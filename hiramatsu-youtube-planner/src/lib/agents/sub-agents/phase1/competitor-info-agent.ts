/**
 * Step 7: 競合情報分析エージェント
 */

import { BaseAgent } from '../../base-agent';
import { COMPETITOR_INFO_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class CompetitorInfoAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('競合情報分析エージェント', COMPETITOR_INFO_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'competitor_data'];
  }

  getOutputKeys(): string[] {
    return ['competitor_claims', 'proposed_solutions', 'evidence_types', 'unique_angles', 'content_gaps'];
  }
}
