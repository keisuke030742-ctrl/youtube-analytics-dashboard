/**
 * Claude LLMクライアント
 */

import Anthropic from '@anthropic-ai/sdk';

export class ClaudeClient {
  private client: Anthropic;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = config.model || 'claude-sonnet-4-5-20250929';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 4096;
  }

  async generate(prompt: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    return textContent && 'text' in textContent ? textContent.text : '';
  }
}
