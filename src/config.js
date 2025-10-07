/**
 * Configuration Manager
 * Loads and validates configuration from environment variables
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export class Config {
  constructor() {
    this.host = process.env.JIRA_HOST;
    this.email = process.env.JIRA_EMAIL;
    this.apiToken = process.env.JIRA_API_TOKEN;

    // Support multiple project keys (comma-separated)
    const projectKeysStr = process.env.JIRA_PROJECT_KEYS || process.env.JIRA_PROJECT_KEY || '';
    this.projectKeys = projectKeysStr.split(',').map(k => k.trim()).filter(k => k);

    // Support multiple team labels (comma-separated)
    const teamLabelsStr = process.env.TEAM_LABELS || '';
    this.teamLabels = teamLabelsStr.split(',').map(t => t.trim()).filter(t => t);

    this.generateCombinedSummary = process.env.GENERATE_COMBINED_SUMMARY === 'true';
    this.outputDir = process.env.OUTPUT_DIR || './output';

    // LLM API configuration (OpenRouter)
    this.openRouterApiKey = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
    this.llmModel = process.env.LLM_MODEL || 'anthropic/claude-3.5-sonnet';
  }

  /**
   * Validate configuration
   */
  validate() {
    const missing = [];

    if (!this.host) missing.push('JIRA_HOST');
    if (!this.email) missing.push('JIRA_EMAIL');
    if (!this.apiToken) missing.push('JIRA_API_TOKEN');
    if (this.projectKeys.length === 0) missing.push('JIRA_PROJECT_KEYS or JIRA_PROJECT_KEY');

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        `Please set them in your .env file. See .env.example for reference.`
      );
    }

    // Validate host format
    if (this.host && !this.host.includes('.atlassian.net')) {
      console.warn(
        `Warning: JIRA_HOST should be in format: your-domain.atlassian.net`
      );
    }

    // Warn if OpenRouter API key is missing (recommendations will fallback to rule-based)
    if (!this.openRouterApiKey) {
      console.warn(
        `Warning: OPENROUTER_API_KEY not set. Using rule-based recommendations instead of AI-generated.`
      );
    }

    return true;
  }

  /**
   * Get Jira client configuration
   */
  getJiraConfig() {
    return {
      host: this.host,
      email: this.email,
      apiToken: this.apiToken,
    };
  }

  /**
   * Get all project keys
   */
  getProjectKeys() {
    return this.projectKeys;
  }

  /**
   * Get all team labels
   */
  getTeamLabels() {
    return this.teamLabels;
  }
}

export function loadConfig() {
  const config = new Config();
  config.validate();
  return config;
}
