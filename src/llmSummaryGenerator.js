/**
 * LLM-based Summary Generator
 * Provider-agnostic implementation using LLM abstraction layer
 */

import { createLLMProvider } from './llmProvider.js';

export class LLMSummaryGenerator {
  constructor(provider, apiKey, model) {
    this.llmProvider = createLLMProvider(provider, apiKey, model);
  }

  /**
   * Generate complete slide content using configured LLM provider
   */
  async generateSlideContent(sprintData, metrics, healthAnalysis, blockers, accomplishments) {
    const { sprintInfo, projectInfo, teamInfo } = sprintData;
    const prompt = this.buildPrompt(sprintInfo, projectInfo, teamInfo, metrics, healthAnalysis, blockers, accomplishments);

    try {
      const text = await this.llmProvider.generateCompletion(prompt, 2048);
      return this.parseSlideContent(text);
    } catch (error) {
      console.error('Error generating LLM slide content:', error.message);
      // Fallback to structured data
      return this.generateFallbackContent(metrics, healthAnalysis, blockers, accomplishments);
    }
  }

  /**
   * Build the prompt for LLM
   */
  buildPrompt(sprintInfo, projectInfo, teamInfo, metrics, healthAnalysis, blockers, accomplishments) {
    return `You are an expert Agile coach creating a concise, executive-level sprint summary for a presentation slide. Generate content for a 2x2 grid layout with four sections.

**Sprint Context:**
- Team: ${teamInfo.label}
- Project: ${projectInfo.name}
- Sprint: ${sprintInfo.name}
- Sprint Goal: ${sprintInfo.goal || 'No goal set'}
- Duration: ${metrics.sprintDurationDays} days

**Sprint Metrics:**
- Overall Health: ${healthAnalysis.overallHealth}
- Completed Issues: ${metrics.completedIssues}/${metrics.totalIssues} (${metrics.completionRate})
- Velocity: ${metrics.velocity} points (${metrics.velocityPercentage} of planned ${metrics.totalStoryPoints})
- In Progress: ${metrics.inProgressIssues}
- Not Started: ${metrics.todoIssues}
- Blocked: ${metrics.blockedIssues}

**Health Indicators:**
${healthAnalysis.healthIndicators.map(i => `- ${i.indicator}: ${i.status} - ${i.message}`).join('\n')}

**Top Blockers:**
${blockers.length > 0 ? blockers.slice(0, 3).map(b => `- [${b.priority}] ${b.key}: ${b.summary}`).join('\n') : '- No blockers'}

**Key Accomplishments:**
${accomplishments.slice(0, 5).map(a => `- ${a.key}: ${a.summary}`).join('\n')}

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

{
  "healthSummary": {
    "title": "Sprint Health Metrics",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"]
  },
  "accomplishments": {
    "title": "Key Accomplishments",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"]
  },
  "blockers": {
    "title": "Blockers & Risks",
    "bullets": ["bullet 1", "bullet 2", "bullet 3"]
  },
  "recommendations": {
    "title": "Recommendations",
    "bullets": ["[High] bullet 1", "[Medium] bullet 2"]
  }
}

Keep all bullets concise and within character limits. Use active voice. Focus on insights, not just data.`;
  }

  /**
   * Parse LLM response into structured slide content
   */
  parseSlideContent(response) {
    try {
      // Remove markdown code blocks if present
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7);
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.substring(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.substring(0, cleaned.length - 3);
      }
      cleaned = cleaned.trim();

      const content = JSON.parse(cleaned);

      // Validate structure
      if (!content.healthSummary || !content.accomplishments || !content.blockers || !content.recommendations) {
        throw new Error('Invalid content structure');
      }

      return content;
    } catch (error) {
      console.error('Error parsing LLM slide content:', error.message);
      console.error('Raw response:', response);
      throw error;
    }
  }

  /**
   * Fallback to structured data if LLM fails
   */
  generateFallbackContent(metrics, healthAnalysis, blockers, accomplishments) {
    return {
      healthSummary: {
        title: 'Sprint Health Metrics',
        bullets: [
          `Health: ${healthAnalysis.overallHealth}`,
          `Done: ${metrics.completedIssues}/${metrics.totalIssues} (${metrics.completionRate})`,
          `Velocity: ${metrics.velocity} issues`,
          `Blocked: ${metrics.blockedIssues}`,
        ].slice(0, 4),
      },
      accomplishments: {
        title: 'What We Delivered',
        bullets: accomplishments.slice(0, 4).map(a =>
          `${a.key}: ${a.summary.substring(0, 38)}${a.summary.length > 38 ? '...' : ''}`
        ),
      },
      blockers: {
        title: "What's Blocking Us",
        bullets: blockers.length > 0
          ? blockers.slice(0, 4).map(b =>
              `${b.key}: ${b.summary.substring(0, 35)}...`
            )
          : ['No blockers - clear path ahead ✓'],
      },
      recommendations: {
        title: 'Next Sprint Focus',
        bullets: [
          metrics.velocityPercentage < 80
            ? '[High] Review sprint capacity'
            : '[Low] Maintain velocity',
          metrics.blockedIssues > 0
            ? `[High] Clear ${metrics.blockedIssues} blockers`
            : '[Low] Keep momentum',
          metrics.todoIssues > 0
            ? `[Medium] Review ${metrics.todoIssues} unstarted`
            : '[Low] Good planning',
        ].slice(0, 4),
      },
    };
  }
}
