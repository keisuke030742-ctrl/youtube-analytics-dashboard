/**
 * Step 2: SEOキーワード選定エージェント
 */

import { BaseAgent } from '../../base-agent';
import { SEO_KEYWORD_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class SEOKeywordAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('SEOキーワード選定エージェント', SEO_KEYWORD_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['purpose', 'keyword_list'];
  }

  getOutputKeys(): string[] {
    return ['selected_keyword', 'search_volume', 'competition_level', 'selection_reason', 'related_keywords'];
  }
}
