/**
 * BaseAgent - 全エージェントの基底クラス
 */

import { createLLMClient, type LLMClient } from '../llm/llm-factory';
import type { AgentResult, AgentInput } from '@/types/agent';

export abstract class BaseAgent {
  protected name: string;
  protected promptTemplate: string;
  protected llm: LLMClient;

  constructor(name: string, promptTemplate: string, llmProvider: 'claude' | 'openai' = 'claude') {
    this.name = name;
    this.promptTemplate = promptTemplate;
    this.llm = createLLMClient(llmProvider);
  }

  /**
   * エージェントを実行
   */
  async run(inputs: AgentInput): Promise<AgentResult> {
    const prompt = this.formatPrompt(inputs);
    const response = await this.llm.generate(prompt);
    return this.parseResponse(response);
  }

  /**
   * プロンプトテンプレートに値を埋め込む
   */
  protected formatPrompt(inputs: AgentInput): string {
    let formattedPrompt = this.promptTemplate;

    // プレースホルダーを置換
    Object.keys(inputs).forEach((key) => {
      const placeholder = `{${key}}`;
      formattedPrompt = formattedPrompt.replace(
        new RegExp(placeholder, 'g'),
        String(inputs[key])
      );
    });

    return formattedPrompt;
  }

  /**
   * LLMの応答をJSONとしてパース
   */
  protected parseResponse(response: string): AgentResult {
    // 1. ```json ... ``` 形式を試す
    const jsonCodeBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonCodeBlockMatch) {
      try {
        return JSON.parse(jsonCodeBlockMatch[1]);
      } catch {
        // 続行
      }
    }

    // 2. ``` ... ``` 形式（言語指定なし）を試す
    const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch {
        // 続行
      }
    }

    // 3. JSONオブジェクト { ... } を探す
    const objectMatch = response.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // 続行
      }
    }

    // 4. JSON配列 [ ... ] を探す
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // 続行
      }
    }

    // 5. 生のJSONを試す
    try {
      return JSON.parse(response);
    } catch {
      // 続行
    }

    // 6. すべて失敗した場合、エラー情報と共にフォールバック構造を返す
    console.warn(`[${this.name}] Failed to parse JSON, using fallback structure`);
    console.warn('Response preview:', response.substring(0, 500));

    // エラーにならないようフォールバックオブジェクトを返す
    return {
      _parseError: true,
      _rawResponse: response.substring(0, 2000),
      error: 'Failed to parse LLM response as JSON'
    };
  }

  /**
   * エージェント名を取得
   */
  getName(): string {
    return this.name;
  }

  /**
   * 必要な入力キーを取得（サブクラスでオーバーライド）
   */
  abstract getRequiredInputs(): string[];

  /**
   * 出力キーを取得（サブクラスでオーバーライド）
   */
  abstract getOutputKeys(): string[];
}
