# Running DucKGP Locally
### 1. Clone the Repository
```powershell
git clone <repository-url>
cd <repository-folder>
```
### 2. Set Up Virtual Environment and Install Dependencies
Run from the project root directory:
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev,groq]"
```
### 3. Configure Environment Variables
```powershell
Copy-Item .env.example .env
Copy-Item frontend\.env.example frontend\.env
```
Fill in the required API keys and configuration values.
### 4. Start the Application
Open three terminals in VS Code.
**Terminal 1: MCP Server**
```powershell
.\.venv\Scripts\Activate.ps1
python -m kgp_student_assistant.mcp.server
```
**Terminal 2: FastAPI Backend**
```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn kgp_student_assistant.api.app:app --reload --port 8000
```
**Terminal 3: React Frontend**
```powershell
cd frontend
npm install
npm run dev
```
### 5. Access DucKGP
Open the local URL displayed in Terminal 3:
http://localhost:5173/
Keep all three terminals running while using the application.
