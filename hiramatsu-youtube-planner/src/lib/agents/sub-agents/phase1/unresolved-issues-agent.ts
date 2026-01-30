/**
 * Step 9: 競合未解決分析エージェント
 */

import { BaseAgent } from '../../base-agent';
import { UNRESOLVED_ISSUES_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class UnresolvedIssuesAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('競合未解決分析エージェント', UNRESOLVED_ISSUES_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'competitor_info', 'pain_points', 'resolved_issues'];
  }

  getOutputKeys(): string[] {
    return ['unresolved_issues', 'content_opportunities', 'blue_ocean_areas', 'priority_ranking'];
  }
}
