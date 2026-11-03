"""DucKGP MCP Server."""

from fastmcp import FastMCP

from kgp_student_assistant.core.config import settings

from kgp_student_assistant.mcp.tools.health import ping
from kgp_student_assistant.mcp.tools.iqps import search_pyqs
from kgp_student_assistant.mcp.tools.gmail import search_gmail
from kgp_student_assistant.mcp.tools.metakgp import ( find_empty_classrooms, where_is_my_prof, )


mcp = FastMCP("DucKGP MCP Server")


# Public tools
mcp.tool(ping)
mcp.tool(search_pyqs)
mcp.tool(find_empty_classrooms)
mcp.tool(where_is_my_prof)


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