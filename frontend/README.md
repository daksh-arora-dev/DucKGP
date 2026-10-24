# DucKGP — React chat frontend 🦆

A playful, high-tech, responsive chat interface for the IIT Kharagpur Student AI Assistant. Built with **React, TypeScript, Vite, and handcrafted CSS** (no Tailwind configuration required).

## Drop it into your existing repository

Extract the ZIP into your existing repository's root. The archive contains exactly one top-level `frontend/` directory.

```text
my-existing-repo/
├── src/                   # your Python FastAPI / LangChain / MCP code
├── pyproject.toml
├── ...
└── frontend/              # paste the entire included folder here
    ├── src/
    ├── public/
    ├── package.json
    └── ...
```

The frontend is a **separate Node.js project**. It does not replace or edit any Python backend files.

## Run locally (Windows PowerShell)

Requires Node.js 20.19+ or 22.12+.

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open **http://localhost:5173**. Your FastMCP server does **not** need to be running to preview the UI.

## Live AI integration

The default `VITE_DEMO_MODE=true` enables **clearly labeled sample responses**, not real Groq or IQPS results.

To connect your existing LangChain/Groq backend:

1. Expose an HTTP `POST /chat` endpoint in FastAPI (see `docs/BACKEND_INTEGRATION.md`).
2. Set the following in `frontend/.env`:

```ini
VITE_DEMO_MODE=false
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_CHAT_ENDPOINT=/chat
```

3. Restart `npm run dev` after editing `.env`.
4. Run FastAPI, plus your FastMCP server if the backend agent needs it.

**Important:** A browser cannot talk directly to your LangChain `main.py` CLI or MCP server as if those were chat endpoints. FastAPI acts as the HTTP bridge; it makes the Groq and MCP calls server-side. Keep all Groq API keys in Python backend `.env`, never in `VITE_` variables.

## Features

- Custom animated duck mascot and distinctive "jolly duck meets sci-fi console" design language
- Fully responsive 3-column layout (collapsible sidebar on mobile)
- Clickable prompt starters, message composer, Enter/Shift+Enter behavior, loading/stop
- Local chat history; create, switch, and delete conversations
- Markdown rendering, code blocks, copy response, optional source and tool badges
- Demo/live mode labels (no fabricated tool results)
- Keyboard shortcut `Ctrl/Cmd + K` to focus chat and `Ctrl/Cmd + Shift + O` for a new chat
- Graceful API and network errors

## Useful commands

```powershell
npm run dev       # Vite development server
npm run build     # TypeScript check + production build
npm run preview   # Preview compiled frontend
```

## Project map

```text
src/
├── App.tsx                 # app state, chat orchestration, welcome screen
├── styles.css              # all UI styling and responsive design
├── components/
│   ├── ChatMessage.tsx     # Markdown answers, sources, copy
│   ├── Composer.tsx        # text input and send/stop controls
│   ├── DuckMark.tsx        # custom SVG duck mascot
│   ├── Sidebar.tsx         # recent conversations
│   └── RightRail.tsx       # capabilities + mode status
└── lib/
    ├── chatApi.ts          # single file to adapt your API contract
    ├── demo.ts             # local sample replies (no LLM)
    ├── storage.ts          # localStorage chat history
    └── types.ts            # shared TypeScript interfaces
```

### Deployment notes

- `npm run build` generates `frontend/dist/`. Host that output on a static host or serve it from your backend.
- `localStorage` is **browser-local, not authenticated, not synced, and not suitable for sensitive ERP data**. Add real login and server-side storage before rollout.
- This frontend is a design/development starting point, not a completed multi-user production system. Protect API routes, add rate limits and server-side student permissions before public deployment.
- Google Fonts are optional visual enhancements; system fallbacks work offline.
