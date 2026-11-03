from langchain_mcp_adapters.client import MultiServerMCPClient

from kgp_student_assistant.core.config import settings


async def load_tools(access_token: str):

    client = MultiServerMCPClient(
        {
            "kgp": {
                "transport": "http",
                "url": settings.mcp_url,

                "headers": {
                    "Authorization": f"Bearer {access_token}"
                },
            }
        }
    )

    tools = await client.get_tools()

    return tools