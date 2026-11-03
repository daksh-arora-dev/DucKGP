"""OAuth authorization-code flow, bound to the verified DucKGP user."""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import secrets
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

from kgp_student_assistant.api.auth import require_user_id
from kgp_student_assistant.core.config import settings
from kgp_student_assistant.integrations.gmail import admin_db, cipher

router = APIRouter(prefix="/gmail", tags=["Gmail"])
SCOPE = "https://www.googleapis.com/auth/gmail.readonly"


@router.post("/connect")
async def connect_gmail(user_id: str = Depends(require_user_id)):
    state = secrets.token_urlsafe(32)
    await admin_db("POST", "gmail_oauth_states", payload={
        "state_hash": sha256(state.encode()).hexdigest(),
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
    })
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPE,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return {"url": "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)}


@router.get("/callback")
async def gmail_callback(state: str = "", code: str = "", error: str = ""):
    frontend = settings.gmail_frontend_url.rstrip("/")
    if error or not state or not code:
        return RedirectResponse(f"{frontend}/?gmail=denied")

    # Atomic one-time state consumption prevents forged/replayed callbacks.
    rows = await admin_db("DELETE", "gmail_oauth_states", params={
        "state_hash": f"eq.{sha256(state.encode()).hexdigest()}",
        "expires_at": f"gt.{datetime.now(timezone.utc).isoformat()}",
    })
    if not rows:
        return RedirectResponse(f"{frontend}/?gmail=expired")

    async with httpx.AsyncClient(timeout=20) as client:
        result = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        })
        if result.status_code != 200:
            raise HTTPException(400, "Google authorization code could not be exchanged")
        tokens = result.json()
        if SCOPE not in tokens.get("scope", "").split():
            raise HTTPException(400, "Gmail read permission was not granted")
        if not tokens.get("refresh_token"):
            raise HTTPException(400, "Google did not issue a refresh token; retry consent")

        profile = await client.get(
            "https://gmail.googleapis.com/gmail/v1/users/me/profile",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        profile.raise_for_status()

    await admin_db("POST", "gmail_connections", params={"on_conflict": "user_id"}, payload={
        "user_id": rows[0]["user_id"],
        "email": profile.json()["emailAddress"],
        "encrypted_refresh_token": cipher().encrypt(
            tokens["refresh_token"].encode()
        ).decode(),
        "connected_at": datetime.now(timezone.utc).isoformat(),
    })
    return RedirectResponse(f"{frontend}/?gmail=connected")


@router.get("/status")
async def gmail_status(user_id: str = Depends(require_user_id)):
    rows = await admin_db(
        "GET", "gmail_connections",
        params={"user_id": f"eq.{user_id}", "select": "email"},
    )
    return {"connected": bool(rows), "email": rows[0]["email"] if rows else None}


@router.delete("/disconnect")
async def gmail_disconnect(user_id: str = Depends(require_user_id)):
    await admin_db(
        "DELETE", "gmail_connections", params={"user_id": f"eq.{user_id}"}
    )
    return {"connected": False}
