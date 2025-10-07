# OpenRouter Setup Guide

This Sprint Summary Agent uses [OpenRouter](https://openrouter.ai/) to access multiple LLM providers through a single API. OpenRouter provides access to Claude, GPT-4, and many other models.

## Why OpenRouter?

- **Multiple Models**: Access to Claude, GPT-4, Gemini, and 100+ other models
- **Single API**: One API key for all providers
- **Cost-Effective**: Pay-as-you-go pricing, often cheaper than direct API access
- **Flexible**: Switch models without code changes
- **No Separate Accounts**: No need for separate Anthropic, OpenAI, etc. accounts

## Setup Instructions

### 1. Create an OpenRouter Account

1. Go to [OpenRouter.ai](https://openrouter.ai/)
2. Sign up for a free account
3. Add credits to your account (starts at $5)

### 2. Get Your API Key

1. Navigate to [Keys](https://openrouter.ai/keys)
2. Create a new API key
3. Copy the key (starts with `sk-or-v1-...`)

### 3. Configure the Agent

Add your OpenRouter API key to the `.env` file:

```bash
# LLM API Configuration (using OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-your-actual-key-here
LLM_MODEL=anthropic/claude-3.5-sonnet
```

## Available Models

You can change the `LLM_MODEL` in `.env` to use different models:

### Recommended Models:

- `anthropic/claude-3.5-sonnet` (Default - Best for analysis)
- `anthropic/claude-3-opus` (Most capable, higher cost)
- `openai/gpt-4-turbo` (Fast and capable)
- `openai/gpt-4o` (Latest GPT-4 optimized)
- `google/gemini-pro-1.5` (Good balance)

### Budget-Friendly Options:

- `anthropic/claude-3-haiku` (Fast and cheap)
- `openai/gpt-3.5-turbo` (Very affordable)
- `meta-llama/llama-3.1-70b-instruct` (Free tier available)

### See All Models:

Visit [OpenRouter Models](https://openrouter.ai/models) for the complete list with pricing.

## Pricing

Typical costs for sprint summary generation (per team):
- Claude 3.5 Sonnet: ~$0.05-0.10 per team
- GPT-4 Turbo: ~$0.03-0.08 per team
- Claude Haiku: ~$0.01-0.02 per team

For 4 teams with full AI generation:
- **Total cost per run: $0.20-0.40** (using Claude 3.5 Sonnet)

## Features Powered by LLM

1. **Sprint Recommendations** (JSON/Markdown reports)
   - Context-aware, prioritized recommendations
   - Specific to each team's performance

2. **PowerPoint Slide Content** (All 4 quadrants)
   - Sprint Health Summary (narrative metrics)
   - Key Accomplishments (business value focus)
   - Blockers & Risks (contextualized challenges)
   - Recommendations (actionable insights)

## Fallback Behavior

If the OpenRouter API is unavailable or the API key is missing:
- **Recommendations**: Falls back to rule-based logic
- **Slide Content**: Falls back to structured data presentation
- The agent will continue to work, just without AI-enhanced content

## Testing Your Setup

Run the agent to test your OpenRouter configuration:

```bash
npm start
```

You should see:
```
🤖 Generating AI recommendations...
🤖 Generating AI slide content for lyra...
```

If you see warnings about missing API key, check your `.env` file.

## Troubleshooting

### Error: "OpenRouter API error: 401"
- Your API key is invalid or missing
- Check that `OPENROUTER_API_KEY` is set correctly in `.env`

### Error: "OpenRouter API error: 402"
- Insufficient credits in your OpenRouter account
- Add more credits at [OpenRouter Billing](https://openrouter.ai/credits)

### Error: "OpenRouter API error: 429"
- Rate limit exceeded
- Wait a moment and try again, or upgrade your account

### Content Falls Back to Structured Data
- Check that your API key is valid
- Ensure you have sufficient credits
- Check the console for specific error messages

## Advanced Configuration

### Using Different Models for Different Tasks

You can modify the code to use different models for recommendations vs. slide content:

```javascript
// In index.js
const llmRecommendations = new LLMRecommendationsGenerator(
  config.openRouterApiKey,
  'anthropic/claude-3-haiku' // Cheaper for recommendations
);

const pptGenerator = new PowerPointGenerator(
  config.openRouterApiKey,
  'anthropic/claude-3.5-sonnet' // Better for narrative content
);
```

### Rate Limiting

OpenRouter has generous rate limits, but for large organizations with many teams, consider:
- Processing teams sequentially (already implemented)
- Adding delays between API calls if needed
- Using the free tier models for testing

## Support

- OpenRouter Docs: https://openrouter.ai/docs
- OpenRouter Discord: https://discord.gg/openrouter
- This Project Issues: Create an issue on GitHub
