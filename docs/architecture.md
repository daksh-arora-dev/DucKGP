# Architecture

```text
UI / CLI / API client
       |
FastAPI (api/app.py)
       |
LangChain agent (agent/factory.py)
       |            \
       |             LLM provider API
       v
MCP client (agent/mcp_client.py)
       |
    MCP HTTP
       |
FastMCP server (mcp/server.py)
       |
MCP tools (mcp/tools/*.py)
       |
Integrations (integrations/*.py)
       |
IQPS / MetaKGP / approved ERP APIs / college docs
```

Principles: each layer has one job; external HTTP happens only in integrations;
MCP is the tool interface; agent code is LLM orchestration, not scraping.
The tool `ping` is real; IQPS is a deliberately unimplemented placeholder.

FastMCP is pinned to the 2.x line for compatibility with langchain-mcp-adapters 0.3.2,
which requires `mcp<2`. Re-evaluate versions together before upgrading to FastMCP 4.
