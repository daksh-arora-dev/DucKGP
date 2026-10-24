FROM python:3.11-slim
WORKDIR /app
COPY pyproject.toml requirements.txt README.md ./
COPY src ./src
RUN python -m pip install --no-cache-dir -r requirements.txt
RUN useradd --create-home appuser
USER appuser
EXPOSE 8000 8001
CMD ["uvicorn", "kgp_student_assistant.api.app:app", "--host", "0.0.0.0", "--port", "8000"]
