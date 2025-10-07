/**
 * Sprint Data Collector
 * Gathers and organizes all sprint-related data from Jira
 */

export class SprintDataCollector {
  constructor(jiraClient) {
    this.jiraClient = jiraClient;
  }

  /**
   * Collect sprint data for a specific team across projects
   */
  async collectSprintDataForTeam(projectKeys, teamLabel) {
    console.log(`Fetching sprint data for team ${teamLabel} across projects: ${projectKeys.join(', ')}...`);

    // Get the last closed sprint for this team across all projects
    const { sprint, boardId, boardName, projectKey } = await this.jiraClient.getLastClosedSprintForTeam(projectKeys, teamLabel);
    console.log(`Found closed sprint: ${sprint.name} (${projectKey} - ${boardName})`);

    // Get all issues in the sprint (filtered by team label if specified)
    const issues = await this.jiraClient.getSprintIssues(sprint.id, teamLabel);
    console.log(`Found ${issues.length} issues in sprint for team ${teamLabel}`);

    // Get team members
    const teamMembers = await this.jiraClient.getSprintTeamMembers(issues);
    console.log(`Found ${teamMembers.length} team members`);

    // Get project info
    const project = await this.jiraClient.getProject(projectKey);

    return {
      sprint,
      boardId,
      boardName,
      issues,
      teamMembers,
      project,
      projectKey,
      teamLabel,
    };
  }

  /**
   * Collect sprint data for a specific project and team
   */
  async collectSprintData(projectKey, teamLabel = null) {
    const teamInfo = teamLabel ? ` for team ${teamLabel}` : '';
    console.log(`Fetching sprint data from project ${projectKey}${teamInfo}...`);

    // Get the last closed sprint (filtered by team name if provided)
    const { sprint, boardId } = await this.jiraClient.getLastClosedSprint(projectKey, teamLabel);
    console.log(`Found closed sprint: ${sprint.name}`);

    // Get all issues in the sprint (filtered by team label if specified)
    const issues = await this.jiraClient.getSprintIssues(sprint.id, teamLabel);
    console.log(`Found ${issues.length} issues in sprint${teamInfo}`);

    // Get team members
    const teamMembers = await this.jiraClient.getSprintTeamMembers(issues);
    console.log(`Found ${teamMembers.length} team members`);

    // Get project info
    const project = await this.jiraClient.getProject(projectKey);

    return {
      sprint,
      boardId,
      issues,
      teamMembers,
      project,
      projectKey,
      teamLabel,
    };
  }

  /**
   * Collect sprint data for multiple teams across multiple projects
   */
  async collectAllSprintData(projectKeys, teamLabels) {
    const allSprintData = [];

    // If no team labels specified, discover them from all sprints
    let teamsToProcess = teamLabels;
    if (!teamLabels || teamLabels.length === 0) {
      const discoveredLabels = new Set();
      for (const projectKey of projectKeys) {
        try {
          const boards = await this.jiraClient.getBoards(projectKey);
          for (const board of boards) {
            try {
              const sprints = await this.jiraClient.getSprints(board.id);
              const closedSprints = sprints.filter(s => s.state === 'closed');
              if (closedSprints.length > 0) {
                const labels = await this.jiraClient.getTeamLabelsFromSprint(closedSprints[0].id);
                labels.forEach(label => discoveredLabels.add(label));
              }
            } catch (error) {
              console.warn(`Warning: Could not fetch sprints for board ${board.name}`);
            }
          }
        } catch (error) {
          console.warn(`Warning: Could not process project ${projectKey}`);
        }
      }
      teamsToProcess = Array.from(discoveredLabels);
      console.log(`Discovered ${teamsToProcess.length} team labels across all projects: ${teamsToProcess.join(', ')}`);
    }

    // Process each team - find their sprint across all projects
    for (const teamLabel of teamsToProcess) {
      try {
        const sprintData = await this.collectSprintDataForTeam(projectKeys, teamLabel);
        if (sprintData.issues.length > 0) {
          allSprintData.push(sprintData);
        } else {
          console.log(`No issues found for team ${teamLabel}, skipping...`);
        }
      } catch (error) {
        console.warn(`Warning: Could not collect data for team ${teamLabel}: ${error.message}`);
      }
    }

    return allSprintData;
  }

  /**
   * Calculate sprint metrics
   */
  calculateMetrics(sprintData) {
    const { issues, sprint } = sprintData;

    // Status categorization
    const statusGroups = {
      completed: [],
      inProgress: [],
      todo: [],
      blocked: [],
    };

    // Story points and issue type tracking
    let totalStoryPoints = 0;
    let completedStoryPoints = 0;
    const issueTypes = {};
    const priorities = {};

    issues.forEach(issue => {
      const status = issue.fields.status.statusCategory.name.toLowerCase();
      // Try multiple common story points field IDs
      const storyPoints = issue.fields.customfield_20826 || issue.fields.customfield_10016 || 0;
      const issueType = issue.fields.issuetype.name;
      const priority = issue.fields.priority?.name || 'None';

      // Track by status
      if (status === 'done') {
        statusGroups.completed.push(issue);
        completedStoryPoints += storyPoints;
      } else if (status === 'in progress' || status === 'indeterminate') {
        statusGroups.inProgress.push(issue);
      } else {
        statusGroups.todo.push(issue);
      }

      // Check for blockers
      if (issue.fields.labels?.includes('blocked') ||
          issue.fields.status.name.toLowerCase().includes('block')) {
        statusGroups.blocked.push(issue);
      }

      totalStoryPoints += storyPoints;

      // Track issue types
      issueTypes[issueType] = (issueTypes[issueType] || 0) + 1;

      // Track priorities
      priorities[priority] = (priorities[priority] || 0) + 1;
    });

    // Calculate dates and duration
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const durationDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // Calculate velocity based on issues (not story points)
    const velocity = statusGroups.completed.length;
    const velocityPercentage = issues.length > 0
      ? ((statusGroups.completed.length / issues.length) * 100).toFixed(1)
      : 0;

    // Calculate completion rate
    const completionRate = issues.length > 0
      ? ((statusGroups.completed.length / issues.length) * 100).toFixed(1)
      : 0;

    return {
      totalIssues: issues.length,
      completedIssues: statusGroups.completed.length,
      inProgressIssues: statusGroups.inProgress.length,
      todoIssues: statusGroups.todo.length,
      issuesByType: issueTypes,
      blockedIssues: statusGroups.blocked.length,
      totalStoryPoints,
      completedStoryPoints,
      velocity,
      velocityPercentage: parseFloat(velocityPercentage),
      completionRate: parseFloat(completionRate),
      durationDays,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      issueTypes,
      priorities,
      statusGroups,
    };
  }

  /**
   * Analyze sprint health
   */
  analyzeSprintHealth(metrics) {
    const healthIndicators = [];
    let overallHealth = 'Good';

    // Velocity check
    if (metrics.velocityPercentage < 60) {
      healthIndicators.push({
        indicator: 'Velocity',
        status: 'Poor',
        message: `Only ${metrics.velocityPercentage}% of story points completed`,
      });
      overallHealth = 'Poor';
    } else if (metrics.velocityPercentage < 80) {
      healthIndicators.push({
        indicator: 'Velocity',
        status: 'Fair',
        message: `${metrics.velocityPercentage}% of story points completed`,
      });
      if (overallHealth === 'Good') overallHealth = 'Fair';
    } else {
      healthIndicators.push({
        indicator: 'Velocity',
        status: 'Good',
        message: `${metrics.velocityPercentage}% of story points completed`,
      });
    }

    // Completion rate check
    if (metrics.completionRate < 60) {
      healthIndicators.push({
        indicator: 'Completion Rate',
        status: 'Poor',
        message: `Only ${metrics.completionRate}% of issues completed`,
      });
      overallHealth = 'Poor';
    } else if (metrics.completionRate < 80) {
      healthIndicators.push({
        indicator: 'Completion Rate',
        status: 'Fair',
        message: `${metrics.completionRate}% of issues completed`,
      });
      if (overallHealth === 'Good') overallHealth = 'Fair';
    } else {
      healthIndicators.push({
        indicator: 'Completion Rate',
        status: 'Good',
        message: `${metrics.completionRate}% of issues completed`,
      });
    }

    // Blocked issues check
    if (metrics.blockedIssues > 0) {
      healthIndicators.push({
        indicator: 'Blockers',
        status: 'Warning',
        message: `${metrics.blockedIssues} blocked issue(s) detected`,
      });
      if (overallHealth === 'Good') overallHealth = 'Fair';
    }

    // In-progress issues check
    if (metrics.inProgressIssues > metrics.completedIssues) {
      healthIndicators.push({
        indicator: 'Work in Progress',
        status: 'Warning',
        message: 'More issues in progress than completed',
      });
    }

    return {
      overallHealth,
      healthIndicators,
    };
  }

  /**
   * Extract key accomplishments
   */
  extractAccomplishments(metrics, issues) {
    const completedIssues = metrics.statusGroups.completed;

    // Sort by priority and story points
    const sortedCompleted = completedIssues
      .sort((a, b) => {
        const priorityOrder = { 'Highest': 0, 'High': 1, 'Medium': 2, 'Low': 3, 'Lowest': 4 };
        const aPriority = priorityOrder[a.fields.priority?.name] || 5;
        const bPriority = priorityOrder[b.fields.priority?.name] || 5;
        return aPriority - bPriority;
      })
      .slice(0, 10); // Top 10 accomplishments

    return sortedCompleted.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      type: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name || 'None',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      storyPoints: issue.fields.customfield_10016 || 0,
    }));
  }

  /**
   * Extract current blockers
   */
  extractBlockers(metrics) {
    return metrics.statusGroups.blocked.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary,
      type: issue.fields.issuetype.name,
      priority: issue.fields.priority?.name || 'None',
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      status: issue.fields.status.name,
    }));
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(metrics, healthAnalysis) {
    const recommendations = [];

    if (metrics.velocityPercentage < 80) {
      recommendations.push({
        category: 'Velocity',
        priority: 'High',
        recommendation: 'Consider reducing sprint commitment or identifying impediments affecting team velocity',
      });
    }

    if (metrics.blockedIssues > 0) {
      recommendations.push({
        category: 'Blockers',
        priority: 'High',
        recommendation: `Address ${metrics.blockedIssues} blocked issue(s) immediately to prevent future sprint delays`,
      });
    }

    if (metrics.inProgressIssues > metrics.completedIssues) {
      recommendations.push({
        category: 'WIP Limit',
        priority: 'Medium',
        recommendation: 'Too much work in progress. Consider implementing WIP limits to improve flow',
      });
    }

    if (metrics.todoIssues > 0) {
      recommendations.push({
        category: 'Sprint Planning',
        priority: 'Medium',
        recommendation: `${metrics.todoIssues} issue(s) not started. Review sprint planning and capacity`,
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        category: 'General',
        priority: 'Low',
        recommendation: 'Sprint executed well. Continue current practices and look for incremental improvements',
      });
    }

    return recommendations;
  }
}
