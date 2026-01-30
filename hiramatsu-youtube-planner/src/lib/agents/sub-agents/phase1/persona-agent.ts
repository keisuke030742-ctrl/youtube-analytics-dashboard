/**
 * Step 4: ペルソナ作成エージェント
 */

import { BaseAgent } from '../../base-agent';
import { PERSONA_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class PersonaAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('ペルソナ作成エージェント', PERSONA_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword'];
  }

  getOutputKeys(): string[] {
    return ['persona', 'background_story', 'current_pain_points', 'desired_outcome', 'search_trigger'];
  }
}
