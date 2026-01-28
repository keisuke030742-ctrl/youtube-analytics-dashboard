import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const MODEL_IDS = {
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-5-20251101',
} as const;

const STYLE_PROMPTS: Record<string, string> = {
  more_hook: `この台本の冒頭フックをより強くしてください。
- 最初の1文で視聴者の注意を強く引きつける
- 意外性や衝撃的な切り口を加える
- ただし煽りすぎて嘘っぽくならないように注意`,

  more_mild: `この台本をよりマイルドなトーンにしてください。
- 過度な煽り表現を和らげる
- 「絶対」「必ず」などの断定表現を減らす
- 信頼感と親しみやすさを重視
- 内容の本質は変えない`,

  shorter: `この台本を50秒以内（約350文字）に収まるよう短縮してください。
- 冗長な表現を削除
- 最も重要なポイントに絞る
- フックと結論は必ず残す
- テンポよく読めるようにする`,

  more_specific: `この台本により具体的な数字や事例を追加してください。
- 金額、期間、割合などの具体的数字を入れる
- 「〜円損する」「〜年後に」など
- 抽象的な表現を具体例に置き換える
- 説得力を高める`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, originalScript, style, model = 'sonnet' } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'APIキーが必要です' },
        { status: 400 }
      );
    }

    if (!originalScript) {
      return NextResponse.json(
        { error: '元の台本が必要です' },
        { status: 400 }
      );
    }

    if (!style || !STYLE_PROMPTS[style]) {
      return NextResponse.json(
        { error: '有効なスタイルを指定してください' },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey,
    });

    const modelId = MODEL_IDS[model as keyof typeof MODEL_IDS] || MODEL_IDS.sonnet;

    const prompt = `あなたは「職人社長の家づくり工務店」のYouTubeショート台本のリライターです。

以下の台本をリライトしてください。

## リライト指示
${STYLE_PROMPTS[style]}

## 元の台本
${originalScript}

## 出力形式
リライトした台本のみを出力してください。説明や補足は不要です。`;

    const message = await client.messages.create({
      model: modelId,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('リライト結果が取得できませんでした');
    }

    return NextResponse.json({
      success: true,
      data: {
        script: textContent.text.trim(),
        model: modelId,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Rewrite API Error:', error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'APIキーが無効です' },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'レート制限に達しました' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `APIエラー（${error.status}）` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
