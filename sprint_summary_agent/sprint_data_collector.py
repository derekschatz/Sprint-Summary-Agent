"""Sprint Data Collector - Gathers and organizes sprint-related data from Jira."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from .jira_client import JiraClient


class SprintDataCollector:
    """Gathers and organizes all sprint-related data from Jira."""

    def __init__(self, jira_client: JiraClient):
        """Initialize with Jira client."""
        self.jira_client = jira_client

    def collect_sprint_data_for_team(
        self, project_keys: List[str], team_label: str
    ) -> Dict[str, Any]:
        """Collect sprint data for a specific team across projects."""
        print(f"Fetching sprint data for team {team_label} across projects: {', '.join(project_keys)}...")

        # Get the last closed sprint for this team across all projects
        result = self.jira_client.get_last_closed_sprint_for_team(project_keys, team_label)
        sprint = result["sprint"]
        board_id = result["boardId"]
        board_name = result["boardName"]
        project_key = result["projectKey"]

        print(f"Found closed sprint: {sprint['name']} ({project_key} - {board_name})")

        # Get all issues in the sprint (filtered by team label)
        issues = self.jira_client.get_sprint_issues(sprint["id"], team_label)
        print(f"Found {len(issues)} issues in sprint for team {team_label}")

        # Get team members
        team_members = self.jira_client.get_sprint_team_members(issues)
        print(f"Found {len(team_members)} team members")

        # Get project info
        project = self.jira_client.get_project(project_key)

        return {
            "sprint": sprint,
            "boardId": board_id,
            "boardName": board_name,
            "issues": issues,
            "teamMembers": team_members,
            "project": project,
            "projectKey": project_key,
            "teamLabel": team_label,
        }

    def collect_sprint_data(
        self, project_key: str, team_label: Optional[str] = None
    ) -> Dict[str, Any]:
        """Collect sprint data for a specific project and team."""
        team_info = f" for team {team_label}" if team_label else ""
        print(f"Fetching sprint data from project {project_key}{team_info}...")

        # Get the last closed sprint
        result = self.jira_client.get_last_closed_sprint(project_key, team_label)
        sprint = result["sprint"]
        board_id = result["boardId"]

        print(f"Found closed sprint: {sprint['name']}")

        # Get all issues in the sprint
        issues = self.jira_client.get_sprint_issues(sprint["id"], team_label)
        print(f"Found {len(issues)} issues in sprint{team_info}")

        # Get team members
        team_members = self.jira_client.get_sprint_team_members(issues)
        print(f"Found {len(team_members)} team members")

        # Get project info
        project = self.jira_client.get_project(project_key)

        return {
            "sprint": sprint,
            "boardId": board_id,
            "issues": issues,
            "teamMembers": team_members,
            "project": project,
            "projectKey": project_key,
            "teamLabel": team_label,
        }

    def collect_all_sprint_data(
        self, project_keys: List[str], team_labels: List[str]
    ) -> List[Dict[str, Any]]:
        """Collect sprint data for multiple teams across multiple projects."""
        all_sprint_data = []

        # If no team labels specified, just get the latest sprint for each project
        if not team_labels:
            print("No team labels provided - fetching latest sprint for each project without team filtering")

            for project_key in project_keys:
                try:
                    sprint_data = self.collect_sprint_data(project_key, None)
                    if sprint_data["issues"]:
                        all_sprint_data.append(sprint_data)
                    else:
                        print(f"No issues found in latest sprint for project {project_key}, skipping...")
                except Exception as e:
                    print(f"Warning: Could not collect data for project {project_key}: {e}")

            return all_sprint_data

        # Process each team - find their sprint across all projects
        for team_label in team_labels:
            try:
                sprint_data = self.collect_sprint_data_for_team(project_keys, team_label)
                if sprint_data["issues"]:
                    all_sprint_data.append(sprint_data)
                else:
                    print(f"No issues found for team {team_label}, skipping...")
            except Exception as e:
                print(f"Warning: Could not collect data for team {team_label}: {e}")

        return all_sprint_data

    def calculate_metrics(self, sprint_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate sprint metrics."""
        issues = sprint_data["issues"]
        sprint = sprint_data["sprint"]

        # Status categorization
        status_groups = {
            "completed": [],
            "inProgress": [],
            "todo": [],
            "blocked": [],
        }

        # Story points and issue type tracking
        total_story_points = 0
        completed_story_points = 0
        issue_types = {}
        priorities = {}

        for issue in issues:
            fields = issue.get("fields", {})
            status = fields.get("status", {}).get("statusCategory", {}).get("name", "").lower()

            # Try multiple common story points field IDs
            story_points = fields.get("customfield_20826") or fields.get("customfield_10016") or 0

            issue_type = fields.get("issuetype", {}).get("name", "Unknown")
            priority = fields.get("priority", {}).get("name") if fields.get("priority") else "None"

            # Track by status
            if status == "done":
                status_groups["completed"].append(issue)
                completed_story_points += story_points
            elif status in ("in progress", "indeterminate"):
                status_groups["inProgress"].append(issue)
            else:
                status_groups["todo"].append(issue)

            # Check for blockers
            labels = fields.get("labels", [])
            status_name = fields.get("status", {}).get("name", "").lower()
            if "blocked" in labels or "block" in status_name:
                status_groups["blocked"].append(issue)

            total_story_points += story_points

            # Track issue types
            issue_types[issue_type] = issue_types.get(issue_type, 0) + 1

            # Track priorities
            priorities[priority] = priorities.get(priority, 0) + 1

        # Calculate dates and duration
        start_date = datetime.fromisoformat(sprint["startDate"].replace("Z", "+00:00"))
        end_date = datetime.fromisoformat(sprint["endDate"].replace("Z", "+00:00"))
        duration_days = (end_date - start_date).days

        # Calculate velocity based on issues (not story points)
        velocity = len(status_groups["completed"])
        velocity_percentage = (
            (len(status_groups["completed"]) / len(issues) * 100) if issues else 0
        )

        # Calculate completion rate
        completion_rate = (len(status_groups["completed"]) / len(issues) * 100) if issues else 0

        return {
            "totalIssues": len(issues),
            "completedIssues": len(status_groups["completed"]),
            "inProgressIssues": len(status_groups["inProgress"]),
            "todoIssues": len(status_groups["todo"]),
            "blockedIssues": len(status_groups["blocked"]),
            "totalStoryPoints": total_story_points,
            "completedStoryPoints": completed_story_points,
            "velocity": velocity,
            "velocityPercentage": round(velocity_percentage, 1),
            "completionRate": round(completion_rate, 1),
            "durationDays": duration_days,
            "startDate": sprint["startDate"],
            "endDate": sprint["endDate"],
            "issueTypes": issue_types,
            "priorities": priorities,
            "statusGroups": status_groups,
        }

    def analyze_sprint_health(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze sprint health."""
        health_indicators = []
        overall_health = "Good"

        # Velocity check
        velocity_pct = metrics["velocityPercentage"]
        if velocity_pct < 60:
            health_indicators.append({
                "indicator": "Velocity",
                "status": "Poor",
                "message": f"Only {velocity_pct}% of story points completed",
            })
            overall_health = "Poor"
        elif velocity_pct < 80:
            health_indicators.append({
                "indicator": "Velocity",
                "status": "Fair",
                "message": f"{velocity_pct}% of story points completed",
            })
            if overall_health == "Good":
                overall_health = "Fair"
        else:
            health_indicators.append({
                "indicator": "Velocity",
                "status": "Good",
                "message": f"{velocity_pct}% of story points completed",
            })

        # Completion rate check
        completion_rate = metrics["completionRate"]
        if completion_rate < 60:
            health_indicators.append({
                "indicator": "Completion Rate",
                "status": "Poor",
                "message": f"Only {completion_rate}% of issues completed",
            })
            overall_health = "Poor"
        elif completion_rate < 80:
            health_indicators.append({
                "indicator": "Completion Rate",
                "status": "Fair",
                "message": f"{completion_rate}% of issues completed",
            })
            if overall_health == "Good":
                overall_health = "Fair"
        else:
            health_indicators.append({
                "indicator": "Completion Rate",
                "status": "Good",
                "message": f"{completion_rate}% of issues completed",
            })

        # Blocked issues check
        if metrics["blockedIssues"] > 0:
            health_indicators.append({
                "indicator": "Blockers",
                "status": "Warning",
                "message": f"{metrics['blockedIssues']} blocked issue(s) detected",
            })
            if overall_health == "Good":
                overall_health = "Fair"

        # In-progress issues check
        if metrics["inProgressIssues"] > metrics["completedIssues"]:
            health_indicators.append({
                "indicator": "Work in Progress",
                "status": "Warning",
                "message": "More issues in progress than completed",
            })

        return {
            "overallHealth": overall_health,
            "healthIndicators": health_indicators,
        }

    def extract_accomplishments(
        self, metrics: Dict[str, Any], issues: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract key accomplishments."""
        completed_issues = metrics["statusGroups"]["completed"]

        # Sort by priority
        priority_order = {"Highest": 0, "High": 1, "Medium": 2, "Low": 3, "Lowest": 4}

        sorted_completed = sorted(
            completed_issues,
            key=lambda x: priority_order.get(
                x.get("fields", {}).get("priority", {}).get("name"), 5
            ),
        )[:10]

        accomplishments = []
        for issue in sorted_completed:
            fields = issue.get("fields", {})
            accomplishments.append({
                "key": issue.get("key"),
                "summary": fields.get("summary", ""),
                "type": fields.get("issuetype", {}).get("name", "Unknown"),
                "priority": fields.get("priority", {}).get("name") if fields.get("priority") else "None",
                "assignee": fields.get("assignee", {}).get("displayName", "Unassigned") if fields.get("assignee") else "Unassigned",
                "storyPoints": fields.get("customfield_10016") or fields.get("customfield_20826") or 0,
            })

        return accomplishments

    def extract_blockers(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Extract current blockers."""
        blockers = []
        for issue in metrics["statusGroups"]["blocked"]:
            fields = issue.get("fields", {})
            blockers.append({
                "key": issue.get("key"),
                "summary": fields.get("summary", ""),
                "type": fields.get("issuetype", {}).get("name", "Unknown"),
                "priority": fields.get("priority", {}).get("name") if fields.get("priority") else "None",
                "assignee": fields.get("assignee", {}).get("displayName", "Unassigned") if fields.get("assignee") else "Unassigned",
                "status": fields.get("status", {}).get("name", "Unknown"),
            })

        return blockers
