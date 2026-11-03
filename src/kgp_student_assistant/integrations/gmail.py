"""Backend-only Gmail token storage and Gmail read API."""
import base64

import httpx
from cryptography.fernet import Fernet

from kgp_student_assistant.core.config import settings


def cipher():
    return Fernet(settings.gmail_encryption_key.encode())


async def admin_db(method: str, table: str, *, params=None, payload=None):
    """Service credential stays on the backend; never expose this function to React."""
    url = f"{settings.supabase_url.rstrip('/')}/rest/v1/{table}"
    headers = {
        "apikey": settings.supabase_secret_key,
        "Content-Type": "application/json",
        "Prefer": "return=representation,resolution=merge-duplicates",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.request(
            method, url, headers=headers, params=params, json=payload
        )
    response.raise_for_status()
    return response.json() if response.content else []


async def gmail_access_token(user_id: str) -> str:
    rows = await admin_db(
        "GET", "gmail_connections",
        params={"user_id": f"eq.{user_id}", "select": "encrypted_refresh_token"},
    )
    if not rows:
        raise ValueError("Gmail is not connected. Select Connect Gmail in DucKGP.")

    refresh_token = cipher().decrypt(
        rows[0]["encrypted_refresh_token"].encode()
    ).decode()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
    if response.status_code != 200:
        raise ValueError("Gmail permission expired or was revoked. Reconnect Gmail.")
    return response.json()["access_token"]


def read_plain_text(payload: dict) -> str:
    """Prefer text/plain parts; use Gmail snippet when mail is HTML-only."""
    if payload.get("mimeType") == "text/plain":
        data = payload.get("body", {}).get("data")
        if data:
            return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4)).decode(
                "utf-8", errors="replace"
            )
    for part in payload.get("parts", []):
        result = read_plain_text(part)
        if result:
            return result
    return ""


async def search_messages(user_id: str, query: str, limit: int = 5) -> list[dict]:
    token = await gmail_access_token(user_id)
    headers = {"Authorization": f"Bearer {token}"}
    base = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    async with httpx.AsyncClient(timeout=20) as client:
        result = await client.get(
            base, headers=headers,
            params={"q": query, "maxResults": max(1, min(limit, 10))},
        )
        result.raise_for_status()
        message_ids = result.json().get("messages", [])
        output = []
        for item in message_ids:
            detail = await client.get(
                f"{base}/{item['id']}",
                headers=headers,
                params={"format": "full"},
            )
            detail.raise_for_status()
            mail = detail.json()
            fields = {
                h["name"].lower(): h["value"]
                for h in mail.get("payload", {}).get("headers", [])
            }
            output.append({
                "id": mail["id"],
                "from": fields.get("from", ""),
                "to": fields.get("to", ""),
                "subject": fields.get("subject", ""),
                "date": fields.get("date", ""),
                "body": (
                    read_plain_text(mail.get("payload", {}))
                    or mail.get("snippet", "")
                )[:2500],
            })
    return output
