/**
 * エージェント関連の型定義
 */

export interface AgentResult {
  [key: string]: any;
}

export interface AgentInput {
  [key: string]: any;
}

export type LLMProvider = 'claude' | 'openai';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  temperature: number;
  maxTokens: number;
}
