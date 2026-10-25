"""API request and response models."""
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=6000)
    conversation_id: str = Field(min_length=1)


class ChatResponse(BaseModel):
    reply: str