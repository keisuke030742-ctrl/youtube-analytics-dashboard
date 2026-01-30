/**
 * OpenAI LLMクライアント
 */

import OpenAI from 'openai';

export class OpenAIClient {
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = config.model || 'gpt-4o';
    this.temperature = config.temperature || 0.7;
    this.maxTokens = config.maxTokens || 4096;
  }

  async generate(prompt: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return completion.choices[0]?.message?.content || '';
  }
}
