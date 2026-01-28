import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildShortScriptPrompt } from '@/lib/prompts/short-script-prompt';
import { searchYouTubeVideos, formatResearchForPrompt } from '@/lib/youtube-api';

// Vercel関数のタイムアウトを300秒に延長（Opus 4.5は遅いため）
export const maxDuration = 300;

// モデルIDのマッピング
const MODEL_IDS = {
  sonnet: 'claude-sonnet-4-20250514',
  opus: 'claude-opus-4-5-20251101',
} as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, theme, additionalInfo, model = 'sonnet', youtubeApiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'APIキーが必要です' },
        { status: 400 }
      );
    }

    if (!theme) {
      return NextResponse.json(
        { error: 'テーマを入力してください' },
        { status: 400 }
      );
    }

    // YouTube APIでリサーチ（APIキーがある場合のみ）
    let youtubeResearchText = '';
    let researchData = null;

    if (youtubeApiKey) {
      try {
        const research = await searchYouTubeVideos(youtubeApiKey, theme, 100);
        youtubeResearchText = formatResearchForPrompt(research);
        researchData = {
          totalResults: research.totalResults,
          videosAnalyzed: research.videos.length,
          avgViews: research.analysis.avgViews,
          medianViews: research.analysis.medianViews,
          maxViews: research.analysis.maxViews,
          patterns: research.analysis.commonPatterns,
        };
      } catch (ytError) {
        console.error('YouTube API Error:', ytError);
        // エラー情報を返す（デバッグ用）
        researchData = {
          error: ytError instanceof Error ? ytError.message : 'YouTube API error',
          totalResults: 0,
          videosAnalyzed: 0,
          avgViews: 0,
          medianViews: 0,
          maxViews: 0,
          patterns: [],
        };
      }
    }

    const client = new Anthropic({
      apiKey,
    });

    // リサーチデータをプロンプトに追加
    const researchSection = youtubeResearchText
      ? `\n\n---\n\n${youtubeResearchText}\n\n**上記の実データを参考に、競合との差別化を意識した企画を作成してください。**`
      : '';

    const prompt = buildShortScriptPrompt(theme, additionalInfo + researchSection);
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

    // デバッグ: レスポンスの最初と最後を記録
    const responseText = textContent.text;
    console.log('API Response length:', responseText.length);
    console.log('API Response start:', responseText.substring(0, 200));
    console.log('API Response end:', responseText.substring(responseText.length - 200));

    return NextResponse.json({
      success: true,
      data: {
        rawMarkdown: responseText,
        model: modelId,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
        research: researchData,
        debug: {
          responseLength: responseText.length,
          startsWithBrace: responseText.trim().startsWith('{'),
          first100: responseText.substring(0, 100),
        },
      },
    });
  } catch (error) {
    console.error('Shorts API Error:', error);

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
      // クレジット残高不足のエラーをチェック
      if (error.message.includes('credit balance is too low')) {
        return NextResponse.json(
          { error: 'APIのクレジット残高が不足しています。Anthropicコンソールでクレジットを購入してください。' },
          { status: 400 }
        );
      }
      // その他の400エラー
      if (error.status === 400) {
        return NextResponse.json(
          { error: 'リクエストが無効です。入力内容を確認してください。' },
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
