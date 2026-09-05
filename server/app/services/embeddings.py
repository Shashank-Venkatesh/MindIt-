"""Heading embedding + graph-link suggestion service.

Design notes
------------
- Embeddings are generated with the SAME local, deterministic hashed-IDF
  embedder already used by app.processor (build_embedding). This means no
  external embedding API/account is required - the only new piece of
  infrastructure is pgvector itself, which lives inside the existing
  Supabase Postgres database.
- Storage + nearest-neighbor search is done with pgvector (see
  app.models.HeadingEmbedding and the ivfflat index created in
  app.database.init_db).
- Suggestions are scoped per-owner: a user only ever gets suggested links
  between their own headings, never another user's.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlmodel import Session, select

from app.models import HeadingEmbedding
from app.processor import build_embedding
import time

# Below this cosine similarity, two headings are considered unrelated and
# won't be surfaced as a suggested graph edge.
DEFAULT_SIMILARITY_THRESHOLD = 0.75
DEFAULT_SUGGESTION_LIMIT = 5


def embed_heading_text(text_value: str) -> List[float]:
    """Turn a heading string into a fixed-length vector.

    idf_map is intentionally empty here: build_embedding() falls back to a
    neutral idf weight of 1.0 for any token it doesn't recognize, which is
    exactly what we want for a single short heading evaluated in isolation
    (there's no multi-document corpus to compute real document frequencies
    against at index time).
    """
    return build_embedding(text_value, idf_map={})


def upsert_heading_embeddings(
    db: Session,
    owner: str,
    note_id: str,
    headings: List[Dict[str, str]],
) -> int:
    """Create/update embeddings for a batch of headings belonging to one note.

    `headings` is a list of {"id": <heading/chunk id>, "text": <heading text>}.
    Returns the number of rows written.
    """
    written = 0
    now = int(time.time() * 1000)

    for heading in headings:
        heading_id = (heading.get("id") or "").strip()
        heading_text = (heading.get("text") or "").strip()
        if not heading_id or not heading_text:
            continue

        vector = embed_heading_text(heading_text)

        existing = db.exec(
            select(HeadingEmbedding).where(
                HeadingEmbedding.owner == owner,
                HeadingEmbedding.note_id == note_id,
                HeadingEmbedding.heading_id == heading_id,
            )
        ).first()

        if existing:
            existing.heading_text = heading_text
            existing.embedding = vector
            existing.updated_at = now
            db.add(existing)
        else:
            db.add(
                HeadingEmbedding(
                    owner=owner,
                    note_id=note_id,
                    heading_id=heading_id,
                    heading_text=heading_text,
                    embedding=vector,
                    created_at=now,
                    updated_at=now,
                )
            )
        written += 1

    db.commit()
    return written


def suggest_links_for_heading(
    db: Session,
    owner: str,
    note_id: str,
    heading_id: str,
    heading_text: Optional[str] = None,
    limit: int = DEFAULT_SUGGESTION_LIMIT,
    threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
) -> List[Dict[str, Any]]:
    """Return the top-N most similar headings (across ALL of this owner's
    notes, excluding the heading itself) as candidate graph edges.

    Uses pgvector's cosine-distance operator (<=>) directly in SQL so the
    nearest-neighbor search runs inside Postgres rather than pulling every
    row back into Python.
    """
    source = db.exec(
        select(HeadingEmbedding).where(
            HeadingEmbedding.owner == owner,
            HeadingEmbedding.note_id == note_id,
            HeadingEmbedding.heading_id == heading_id,
        )
    ).first()

    if source is None:
        if not heading_text:
            return []
        # Heading hasn't been indexed yet (e.g. user hasn't saved the note) -
        # embed on the fly for a one-off suggestion query without persisting it.
        query_vector = embed_heading_text(heading_text)
    else:
        query_vector = source.embedding

    rows = db.exec(
        text(
            """
            select note_id, heading_id, heading_text,
                   1 - (embedding <=> :query_vector) as similarity
            from heading_embeddings
            where owner = :owner
              and not (note_id = :note_id and heading_id = :heading_id)
            order by embedding <=> :query_vector
            limit :limit
            """
        ).bindparams(
            owner=owner,
            note_id=note_id,
            heading_id=heading_id,
            query_vector=str(query_vector),
            limit=limit,
        )
    ).all()

    suggestions = []
    for row in rows:
        similarity = round(float(row.similarity), 4)
        if similarity < threshold:
            continue
        suggestions.append(
            {
                "note_id": row.note_id,
                "heading_id": row.heading_id,
                "heading_text": row.heading_text,
                "similarity": similarity,
            }
        )
    return suggestions


def delete_note_embeddings(db: Session, owner: str, note_id: str) -> int:
    """Remove all heading embeddings for a note (call this when a note is
    deleted so stale headings don't keep showing up as suggestions)."""
    rows = db.exec(
        select(HeadingEmbedding).where(
            HeadingEmbedding.owner == owner,
            HeadingEmbedding.note_id == note_id,
        )
    ).all()
    for row in rows:
        db.delete(row)
    db.commit()
    return len(rows)
