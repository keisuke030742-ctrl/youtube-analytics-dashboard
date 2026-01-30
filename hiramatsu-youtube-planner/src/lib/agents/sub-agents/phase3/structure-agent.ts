/**
 * Step 21: 構成案作成エージェント
 */

import { BaseAgent } from '../../base-agent';
import { STRUCTURE_AGENT_PROMPT } from '../../../prompts/phase3-prompts';

export class StructureAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('構成案作成エージェント', STRUCTURE_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['hook_script', 'action_steps', 'final_title'];
  }

  getOutputKeys(): string[] {
    return ['structure', 'total_duration', 'retention_strategy'];
  }
}
