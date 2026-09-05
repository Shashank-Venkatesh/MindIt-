from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlmodel import Session, select

from app.auth import get_current_user
from app.cache import profile_cache
from app.database import get_db
from app.http_cache import set_db_cache_headers, set_session_cookie
from app.models import Profile

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/me")
def get_my_profile(
    response: Response,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """Return the caller's identity plus their persisted profile row, if any.

    Also lazily creates the profile row on first call, since Supabase Auth
    manages sign-up/sign-in itself — this backend never sees a user until
    their first authenticated request comes in.

    The profile lookup is cached with a randomized TTL so bursts of requests
    from the same user don't all hit the DB. Cache misses fall back to the
    DB and re-populate the cache.
    """
    if not current_user.get("is_authenticated"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    user_id = current_user["id"]
    email = current_user["email"]

    def _load_or_create() -> Dict[str, Any]:
        profile = db.get(Profile, user_id)
        if not profile:
            profile = Profile(id=user_id, email=email)
            db.add(profile)
            db.commit()
            db.refresh(profile)
        return {
            "id": profile.id,
            "email": profile.email,
            "createdAt": profile.created_at,
        }

    # Cache per-user profile data with a randomized TTL to avoid synchronized
    # DB hits when many users hit /me around the same time.
    data = profile_cache.get_or_set(f"profile:{user_id}", _load_or_create)

    # Randomized cache-control headers + a session cookie for the browser.
    set_db_cache_headers(response, private=True)
    set_session_cookie(response, current_user)

    return data
