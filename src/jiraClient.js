/**
 * Jira API v3 Client
 * Handles all interactions with Jira REST API v3
 */

export class JiraClient {
  constructor(config) {
    this.host = config.host;
    this.email = config.email;
    this.apiToken = config.apiToken;
    this.baseUrl = `https://${this.host}/rest/api/3`;
    this.agileUrl = `https://${this.host}/rest/agile/1.0`;
  }

  /**
   * Make authenticated request to Jira API
   */
  async request(url, options = {}) {
    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get all boards for a project
   */
  async getBoards(projectKey) {
    const url = `${this.agileUrl}/board?projectKeyOrId=${projectKey}`;
    const data = await this.request(url);
    return data.values;
  }

  /**
   * Get all boards for multiple projects
   */
  async getAllBoardsForProjects(projectKeys) {
    const allBoards = [];
    for (const projectKey of projectKeys) {
      try {
        const boards = await this.getBoards(projectKey);
        allBoards.push(...boards.map(board => ({ ...board, projectKey })));
      } catch (error) {
        console.warn(`Warning: Could not fetch boards for project ${projectKey}: ${error.message}`);
      }
    }
    return allBoards;
  }

  /**
   * Get all sprints for a board
   */
  async getSprints(boardId) {
    const url = `${this.agileUrl}/board/${boardId}/sprint`;
    const data = await this.request(url);
    return data.values;
  }

  /**
   * Get the most recently closed sprint for a team across all projects
   * Searches all boards in all projects for sprints with the team name
   */
  async getLastClosedSprintForTeam(projectKeys, teamLabel) {
    const allBoards = await this.getAllBoardsForProjects(projectKeys);

    if (allBoards.length === 0) {
      throw new Error(`No boards found for projects: ${projectKeys.join(', ')}`);
    }

    let allMatchingSprints = [];

    // Search all boards for sprints with the team name
    for (const board of allBoards) {
      try {
        const sprints = await this.getSprints(board.id);

        // Filter for closed sprints with team name in sprint name
        const teamSprints = sprints.filter(sprint =>
          sprint.state === 'closed' &&
          sprint.name.toLowerCase().includes(teamLabel.toLowerCase())
        );

        // Add board and project info to each sprint
        teamSprints.forEach(sprint => {
          allMatchingSprints.push({
            sprint,
            boardId: board.id,
            boardName: board.name,
            projectKey: board.projectKey
          });
        });
      } catch (error) {
        console.warn(`Warning: Could not fetch sprints for board ${board.name}: ${error.message}`);
      }
    }

    if (allMatchingSprints.length === 0) {
      throw new Error(`No closed sprints found with team name "${teamLabel}" across projects: ${projectKeys.join(', ')}`);
    }

    // Sort by end date to get most recent
    allMatchingSprints.sort((a, b) =>
      new Date(b.sprint.endDate) - new Date(a.sprint.endDate)
    );

    const mostRecent = allMatchingSprints[0];
    return {
      sprint: mostRecent.sprint,
      boardId: mostRecent.boardId,
      boardName: mostRecent.boardName,
      projectKey: mostRecent.projectKey
    };
  }

  /**
   * Get the most recently closed sprint for a project, optionally filtered by team name
   */
  async getLastClosedSprint(projectKey, teamLabel = null) {
    const boards = await this.getBoards(projectKey);
    if (boards.length === 0) {
      throw new Error(`No boards found for project ${projectKey}`);
    }

    // Use the first board (or you can add logic to select specific board)
    const boardId = boards[0].id;
    const sprints = await this.getSprints(boardId);

    // Filter for closed sprints
    let closedSprints = sprints.filter(sprint => sprint.state === 'closed');

    // If team label provided, try to find sprints matching the team name
    if (teamLabel) {
      const teamSpecificSprints = closedSprints.filter(sprint =>
        sprint.name.toLowerCase().includes(teamLabel.toLowerCase())
      );

      // If we found team-specific sprints, use those; otherwise fall back to all sprints
      if (teamSpecificSprints.length > 0) {
        closedSprints = teamSpecificSprints;
      }
    }

    // Sort by end date to get most recent
    closedSprints.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));

    if (closedSprints.length === 0) {
      throw new Error(`No closed sprints found for project ${projectKey}`);
    }

    return { sprint: closedSprints[0], boardId, projectKey };
  }

  /**
   * Get the most recently closed sprints for multiple projects
   */
  async getLastClosedSprintsForProjects(projectKeys) {
    const sprints = [];
    for (const projectKey of projectKeys) {
      try {
        const sprintData = await this.getLastClosedSprint(projectKey);
        sprints.push(sprintData);
      } catch (error) {
        console.warn(`Warning: ${error.message}`);
      }
    }
    return sprints;
  }

  /**
   * Get all issues in a sprint
   */
  async getSprintIssues(sprintId, teamLabel = null) {
    const url = `${this.agileUrl}/sprint/${sprintId}/issue?maxResults=1000`;
    const data = await this.request(url);
    let issues = data.issues;

    // Filter by team label if specified
    if (teamLabel) {
      issues = issues.filter(issue =>
        issue.fields.labels && issue.fields.labels.includes(teamLabel)
      );
    }

    return issues;
  }

  /**
   * Get unique team labels from sprint issues
   */
  async getTeamLabelsFromSprint(sprintId) {
    const url = `${this.agileUrl}/sprint/${sprintId}/issue?maxResults=1000`;
    const data = await this.request(url);
    const labelsSet = new Set();

    data.issues.forEach(issue => {
      if (issue.fields.labels) {
        issue.fields.labels.forEach(label => labelsSet.add(label));
      }
    });

    return Array.from(labelsSet);
  }

  /**
   * Get detailed issue information including changelog
   */
  async getIssueDetails(issueKey) {
    const url = `${this.baseUrl}/issue/${issueKey}?expand=changelog`;
    return this.request(url);
  }

  /**
   * Get users assigned to issues in the sprint
   */
  async getSprintTeamMembers(issues) {
    const uniqueUsers = new Map();

    for (const issue of issues) {
      if (issue.fields.assignee) {
        const user = issue.fields.assignee;
        if (!uniqueUsers.has(user.accountId)) {
          uniqueUsers.set(user.accountId, {
            accountId: user.accountId,
            displayName: user.displayName,
            emailAddress: user.emailAddress || 'N/A',
            avatarUrl: user.avatarUrls?.['48x48'] || '',
          });
        }
      }
    }

    return Array.from(uniqueUsers.values());
  }

  /**
   * Get project details
   */
  async getProject(projectKey) {
    const url = `${this.baseUrl}/project/${projectKey}`;
    return this.request(url);
  }

  /**
   * Search for issues with JQL
   */
  async searchIssues(jql, fields = ['summary', 'status', 'assignee']) {
    const url = `${this.baseUrl}/search`;
    const body = {
      jql,
      fields,
      maxResults: 1000,
    };

    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
}
