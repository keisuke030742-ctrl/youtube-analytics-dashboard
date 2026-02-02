import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildThumbnailPrompt } from '@/lib/prompts/thumbnail-prompt';

// Vercel関数のタイムアウトを300秒に延長
export const maxDuration = 300;

// モデルIDのマッピング
const MODEL_IDS = {
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-5-20251101',
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, transcript, additionalInfo, model = 'sonnet' } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'APIキーが必要です' },
        { status: 400 }
      );
    }

    if (!transcript) {
      return NextResponse.json(
        { error: '動画の文字起こし内容を入力してください' },
        { status: 400 }
      );
    }

    const client = new Anthropic({
      apiKey,
    });

    const prompt = buildThumbnailPrompt(transcript, additionalInfo);
    const modelId = MODEL_IDS[model as keyof typeof MODEL_IDS] || MODEL_IDS.sonnet;

    const message = await client.messages.create({
      model: modelId,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // テキストコンテンツを抽出
    const textContent = message.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('生成結果が取得できませんでした');
    }

    const responseText = textContent.text;
    console.log('Thumbnail API Response length:', responseText.length);

    return NextResponse.json({
      success: true,
      data: {
        rawMarkdown: responseText,
        model: modelId,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      },
    });
  } catch (error) {
    console.error('Thumbnail API Error:', error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { error: 'APIキーが無効です。正しいAPIキーを入力してください。' },
          { status: 401 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: 'APIのレート制限に達しました。しばらく待ってから再試行してください。' },
          { status: 429 }
        );
      }
      if (error.message.includes('credit balance is too low')) {
        return NextResponse.json(
          { error: 'APIのクレジット残高が不足しています。Anthropicコンソールでクレジットを購入してください。' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `APIエラーが発生しました（${error.status}）` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : '予期せぬエラーが発生しました' },
      { status: 500 }
    );
  }
}
