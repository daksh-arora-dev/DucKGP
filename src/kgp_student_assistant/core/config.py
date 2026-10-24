"""Typed configuration read from environment or a local .env file."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    iqps_base_url: str = "https://iqps.metakgp.org"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    llm_model: str = "openai:gpt-4.1-mini"
    mcp_url: str = "http://127.0.0.1:8001/mcp"
    mcp_host: str = "127.0.0.1"
    mcp_port: int = 8001


settings = Settings()
