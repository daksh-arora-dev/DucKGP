""" 
    LLM initialization and configuration.
    model chosen: openai/gpt-oss-120b
    provider: Groqcloud
"""

from langchain_groq import ChatGroq
from kgp_student_assistant.core.config import settings


def get_llm() -> ChatGroq:

    if (
        settings.llm_api_key is None
        or not settings.llm_api_key.get_secret_value()
    ):
        raise ValueError(
            "LLM_API_KEY is missing from .env"
        )

    llm = ChatGroq(
        model=settings.llm_model,
        api_key=settings.llm_api_key.get_secret_value(),
        reasoning_format="hidden",
        max_retries=2,
    )

    return llm