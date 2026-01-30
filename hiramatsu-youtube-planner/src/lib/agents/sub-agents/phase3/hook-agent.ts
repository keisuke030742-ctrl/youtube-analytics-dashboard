/**
 * Step 19: 冒頭フック作成エージェント（PASTORフォーミュラ）
 */

import { BaseAgent } from '../../base-agent';
import { HOOK_AGENT_PROMPT } from '../../../prompts/phase3-prompts';

export class HookAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('冒頭フック作成エージェント', HOOK_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['final_title', 'pain_points'];
  }

  getOutputKeys(): string[] {
    return ['hook_script', 'pastor_elements', 'hook_strength', 'expected_retention'];
  }
}
