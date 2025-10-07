# Sprint Summary Agent

An intelligent agent that gathers data from Jira (using v3 API) and generates comprehensive sprint summaries for multiple projects and teams with AI-powered insights.

## Features

- **Multi-Project Support**: Analyze sprints across multiple Jira projects
- **Team-Based Filtering**: Generate reports for specific teams using labels
- **Auto-Discovery**: Automatically discovers all team labels in a sprint
- **AI-Powered Insights**: Uses LLM (via OpenRouter) to generate contextual recommendations and slide content
- **PowerPoint Generation**: Creates professional presentation slides with 2x2 layout for each team
- **Individual Team Reports**: Creates separate reports for each team
- **Combined Summary**: Aggregates metrics across all teams
- Fetches data from the most recently closed sprint per project
- Generates detailed sprint analysis including:
  - Sprint Health Metrics
  - Sprint Health Analysis
  - Team Work Summary
  - Current Blockers
  - Key Accomplishments
  - Next Sprint Priorities
  - Team Composition
  - Sprint Status
  - AI-Generated Recommendations
- Outputs in JSON, Markdown, and PowerPoint formats

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure Jira credentials:
```bash
cp .env.example .env
```

3. Edit `.env` with your Jira details:
   - `JIRA_HOST`: Your Atlassian domain (e.g., your-domain.atlassian.net)
   - `JIRA_EMAIL`: Your Jira account email
   - `JIRA_API_TOKEN`: Generate from https://id.atlassian.com/manage-profile/security/api-tokens
   - `JIRA_PROJECT_KEYS`: Comma-separated project keys (e.g., PROJ1,PROJ2,PROJ3)
   - `TEAM_LABELS`: Comma-separated team labels (leave empty to auto-discover)
   - `GENERATE_COMBINED_SUMMARY`: Set to `true` to generate combined report
   - `LLM_PROVIDER`: Set to `openrouter` for AI-powered insights
   - `LLM_API_KEY`: Your OpenRouter API key from https://openrouter.ai/keys
   - `LLM_MODEL`: AI model to use (default: `anthropic/claude-3.5-sonnet`)

## Usage

### Analyze Multiple Projects and Teams

```bash
npm start
```

The agent will:
1. Fetch the most recently closed sprint from each project
2. Discover or use configured team labels
3. Generate individual reports for each team
4. Use AI to generate contextual recommendations
5. Generate a combined summary (if enabled)
6. Create a PowerPoint presentation with slides for each team

### Example Configuration

```env
# Jira Configuration
JIRA_PROJECT_KEYS=PROJ1,PROJ2,PROJ3
TEAM_LABELS=TeamAlpha,TeamBeta,TeamGamma
GENERATE_COMBINED_SUMMARY=true

# AI Configuration (Optional - for enhanced insights)
LLM_PROVIDER=openrouter
LLM_API_KEY=sk-or-v1-your-api-key-here
LLM_MODEL=anthropic/claude-3.5-sonnet
```

## Output Files

For each team, the agent generates:
- `output/sprint-summary-{PROJECT}-{TEAM}.json` - Team-specific JSON report
- `output/sprint-summary-{PROJECT}-{TEAM}.md` - Team-specific Markdown report

If combined summary is enabled:
- `output/sprint-summary-combined.json` - Aggregated JSON report
- `output/sprint-summary-combined.md` - Aggregated Markdown report

PowerPoint presentation:
- `output/sprint-summary-presentation.pptx` - Professional slides with overview and team summaries

## How It Works

1. **Project Discovery**: Connects to each configured project
2. **Sprint Detection**: Finds the most recently closed sprint
3. **Team Filtering**: Filters issues by team labels (or discovers all teams)
4. **Data Collection**: Gathers sprint metrics, issues, and team data
5. **AI Analysis**: Uses LLM to generate contextual recommendations based on sprint data
6. **Report Generation**: Creates individual and combined reports in JSON and Markdown
7. **Presentation Creation**: Generates PowerPoint slides with AI-generated insights in 2x2 layout

## Development

```bash
npm run dev
```
