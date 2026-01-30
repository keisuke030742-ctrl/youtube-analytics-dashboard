/**
 * Step 16: パワーワード提案エージェント
 */

import { BaseAgent } from '../../base-agent';
import { POWER_WORD_AGENT_PROMPT } from '../../../prompts/phase2-prompts';

export class PowerWordAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('パワーワード提案エージェント', POWER_WORD_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['top_3_titles'];
  }

  getOutputKeys(): string[] {
    return ['power_word_suggestions', 'best_choice'];
  }
}
