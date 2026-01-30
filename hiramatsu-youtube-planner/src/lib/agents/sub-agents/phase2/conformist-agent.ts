/**
 * Step 13: 順張り企画生成エージェント
 */

import { BaseAgent } from '../../base-agent';
import { CONFORMIST_AGENT_PROMPT } from '../../../prompts/phase2-prompts';

export class ConformistAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('順張り企画生成エージェント', CONFORMIST_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'competitor_titles', 'differentiation_points'];
  }

  getOutputKeys(): string[] {
    return ['conformist_ideas'];
  }
}
