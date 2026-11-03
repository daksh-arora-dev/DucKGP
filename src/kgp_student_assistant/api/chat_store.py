"""Student-scoped chat storage through Supabase's REST API and RLS."""
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException

from kgp_student_assistant.core.config import settings


class ChatStore:
    def __init__(self, client: httpx.AsyncClient, access_token: str):
        self.client = client
        self.base_url = settings.supabase_url.rstrip("/") + "/rest/v1"
        self.headers = {
            "apikey": settings.supabase_publishable_key,
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

    async def _request(self, method: str, table: str, **kwargs):
        try:
            response = await self.client.request(
                method,
                f"{self.base_url}/{table}",
                headers=self.headers,
                **kwargs,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise HTTPException(502, "Chat database request failed") from exc
        return response.json() if response.content else None

    async def verify_profile(self, user_id: str) -> None:
        rows = await self._request(
            "GET", "profiles", params={"select": "id", "id": f"eq.{user_id}"}
        )
        if not rows:
            raise HTTPException(403, "Complete your student profile first")

    async def ensure_conversation(self, conversation_id: str, user_id: str, message: str):
        rows = await self._request(
            "GET", "conversations", params={"select": "id", "id": f"eq.{conversation_id}"}
        )
        if rows:
            return
        title = " ".join(message.split())[:34] or "New conversation"
        await self._request(
            "POST",
            "conversations",
            json={"id": conversation_id, "user_id": user_id, "title": title},
        )

    async def recent_messages(self, conversation_id: str) -> list[dict]:
        rows = await self._request(
            "GET",
            "messages",
            params={
                "select": "role,content",
                "conversation_id": f"eq.{conversation_id}",
                "order": "created_at.desc,id.desc",
                "limit": "40",
            },
        )
        return [{"role": row["role"], "content": row["content"]} for row in reversed(rows)]

    async def save_message(self, conversation_id: str, role: str, content: str):
        await self._request(
            "POST",
            "messages",
            json={"conversation_id": conversation_id, "role": role, "content": content},
        )

    async def touch_conversation(self, conversation_id: str):
        await self._request(
            "PATCH",
            "conversations",
            params={"id": f"eq.{conversation_id}"},
            json={"updated_at": datetime.now(timezone.utc).isoformat()},
        )
