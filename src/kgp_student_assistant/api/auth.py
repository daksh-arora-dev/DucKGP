import httpx

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from kgp_student_assistant.core.config import settings


security = HTTPBearer(auto_error=False)


async def require_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security)
) -> str:

    # Check whether a token was provided
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required"
        )

    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase authentication not configured"
        )

    # Verify the token with Supabase
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": settings.supabase_publishable_key,
                    "Authorization": f"Bearer {credentials.credentials}"
                }
            )

    except httpx.RequestError:
        raise HTTPException(
            status_code=503,
            detail="Authentication service unavailable"
        )

    if response.status_code in (401, 403):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    if response.status_code != 200:
        raise HTTPException(
            status_code=503,
            detail="Unable to verify authentication"
        )

    user_id = response.json().get("id")

    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid user"
        )

    return user_id