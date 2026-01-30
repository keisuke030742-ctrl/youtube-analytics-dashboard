/**
 * Step 22: 事例ピックアップエージェント
 */

import { BaseAgent } from '../../base-agent';
import { EXAMPLE_AGENT_PROMPT } from '../../../prompts/phase3-prompts';

export class ExampleAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('事例ピックアップエージェント', EXAMPLE_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['structure', 'knowledge_base'];
  }

  getOutputKeys(): string[] {
    return ['examples', 'data_points', 'credibility_boost'];
  }
}
