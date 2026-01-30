/**
 * 品質チェックエージェント
 */

import { BaseAgent } from '../../base-agent';
import { QUALITY_CHECK_AGENT_PROMPT } from '../../../prompts/phase4-prompts';

export class QualityCheckAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('品質チェックエージェント', QUALITY_CHECK_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['script'];
  }

  getOutputKeys(): string[] {
    return ['overall_score', 'ng_words', 'compliance_issues', 'flame_risk', 'youtube_policy_check', 'approval_status', 'improvement_suggestions'];
  }
}
