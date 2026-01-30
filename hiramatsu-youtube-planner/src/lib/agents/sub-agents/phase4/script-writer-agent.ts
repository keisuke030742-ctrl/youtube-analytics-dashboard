/**
 * 台本執筆エージェント
 */

import { BaseAgent } from '../../base-agent';
import { SCRIPT_WRITER_AGENT_PROMPT } from '../../../prompts/phase4-prompts';

export class ScriptWriterAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('台本執筆エージェント', SCRIPT_WRITER_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['final_title', 'thumbnail_word', 'hook_script', 'structure', 'examples', 'action_steps'];
  }

  getOutputKeys(): string[] {
    return ['script'];
  }
}
