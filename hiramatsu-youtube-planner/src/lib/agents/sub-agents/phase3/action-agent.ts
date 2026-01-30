/**
 * Step 20: アクション整理エージェント
 */

import { BaseAgent } from '../../base-agent';
import { ACTION_AGENT_PROMPT } from '../../../prompts/phase3-prompts';

export class ActionAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('アクション整理エージェント', ACTION_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['new_facts', 'differentiation_points', 'unresolved_issues'];
  }

  getOutputKeys(): string[] {
    return ['action_steps', 'quick_win', 'avoid_mistakes'];
  }
}
