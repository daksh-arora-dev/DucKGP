"""Loading tools from the MCP server."""

from langchain_mcp_adapters.client import MultiServerMCPClient
from kgp_student_assistant.core.config import settings

async def load_tools():
    client = MultiServerMCPClient(
        {
            "kgp": {
                "transport": "http",
                "url": settings.mcp_url,
            }
        }
    )
    tools = await client.get_tools()
    return tools