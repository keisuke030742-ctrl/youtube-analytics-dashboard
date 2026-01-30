/**
 * Step 18: サムネワード決定エージェント
 */

import { BaseAgent } from '../../base-agent';
import { THUMBNAIL_WORD_AGENT_PROMPT } from '../../../prompts/phase2-prompts';

export class ThumbnailWordAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('サムネワード決定エージェント', THUMBNAIL_WORD_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['final_title'];
  }

  getOutputKeys(): string[] {
    return ['thumbnail_word', 'character_count', 'color_suggestion', 'font_size', 'visual_impact', 'reasoning'];
  }
}
