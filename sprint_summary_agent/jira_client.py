"""Jira API v3 Client for interacting with Jira REST API."""

import base64
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests


class JiraClient:
    """Handles all interactions with Jira REST API v3."""

    def __init__(self, config: dict):
        """Initialize Jira client with configuration.

        Args:
            config: Dictionary with 'host', 'email', and 'api_token' keys
        """
        self.host = config["host"]
        self.email = config["email"]
        self.api_token = config["api_token"]
        self.base_url = f"https://{self.host}/rest/api/3"
        self.agile_url = f"https://{self.host}/rest/agile/1.0"

    def _get_auth_header(self) -> str:
        """Generate Basic Auth header."""
        credentials = f"{self.email}:{self.api_token}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return f"Basic {encoded}"

    def request(self, url: str, method: str = "GET", **kwargs) -> Dict[str, Any]:
        """Make authenticated request to Jira API.

        Args:
            url: Full URL to request
            method: HTTP method
            **kwargs: Additional arguments for requests

        Returns:
            JSON response data

        Raises:
            Exception: If request fails
        """
        headers = {
            "Authorization": self._get_auth_header(),
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        headers.update(kwargs.pop("headers", {}))

        response = requests.request(method, url, headers=headers, **kwargs)

        if not response.ok:
            raise Exception(f"Jira API Error ({response.status_code}): {response.text}")

        return response.json()

    def get_boards(self, project_key: str) -> List[Dict[str, Any]]:
        """Get all boards for a project."""
        url = f"{self.agile_url}/board?projectKeyOrId={project_key}"
        data = self.request(url)
        return data.get("values", [])

    def get_all_boards_for_projects(self, project_keys: List[str]) -> List[Dict[str, Any]]:
        """Get all boards for multiple projects."""
        all_boards = []
        for project_key in project_keys:
            try:
                boards = self.get_boards(project_key)
                for board in boards:
                    board["projectKey"] = project_key
                    all_boards.append(board)
            except Exception as e:
                print(f"Warning: Could not fetch boards for project {project_key}: {e}")
        return all_boards

    def get_sprints(self, board_id: int) -> List[Dict[str, Any]]:
        """Get all sprints for a board."""
        url = f"{self.agile_url}/board/{board_id}/sprint"
        data = self.request(url)
        return data.get("values", [])

    def get_last_closed_sprint_for_team(
        self, project_keys: List[str], team_label: str
    ) -> Dict[str, Any]:
        """Get the most recently closed sprint for a team across all projects.

        Args:
            project_keys: List of project keys to search
            team_label: Team name to search for in sprint names

        Returns:
            Dictionary with sprint, boardId, boardName, and projectKey

        Raises:
            Exception: If no sprints found
        """
        all_boards = self.get_all_boards_for_projects(project_keys)

        if not all_boards:
            raise Exception(f"No boards found for projects: {', '.join(project_keys)}")

        all_matching_sprints = []

        # Search all boards for sprints with the team name
        for board in all_boards:
            try:
                sprints = self.get_sprints(board["id"])

                # Filter for closed sprints with team name in sprint name
                team_sprints = [
                    sprint
                    for sprint in sprints
                    if sprint.get("state") == "closed"
                    and team_label.lower() in sprint.get("name", "").lower()
                ]

                # Add board and project info to each sprint
                for sprint in team_sprints:
                    all_matching_sprints.append(
                        {
                            "sprint": sprint,
                            "boardId": board["id"],
                            "boardName": board["name"],
                            "projectKey": board["projectKey"],
                        }
                    )
            except Exception as e:
                print(f"Warning: Could not fetch sprints for board {board['name']}: {e}")

        if not all_matching_sprints:
            raise Exception(
                f'No closed sprints found with team name "{team_label}" '
                f"across projects: {', '.join(project_keys)}"
            )

        # Sort by end date to get most recent
        all_matching_sprints.sort(
            key=lambda x: datetime.fromisoformat(x["sprint"]["endDate"].replace("Z", "+00:00")),
            reverse=True,
        )

        most_recent = all_matching_sprints[0]
        return {
            "sprint": most_recent["sprint"],
            "boardId": most_recent["boardId"],
            "boardName": most_recent["boardName"],
            "projectKey": most_recent["projectKey"],
        }

    def get_last_closed_sprint(
        self, project_key: str, team_label: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get the most recently closed sprint for a project.

        Args:
            project_key: Project key
            team_label: Optional team label to filter by

        Returns:
            Dictionary with sprint, boardId, and projectKey

        Raises:
            Exception: If no sprints found
        """
        boards = self.get_boards(project_key)
        if not boards:
            raise Exception(f"No boards found for project {project_key}")

        # Use the first board
        board_id = boards[0]["id"]
        sprints = self.get_sprints(board_id)

        # Filter for closed sprints
        closed_sprints = [sprint for sprint in sprints if sprint.get("state") == "closed"]

        # If team label provided, try to find sprints matching the team name
        if team_label:
            team_specific_sprints = [
                sprint
                for sprint in closed_sprints
                if team_label.lower() in sprint.get("name", "").lower()
            ]

            # If we found team-specific sprints, use those
            if team_specific_sprints:
                closed_sprints = team_specific_sprints

        # Sort by end date to get most recent
        closed_sprints.sort(
            key=lambda x: datetime.fromisoformat(x["endDate"].replace("Z", "+00:00")),
            reverse=True,
        )

        if not closed_sprints:
            raise Exception(f"No closed sprints found for project {project_key}")

        return {"sprint": closed_sprints[0], "boardId": board_id, "projectKey": project_key}

    def get_sprint_issues(self, sprint_id: int, team_label: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all issues in a sprint.

        Args:
            sprint_id: Sprint ID
            team_label: Optional team label to filter by

        Returns:
            List of issues
        """
        url = f"{self.agile_url}/sprint/{sprint_id}/issue?maxResults=1000"
        data = self.request(url)
        issues = data.get("issues", [])

        # Filter by team label if specified
        if team_label:
            issues = [
                issue
                for issue in issues
                if issue.get("fields", {}).get("labels")
                and team_label in issue["fields"]["labels"]
            ]

        return issues

    def get_team_labels_from_sprint(self, sprint_id: int) -> List[str]:
        """Get unique team labels from sprint issues."""
        url = f"{self.agile_url}/sprint/{sprint_id}/issue?maxResults=1000"
        data = self.request(url)
        labels_set = set()

        for issue in data.get("issues", []):
            issue_labels = issue.get("fields", {}).get("labels", [])
            labels_set.update(issue_labels)

        return sorted(labels_set)

    def get_sprint_team_members(self, issues: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Get users assigned to issues in the sprint."""
        unique_users = {}

        for issue in issues:
            assignee = issue.get("fields", {}).get("assignee")
            if assignee:
                account_id = assignee.get("accountId")
                if account_id and account_id not in unique_users:
                    unique_users[account_id] = {
                        "accountId": account_id,
                        "displayName": assignee.get("displayName", "Unknown"),
                        "emailAddress": assignee.get("emailAddress", "N/A"),
                        "avatarUrl": assignee.get("avatarUrls", {}).get("48x48", ""),
                    }

        return list(unique_users.values())

    def get_project(self, project_key: str) -> Dict[str, Any]:
        """Get project details."""
        url = f"{self.base_url}/project/{project_key}"
        return self.request(url)

    def search_issues(
        self, jql: str, fields: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Search for issues with JQL."""
        if fields is None:
            fields = ["summary", "status", "assignee"]

        url = f"{self.base_url}/search"
        body = {"jql": jql, "fields": fields, "maxResults": 1000}

        return self.request(url, method="POST", json=body)
