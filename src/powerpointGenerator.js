/**
 * PowerPoint Generator
 * Creates PowerPoint presentations with sprint summaries in 2x2 format
 */

import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { LLMSummaryGenerator } from './llmSummaryGenerator.js';

export class PowerPointGenerator {
  constructor(provider, apiKey, model) {
    this.pptx = new pptxgen();
    this.pptx.author = 'Sprint Summary Agent';
    this.pptx.company = 'International SOS';
    this.pptx.title = 'Sprint Summary Report';
    this.llmGenerator = new LLMSummaryGenerator(provider, apiKey, model);
  }

  /**
   * Create a 2x2 slide for a team's sprint summary with LLM-generated content
   */
  async createTeamSlide(summary, sprintData, metrics) {
    const slide = this.pptx.addSlide();
    const { sprintInfo, projectInfo, teamInfo, sprintHealthMetrics,
            sprintHealthAnalysis, currentBlockers, keyAccomplishments } = summary;

    // Construct proper data structures for LLM
    const teamInfoForLLM = teamInfo || { label: sprintData.teamLabel };
    const sprintInfoForLLM = sprintInfo || sprintData.sprint;
    const projectInfoForLLM = projectInfo || sprintData.project;

    // Generate LLM content for the slide
    console.log(`   🤖 Generating AI slide content for ${teamInfoForLLM.label}...`);
    const slideContent = await this.llmGenerator.generateSlideContent(
      {
        sprintInfo: sprintInfoForLLM,
        projectInfo: projectInfoForLLM,
        teamInfo: teamInfoForLLM
      },
      metrics,
      sprintHealthAnalysis,
      currentBlockers,
      keyAccomplishments
    );

    // Title: Team Name and Sprint
    slide.addText(`${teamInfoForLLM.label.toUpperCase()} - ${sprintInfoForLLM.name}`, {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 28,
      bold: true,
      color: '363636',
      align: 'center'
    });

    // Subtitle: Project and Date Range
    const startDate = new Date(sprintInfoForLLM.startDate).toLocaleDateString();
    const endDate = new Date(sprintInfoForLLM.endDate).toLocaleDateString();
    slide.addText(`${projectInfoForLLM.name} | ${startDate} - ${endDate}`, {
      x: 0.5,
      y: 0.9,
      w: 9,
      h: 0.3,
      fontSize: 14,
      color: '666666',
      align: 'center'
    });

    // Define 2x2 grid layout - adjusted for better fit
    const boxWidth = 4.4;
    const boxHeight = 1.6;
    const leftX = 0.5;
    const rightX = 5.1;
    const topY = 1.4;
    const bottomY = 3.0;

    // Health color based on status
    const healthColors = {
      'Good': '4CAF50',
      'Fair': 'FFA726',
      'Poor': 'EF5350'
    };
    const healthColor = healthColors[sprintHealthMetrics.overallHealth] || '757575';

    // TOP LEFT: Sprint Health Metrics
    slide.addShape('rect', {
      x: leftX,
      y: topY,
      w: boxWidth,
      h: boxHeight,
      fill: { color: 'F5F5F5' },
      line: { color: 'DDDDDD', width: 1 }
    });

    slide.addText(`📊 ${slideContent.healthSummary.title}`, {
      x: leftX + 0.1,
      y: topY + 0.1,
      w: boxWidth - 0.2,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: '363636'
    });

    const healthBullets = slideContent.healthSummary.bullets.slice(0, 5).map(b => `• ${b}`).join('\n');

    slide.addText(healthBullets, {
      x: leftX + 0.1,
      y: topY + 0.45,
      w: boxWidth - 0.2,
      h: boxHeight - 0.55,
      fontSize: 9,
      color: '424242',
      valign: 'top'
    });

    // Health indicator circle
    slide.addShape('ellipse', {
      x: leftX + boxWidth - 0.8,
      y: topY + 0.15,
      w: 0.5,
      h: 0.5,
      fill: { color: healthColor }
    });

    // TOP RIGHT: Key Accomplishments
    slide.addShape('rect', {
      x: rightX,
      y: topY,
      w: boxWidth,
      h: boxHeight,
      fill: { color: 'F5F5F5' },
      line: { color: 'DDDDDD', width: 1 }
    });

    slide.addText(`🎯 ${slideContent.accomplishments.title}`, {
      x: rightX + 0.1,
      y: topY + 0.1,
      w: boxWidth - 0.2,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: '363636'
    });

    const accomplishmentsBullets = slideContent.accomplishments.bullets.slice(0, 5).map(b => `• ${b}`).join('\n');

    slide.addText(accomplishmentsBullets || 'No key accomplishments recorded', {
      x: rightX + 0.1,
      y: topY + 0.45,
      w: boxWidth - 0.2,
      h: boxHeight - 0.55,
      fontSize: 8,
      color: '424242',
      valign: 'top'
    });

    // BOTTOM LEFT: Current Blockers
    slide.addShape('rect', {
      x: leftX,
      y: bottomY,
      w: boxWidth,
      h: boxHeight,
      fill: { color: 'F5F5F5' },
      line: { color: 'DDDDDD', width: 1 }
    });

    slide.addText(`🚧 ${slideContent.blockers.title}`, {
      x: leftX + 0.1,
      y: bottomY + 0.1,
      w: boxWidth - 0.2,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: '363636'
    });

    const blockersBullets = slideContent.blockers.bullets.slice(0, 5).map(b => `• ${b}`).join('\n');
    const hasBlockers = currentBlockers.length > 0;

    slide.addText(blockersBullets, {
      x: leftX + 0.1,
      y: bottomY + 0.45,
      w: boxWidth - 0.2,
      h: boxHeight - 0.55,
      fontSize: 8,
      color: hasBlockers ? 'D32F2F' : '388E3C',
      valign: 'top'
    });

    // BOTTOM RIGHT: Recommendations
    slide.addShape('rect', {
      x: rightX,
      y: bottomY,
      w: boxWidth,
      h: boxHeight,
      fill: { color: 'F5F5F5' },
      line: { color: 'DDDDDD', width: 1 }
    });

    slide.addText(`💡 ${slideContent.recommendations.title}`, {
      x: rightX + 0.1,
      y: bottomY + 0.1,
      w: boxWidth - 0.2,
      h: 0.3,
      fontSize: 12,
      bold: true,
      color: '363636'
    });

    const recommendationsBullets = slideContent.recommendations.bullets.slice(0, 5).map(b => `• ${b}`).join('\n');

    slide.addText(recommendationsBullets, {
      x: rightX + 0.1,
      y: bottomY + 0.45,
      w: boxWidth - 0.2,
      h: boxHeight - 0.55,
      fontSize: 8,
      color: '424242',
      valign: 'top'
    });
  }

  /**
   * Create a summary slide with all teams
   */
  createOverviewSlide(allSummaries) {
    const slide = this.pptx.addSlide();

    // Title
    slide.addText('Sprint Summary Overview - All Teams', {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.5,
      fontSize: 32,
      bold: true,
      color: '363636',
      align: 'center'
    });

    // Subtitle
    const date = new Date().toLocaleDateString();
    slide.addText(`Generated: ${date}`, {
      x: 0.5,
      y: 0.9,
      w: 9,
      h: 0.3,
      fontSize: 14,
      color: '666666',
      align: 'center'
    });

    // Calculate aggregate metrics
    let totalIssues = 0;
    let completedIssues = 0;
    let totalPoints = 0;
    let completedPoints = 0;
    let totalBlockers = 0;

    allSummaries.forEach(summary => {
      totalIssues += summary.sprintHealthMetrics.totalIssues;
      completedIssues += summary.sprintHealthMetrics.completedIssues;
      totalPoints += summary.sprintHealthMetrics.totalStoryPoints;
      completedPoints += summary.sprintHealthMetrics.completedStoryPoints;
      totalBlockers += summary.sprintHealthMetrics.blockedIssues;
    });

    const overallCompletion = totalIssues > 0 ? ((completedIssues / totalIssues) * 100).toFixed(1) : 0;
    const overallVelocity = totalPoints > 0 ? ((completedPoints / totalPoints) * 100).toFixed(1) : 0;

    // Aggregate metrics box
    slide.addShape('rect', {
      x: 1,
      y: 1.5,
      w: 8,
      h: 2,
      fill: { color: 'E3F2FD' },
      line: { color: '1976D2', width: 2 }
    });

    const aggregateText = [
      `Total Teams: ${allSummaries.length}`,
      `Total Issues: ${completedIssues}/${totalIssues} (${overallCompletion}%)`,
      `Total Story Points: ${completedPoints}/${totalPoints} (${overallVelocity}%)`,
      `Total Blockers: ${totalBlockers}`
    ];

    slide.addText(aggregateText.join('\n'), {
      x: 1.5,
      y: 1.8,
      w: 7,
      h: 1.5,
      fontSize: 18,
      bold: true,
      color: '1565C0',
      valign: 'middle'
    });

    // Team summary table
    const tableData = [
      [
        { text: 'Team', options: { bold: true, color: 'FFFFFF', fill: '1976D2' } },
        { text: 'Sprint', options: { bold: true, color: 'FFFFFF', fill: '1976D2' } },
        { text: 'Health', options: { bold: true, color: 'FFFFFF', fill: '1976D2' } },
        { text: 'Completion', options: { bold: true, color: 'FFFFFF', fill: '1976D2' } },
        { text: 'Velocity', options: { bold: true, color: 'FFFFFF', fill: '1976D2' } }
      ]
    ];

    allSummaries.forEach(summary => {
      const healthColors = {
        'Good': '4CAF50',
        'Fair': 'FFA726',
        'Poor': 'EF5350'
      };
      const healthColor = healthColors[summary.sprintHealthMetrics.overallHealth] || '757575';

      tableData.push([
        summary.teamInfo.label.toUpperCase(),
        summary.sprintInfo.name,
        { text: summary.sprintHealthMetrics.overallHealth, options: { fill: healthColor, color: 'FFFFFF', bold: true } },
        summary.sprintHealthMetrics.completionRate,
        String(summary.sprintHealthMetrics.velocity)
      ]);
    });

    slide.addTable(tableData, {
      x: 1,
      y: 4,
      w: 8,
      h: 4,
      fontSize: 12,
      border: { pt: 1, color: 'DDDDDD' }
    });
  }

  /**
   * Generate PowerPoint presentation
   */
  async generatePresentation(allSummaries, allSprintData, allMetrics, outputDir = './output') {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create overview slide first
    this.createOverviewSlide(allSummaries);

    // Create a slide for each team (must process sequentially for LLM calls)
    for (let i = 0; i < allSummaries.length; i++) {
      await this.createTeamSlide(allSummaries[i], allSprintData[i], allMetrics[i]);
    }

    // Save presentation
    const filePath = path.join(outputDir, 'sprint-summary-presentation.pptx');
    await this.pptx.writeFile({ fileName: filePath });

    console.log(`PowerPoint presentation saved to: ${filePath}`);
    return filePath;
  }
}
