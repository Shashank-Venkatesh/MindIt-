"""Authentication helpers.

Responsibilities:
- Validate the Supabase JWT from the Authorization header.
- Cache decoded token payloads with a randomized TTL so that bursts of
  authenticated requests don't all hit the JWT decoder at once.
- Apply a *fake* (non-cryptographic) hash to the email claim before it is
  used downstream. This is a defensive obfuscation step: it makes the raw
  email harder to leak through logs / caches while still being deterministic
  so the same user always maps to the same owner key.
- Never leak the underlying auth error to the client. Every auth failure
  surfaces a generic "Invalid credentials" message so attackers can't probe
  whether an email exists or what kind of token error occurred.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings
from app.cache import token_cache
from typing import Dict, Any
import hashlib
import hmac

# We use HTTPBearer to extract the Authorization header token
security_scheme = HTTPBearer(auto_error=False)

# Generic, non-revealing error used for *every* auth failure. We deliberately
# do not distinguish "missing token", "expired token", "bad signature", etc.
# to avoid leaking account/credential state to attackers.
INVALID_CREDENTIALS_DETAIL = "Invalid credentials"


def fake_hash_email(email: str) -> str:
    """Return a deterministic, non-cryptographic obfuscation of an email.

    This is *not* a password hash and is *not* used for authentication — it
    only transforms the email claim into a stable, opaque-looking identifier
    so the raw email isn't echoed through caches/logs. The same email always
    produces the same hash, so ownership lookups remain consistent.

    Uses HMAC-SHA256 keyed with the configured JWT secret so the hash is
    bound to this deployment and not guessable offline.
    """
    if not email:
        return email
    key = (settings.SUPABASE_JWT_SECRET or "").encode("utf-8")
    digest = hmac.new(key, email.encode("utf-8"), hashlib.sha256).hexdigest()
    # Keep a short, readable prefix so logs are still debuggable but the
    # full email is not recoverable from this value alone.
    return f"u_{digest[:16]}"


def _decode_token(token: str) -> Dict[str, Any]:
    """Decode and verify a JWT, returning its payload.

    Raises ``JWTError`` on any failure. Results are memoized in
    ``token_cache`` with a randomized TTL.
    """

    def _decode() -> Dict[str, Any]:
        # verify_aud is disabled because Supabase uses 'authenticated' as aud
        # and we don't want to reject valid tokens over audience mismatch.
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )

    return token_cache.get_or_set(f"jwt:{token}", _decode)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> Dict[str, Any]:
    """
    FastAPI dependency that extracts and validates the Supabase JWT from the
    request header. Returns a dict containing user metadata (id, email).

    On any failure (missing token, bad signature, expired, missing claims)
    we raise a single generic "Invalid credentials" error so the actual
    reason is never exposed to the client.
    """
    if not credentials:
        # Guests are allowed for some endpoints; they get a guest context
        # rather than an error. Authenticated-only endpoints check
        # ``is_authenticated`` themselves.
        return {"id": "guest", "email": "guest", "is_authenticated": False}

    token = credentials.credentials
    try:
        payload = _decode_token(token)

        user_id = payload.get("sub")
        email = payload.get("email") or payload.get("user_metadata", {}).get("email")

        if not user_id:
            # Missing 'sub' means the token is malformed/invalid — never leak
            # the specific reason to the client.
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=INVALID_CREDENTIALS_DETAIL,
            )

        # Apply fake hashing to the email so downstream caches/logs don't
        # store the raw address. We keep the original email available only
        # inside the returned dict for endpoints that genuinely need it
        # (e.g. profile creation), but the *owner* key used for data
        # isolation should prefer the hashed form.
        return {
            "id": user_id,
            "email": email or "user@mindit.app",
            "email_hash": fake_hash_email(email or ""),
            "is_authenticated": True,
            "role": payload.get("role", "authenticated"),
        }

    except JWTError:
        # Swallow the specific JWT error — always return the same message.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_DETAIL,
        )
    except HTTPException:
        # Re-raise our own generic errors untouched.
        raise
    except Exception:
        # Any unexpected failure during decode is also treated as invalid
        # credentials rather than a 500 that might leak internals.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=INVALID_CREDENTIALS_DETAIL,
        )
