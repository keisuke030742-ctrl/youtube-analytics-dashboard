/**
 * Step 6: 知識レベル判定エージェント
 */

import { BaseAgent } from '../../base-agent';
import { KNOWLEDGE_LEVEL_AGENT_PROMPT } from '../../../prompts/phase1-prompts';

export class KnowledgeLevelAgent extends BaseAgent {
  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    super('知識レベル判定エージェント', KNOWLEDGE_LEVEL_AGENT_PROMPT, llmProvider);
  }

  getRequiredInputs(): string[] {
    return ['keyword', 'persona'];
  }

  getOutputKeys(): string[] {
    return ['knowledge_level', 'reasoning', 'vocabulary_guidelines', 'avoid_terms', 'explanation_depth', 'assumed_knowledge'];
  }
}
