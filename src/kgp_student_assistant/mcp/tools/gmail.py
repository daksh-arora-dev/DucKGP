import httpx
from fastmcp.server.dependencies import get_http_headers

from kgp_student_assistant.core.config import settings
from kgp_student_assistant.integrations.gmail import search_messages


async def get_authenticated_user() -> str:
    """Identify the student making this MCP request."""

    headers = get_http_headers(include_all=True)
    authorization = headers.get("authorization", "")

    if not authorization.startswith("Bearer "):
        raise ValueError("Authentication required")

    token = authorization.split(" ", 1)[1]

    # Independently verify the student with Supabase.
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {token}",
            },
        )

    if response.status_code != 200:
        raise ValueError("Invalid or expired authentication")

    user_id = response.json().get("id")

    if not user_id:
        raise ValueError("Authenticated user not found")

    return user_id


async def search_gmail(
    query: str,
    limit: int = 5,
) -> list[dict]:
    """Search the authenticated student's connected Gmail.

    Supports Gmail search queries, including:
    in:inbox, in:sent, is:unread, from:, after:.
    """

    user_id = await get_authenticated_user()

    return await search_messages(
        user_id=user_id,
        query=query,
        limit=limit,
    )