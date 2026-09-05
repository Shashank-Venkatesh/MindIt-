from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import Session, select
from app.database import get_db
from app.models import NoteHistory
from app.auth import get_current_user
from app.http_cache import set_db_cache_headers, set_session_cookie
from app.services import embeddings as embeddings_service
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import time

router = APIRouter(tags=["notes"])

class NoteCreateRequest(BaseModel):
    id: Optional[str] = None
    owner: Optional[str] = None
    createdAt: Optional[int] = None
    viewedAt: Optional[int] = None
    preview: str
    text: str
    result: Dict[str, Any]

@router.get("/api/notes", response_model=List[NoteHistory])
def list_notes(
    response: Response,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    statement = select(NoteHistory).where(NoteHistory.owner == owner).order_by(NoteHistory.createdAt.desc())
    notes = db.exec(statement).all()
    # Randomized private cache headers + session cookie for authenticated reads.
    set_db_cache_headers(response, private=True)
    set_session_cookie(response, current_user)
    return notes

@router.get("/api/notes/{note_id}", response_model=NoteHistory)
def get_note(
    note_id: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    statement = select(NoteHistory).where(NoteHistory.id == note_id, NoteHistory.owner == owner)
    note = db.exec(statement).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you do not have permission to access it."
        )
    
    # Touch note (update viewedAt)
    note.viewedAt = int(time.time() * 1000)
    db.add(note)
    db.commit()
    db.refresh(note)
    # A single-note read is also private + randomized cache + session cookie.
    set_db_cache_headers(response, private=True)
    set_session_cookie(response, current_user)
    return note

@router.post("/api/notes", response_model=NoteHistory)
def create_note(
    payload: NoteCreateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    
    # Generate ID if not provided
    note_id = payload.id or f"{int(time.time()*1000)}-custom"
    
    # Check if note already exists
    existing = db.exec(select(NoteHistory).where(NoteHistory.id == note_id)).first()
    if existing:
        # Update existing note if it belongs to the same user
        if existing.owner != owner:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this note."
            )
        existing.viewedAt = int(time.time() * 1000)
        existing.preview = payload.preview
        existing.text = payload.text
        existing.result = payload.result
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    now = int(time.time() * 1000)
    note = NoteHistory(
        id=note_id,
        owner=owner,
        createdAt=payload.createdAt or now,
        viewedAt=payload.viewedAt or now,
        preview=payload.preview,
        text=payload.text,
        result=payload.result
    )
    
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

@router.delete("/api/notes/{note_id}")
def delete_note(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    statement = select(NoteHistory).where(NoteHistory.id == note_id, NoteHistory.owner == owner)
    note = db.exec(statement).first()
    if not note:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Note not found or you do not have permission to delete it."
        )
    
    db.delete(note)
    db.commit()
    embeddings_service.delete_note_embeddings(db, owner=owner, note_id=note_id)
    return {"message": "Note deleted successfully."}

@router.delete("/api/notes/clear/all")
def clear_all_notes(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    statement = select(NoteHistory).where(NoteHistory.owner == owner)
    notes = db.exec(statement).all()
    for note in notes:
        db.delete(note)
        embeddings_service.delete_note_embeddings(db, owner=owner, note_id=note.id)
    db.commit()
    return {"message": "All notes cleared successfully."}
