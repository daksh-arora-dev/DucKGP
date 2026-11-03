"""Create the DucKGP AI agent."""

from importlib.resources import files

from langchain.agents import create_agent

from kgp_student_assistant.agent.llm import get_llm
from kgp_student_assistant.agent.mcp_client import load_tools


async def create_my_agent(access_token: str):

    # Initialize LLM
    llm = get_llm()

    # Load MCP tools for the authenticated student
    tools = await load_tools(access_token)

    # Load system prompt
    system_prompt = (
        files("kgp_student_assistant")
        .joinpath("prompts/system.txt")
        .read_text(encoding="utf-8")
    )
    agent = create_agent(
        model=llm,
        tools=tools,
        system_prompt=system_prompt,
    )

    return agent