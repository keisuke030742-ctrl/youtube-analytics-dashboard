/**
 * Step 5: 検索直前心理分析エージェント
 */

import { BaseAgent } from '../../base-agent';
import { PSYCHOLOGY_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class PsychologyAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('検索直前心理分析エージェント', PSYCHOLOGY_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'persona'];
  }

  getOutputKeys(): string[] {
    return ['emotional_state', 'preconceptions', 'hopes', 'fears', 'urgency_level', 'trust_level', 'key_insight'];
  }
}
