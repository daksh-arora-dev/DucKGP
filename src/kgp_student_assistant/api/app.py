import logging
import os
from contextlib import asynccontextmanager
from uuid import UUID

import httpx
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from kgp_student_assistant.agent.kitchen import create_my_agent
from kgp_student_assistant.api.auth import require_user_id
from kgp_student_assistant.api.chat_store import ChatStore
from kgp_student_assistant.api.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="DucKGP API", lifespan=lifespan)
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
if production_origin := os.getenv("FRONTEND_ORIGIN"):
    origins.append(production_origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/chat", response_model=ChatResponse)
async def chat(
    payload: ChatRequest,
    request: Request,
    user_id: str = Depends(require_user_id),
):
    try:
        conversation_id = str(UUID(payload.conversation_id))
    except ValueError as exc:
        raise HTTPException(422, "Invalid conversation ID") from exc

    # Auth dependency has already verified this Bearer token with Supabase Auth.
    agent = await create_my_agent(access_token)
    access_token = request.headers["authorization"].split(" ", 1)[1]

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            store = ChatStore(client, access_token)
            await store.verify_profile(user_id)
            await store.ensure_conversation(conversation_id, user_id, payload.message)
            history = await store.recent_messages(conversation_id)
            await store.save_message(conversation_id, "user", payload.message)

            response = await agent.ainvoke(
            {
                "messages": history + [
                    {
                        "role": "user",
                        "content": payload.message
                    }
                ]
            }
        )

            reply = str(response["messages"][-1].content)
            await store.save_message(conversation_id, "assistant", reply)
            await store.touch_conversation(conversation_id)
            return ChatResponse(reply=reply)
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Chat request failed")
        raise HTTPException(500, "Unable to process your request") from exc
