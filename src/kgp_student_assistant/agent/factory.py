"""Agent construction: no business logic, only LLM + prompt + tools."""
from importlib.resources import files
from langchain.agents import create_agent

from kgp_student_assistant.agent.mcp_client import load_tools
from kgp_student_assistant.core.config import settings


async def create_kgp_agent():
    tools = await load_tools()
    prompt = (
        files("kgp_student_assistant")
        .joinpath("prompts/system.txt")
        .read_text(encoding="utf-8")
    )
    return create_agent(model=settings.llm_model, tools=tools, system_prompt=prompt)
