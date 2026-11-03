from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

    # LLM Configuration
    llm_api_key: SecretStr | None = None
    llm_model: str = "openai/gpt-oss-120b"

    # MCP Configuration
    mcp_url: str = "http://127.0.0.1:8001/mcp"
    mcp_host: str = "127.0.0.1"
    mcp_port: int = 8001

    # IQPS Configuration
    iqps_base_url: str = ""

    # Supabase Configuration
    supabase_url: str = ""
    supabase_publishable_key: str = ""

    # Google OAuth
    google_client_id: str = ""
    google_client_secret: str = ""

    google_redirect_uri: str = (
        "http://localhost:8000/gmail/callback"
    )

    gmail_frontend_url: str = "http://localhost:5173"

    # Encryption
    gmail_encryption_key: str = ""

    # Supabase elevated backend access
    supabase_secret_key: str = ""


settings = Settings()