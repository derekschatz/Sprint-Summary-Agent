/**
 * LLM-based Recommendations Generator
 * Uses OpenRouter API to generate context-aware sprint recommendations
 */

export class LLMRecommendationsGenerator {
  constructor(apiKey, model) {
    this.apiKey = apiKey || process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
    this.model = model || process.env.LLM_MODEL || 'anthropic/claude-3.5-sonnet';
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  /**
   * Generate recommendations using LLM via OpenRouter
   */
  async generateRecommendations(metrics, healthAnalysis, sprintInfo, projectInfo, teamInfo, blockers, accomplishments) {
    const prompt = this.buildPrompt(metrics, healthAnalysis, sprintInfo, projectInfo, teamInfo, blockers, accomplishments);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://github.com/yourusername/sprint-summary-agent',
          'X-Title': 'Sprint Summary Agent',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const text = data.choices[0].message.content;
      return this.parseRecommendations(text);
    } catch (error) {
      console.error('Error generating LLM recommendations:', error.message);
      // Fallback to rule-based recommendations
      return this.generateFallbackRecommendations(metrics);
    }
  }

  /**
   * Build the prompt for Claude
   */
  buildPrompt(metrics, healthAnalysis, sprintInfo, projectInfo, teamInfo, blockers, accomplishments) {
    return `You are an expert Agile coach analyzing a sprint retrospective. Generate 3-5 actionable recommendations based on the following sprint data.

**Sprint Information:**
- Team: ${teamInfo.label}
- Project: ${projectInfo.name}
- Sprint: ${sprintInfo.name}
- Sprint Goal: ${sprintInfo.goal || 'No goal set'}
- Duration: ${metrics.sprintDurationDays} days

**Sprint Metrics:**
- Total Issues: ${metrics.totalIssues}
- Completed Issues: ${metrics.completedIssues} (${metrics.completionRate})
- In Progress: ${metrics.inProgressIssues}
- Not Started: ${metrics.todoIssues}
- Blocked: ${metrics.blockedIssues}
- Total Story Points: ${metrics.totalStoryPoints}
- Completed Story Points: ${metrics.completedStoryPoints} (${metrics.velocityPercentage})
- Velocity: ${metrics.velocity}

**Sprint Health:**
- Overall Health: ${healthAnalysis.overallHealth}
${healthAnalysis.healthIndicators.map(i => `- ${i.indicator}: ${i.status} - ${i.message}`).join('\n')}

**Current Blockers:**
${blockers.length > 0 ? blockers.slice(0, 3).map(b => `- ${b.key}: ${b.summary} (Priority: ${b.priority})`).join('\n') : '- No blockers'}

**Key Accomplishments:**
${accomplishments.slice(0, 5).map(a => `- ${a.key}: ${a.summary}`).join('\n')}

Generate 3-5 recommendations in the following JSON format. Prioritize recommendations based on impact (High/Medium/Low). Focus on actionable insights specific to this team's performance:

[
  {
    "category": "Category name (e.g., Velocity, Blockers, WIP Limit, Sprint Planning, Team Health, etc.)",
    "priority": "High|Medium|Low",
    "recommendation": "Specific, actionable recommendation"
  }
]

Only return the JSON array, no additional text.`;
  }

  /**
   * Parse LLM response into structured recommendations
   */
  parseRecommendations(response) {
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

      const recommendations = JSON.parse(cleaned);

      // Validate structure
      if (!Array.isArray(recommendations)) {
        throw new Error('Response is not an array');
      }

      // Ensure each recommendation has required fields
      return recommendations.map(rec => ({
        category: rec.category || 'General',
        priority: rec.priority || 'Medium',
        recommendation: rec.recommendation || '',
      }));
    } catch (error) {
      console.error('Error parsing LLM recommendations:', error.message);
      console.error('Raw response:', response);
      throw error;
    }
  }

  /**
   * Fallback to rule-based recommendations if LLM fails
   */
  generateFallbackRecommendations(metrics) {
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
