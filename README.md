# For now, to test it, start by pulling the repo, and be in the root directory
## Make 3 terminals
### Terminal 1 ( start mcp server)
`python -m kgp_student_assistant.mcp.server`
### Terminal 2 ( start api to connect frontend to backend)
`python -m uvicorn kgp_student_assistant.api.app:app --reload --port 8000`
### Terminal 3 ( start the frontend)
`cd frontend`
`npm run dev`
## click on the local server link
