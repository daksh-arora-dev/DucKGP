import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from kgp_student_assistant.agent.kitchen import create_my_agent
from kgp_student_assistant.api.schemas import ChatRequest, ChatResponse


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):

    app.state.agent = await create_my_agent()

    yield


app = FastAPI(
    title="DucKGP API",
    lifespan=lifespan
)


# Allow React frontend to communicate with FastAPI
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

if production_origin := os.getenv("FRONTEND_ORIGIN"):
    origins.append(production_origin.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):

    try:
        response = await app.state.agent.ainvoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": request.message
                    }
                ]
            },
            config={
                "configurable": {
                    "thread_id": request.conversation_id
                }
            }
        )

        return ChatResponse(
            reply=str(response["messages"][-1].content)
        )

    except Exception as exc:
        logger.exception("Chat request failed")

        raise HTTPException(
            status_code=500,
            detail="Unable to process your request"
        ) from exc