/**
 * Step 8: 競合解決済み分析エージェント
 */

import { BaseAgent } from '../../base-agent';
import { RESOLVED_ISSUES_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class ResolvedIssuesAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('競合解決済み分析エージェント', RESOLVED_ISSUES_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'competitor_info', 'pain_points'];
  }

  getOutputKeys(): string[] {
    return ['resolved_issues', 'saturated_approaches', 'recommendation'];
  }
}
