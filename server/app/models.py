from typing import Optional, Dict, Any, List
from sqlmodel import SQLModel, Field, Column
from sqlalchemy.dialects.postgresql import JSONB, TEXT
from pgvector.sqlalchemy import Vector
import time

# Must match app.processor.EMBEDDING_DIMENSION - the two are decoupled on
# purpose (models.py should not import the processing pipeline), but the
# vector column width has to agree with whatever build_embedding() produces.
HEADING_EMBEDDING_DIMENSION = 48

class Profile(SQLModel, table=True):
    __tablename__ = "profiles"

    id: str = Field(primary_key=True, description="Supabase Auth User UUID")
    email: str = Field(index=True)
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))

class NoteHistory(SQLModel, table=True):
    __tablename__ = "note_history"

    id: str = Field(primary_key=True, index=True)
    owner: str = Field(index=True, description="User email/username or 'guest'")
    createdAt: int = Field(default_factory=lambda: int(time.time() * 1000))
    viewedAt: int = Field(default_factory=lambda: int(time.time() * 1000))
    preview: str = Field(sa_column=Column(TEXT))
    text: str = Field(sa_column=Column(TEXT))
    result: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))

class DocumentMetadata(SQLModel, table=True):
    __tablename__ = "documents"

    id: Optional[int] = Field(default=None, primary_key=True)
    owner: str = Field(index=True, description="User email or 'guest'")
    filename: str
    file_size: int
    storage_path: str
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))


class HeadingEmbedding(SQLModel, table=True):
    """One row per mind-map heading, used to power 'suggest a link between
    these two headings' queries via pgvector similarity search.

    A heading is scoped to (owner, note_id, heading_id) so the same heading
    text in two different notes still gets two rows - graph-link suggestions
    are computed per-owner across all of that user's notes.
    """
    __tablename__ = "heading_embeddings"

    id: Optional[int] = Field(default=None, primary_key=True)
    owner: str = Field(index=True, description="User email or 'guest'")
    note_id: str = Field(index=True, foreign_key="note_history.id")
    heading_id: str = Field(index=True, description="Chunk/heading id from the mindmap graph")
    heading_text: str = Field(sa_column=Column(TEXT))
    embedding: List[float] = Field(sa_column=Column(Vector(HEADING_EMBEDDING_DIMENSION)))
    created_at: int = Field(default_factory=lambda: int(time.time() * 1000))
    updated_at: int = Field(default_factory=lambda: int(time.time() * 1000))
