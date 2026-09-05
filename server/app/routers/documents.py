from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import Session, select
from app.database import get_db
from app.models import DocumentMetadata
from app.auth import get_current_user
from app.http_cache import set_db_cache_headers, set_session_cookie
from app.config import settings
from supabase import create_client, Client
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import time

router = APIRouter(tags=["documents"])

# Initialize Supabase client
supabase_client: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

class DocumentCreateRequest(BaseModel):
    filename: str
    file_size: int
    storage_path: str

@router.get("/api/documents", response_model=List[DocumentMetadata])
def list_documents(
    response: Response,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    statement = select(DocumentMetadata).where(DocumentMetadata.owner == owner).order_by(DocumentMetadata.created_at.desc())
    docs = db.exec(statement).all()
    # Randomized private cache headers + session cookie for authenticated reads.
    set_db_cache_headers(response, private=True)
    set_session_cookie(response, current_user)
    return docs

@router.post("/api/documents", response_model=DocumentMetadata)
def register_document(
    payload: DocumentCreateRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    doc = DocumentMetadata(
        owner=owner,
        filename=payload.filename,
        file_size=payload.file_size,
        storage_path=payload.storage_path,
        created_at=int(time.time() * 1000)
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

@router.get("/api/documents/{doc_id}/download-url")
def get_document_download_url(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    statement = select(DocumentMetadata).where(DocumentMetadata.id == doc_id, DocumentMetadata.owner == owner)
    doc = db.exec(statement).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or you do not have permission to access it."
        )

    try:
        # Generate a signed URL for the file to download from Supabase Storage (valid for 60 seconds)
        # Bucket name is assumed to be 'documents'
        response = supabase_client.storage.from_("documents").create_signed_url(doc.storage_path, 60)
        return {"download_url": response.get("signedURL") or response.get("signed_url")}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate download URL from Supabase: {str(e)}"
        )

@router.delete("/api/documents/{doc_id}")
def delete_document(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    owner = current_user["email"] if current_user.get("is_authenticated") else "guest"
    statement = select(DocumentMetadata).where(DocumentMetadata.id == doc_id, DocumentMetadata.owner == owner)
    doc = db.exec(statement).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found or you do not have permission to delete it."
        )

    # 1. Attempt to delete from Supabase storage
    try:
        supabase_client.storage.from_("documents").remove([doc.storage_path])
    except Exception as e:
        # Log error but don't fail, we want to clear db representation anyway
        print(f"Warn: failed to delete file {doc.storage_path} from Supabase: {str(e)}")

    # 2. Delete from DB
    db.delete(doc)
    db.commit()
    return {"message": "Document metadata and file deleted successfully."}
