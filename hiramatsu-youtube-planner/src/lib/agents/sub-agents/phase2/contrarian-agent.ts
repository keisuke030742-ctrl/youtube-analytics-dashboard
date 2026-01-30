/**
 * Step 14: 逆張り企画生成エージェント
 */

import { BaseAgent } from '../../base-agent';
import { CONTRARIAN_AGENT_PROMPT } from '../../../prompts/phase2-prompts';

export class ContrarianAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('逆張り企画生成エージェント', CONTRARIAN_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'competitor_titles', 'unresolved_issues', 'new_facts'];
  }

  getOutputKeys(): string[] {
    return ['contrarian_ideas'];
  }
}
