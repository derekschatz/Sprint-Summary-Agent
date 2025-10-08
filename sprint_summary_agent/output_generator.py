"""Output Generator - Generates JSON and Markdown formatted sprint summaries."""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional


class OutputGenerator:
    """Generates JSON and Markdown formatted sprint summaries."""

    def generate_summary(
        self,
        sprint_data: Dict[str, Any],
        metrics: Dict[str, Any],
        health_analysis: Dict[str, Any],
        accomplishments: List[Dict[str, Any]],
        blockers: List[Dict[str, Any]],
        recommendations: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """Generate comprehensive sprint summary."""
        sprint = sprint_data["sprint"]
        team_members = sprint_data["teamMembers"]
        project = sprint_data["project"]
        team_label = sprint_data.get("teamLabel")

        return {
            "sprintInfo": {
                "name": sprint["name"],
                "id": sprint["id"],
                "state": sprint.get("state", "unknown"),
                "startDate": sprint["startDate"],
                "endDate": sprint["endDate"],
                "goal": sprint.get("goal", "No goal set"),
            },
            "projectInfo": {
                "key": project["key"],
                "name": project["name"],
            },
            "teamInfo": {
                "label": team_label or "All Teams",
            },
            "sprintHealthMetrics": {
                "overallHealth": health_analysis["overallHealth"],
                "totalIssues": metrics["totalIssues"],
                "completedIssues": metrics["completedIssues"],
                "inProgressIssues": metrics["inProgressIssues"],
                "todoIssues": metrics["todoIssues"],
                "blockedIssues": metrics["blockedIssues"],
                "completionRate": f"{metrics['completionRate']}%",
                "velocity": metrics["velocity"],
                "totalStoryPoints": metrics["totalStoryPoints"],
                "completedStoryPoints": metrics["completedStoryPoints"],
                "velocityPercentage": f"{metrics['velocityPercentage']}%",
                "sprintDurationDays": metrics["durationDays"],
            },
            "sprintHealthAnalysis": {
                "overallHealth": health_analysis["overallHealth"],
                "healthIndicators": health_analysis["healthIndicators"],
            },
            "whatTheTeamWorkedOn": {
                "issuesByType": metrics["issueTypes"],
                "issuesByPriority": metrics["priorities"],
                "completedWork": len(accomplishments),
                "inProgressWork": metrics["inProgressIssues"],
            },
            "currentBlockers": blockers,
            "keyAccomplishments": accomplishments,
            "nextSprintPriorities": self.generate_next_sprint_priorities(metrics, blockers),
            "teamComposition": {
                "totalMembers": len(team_members),
                "members": [
                    {
                        "displayName": member["displayName"],
                        "email": member["emailAddress"],
                    }
                    for member in team_members
                ],
            },
            "sprintStatus": {
                "status": sprint.get("state", "unknown"),
                "completionSummary": f"{metrics['completedIssues']} of {metrics['totalIssues']} issues completed ({metrics['completionRate']}%)",
                "velocitySummary": f"{metrics['completedStoryPoints']} of {metrics['totalStoryPoints']} story points completed ({metrics['velocityPercentage']}%)",
            },
            "recommendations": recommendations,
            "generatedAt": datetime.utcnow().isoformat() + "Z",
        }

    def generate_next_sprint_priorities(
        self, metrics: Dict[str, Any], blockers: List[Dict[str, Any]]
    ) -> List[Dict[str, str]]:
        """Generate next sprint priorities based on current sprint data."""
        priorities = []

        # Carry over incomplete work
        if metrics.get("inProgressIssues", 0) > 0:
            priorities.append({
                "priority": "High",
                "item": f"Complete {metrics['inProgressIssues']} in-progress issue(s) from previous sprint",
            })

        # Address blockers
        if blockers:
            priorities.append({
                "priority": "High",
                "item": f"Resolve {len(blockers)} blocked issue(s)",
            })

        # Address unstarted work
        if metrics.get("todoIssues", 0) > 0:
            priorities.append({
                "priority": "Medium",
                "item": f"Review and re-prioritize {metrics['todoIssues']} unstarted issue(s)",
            })

        # General planning
        priorities.append({
            "priority": "Medium",
            "item": "Conduct sprint planning with updated velocity metrics",
        })

        priorities.append({
            "priority": "Low",
            "item": "Schedule retrospective to discuss improvements",
        })

        return priorities

    def generate_filename(self, summary: Dict[str, Any], extension: str) -> str:
        """Generate filename based on project and team."""
        project_key = summary["projectInfo"]["key"]
        team_label = summary["teamInfo"]["label"]
        sanitized_team = "".join(c if c.isalnum() else "_" for c in team_label)
        return f"sprint-summary-{project_key}-{sanitized_team}.{extension}"

    def save_json(
        self, summary: Dict[str, Any], output_dir: str = "./output", filename: Optional[str] = None
    ) -> str:
        """Save JSON output."""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        file_name = filename or self.generate_filename(summary, "json")
        file_path = output_path / file_name

        with open(file_path, "w") as f:
            json.dump(summary, f, indent=2)

        print(f"JSON summary saved to: {file_path}")
        return str(file_path)

    def save_markdown(
        self, summary: Dict[str, Any], output_dir: str = "./output", filename: Optional[str] = None
    ) -> str:
        """Generate and save Markdown output."""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        markdown = self.generate_markdown(summary)
        file_name = filename or self.generate_filename(summary, "md")
        file_path = output_path / file_name

        with open(file_path, "w") as f:
            f.write(markdown)

        print(f"Markdown summary saved to: {file_path}")
        return str(file_path)

    def generate_combined_summary(self, all_summaries: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Generate combined summary from multiple team summaries."""
        if not all_summaries:
            return None

        # Aggregate metrics across all teams
        combined_metrics = {
            "totalIssues": 0,
            "completedIssues": 0,
            "inProgressIssues": 0,
            "todoIssues": 0,
            "blockedIssues": 0,
            "totalStoryPoints": 0,
            "completedStoryPoints": 0,
            "totalTeamMembers": 0,
        }

        all_blockers = []
        all_accomplishments = []
        projects_map = {}
        teams_set = set()

        for summary in all_summaries:
            # Aggregate metrics
            metrics = summary["sprintHealthMetrics"]
            combined_metrics["totalIssues"] += metrics["totalIssues"]
            combined_metrics["completedIssues"] += metrics["completedIssues"]
            combined_metrics["inProgressIssues"] += metrics["inProgressIssues"]
            combined_metrics["todoIssues"] += metrics["todoIssues"]
            combined_metrics["blockedIssues"] += metrics["blockedIssues"]
            combined_metrics["totalStoryPoints"] += metrics["totalStoryPoints"]
            combined_metrics["completedStoryPoints"] += metrics["completedStoryPoints"]
            combined_metrics["totalTeamMembers"] += summary["teamComposition"]["totalMembers"]

            # Collect blockers
            for blocker in summary["currentBlockers"]:
                all_blockers.append({
                    **blocker,
                    "team": summary["teamInfo"]["label"],
                    "project": summary["projectInfo"]["key"],
                })

            # Collect accomplishments
            for accomplishment in summary["keyAccomplishments"]:
                all_accomplishments.append({
                    **accomplishment,
                    "team": summary["teamInfo"]["label"],
                    "project": summary["projectInfo"]["key"],
                })

            # Track projects and teams
            projects_map[summary["projectInfo"]["key"]] = summary["projectInfo"]["name"]
            teams_set.add(summary["teamInfo"]["label"])

        # Calculate combined percentages
        completion_rate = (
            round((combined_metrics["completedIssues"] / combined_metrics["totalIssues"]) * 100, 1)
            if combined_metrics["totalIssues"] > 0
            else 0
        )
        velocity_percentage = (
            round((combined_metrics["completedStoryPoints"] / combined_metrics["totalStoryPoints"]) * 100, 1)
            if combined_metrics["totalStoryPoints"] > 0
            else 0
        )

        # Sort accomplishments by story points
        all_accomplishments.sort(key=lambda x: x.get("storyPoints", 0), reverse=True)

        return {
            "title": "Combined Sprint Summary - All Teams",
            "projects": [{"key": k, "name": v} for k, v in projects_map.items()],
            "teams": sorted(teams_set),
            "sprintHealthMetrics": {
                **combined_metrics,
                "completionRate": f"{completion_rate}%",
                "velocityPercentage": f"{velocity_percentage}%",
                "velocity": combined_metrics["completedStoryPoints"],
            },
            "currentBlockers": all_blockers[:20],  # Top 20 blockers
            "keyAccomplishments": all_accomplishments[:20],  # Top 20 accomplishments
            "teamSummaries": [
                {
                    "team": s["teamInfo"]["label"],
                    "project": s["projectInfo"]["key"],
                    "health": s["sprintHealthAnalysis"]["overallHealth"],
                    "completionRate": s["sprintHealthMetrics"]["completionRate"],
                    "velocity": s["sprintHealthMetrics"]["velocity"],
                }
                for s in all_summaries
            ],
            "generatedAt": datetime.utcnow().isoformat() + "Z",
        }

    def save_combined_summary(
        self, combined_summary: Optional[Dict[str, Any]], output_dir: str = "./output"
    ) -> Optional[Dict[str, str]]:
        """Save combined summary."""
        if not combined_summary:
            return None

        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Save JSON
        json_path = output_path / "sprint-summary-combined.json"
        with open(json_path, "w") as f:
            json.dump(combined_summary, f, indent=2)
        print(f"Combined JSON summary saved to: {json_path}")

        # Generate and save Markdown
        markdown = self.generate_combined_markdown(combined_summary)
        md_path = output_path / "sprint-summary-combined.md"
        with open(md_path, "w") as f:
            f.write(markdown)
        print(f"Combined Markdown summary saved to: {md_path}")

        return {"jsonPath": str(json_path), "mdPath": str(md_path)}

    def generate_markdown(self, summary: Dict[str, Any]) -> str:
        """Generate Markdown formatted summary."""
        sprint_info = summary["sprintInfo"]
        project_info = summary["projectInfo"]
        team_info = summary["teamInfo"]
        metrics = summary["sprintHealthMetrics"]
        health = summary["sprintHealthAnalysis"]
        worked_on = summary["whatTheTeamWorkedOn"]
        blockers = summary["currentBlockers"]
        accomplishments = summary["keyAccomplishments"]
        priorities = summary["nextSprintPriorities"]
        team_comp = summary["teamComposition"]
        status = summary["sprintStatus"]
        recommendations = summary["recommendations"]

        start_date = datetime.fromisoformat(sprint_info["startDate"].replace("Z", "+00:00"))
        end_date = datetime.fromisoformat(sprint_info["endDate"].replace("Z", "+00:00"))
        generated = datetime.fromisoformat(summary["generatedAt"].replace("Z", "+00:00"))

        markdown = f"""# Sprint Summary: {sprint_info['name']}

**Project:** {project_info['name']} ({project_info['key']})
**Team:** {team_info['label']}
**Sprint Duration:** {start_date.strftime('%Y-%m-%d')} - {end_date.strftime('%Y-%m-%d')} ({metrics['sprintDurationDays']} days)
**Sprint Goal:** {sprint_info['goal']}
**Generated:** {generated.strftime('%Y-%m-%d %H:%M:%S')}

---

## 📊 Sprint Health Metrics

| Metric | Value |
|--------|-------|
| **Overall Health** | **{metrics['overallHealth']}** |
| Total Issues | {metrics['totalIssues']} |
| Completed Issues | {metrics['completedIssues']} |
| In Progress | {metrics['inProgressIssues']} |
| Not Started | {metrics['todoIssues']} |
| Blocked | {metrics['blockedIssues']} |
| **Completion Rate** | **{metrics['completionRate']}** |
| **Velocity (Issues)** | **{metrics['velocity']} completed** |
| Total Story Points | {metrics['totalStoryPoints']} |
| Completed Story Points | {metrics['completedStoryPoints']} |
| Story Points Completion | {metrics['velocityPercentage']} |

---

## 🏥 Sprint Health Analysis

**Overall Status:** {health['overallHealth']}

"""
        for indicator in health["healthIndicators"]:
            markdown += f"- **{indicator['indicator']}:** {indicator['status']} - {indicator['message']}\n"

        markdown += """
---

## 💼 What the Team Worked On

### Issues by Type
"""
        for issue_type, count in worked_on["issuesByType"].items():
            markdown += f"- {issue_type}: {count}\n"

        markdown += "\n### Issues by Priority\n"
        for priority, count in worked_on["issuesByPriority"].items():
            markdown += f"- {priority}: {count}\n"

        markdown += f"""
### Work Distribution
- ✅ Completed: {worked_on['completedWork']} issues
- 🔄 In Progress: {worked_on['inProgressWork']} issues

---

## 🚧 Current Blockers

"""
        if blockers:
            for blocker in blockers:
                markdown += f"""### {blocker['key']}: {blocker['summary']}
- **Type:** {blocker['type']}
- **Priority:** {blocker['priority']}
- **Assignee:** {blocker['assignee']}
- **Status:** {blocker['status']}

"""
        else:
            markdown += "*No blockers identified*\n"

        markdown += """---

## 🎯 Key Accomplishments

"""
        for i, accomplishment in enumerate(accomplishments[:10], 1):
            markdown += f"""{i}. **{accomplishment['key']}:** {accomplishment['summary']}
   - Type: {accomplishment['type']}
   - Priority: {accomplishment['priority']}
   - Assignee: {accomplishment['assignee']}
   - Story Points: {accomplishment['storyPoints']}

"""

        markdown += """---

## 📋 Next Sprint Priorities

"""
        for i, priority in enumerate(priorities, 1):
            markdown += f"{i}. **[{priority['priority']}]** {priority['item']}\n"

        markdown += f"""
---

## 👥 Team Composition

**Total Team Members:** {team_comp['totalMembers']}

"""
        for member in team_comp["members"]:
            markdown += f"- {member['displayName']} ({member['email']})\n"

        markdown += f"""
---

## 📈 Sprint Status

**Status:** {status['status']}

- {status['completionSummary']}
- {status['velocitySummary']}

---

## 💡 Recommendations

"""
        for i, rec in enumerate(recommendations, 1):
            markdown += f"""{i}. **[{rec['priority']}] {rec['category']}**
   {rec['recommendation']}

"""

        markdown += """---

*Report generated by Sprint Summary Agent*
"""
        return markdown

    def generate_combined_markdown(self, combined: Dict[str, Any]) -> str:
        """Generate combined Markdown."""
        generated = datetime.fromisoformat(combined["generatedAt"].replace("Z", "+00:00"))

        markdown = f"""# {combined['title']}

**Generated:** {generated.strftime('%Y-%m-%d %H:%M:%S')}

---

## 📊 Overall Metrics Across All Teams

| Metric | Value |
|--------|-------|
| **Projects** | {len(combined['projects'])} ({', '.join(p['key'] for p in combined['projects'])}) |
| **Teams** | {len(combined['teams'])} ({', '.join(combined['teams'])}) |
| **Total Issues** | {combined['sprintHealthMetrics']['totalIssues']} |
| **Completed Issues** | {combined['sprintHealthMetrics']['completedIssues']} |
| **Completion Rate** | {combined['sprintHealthMetrics']['completionRate']} |
| **Velocity (Issues)** | {combined['sprintHealthMetrics']['velocity']} completed |
| **Total Story Points** | {combined['sprintHealthMetrics']['totalStoryPoints']} |
| **Completed Story Points** | {combined['sprintHealthMetrics']['completedStoryPoints']} |
| **Story Points Completion** | {combined['sprintHealthMetrics']['velocityPercentage']} |
| **Blocked Issues** | {combined['sprintHealthMetrics']['blockedIssues']} |
| **Total Team Members** | {combined['sprintHealthMetrics']['totalTeamMembers']} |

---

## 👥 Team Summary

"""
        for team in combined["teamSummaries"]:
            markdown += f"- **{team['team']}** ({team['project']}): {team['health']} - Completion: {team['completionRate']}, Velocity: {team['velocity']}\n"

        markdown += """
---

## 🚧 All Blockers (Top 20)

"""
        if combined["currentBlockers"]:
            for blocker in combined["currentBlockers"]:
                markdown += f"""### {blocker['key']}: {blocker['summary']}
- **Team:** {blocker['team']} ({blocker['project']})
- **Type:** {blocker['type']}
- **Priority:** {blocker['priority']}
- **Assignee:** {blocker['assignee']}
- **Status:** {blocker['status']}

"""
        else:
            markdown += "*No blockers identified*\n"

        markdown += """---

## 🎯 Top Accomplishments (Top 20)

"""
        for i, accomplishment in enumerate(combined["keyAccomplishments"], 1):
            markdown += f"""{i}. **{accomplishment['key']}:** {accomplishment['summary']}
   - Team: {accomplishment['team']} ({accomplishment['project']})
   - Type: {accomplishment['type']}
   - Priority: {accomplishment['priority']}
   - Assignee: {accomplishment['assignee']}
   - Story Points: {accomplishment['storyPoints']}

"""

        markdown += """---

*Combined report generated by Sprint Summary Agent*
"""
        return markdown
