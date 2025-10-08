"""Configuration management using pydantic-settings."""

from pathlib import Path
from typing import List, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Jira Configuration
    jira_host: str = Field(..., description="Jira Atlassian domain")
    jira_email: str = Field(..., description="Jira account email")
    jira_api_token: str = Field(..., description="Jira API token")
    jira_project_keys: str = Field(..., description="Comma-separated project keys")

    # Team Configuration
    team_labels: str = Field(default="", description="Comma-separated team labels")

    # Output Configuration
    generate_combined_summary: bool = Field(default=True, description="Generate combined summary")
    output_dir: str = Field(default="./output", description="Output directory path")

    # LLM Configuration
    llm_provider: str = Field(default="openrouter", description="LLM provider (openai, anthropic, openrouter)")
    llm_api_key: Optional[str] = Field(default=None, description="LLM API key")
    llm_model: Optional[str] = Field(default=None, description="LLM model name")

    @field_validator("jira_host")
    @classmethod
    def validate_jira_host(cls, v: str) -> str:
        """Validate Jira host format."""
        if v and ".atlassian.net" not in v:
            print(f"Warning: JIRA_HOST should be in format: your-domain.atlassian.net")
        return v

    @field_validator("llm_provider")
    @classmethod
    def validate_llm_provider(cls, v: str) -> str:
        """Validate LLM provider is supported."""
        supported = ["openai", "anthropic", "openrouter"]
        if v and v.lower() not in supported:
            print(f"Warning: Unsupported LLM_PROVIDER: {v}. Supported: {', '.join(supported)}")
        return v.lower() if v else v

    def get_project_keys(self) -> List[str]:
        """Get list of project keys."""
        return [k.strip() for k in self.jira_project_keys.split(",") if k.strip()]

    def get_team_labels(self) -> List[str]:
        """Get list of team labels."""
        if not self.team_labels:
            return []
        return [t.strip() for t in self.team_labels.split(",") if t.strip()]

    def get_jira_config(self) -> dict:
        """Get Jira client configuration."""
        return {
            "host": self.jira_host,
            "email": self.jira_email,
            "api_token": self.jira_api_token,
        }

    def get_llm_config(self) -> dict:
        """Get LLM configuration."""
        return {
            "provider": self.llm_provider,
            "api_key": self.llm_api_key,
            "model": self.llm_model,
        }


def load_settings() -> Settings:
    """Load and validate settings."""
    try:
        settings = Settings()

        # Warn if LLM API key is missing
        if not settings.llm_api_key:
            print("Warning: LLM_API_KEY not set. Using rule-based recommendations instead of AI-generated.")

        return settings
    except Exception as e:
        error_msg = f"Failed to load settings: {e}"
        if "jira_host" in str(e).lower() or "jira_email" in str(e).lower() or "jira_api_token" in str(e).lower():
            error_msg += "\nMake sure to set JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN in your .env file"
        raise ValueError(error_msg) from e
