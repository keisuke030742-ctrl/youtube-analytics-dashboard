/**
 * Step 1: 目的決定エージェント
 */

import { BaseAgent } from '../../base-agent';
import { PURPOSE_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class PurposeAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('目的決定エージェント', PURPOSE_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['userInstruction'];
  }

  getOutputKeys(): string[] {
    return ['purpose', 'kpi', 'target_audience', 'strategy'];
  }
}
