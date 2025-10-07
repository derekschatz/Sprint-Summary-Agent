#!/usr/bin/env node

/**
 * Sprint Summary Agent
 * Main entry point for the application
 */

import { loadConfig } from './config.js';
import { JiraClient } from './jiraClient.js';
import { SprintDataCollector } from './sprintDataCollector.js';
import { OutputGenerator } from './outputGenerator.js';
import { PowerPointGenerator } from './powerpointGenerator.js';
import { LLMRecommendationsGenerator } from './llmRecommendations.js';

async function main() {
  console.log('🚀 Sprint Summary Agent Starting...\n');

  try {
    // Load and validate configuration
    console.log('📋 Loading configuration...');
    const config = loadConfig();
    const projectKeys = config.getProjectKeys();
    const teamLabels = config.getTeamLabels();
    console.log(`✅ Configuration loaded successfully`);
    console.log(`   Projects: ${projectKeys.join(', ')}`);
    console.log(`   Teams: ${teamLabels.length > 0 ? teamLabels.join(', ') : 'None (latest sprint per project)'}\n`);

    // Initialize Jira client
    console.log('🔗 Connecting to Jira...');
    const jiraClient = new JiraClient(config.getJiraConfig());
    console.log(`✅ Connected to ${config.host}\n`);

    // Initialize data collector, output generator, and LLM recommendations
    const dataCollector = new SprintDataCollector(jiraClient);
    const outputGenerator = new OutputGenerator();
    const llmConfig = config.getLLMConfig();
    const llmRecommendations = new LLMRecommendationsGenerator(
      llmConfig.provider,
      llmConfig.apiKey,
      llmConfig.model
    );

    // Collect sprint data for all projects and teams
    const dataDescription = teamLabels.length > 0 ? 'all projects and teams' : 'latest sprint per project';
    console.log(`📊 Collecting sprint data for ${dataDescription}...`);
    const allSprintData = await dataCollector.collectAllSprintData(projectKeys, teamLabels);
    const entityType = teamLabels.length > 0 ? 'team(s)' : 'project(s)';
    console.log(`✅ Collected data for ${allSprintData.length} ${entityType}\n`);

    if (allSprintData.length === 0) {
      console.warn('⚠️  No sprint data found for any project/team combination');
      return;
    }

    // Process each team's sprint data
    const allSummaries = [];
    const allMetrics = [];
    const reportType = teamLabels.length > 0 ? 'team reports' : 'project reports';
    console.log(`🔄 Processing individual ${reportType}...\n`);

    for (const sprintData of allSprintData) {
      const teamLabel = sprintData.teamLabel || 'All Teams';
      const projectKey = sprintData.projectKey;

      console.log(`\n📈 Processing: ${projectKey} - ${teamLabel}`);
      console.log('─'.repeat(60));

      // Calculate metrics
      const metrics = dataCollector.calculateMetrics(sprintData);

      // Analyze sprint health
      const healthAnalysis = dataCollector.analyzeSprintHealth(metrics);
      console.log(`   Health: ${healthAnalysis.overallHealth}`);

      // Extract key data
      const accomplishments = dataCollector.extractAccomplishments(metrics, sprintData.issues);
      const blockers = dataCollector.extractBlockers(metrics);

      // Generate recommendations using LLM
      console.log('   🤖 Generating AI recommendations...');
      const teamInfo = { label: sprintData.teamLabel };
      const sprintInfo = sprintData.sprint || sprintData.sprintInfo;
      const projectInfo = sprintData.project || sprintData.projectInfo;
      const recommendations = await llmRecommendations.generateRecommendations(
        metrics,
        healthAnalysis,
        sprintInfo,
        projectInfo,
        teamInfo,
        blockers,
        accomplishments
      );

      // Generate summary
      const summary = outputGenerator.generateSummary(
        sprintData,
        metrics,
        healthAnalysis,
        accomplishments,
        blockers,
        recommendations
      );

      allSummaries.push(summary);
      allMetrics.push(metrics);

      // Save team-specific outputs
      await outputGenerator.saveJSON(summary, config.outputDir);
      await outputGenerator.saveMarkdown(summary, config.outputDir);

      console.log(`   ✅ Completed: ${metrics.completedIssues}/${metrics.totalIssues} issues`);
      console.log(`   ✅ Velocity: ${metrics.completedStoryPoints}/${metrics.totalStoryPoints} points`);
    }

    console.log('\n' + '═'.repeat(60));
    const summaryTitle = teamLabels.length > 0 ? 'ALL TEAMS SUMMARY' : 'ALL PROJECTS SUMMARY';
    console.log(`📊 ${summaryTitle}`);
    console.log('═'.repeat(60));

    // Print summary table
    allSummaries.forEach(summary => {
      const team = summary.teamInfo.label;
      const project = summary.projectInfo.key;
      const health = summary.sprintHealthAnalysis.overallHealth;
      const completion = summary.sprintHealthMetrics.completionRate;
      const velocity = summary.sprintHealthMetrics.velocity;

      console.log(`${project.padEnd(15)} | ${team.padEnd(20)} | ${health.padEnd(8)} | Completion: ${completion.padEnd(6)} | Velocity: ${velocity}`);
    });

    // Generate combined summary if configured
    if (config.generateCombinedSummary && allSummaries.length > 1) {
      const combinedType = teamLabels.length > 0 ? 'all teams' : 'all projects';
      console.log(`\n📊 Generating combined summary across ${combinedType}...`);
      const combinedSummary = outputGenerator.generateCombinedSummary(allSummaries);
      await outputGenerator.saveCombinedSummary(combinedSummary, config.outputDir);
      console.log('✅ Combined summary generated');
    }

    // Generate PowerPoint presentation with LLM-powered content
    console.log('\n📊 Generating PowerPoint presentation...');
    const pptGenerator = new PowerPointGenerator(
      llmConfig.provider,
      llmConfig.apiKey,
      llmConfig.model
    );
    await pptGenerator.generatePresentation(allSummaries, allSprintData, allMetrics, config.outputDir);
    console.log('✅ PowerPoint presentation generated');

    console.log('\n' + '═'.repeat(60));
    console.log(`✨ Sprint Summary Agent completed successfully!`);
    const reportCount = teamLabels.length > 0 ? 'team report(s)' : 'project report(s)';
    console.log(`   Generated ${allSummaries.length} ${reportCount}`);
    console.log(`   Output directory: ${config.outputDir}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

// Run the agent
main();
