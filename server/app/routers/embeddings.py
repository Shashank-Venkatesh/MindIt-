from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from app.database import get_db
from app.auth import get_current_user
from app.services import embeddings as embeddings_service
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

router = APIRouter(tags=["embeddings"], prefix="/api/embeddings")


class HeadingInput(BaseModel):
    id: str
    text: str


class IndexHeadingsRequest(BaseModel):
    note_id: str
    headings: List[HeadingInput]


class SuggestionsRequest(BaseModel):
    note_id: str
    heading_id: str
    # Optional: pass the current heading text so a not-yet-saved heading can
    # still get suggestions without being indexed first.
    heading_text: Optional[str] = None
    limit: int = 5
    threshold: float = embeddings_service.DEFAULT_SIMILARITY_THRESHOLD


def _owner(current_user: Dict[str, Any]) -> str:
    return current_user["email"] if current_user.get("is_authenticated") else "guest"


@router.post("/index")
def index_headings(
    payload: IndexHeadingsRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Embed + upsert a batch of headings for a note. Call this whenever a
    note is saved/edited so its headings are searchable for link suggestions.
    """
    owner = _owner(current_user)
    headings = [h.model_dump() for h in payload.headings]
    written = embeddings_service.upsert_heading_embeddings(
        db, owner=owner, note_id=payload.note_id, headings=headings
    )
    return {"indexed": written}


@router.post("/suggestions")
def get_suggestions(
    payload: SuggestionsRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Return candidate headings (from anywhere in this user's notes) that
    are semantically close to the given heading - i.e. suggested graph edges.
    """
    owner = _owner(current_user)
    suggestions = embeddings_service.suggest_links_for_heading(
        db,
        owner=owner,
        note_id=payload.note_id,
        heading_id=payload.heading_id,
        heading_text=payload.heading_text,
        limit=payload.limit,
        threshold=payload.threshold,
    )
    return {"suggestions": suggestions}


@router.delete("/note/{note_id}")
def delete_note_heading_embeddings(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Clean up heading embeddings when a note is deleted."""
    owner = _owner(current_user)
    deleted = embeddings_service.delete_note_embeddings(db, owner=owner, note_id=note_id)
    return {"deleted": deleted}
