"""Simple tool, safe to test without external systems."""


def ping() -> dict[str, str]:
    """Check that the IIT KGP MCP server is reachable."""
    return {"status": "ok", "service": "kgp-student-assistant"}
