/**
 * LLM Provider Abstraction Layer
 * Supports multiple LLM providers (OpenAI, Anthropic, OpenRouter, etc.)
 */

/**
 * Base LLM Provider class
 */
class LLMProvider {
  constructor(apiKey, model, baseUrl) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  /**
   * Generate completion - must be implemented by subclasses
   */
  async generateCompletion(prompt, maxTokens = 2048) {
    throw new Error('generateCompletion must be implemented by subclass');
  }

  /**
   * Build request headers - can be overridden by subclasses
   */
  buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Build request body - can be overridden by subclasses
   */
  buildRequestBody(prompt, maxTokens) {
    return {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
    };
  }

  /**
   * Extract text from response - can be overridden by subclasses
   */
  extractResponseText(data) {
    return data.choices[0].message.content;
  }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider extends LLMProvider {
  constructor(apiKey, model = 'gpt-4o') {
    super(apiKey, model, 'https://api.openai.com/v1');
  }

  async generateCompletion(prompt, maxTokens = 2048) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildRequestBody(prompt, maxTokens)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return this.extractResponseText(data);
  }
}

/**
 * Anthropic Provider
 */
class AnthropicProvider extends LLMProvider {
  constructor(apiKey, model = 'claude-3-5-sonnet-20241022') {
    super(apiKey, model, 'https://api.anthropic.com/v1');
  }

  buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  buildRequestBody(prompt, maxTokens) {
    return {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: maxTokens,
    };
  }

  extractResponseText(data) {
    return data.content[0].text;
  }

  async generateCompletion(prompt, maxTokens = 2048) {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildRequestBody(prompt, maxTokens)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return this.extractResponseText(data);
  }
}

/**
 * OpenRouter Provider
 */
class OpenRouterProvider extends LLMProvider {
  constructor(apiKey, model = 'anthropic/claude-3.5-sonnet') {
    super(apiKey, model, 'https://openrouter.ai/api/v1');
  }

  buildHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://github.com/yourusername/sprint-summary-agent',
      'X-Title': 'Sprint Summary Agent',
    };
  }

  async generateCompletion(prompt, maxTokens = 2048) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(this.buildRequestBody(prompt, maxTokens)),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return this.extractResponseText(data);
  }
}

/**
 * Factory function to create LLM provider based on config
 */
export function createLLMProvider(providerName, apiKey, model) {
  const provider = (providerName || 'openrouter').toLowerCase();

  switch (provider) {
    case 'openai':
      return new OpenAIProvider(apiKey, model || 'gpt-4o');

    case 'anthropic':
      return new AnthropicProvider(apiKey, model || 'claude-3-5-sonnet-20241022');

    case 'openrouter':
      return new OpenRouterProvider(apiKey, model || 'anthropic/claude-3.5-sonnet');

    default:
      throw new Error(
        `Unsupported LLM provider: ${provider}. ` +
        `Supported providers: openai, anthropic, openrouter`
      );
  }
}

/**
 * Get recommended models for each provider
 */
export function getRecommendedModels() {
  return {
    openai: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
    anthropic: [
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
    openrouter: [
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4o',
      'google/gemini-pro-1.5',
      'meta-llama/llama-3.1-70b-instruct',
    ],
  };
}
