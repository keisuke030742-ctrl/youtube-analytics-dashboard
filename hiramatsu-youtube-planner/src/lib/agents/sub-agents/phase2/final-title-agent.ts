/**
 * Step 17: 最終タイトル決定エージェント
 */

import { BaseAgent } from '../../base-agent';
import { FINAL_TITLE_AGENT_PROMPT } from '../../../prompts/phase2-prompts';

export class FinalTitleAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('最終タイトル決定エージェント', FINAL_TITLE_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['power_word_suggestions', 'keyword', 'persona'];
  }

  getOutputKeys(): string[] {
    return ['final_title', 'character_count', 'seo_keyword_included', 'expected_ctr', 'risk_level', 'reasoning'];
  }
}
