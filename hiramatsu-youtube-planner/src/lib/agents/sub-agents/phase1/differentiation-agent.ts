/**
 * Step 10: 差別化ポイント発見エージェント
 */

import { BaseAgent } from '../../base-agent';
import { DIFFERENTIATION_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class DifferentiationAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('差別化ポイント発見エージェント', DIFFERENTIATION_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'resolved_issues', 'unresolved_issues'];
  }

  getOutputKeys(): string[] {
    return ['differentiation_points', 'must_include_content', 'unique_angle', 'competitive_advantage'];
  }
}
