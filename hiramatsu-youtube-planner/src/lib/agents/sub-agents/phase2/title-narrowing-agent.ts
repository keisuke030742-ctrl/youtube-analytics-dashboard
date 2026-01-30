/**
 * Step 15: タイトル候補絞込エージェント
 */

import { BaseAgent } from '../../base-agent';
import { TITLE_NARROWING_AGENT_PROMPT } from '../../../prompts/phase2-prompts';

export class TitleNarrowingAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('タイトル候補絞込エージェント', TITLE_NARROWING_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['conformist_ideas', 'contrarian_ideas', 'persona'];
  }

  getOutputKeys(): string[] {
    return ['top_3_titles', 'recommendation'];
  }
}
