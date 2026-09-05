"""Helpers for HTTP caching headers and cookies on DB-backed endpoints.

Why randomized expiration here too?
-----------------------------------
Just like the in-process token cache, fixed ``max-age`` values cause many
clients to re-request stale data at the same instant, hammering the DB.
By jittering the ``max-age`` per response we spread revalidation across
clients so the DB isn't hit by a synchronized burst.

We also set a short-lived ``session`` cookie that mirrors the auth state so
the browser can route/cache authenticated responses without re-sending the
full token on every navigation. The cookie is non-persistent (no
``Expires``/``Max-Age``) so it dies when the browser closes, and it is
marked ``HttpOnly`` + ``SameSite=Lax`` for safety.
"""

from __future__ import annotations

import random
from typing import Any

from fastapi import Response


# Base window (seconds) for the public-ish cache headers on read endpoints.
# Actual max-age sent to a client = CACHE_BASE_MAX_AGE + random(0, CACHE_JITTER).
CACHE_BASE_MAX_AGE = 30
CACHE_JITTER = 45


def _random_max_age(base: int = CACHE_BASE_MAX_AGE, jitter: int = CACHE_JITTER) -> int:
    """Return a randomized max-age in seconds for a single response."""
    return base + random.randint(0, max(jitter, 0))


def set_db_cache_headers(response: Response, *, private: bool = True) -> int:
    """Attach randomized cache-control headers to a DB read response.

    Returns the chosen ``max-age`` so callers can reuse it (e.g. for a
    cookie). ``private`` defaults to True because DB reads are scoped to
    the authenticated user and must never be cached by shared proxies.
    """
    max_age = _random_max_age()
    visibility = "private" if private else "public"
    response.headers["Cache-Control"] = (
        f"{visibility}, max-age={max_age}, must-revalidate"
    )
    return max_age


def set_session_cookie(response: Response, user: Any) -> None:
    """Set a short-lived, randomized session cookie for an authenticated user.

    The cookie value is the user's id (already validated) plus a random
    nonce so two concurrent responses for the same user don't collide. It
    is HttpOnly (not readable by JS) and SameSite=Lax (CSRF-friendly).

    The cookie has no ``Max-Age``/``Expires`` so it is a session cookie:
    it disappears when the browser closes. For guests we set a clearly
    anonymous value.
    """
    if user and user.get("is_authenticated"):
        nonce = random.token_hex(8)
        value = f"{user.get('id')}:{nonce}"
    else:
        value = "guest"

    response.set_cookie(
        key="mindit_session",
        value=value,
        httponly=True,
        secure=False,  # set True behind HTTPS in production
        samesite="lax",
        path="/",
    )
