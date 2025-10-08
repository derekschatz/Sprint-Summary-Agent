"""LLM Provider Abstraction Layer supporting multiple providers."""

from abc import ABC, abstractmethod
from typing import Optional

import httpx
from anthropic import Anthropic
from openai import OpenAI


class LLMProvider(ABC):
    """Base LLM Provider class."""

    def __init__(self, api_key: str, model: str):
        """Initialize provider with API key and model."""
        self.api_key = api_key
        self.model = model

    @abstractmethod
    def generate_completion(self, prompt: str, max_tokens: int = 2048) -> str:
        """Generate completion - must be implemented by subclasses."""
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI Provider."""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        """Initialize OpenAI provider."""
        super().__init__(api_key, model)
        self.client = OpenAI(api_key=api_key)

    def generate_completion(self, prompt: str, max_tokens: int = 2048) -> str:
        """Generate completion using OpenAI API."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content


class AnthropicProvider(LLMProvider):
    """Anthropic Provider."""

    def __init__(self, api_key: str, model: str = "claude-3-5-sonnet-20241022"):
        """Initialize Anthropic provider."""
        super().__init__(api_key, model)
        self.client = Anthropic(api_key=api_key)

    def generate_completion(self, prompt: str, max_tokens: int = 2048) -> str:
        """Generate completion using Anthropic API."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return response.content[0].text


class OpenRouterProvider(LLMProvider):
    """OpenRouter Provider."""

    def __init__(self, api_key: str, model: str = "anthropic/claude-3.5-sonnet"):
        """Initialize OpenRouter provider."""
        super().__init__(api_key, model)
        self.base_url = "https://openrouter.ai/api/v1"

    def generate_completion(self, prompt: str, max_tokens: int = 2048) -> str:
        """Generate completion using OpenRouter API."""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://github.com/yourusername/sprint-summary-agent",
            "X-Title": "Sprint Summary Agent",
        }

        data = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
        }

        with httpx.Client() as client:
            response = client.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=data,
                timeout=60.0,
            )
            response.raise_for_status()
            result = response.json()
            return result["choices"][0]["message"]["content"]


def create_llm_provider(
    provider_name: str, api_key: Optional[str], model: Optional[str]
) -> Optional[LLMProvider]:
    """Factory function to create LLM provider based on config.

    Args:
        provider_name: Name of provider (openai, anthropic, openrouter)
        api_key: API key for the provider
        model: Model name to use

    Returns:
        LLMProvider instance or None if no API key provided

    Raises:
        ValueError: If provider is not supported
    """
    if not api_key:
        return None

    provider = provider_name.lower()

    if provider == "openai":
        return OpenAIProvider(api_key, model or "gpt-4o")
    elif provider == "anthropic":
        return AnthropicProvider(api_key, model or "claude-3-5-sonnet-20241022")
    elif provider == "openrouter":
        return OpenRouterProvider(api_key, model or "anthropic/claude-3.5-sonnet")
    else:
        raise ValueError(
            f"Unsupported LLM provider: {provider}. "
            f"Supported providers: openai, anthropic, openrouter"
        )


def get_recommended_models() -> dict:
    """Get recommended models for each provider."""
    return {
        "openai": [
            "gpt-4o",
            "gpt-4o-mini",
            "gpt-4-turbo",
            "gpt-3.5-turbo",
        ],
        "anthropic": [
            "claude-3-5-sonnet-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
        ],
        "openrouter": [
            "anthropic/claude-3.5-sonnet",
            "openai/gpt-4o",
            "google/gemini-pro-1.5",
            "meta-llama/llama-3.1-70b-instruct",
        ],
    }
