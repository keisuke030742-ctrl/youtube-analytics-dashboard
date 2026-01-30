/**
 * Step 11: 新事実発見エージェント
 */

import { BaseAgent } from '../../base-agent';
import { NEW_FACT_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class NewFactAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('新事実発見エージェント', NEW_FACT_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'differentiation_points', 'knowledge_base'];
  }

  getOutputKeys(): string[] {
    return ['new_facts', 'best_new_fact', 'aha_moment', 'connection_to_solution'];
  }
}
