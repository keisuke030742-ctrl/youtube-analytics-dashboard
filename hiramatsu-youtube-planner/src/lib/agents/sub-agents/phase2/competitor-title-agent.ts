/**
 * Step 12: 競合タイトル収集エージェント
 */

import { BaseAgent } from '../../base-agent';
import { COMPETITOR_TITLE_AGENT_PROMPT } from '../../../prompts/phase2-prompts';

export class CompetitorTitleAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('競合タイトル収集エージェント', COMPETITOR_TITLE_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'competitor_data'];
  }

  getOutputKeys(): string[] {
    return ['competitor_titles', 'common_patterns', 'high_performing_elements', 'title_length_trend', 'power_words_used'];
  }
}
