# Python Quick Start Guide

## Installation

1. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Jira and LLM credentials
```

## Running the Application

```bash
# Run the Python version
python -m sprint_summary_agent.main

# Or if installed
pip install -e .
sprint-summary
```

## What Changed from JavaScript

### ✅ Improvements

1. **Type Safety** - Full Python type hints
2. **Pydantic Settings** - Robust configuration management
3. **Native LLM SDKs** - Official OpenAI/Anthropic clients
4. **Better Error Handling** - Proper exception handling
5. **Python Best Practices** - PEP 8 compliant code

### 📁 New Structure

```
sprint_summary_agent/
├── __init__.py              # Package init
├── main.py                  # Entry point (was index.js)
├── settings.py              # Config (was config.js)
├── jira_client.py           # Jira API (was jiraClient.js)
├── llm_provider.py          # LLM abstraction (was llmProvider.js)
├── sprint_data_collector.py # Data collection (was sprintDataCollector.js)
├── llm_recommendations.py   # AI recommendations (was llmRecommendations.js)
├── llm_summary_generator.py # AI summaries (was llmSummaryGenerator.js)
├── output_generator.py      # Output generation (was outputGenerator.js)
└── powerpoint_generator.py  # PowerPoint (was powerpointGenerator.js)
```

### 🔧 Configuration

Same `.env` file works for both versions. No changes needed!

### 🚀 Example Usage

**Generate reports for multiple teams:**
```bash
# Set in .env:
# JIRA_PROJECT_KEYS=PROJ1,PROJ2
# TEAM_LABELS=TeamA,TeamB,TeamC

python -m sprint_summary_agent.main
```

**Generate reports for entire projects (no team filtering):**
```bash
# Set in .env:
# JIRA_PROJECT_KEYS=PROJ1,PROJ2
# TEAM_LABELS=

python -m sprint_summary_agent.main
```

## Testing the Conversion

Both versions should produce identical output:

**Python:**
```bash
python -m sprint_summary_agent.main
```

**JavaScript (for comparison):**
```bash
npm start
```

## Troubleshooting

**Import errors?**
```bash
# Make sure you're in the virtual environment
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Pydantic errors?**
```bash
# Check your .env file has all required fields
cat .env.example
```

**LLM errors?**
```bash
# Verify your API keys are set
echo $LLM_API_KEY  # or check .env
```

## Next Steps

1. Test with your Jira instance
2. Review generated outputs in `output/` directory
3. Customize LLM prompts if needed (in `llm_*.py` files)
4. Add custom metrics or analysis in `sprint_data_collector.py`

## Support

Both Python and JavaScript versions are fully functional. Use whichever you prefer!
