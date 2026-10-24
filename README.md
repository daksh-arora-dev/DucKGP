# KGP Student AI Assistant

Starter architecture for a modular IIT KGP assistant using FastMCP, LangChain and FastAPI.
**This scaffold does not connect to real IQPS, ERP, MetaKGP or Gmail yet.** The only registered MCP tool is `ping`.

## Windows PowerShell setup

Requires Python 3.11 or 3.12 and VS Code.

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
```

The canonical dependencies are in `pyproject.toml`; `requirements.txt` is a compatibility entry point for `pip -r`.

## Start MCP server

```powershell
python -m kgp_student_assistant.mcp.server
```

MCP endpoint: http://127.0.0.1:8001/mcp

## Start API in another terminal

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn kgp_student_assistant.api.app:app --reload
```

Open http://127.0.0.1:8000/docs and test GET /health.

## Enable LLM chat (optional)

For OpenAI (or replace with the correct provider integration for your chosen model):

```powershell
python -m pip install -e ".[openai]"
```

Set `OPENAI_API_KEY` in `.env`. Chat will call the running MCP server through `MultiServerMCPClient`.

## Test / style

```powershell
pytest
ruff check src tests
```

## Add your first real integration

1. Implement the external network or API access in `integrations/iqps.py`.
2. Add input validation and a simple wrapper in `mcp/tools/iqps.py`.
3. Register the IQPS tool in `mcp/server.py` only after it works.
4. Mock the external service in unit tests; add opt-in integration tests for live sources.

Do not commit credentials or student records. Avoid automating ERP OTP/password entry without explicit authorization and consent.

**Dependency compatibility:** LangChain MCP Adapters 0.3.2 requires the MCP SDK 1.x line;
FastMCP 2.14.x supports that line. Update both together when compatibility improves.
