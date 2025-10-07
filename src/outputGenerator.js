/**
 * Output Generator
 * Generates JSON and Markdown formatted sprint summaries
 */

import fs from 'fs';
import path from 'path';

export class OutputGenerator {
  /**
   * Generate comprehensive sprint summary
   */
  generateSummary(sprintData, metrics, healthAnalysis, accomplishments, blockers, recommendations) {
    const { sprint, teamMembers, project, teamLabel } = sprintData;

    return {
      sprintInfo: {
        name: sprint.name,
        id: sprint.id,
        state: sprint.state,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        goal: sprint.goal || 'No goal set',
      },
      projectInfo: {
        key: project.key,
        name: project.name,
      },
      teamInfo: {
        label: teamLabel || 'All Teams',
      },
      sprintHealthMetrics: {
        overallHealth: healthAnalysis.overallHealth,
        totalIssues: metrics.totalIssues,
        completedIssues: metrics.completedIssues,
        inProgressIssues: metrics.inProgressIssues,
        todoIssues: metrics.todoIssues,
        blockedIssues: metrics.blockedIssues,
        completionRate: `${metrics.completionRate}%`,
        velocity: metrics.velocity,
        totalStoryPoints: metrics.totalStoryPoints,
        completedStoryPoints: metrics.completedStoryPoints,
        velocityPercentage: `${metrics.velocityPercentage}%`,
        sprintDurationDays: metrics.durationDays,
      },
      sprintHealthAnalysis: {
        overallHealth: healthAnalysis.overallHealth,
        healthIndicators: healthAnalysis.healthIndicators,
      },
      whatTheTeamWorkedOn: {
        issuesByType: metrics.issueTypes,
        issuesByPriority: metrics.priorities,
        completedWork: accomplishments.length,
        inProgressWork: metrics.inProgressIssues,
      },
      currentBlockers: blockers,
      keyAccomplishments: accomplishments,
      nextSprintPriorities: this.generateNextSprintPriorities(metrics, blockers),
      teamComposition: {
        totalMembers: teamMembers.length,
        members: teamMembers.map(member => ({
          displayName: member.displayName,
          email: member.emailAddress,
        })),
      },
      sprintStatus: {
        status: sprint.state,
        completionSummary: `${metrics.completedIssues} of ${metrics.totalIssues} issues completed (${metrics.completionRate}%)`,
        velocitySummary: `${metrics.completedStoryPoints} of ${metrics.totalStoryPoints} story points completed (${metrics.velocityPercentage}%)`,
      },
      recommendations: recommendations,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate next sprint priorities based on current sprint data
   */
  generateNextSprintPriorities(metrics, blockers) {
    const priorities = [];

    // Carry over incomplete work
    if (metrics.inProgressIssues > 0) {
      priorities.push({
        priority: 'High',
        item: `Complete ${metrics.inProgressIssues} in-progress issue(s) from previous sprint`,
      });
    }

    // Address blockers
    if (blockers.length > 0) {
      priorities.push({
        priority: 'High',
        item: `Resolve ${blockers.length} blocked issue(s)`,
      });
    }

    // Address unstarted work
    if (metrics.todoIssues > 0) {
      priorities.push({
        priority: 'Medium',
        item: `Review and re-prioritize ${metrics.todoIssues} unstarted issue(s)`,
      });
    }

    // General planning
    priorities.push({
      priority: 'Medium',
      item: 'Conduct sprint planning with updated velocity metrics',
    });

    priorities.push({
      priority: 'Low',
      item: 'Schedule retrospective to discuss improvements',
    });

    return priorities;
  }

  /**
   * Generate filename based on project and team
   */
  generateFilename(summary, extension) {
    const projectKey = summary.projectInfo.key;
    const teamLabel = summary.teamInfo.label;
    const sanitizedTeam = teamLabel.replace(/[^a-zA-Z0-9]/g, '_');
    return `sprint-summary-${projectKey}-${sanitizedTeam}.${extension}`;
  }

  /**
   * Save JSON output
   */
  async saveJSON(summary, outputDir = './output', filename = null) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = filename || this.generateFilename(summary, 'json');
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
    console.log(`JSON summary saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Generate and save Markdown output
   */
  async saveMarkdown(summary, outputDir = './output', filename = null) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const markdown = this.generateMarkdown(summary);
    const fileName = filename || this.generateFilename(summary, 'md');
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, markdown);
    console.log(`Markdown summary saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Generate combined summary from multiple team summaries
   */
  generateCombinedSummary(allSummaries) {
    if (allSummaries.length === 0) return null;

    // Aggregate metrics across all teams
    const combinedMetrics = {
      totalIssues: 0,
      completedIssues: 0,
      inProgressIssues: 0,
      todoIssues: 0,
      blockedIssues: 0,
      totalStoryPoints: 0,
      completedStoryPoints: 0,
      totalTeamMembers: 0,
    };

    const allBlockers = [];
    const allAccomplishments = [];
    const projectsMap = new Map();
    const teamsMap = new Map();

    allSummaries.forEach(summary => {
      // Aggregate metrics
      const metrics = summary.sprintHealthMetrics;
      combinedMetrics.totalIssues += metrics.totalIssues;
      combinedMetrics.completedIssues += metrics.completedIssues;
      combinedMetrics.inProgressIssues += metrics.inProgressIssues;
      combinedMetrics.todoIssues += metrics.todoIssues;
      combinedMetrics.blockedIssues += metrics.blockedIssues;
      combinedMetrics.totalStoryPoints += metrics.totalStoryPoints;
      combinedMetrics.completedStoryPoints += metrics.completedStoryPoints;
      combinedMetrics.totalTeamMembers += summary.teamComposition.totalMembers;

      // Collect blockers
      allBlockers.push(...summary.currentBlockers.map(b => ({
        ...b,
        team: summary.teamInfo.label,
        project: summary.projectInfo.key,
      })));

      // Collect accomplishments
      allAccomplishments.push(...summary.keyAccomplishments.map(a => ({
        ...a,
        team: summary.teamInfo.label,
        project: summary.projectInfo.key,
      })));

      // Track projects and teams
      projectsMap.set(summary.projectInfo.key, summary.projectInfo.name);
      teamsMap.set(summary.teamInfo.label, true);
    });

    // Calculate combined percentages
    const completionRate = combinedMetrics.totalIssues > 0
      ? ((combinedMetrics.completedIssues / combinedMetrics.totalIssues) * 100).toFixed(1)
      : 0;
    const velocityPercentage = combinedMetrics.totalStoryPoints > 0
      ? ((combinedMetrics.completedStoryPoints / combinedMetrics.totalStoryPoints) * 100).toFixed(1)
      : 0;

    return {
      title: 'Combined Sprint Summary - All Teams',
      projects: Array.from(projectsMap.entries()).map(([key, name]) => ({ key, name })),
      teams: Array.from(teamsMap.keys()),
      sprintHealthMetrics: {
        ...combinedMetrics,
        completionRate: `${completionRate}%`,
        velocityPercentage: `${velocityPercentage}%`,
        velocity: combinedMetrics.completedStoryPoints,
      },
      currentBlockers: allBlockers.slice(0, 20), // Top 20 blockers
      keyAccomplishments: allAccomplishments
        .sort((a, b) => (b.storyPoints || 0) - (a.storyPoints || 0))
        .slice(0, 20), // Top 20 accomplishments
      teamSummaries: allSummaries.map(s => ({
        team: s.teamInfo.label,
        project: s.projectInfo.key,
        health: s.sprintHealthAnalysis.overallHealth,
        completionRate: s.sprintHealthMetrics.completionRate,
        velocity: s.sprintHealthMetrics.velocity,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Save combined summary
   */
  async saveCombinedSummary(combinedSummary, outputDir = './output') {
    if (!combinedSummary) return null;

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save JSON
    const jsonPath = path.join(outputDir, 'sprint-summary-combined.json');
    fs.writeFileSync(jsonPath, JSON.stringify(combinedSummary, null, 2));
    console.log(`Combined JSON summary saved to: ${jsonPath}`);

    // Generate and save Markdown
    const markdown = this.generateCombinedMarkdown(combinedSummary);
    const mdPath = path.join(outputDir, 'sprint-summary-combined.md');
    fs.writeFileSync(mdPath, markdown);
    console.log(`Combined Markdown summary saved to: ${mdPath}`);

    return { jsonPath, mdPath };
  }

  /**
   * Generate combined Markdown
   */
  generateCombinedMarkdown(combined) {
    return `# ${combined.title}

**Generated:** ${new Date(combined.generatedAt).toLocaleString()}

---

## 📊 Overall Metrics Across All Teams

| Metric | Value |
|--------|-------|
| **Projects** | ${combined.projects.length} (${combined.projects.map(p => p.key).join(', ')}) |
| **Teams** | ${combined.teams.length} (${combined.teams.join(', ')}) |
| **Total Issues** | ${combined.sprintHealthMetrics.totalIssues} |
| **Completed Issues** | ${combined.sprintHealthMetrics.completedIssues} |
| **Completion Rate** | ${combined.sprintHealthMetrics.completionRate} |
| **Velocity (Issues)** | ${combined.sprintHealthMetrics.velocity} completed |
| **Total Story Points** | ${combined.sprintHealthMetrics.totalStoryPoints} |
| **Completed Story Points** | ${combined.sprintHealthMetrics.completedStoryPoints} |
| **Story Points Completion** | ${combined.sprintHealthMetrics.velocityPercentage} |
| **Blocked Issues** | ${combined.sprintHealthMetrics.blockedIssues} |
| **Total Team Members** | ${combined.sprintHealthMetrics.totalTeamMembers} |

---

## 👥 Team Summary

${combined.teamSummaries.map(team =>
  `- **${team.team}** (${team.project}): ${team.health} - Completion: ${team.completionRate}, Velocity: ${team.velocity}`
).join('\n')}

---

## 🚧 All Blockers (Top 20)

${combined.currentBlockers.length > 0 ? combined.currentBlockers.map(blocker =>
  `### ${blocker.key}: ${blocker.summary}
- **Team:** ${blocker.team} (${blocker.project})
- **Type:** ${blocker.type}
- **Priority:** ${blocker.priority}
- **Assignee:** ${blocker.assignee}
- **Status:** ${blocker.status}
`).join('\n') : '*No blockers identified*'}

---

## 🎯 Top Accomplishments (Top 20)

${combined.keyAccomplishments.slice(0, 20).map((accomplishment, index) =>
  `${index + 1}. **${accomplishment.key}:** ${accomplishment.summary}
   - Team: ${accomplishment.team} (${accomplishment.project})
   - Type: ${accomplishment.type}
   - Priority: ${accomplishment.priority}
   - Assignee: ${accomplishment.assignee}
   - Story Points: ${accomplishment.storyPoints}
`).join('\n')}

---

*Combined report generated by Sprint Summary Agent*
`;
  }

  /**
   * Generate Markdown formatted summary
   */
  generateMarkdown(summary) {
    const { sprintInfo, projectInfo, teamInfo, sprintHealthMetrics, sprintHealthAnalysis,
            whatTheTeamWorkedOn, currentBlockers, keyAccomplishments,
            nextSprintPriorities, teamComposition, sprintStatus, recommendations } = summary;

    return `# Sprint Summary: ${sprintInfo.name}

**Project:** ${projectInfo.name} (${projectInfo.key})
**Team:** ${teamInfo.label}
**Sprint Duration:** ${new Date(sprintInfo.startDate).toLocaleDateString()} - ${new Date(sprintInfo.endDate).toLocaleDateString()} (${sprintHealthMetrics.sprintDurationDays} days)
**Sprint Goal:** ${sprintInfo.goal}
**Generated:** ${new Date(summary.generatedAt).toLocaleString()}

---

## 📊 Sprint Health Metrics

| Metric | Value |
|--------|-------|
| **Overall Health** | **${sprintHealthMetrics.overallHealth}** |
| Total Issues | ${sprintHealthMetrics.totalIssues} |
| Completed Issues | ${sprintHealthMetrics.completedIssues} |
| In Progress | ${sprintHealthMetrics.inProgressIssues} |
| Not Started | ${sprintHealthMetrics.todoIssues} |
| Blocked | ${sprintHealthMetrics.blockedIssues} |
| **Completion Rate** | **${sprintHealthMetrics.completionRate}** |
| **Velocity (Issues)** | **${sprintHealthMetrics.velocity} completed** |
| Total Story Points | ${sprintHealthMetrics.totalStoryPoints} |
| Completed Story Points | ${sprintHealthMetrics.completedStoryPoints} |
| Story Points Completion | ${sprintHealthMetrics.velocityPercentage}% |

---

## 🏥 Sprint Health Analysis

**Overall Status:** ${sprintHealthAnalysis.overallHealth}

${sprintHealthAnalysis.healthIndicators.map(indicator =>
  `- **${indicator.indicator}:** ${indicator.status} - ${indicator.message}`
).join('\n')}

---

## 💼 What the Team Worked On

### Issues by Type
${Object.entries(whatTheTeamWorkedOn.issuesByType).map(([type, count]) =>
  `- ${type}: ${count}`
).join('\n')}

### Issues by Priority
${Object.entries(whatTheTeamWorkedOn.issuesByPriority).map(([priority, count]) =>
  `- ${priority}: ${count}`
).join('\n')}

### Work Distribution
- ✅ Completed: ${whatTheTeamWorkedOn.completedWork} issues
- 🔄 In Progress: ${whatTheTeamWorkedOn.inProgressWork} issues

---

## 🚧 Current Blockers

${currentBlockers.length > 0 ? currentBlockers.map(blocker =>
  `### ${blocker.key}: ${blocker.summary}
- **Type:** ${blocker.type}
- **Priority:** ${blocker.priority}
- **Assignee:** ${blocker.assignee}
- **Status:** ${blocker.status}
`).join('\n') : '*No blockers identified*'}

---

## 🎯 Key Accomplishments

${keyAccomplishments.slice(0, 10).map((accomplishment, index) =>
  `${index + 1}. **${accomplishment.key}:** ${accomplishment.summary}
   - Type: ${accomplishment.type}
   - Priority: ${accomplishment.priority}
   - Assignee: ${accomplishment.assignee}
   - Story Points: ${accomplishment.storyPoints}
`).join('\n')}

---

## 📋 Next Sprint Priorities

${nextSprintPriorities.map((priority, index) =>
  `${index + 1}. **[${priority.priority}]** ${priority.item}`
).join('\n')}

---

## 👥 Team Composition

**Total Team Members:** ${teamComposition.totalMembers}

${teamComposition.members.map(member =>
  `- ${member.displayName} (${member.email})`
).join('\n')}

---

## 📈 Sprint Status

**Status:** ${sprintStatus.status}

- ${sprintStatus.completionSummary}
- ${sprintStatus.velocitySummary}

---

## 💡 Recommendations

${recommendations.map((rec, index) =>
  `${index + 1}. **[${rec.priority}] ${rec.category}**
   ${rec.recommendation}
`).join('\n')}

---

*Report generated by Sprint Summary Agent*
`;
  }
}
