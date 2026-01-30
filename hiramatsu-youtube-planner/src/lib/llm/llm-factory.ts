/**
 * LLMファクトリー - モデルの切り替えを管理
 */

import { ClaudeClient } from './claude-client';
import { OpenAIClient } from './openai-client';
import type { LLMProvider } from '@/types/agent';

export interface LLMClient {
  generate(prompt: string): Promise<string>;
}

export function createLLMClient(provider: LLMProvider = 'claude'): LLMClient {
  switch (provider) {
    case 'claude':
      return new ClaudeClient();
    case 'openai':
      return new OpenAIClient();
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
