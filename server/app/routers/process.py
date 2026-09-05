from fastapi import APIRouter, Response, HTTPException, status
from pydantic import BaseModel, Field
from app.processor import process_notes

router = APIRouter(tags=["process"])

class ProcessRequest(BaseModel):
    text: str = Field(..., description="Note text content to process")

@router.post("/api/process")
def process_text(payload: ProcessRequest, response: Response):
    # Enforce non-persistent processing responses for privacy.
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"

    text = payload.text.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide note text in the text field."
        )

    try:
        result = process_notes(text)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing notes: {str(e)}"
        )
