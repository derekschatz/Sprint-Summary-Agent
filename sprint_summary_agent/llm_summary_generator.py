"""LLM-based Summary Generator for presentation slides."""

import json
from typing import Any, Dict, List, Optional

from .llm_provider import LLMProvider, create_llm_provider


class LLMSummaryGenerator:
    """Generate narrative sprint summaries for presentation slides using LLM."""

    def __init__(self, provider: str, api_key: Optional[str], model: Optional[str]):
        """Initialize with LLM provider configuration."""
        self.llm_provider = create_llm_provider(provider, api_key, model)

    def generate_slide_content(self, summary: Dict[str, Any]) -> Dict[str, Any]:
        """Generate complete slide content using configured LLM provider."""
        # Extract data from summary
        sprint_info = summary.get("sprintInfo", {})
        project_info = summary.get("projectInfo", {})
        team_info = summary.get("teamInfo", {})
        metrics = summary.get("sprintHealthMetrics", {})
        health_analysis = summary.get("sprintHealthAnalysis", {})
        blockers = summary.get("currentBlockers", [])
        accomplishments = summary.get("keyAccomplishments", [])

        if not self.llm_provider:
            return self._generate_fallback_content(metrics, health_analysis, blockers, accomplishments)

        prompt = self._build_prompt(
            sprint_info, project_info, team_info, metrics, health_analysis, blockers, accomplishments
        )

        try:
            text = self.llm_provider.generate_completion(prompt, 2048)
            return self._parse_slide_content(text)
        except Exception as e:
            print(f"Error generating LLM slide content: {e}")
            return self._generate_fallback_content(metrics, health_analysis, blockers, accomplishments)

    def _build_prompt(
        self,
        sprint_info: Dict[str, Any],
        project_info: Dict[str, Any],
        team_info: Dict[str, Any],
        metrics: Dict[str, Any],
        health_analysis: Dict[str, Any],
        blockers: List[Dict[str, Any]],
        accomplishments: List[Dict[str, Any]],
    ) -> str:
        """Build the prompt for LLM."""
        health_indicators_text = "\n".join(
            [f"- {i['indicator']}: {i['status']} - {i['message']}" for i in health_analysis['healthIndicators']]
        )

        blockers_text = "\n".join(
            [f"- [{b['priority']}] {b['key']}: {b['summary']}" for b in blockers[:3]]
        ) if blockers else "- No blockers"

        accomplishments_text = "\n".join(
            [f"- {a['key']}: {a['summary']}" for a in accomplishments[:5]]
        )

        return f"""You are an expert Agile coach creating a concise, executive-level sprint summary for a presentation slide. Generate content for a 2x2 grid layout with four sections.

**Sprint Context:**
- Team: {team_info.get('label', 'Unknown')}
- Project: {project_info.get('name', 'Unknown')}
- Sprint: {sprint_info.get('name', 'Unknown')}
- Sprint Goal: {sprint_info.get('goal', 'No goal set')}
- Duration: {metrics.get('durationDays', 0)} days

**Sprint Metrics:**
- Overall Health: {health_analysis.get('overallHealth', 'Unknown')}
- Completed Issues: {metrics.get('completedIssues', 0)}/{metrics.get('totalIssues', 0)} ({metrics.get('completionRate', 0)}%)
- Velocity: {metrics.get('velocity', 0)} points ({metrics.get('velocityPercentage', 0)}% of planned {metrics.get('totalStoryPoints', 0)})
- In Progress: {metrics.get('inProgressIssues', 0)}
- Not Started: {metrics.get('todoIssues', 0)}
- Blocked: {metrics.get('blockedIssues', 0)}

**Health Indicators:**
{health_indicators_text}

**Top Blockers:**
{blockers_text}

**Key Accomplishments:**
{accomplishments_text}

Generate content for a 2x2 slide layout in JSON format with these four sections:

1. **Sprint Health Summary** (Top Left): A concise narrative summary (3-4 bullet points, max 50 chars each) highlighting:
   - Overall sprint health with key metrics
   - Completion rate and velocity achievement
   - Any critical concerns or wins

2. **Key Accomplishments** (Top Right): Narrative highlights (3-5 bullet points, max 45 chars each):
   - Most impactful completed work
   - Focus on business value and outcomes
   - Group similar items if helpful

3. **Blockers & Risks** (Bottom Left): Current challenges (3-4 bullet points, max 45 chars each):
   - Active blockers with priority context
   - If no blockers, highlight what's keeping momentum
   - Be specific but concise

4. **Recommendations** (Bottom Right): Actionable next steps (3-4 bullet points, max 55 chars each):
   - Prioritized recommendations (High/Medium/Low)
   - Focus on what will improve next sprint
   - Be specific and actionable

Return ONLY this JSON structure:

{{
  "healthSummary": {{
    "title": "Sprint Health Metrics",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"]
  }},
  "accomplishments": {{
    "title": "Key Accomplishments",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"]
  }},
  "blockers": {{
    "title": "Blockers & Risks",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"]
  }},
  "recommendations": {{
    "title": "Recommendations",
    "bullets": ["[High] bullet 1", "[Medium] bullet 2"]
  }}
}}

Keep all bullets concise and within character limits. Use active voice. Focus on insights, not just data."""

    def _parse_slide_content(self, response: str) -> Dict[str, Any]:
        """Parse LLM response into structured slide content."""
        try:
            # Remove markdown code blocks if present
            cleaned = response.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            content = json.loads(cleaned)

            # Validate structure
            required_keys = ["healthSummary", "accomplishments", "blockers", "recommendations"]
            if not all(key in content for key in required_keys):
                raise ValueError("Invalid content structure")

            return content
        except Exception as e:
            print(f"Error parsing LLM slide content: {e}")
            print(f"Raw response: {response}")
            raise

    def _generate_fallback_content(
        self,
        metrics: Dict[str, Any],
        health_analysis: Dict[str, Any],
        blockers: List[Dict[str, Any]],
        accomplishments: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """Fallback to structured data if LLM fails."""
        health_bullets = [
            f"Health: {health_analysis.get('overallHealth', 'Unknown')}",
            f"Done: {metrics.get('completedIssues', 0)}/{metrics.get('totalIssues', 0)} ({metrics.get('completionRate', 0)}%)",
            f"Velocity: {metrics.get('velocity', 0)} issues",
            f"Blocked: {metrics.get('blockedIssues', 0)}",
        ]

        accomplishment_bullets = [
            f"{a['key']}: {a['summary'][:38]}{'...' if len(a['summary']) > 38 else ''}"
            for a in accomplishments[:4]
        ]

        blocker_bullets = (
            [f"{b['key']}: {b['summary'][:35]}..." for b in blockers[:4]]
            if blockers
            else ["No blockers - clear path ahead ✓"]
        )

        recommendation_bullets = []
        if metrics.get("velocityPercentage", 0) < 80:
            recommendation_bullets.append("[High] Review sprint capacity")
        else:
            recommendation_bullets.append("[Low] Maintain velocity")

        if metrics.get("blockedIssues", 0) > 0:
            recommendation_bullets.append(f"[High] Clear {metrics['blockedIssues']} blockers")
        else:
            recommendation_bullets.append("[Low] Keep momentum")

        if metrics.get("todoIssues", 0) > 0:
            recommendation_bullets.append(f"[Medium] Review {metrics['todoIssues']} unstarted")
        else:
            recommendation_bullets.append("[Low] Good planning")

        return {
            "healthSummary": {
                "title": "Sprint Health Metrics",
                "bullets": health_bullets[:4],
            },
            "accomplishments": {
                "title": "What We Delivered",
                "bullets": accomplishment_bullets or ["No completed items"],
            },
            "blockers": {
                "title": "What's Blocking Us",
                "bullets": blocker_bullets,
            },
            "recommendations": {
                "title": "Next Sprint Focus",
                "bullets": recommendation_bullets[:4],
            },
        }
