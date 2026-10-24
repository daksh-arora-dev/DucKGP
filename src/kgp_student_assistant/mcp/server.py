"""FastMCP entry point. Run: python -m kgp_student_assistant.mcp.server"""
from fastmcp import FastMCP

from kgp_student_assistant.core.config import settings
from kgp_student_assistant.mcp.tools.health import ping
from kgp_student_assistant.mcp.tools.iqps import search_pyqs



mcp = FastMCP("IIT KGP Student Guide")


mcp.tool(ping)
mcp.tool(search_pyqs)


def main():
    mcp.run(
        transport="http",
        host=settings.mcp_host,
        port=settings.mcp_port,
        path="/mcp"
    )


if __name__ == "__main__":
    main()
