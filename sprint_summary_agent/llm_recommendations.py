"""LLM-based Recommendations Generator."""

import json
from typing import Any, Dict, List, Optional

from .llm_provider import LLMProvider, create_llm_provider


class LLMRecommendationsGenerator:
    """Generate context-aware sprint recommendations using LLM."""

    def __init__(self, provider: str, api_key: Optional[str], model: Optional[str]):
        """Initialize with LLM provider configuration."""
        self.llm_provider = create_llm_provider(provider, api_key, model)

    def generate_recommendations(
        self,
        metrics: Dict[str, Any],
        health_analysis: Dict[str, Any],
        sprint_info: Dict[str, Any],
        project_info: Dict[str, Any],
        team_info: Dict[str, Any],
        blockers: List[Dict[str, Any]],
        accomplishments: List[Dict[str, Any]],
    ) -> List[Dict[str, str]]:
        """Generate recommendations using configured LLM provider."""
        if not self.llm_provider:
            return self._generate_fallback_recommendations(metrics)

        prompt = self._build_prompt(
            metrics, health_analysis, sprint_info, project_info, team_info, blockers, accomplishments
        )

        try:
            text = self.llm_provider.generate_completion(prompt, 1024)
            return self._parse_recommendations(text)
        except Exception as e:
            print(f"Error generating LLM recommendations: {e}")
            return self._generate_fallback_recommendations(metrics)

    def _build_prompt(
        self,
        metrics: Dict[str, Any],
        health_analysis: Dict[str, Any],
        sprint_info: Dict[str, Any],
        project_info: Dict[str, Any],
        team_info: Dict[str, Any],
        blockers: List[Dict[str, Any]],
        accomplishments: List[Dict[str, Any]],
    ) -> str:
        """Build the prompt for LLM."""
        blockers_text = "\n".join(
            [f"- {b['key']}: {b['summary']} (Priority: {b['priority']})" for b in blockers[:3]]
        ) if blockers else "- No blockers"

        accomplishments_text = "\n".join(
            [f"- {a['key']}: {a['summary']}" for a in accomplishments[:5]]
        )

        health_indicators_text = "\n".join(
            [f"- {i['indicator']}: {i['status']} - {i['message']}" for i in health_analysis['healthIndicators']]
        )

        return f"""You are an expert Agile coach analyzing a sprint retrospective. Generate 3-5 actionable recommendations based on the following sprint data.

**Sprint Information:**
- Team: {team_info.get('label', 'Unknown')}
- Project: {project_info.get('name', 'Unknown')}
- Sprint: {sprint_info.get('name', 'Unknown')}
- Sprint Goal: {sprint_info.get('goal', 'No goal set')}
- Duration: {metrics.get('durationDays', 0)} days

**Sprint Metrics:**
- Total Issues: {metrics.get('totalIssues', 0)}
- Completed Issues: {metrics.get('completedIssues', 0)} ({metrics.get('completionRate', 0)}%)
- In Progress: {metrics.get('inProgressIssues', 0)}
- Not Started: {metrics.get('todoIssues', 0)}
- Blocked: {metrics.get('blockedIssues', 0)}
- Total Story Points: {metrics.get('totalStoryPoints', 0)}
- Completed Story Points: {metrics.get('completedStoryPoints', 0)} ({metrics.get('velocityPercentage', 0)}%)
- Velocity: {metrics.get('velocity', 0)}

**Sprint Health:**
- Overall Health: {health_analysis.get('overallHealth', 'Unknown')}
{health_indicators_text}

**Current Blockers:**
{blockers_text}

**Key Accomplishments:**
{accomplishments_text}

Generate 3-5 recommendations in the following JSON format. Prioritize recommendations based on impact (High/Medium/Low). Focus on actionable insights specific to this team's performance:

[
  {{
    "category": "Category name (e.g., Velocity, Blockers, WIP Limit, Sprint Planning, Team Health, etc.)",
    "priority": "High|Medium|Low",
    "recommendation": "Specific, actionable recommendation"
  }}
]

Only return the JSON array, no additional text."""

    def _parse_recommendations(self, response: str) -> List[Dict[str, str]]:
        """Parse LLM response into structured recommendations."""
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

            recommendations = json.loads(cleaned)

            # Validate structure
            if not isinstance(recommendations, list):
                raise ValueError("Response is not an array")

            # Ensure each recommendation has required fields
            return [
                {
                    "category": rec.get("category", "General"),
                    "priority": rec.get("priority", "Medium"),
                    "recommendation": rec.get("recommendation", ""),
                }
                for rec in recommendations
            ]
        except Exception as e:
            print(f"Error parsing LLM recommendations: {e}")
            print(f"Raw response: {response}")
            raise

    def _generate_fallback_recommendations(self, metrics: Dict[str, Any]) -> List[Dict[str, str]]:
        """Fallback to rule-based recommendations if LLM fails."""
        recommendations = []

        if metrics.get("velocityPercentage", 0) < 80:
            recommendations.append({
                "category": "Velocity",
                "priority": "High",
                "recommendation": "Consider reducing sprint commitment or identifying impediments affecting team velocity",
            })

        if metrics.get("blockedIssues", 0) > 0:
            recommendations.append({
                "category": "Blockers",
                "priority": "High",
                "recommendation": f"Address {metrics['blockedIssues']} blocked issue(s) immediately to prevent future sprint delays",
            })

        if metrics.get("inProgressIssues", 0) > metrics.get("completedIssues", 0):
            recommendations.append({
                "category": "WIP Limit",
                "priority": "Medium",
                "recommendation": "Too much work in progress. Consider implementing WIP limits to improve flow",
            })

        if metrics.get("todoIssues", 0) > 0:
            recommendations.append({
                "category": "Sprint Planning",
                "priority": "Medium",
                "recommendation": f"{metrics['todoIssues']} issue(s) not started. Review sprint planning and capacity",
            })

        if not recommendations:
            recommendations.append({
                "category": "General",
                "priority": "Low",
                "recommendation": "Sprint executed well. Continue current practices and look for incremental improvements",
            })

        return recommendations
