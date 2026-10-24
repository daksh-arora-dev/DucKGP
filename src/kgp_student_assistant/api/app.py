"""HTTP API. Keep endpoints thin; business logic lives elsewhere."""
from fastapi import FastAPI, HTTPException

from kgp_student_assistant.agent.kitchen import create_kgp_agent
from kgp_student_assistant.api.schemas import ChatRequest, ChatResponse

app = FastAPI(title="IIT KGP Student Assistant", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest) -> ChatResponse:
    # Simplified starter: rebuilds the agent on each request. Add app-lifespan
    # caching, auth, per-user state and rate limiting before real deployment.
    try:
        agent = await create_kgp_agent()
        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": payload.message}]}
        )
        return ChatResponse(reply=str(result["messages"][-1].content))
    except Exception as exc:
        # Do not expose credentials or internal tracebacks in an HTTP response.
        raise HTTPException(status_code=503, detail="Chat service unavailable; check MCP and LLM settings") from exc
