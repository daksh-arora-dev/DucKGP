"""MCP client adapter: remote tools become LangChain tools."""
from langchain_mcp_adapters.client import MultiServerMCPClient

from kgp_student_assistant.core.config import settings


async def load_tools():
    client = MultiServerMCPClient(
        {"kgp": {"transport": "http", "url": settings.mcp_url}}
    )
    return await client.get_tools()
