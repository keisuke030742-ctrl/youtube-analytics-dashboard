/**
 * Step 3: 検索結果分析エージェント
 */

import { BaseAgent } from '../../base-agent';
import { SEARCH_ANALYSIS_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class SearchAnalysisAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('検索結果分析エージェント', SEARCH_ANALYSIS_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'competitor_data'];
  }

  getOutputKeys(): string[] {
    return ['top_videos_summary', 'common_title_patterns', 'winning_factors', 'opportunity_gaps', 'recommended_approach'];
  }
}
