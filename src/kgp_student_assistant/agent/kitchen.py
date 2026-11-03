"""Create DucKGP agent; persistent history is supplied by the API."""
from importlib.resources import files

from langchain.agents import create_agent

from kgp_student_assistant.agent.llm import get_llm
from kgp_student_assistant.agent.mcp_client import load_tools


async def create_my_agent():
    llm = get_llm()
    tools = await load_tools()
    system_prompt = (
        files("kgp_student_assistant")
        .joinpath("prompts/system.txt")
        .read_text(encoding="utf-8")
    )
    return create_agent(model=llm, tools=tools, system_prompt=system_prompt)
