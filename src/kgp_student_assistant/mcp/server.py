"""DucKGP MCP Server."""

from fastmcp import FastMCP

from kgp_student_assistant.core.config import settings

from kgp_student_assistant.mcp.tools.health import ping
from kgp_student_assistant.mcp.tools.iqps import search_pyqs
from kgp_student_assistant.mcp.tools.gmail import search_gmail


mcp = FastMCP("DucKGP MCP Server")


# Public tools
mcp.tool(ping)
mcp.tool(search_pyqs)


# User-specific tools
mcp.tool(search_gmail)


def main():
    mcp.run(
        transport="http",
        host=settings.mcp_host,
        port=settings.mcp_port,
        path="/mcp",
    )


if __name__ == "__main__":
    main()