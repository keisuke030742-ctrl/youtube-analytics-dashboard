import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { buildThumbnailPrompt } from '@/lib/prompts/thumbnail-prompt';
import { searchYouTubeVideos, formatResearchForPrompt } from '@/lib/youtube-api';

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
    const { apiKey, transcript, additionalInfo, model = 'sonnet', youtubeApiKey, searchKeyword } = body;

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

    // YouTube APIでリサーチ（APIキーとキーワードがある場合のみ）
    let youtubeResearchText = '';
    let researchData = null;

    if (youtubeApiKey && searchKeyword) {
      try {
        const research = await searchYouTubeVideos(youtubeApiKey, searchKeyword, 50);
        youtubeResearchText = formatResearchForPrompt(research);
        researchData = {
          keyword: searchKeyword,
          totalResults: research.totalResults,
          videosAnalyzed: research.videos.length,
          avgViews: research.analysis.avgViews,
          medianViews: research.analysis.medianViews,
          maxViews: research.analysis.maxViews,
          patterns: research.analysis.commonPatterns,
          topVideos: research.videos.slice(0, 5).map(v => ({
            title: v.title,
            viewCount: v.viewCount,
            channelTitle: v.channelTitle,
          })),
        };
      } catch (ytError) {
        console.error('YouTube API Error:', ytError);
        researchData = {
          error: ytError instanceof Error ? ytError.message : 'YouTube API error',
          keyword: searchKeyword,
        };
      }
    }

    const client = new Anthropic({
      apiKey,
    });

    // リサーチデータをプロンプトに追加
    const researchSection = youtubeResearchText
      ? `\n\n---\n\n${youtubeResearchText}\n\n**上記の競合データを参考に、再生回数が伸びるサムネ・タイトルを作成してください。特に上位動画のタイトルパターンを分析し、差別化ポイントを見つけてください。**`
      : '';

    const prompt = buildThumbnailPrompt(transcript, (additionalInfo || '') + researchSection);
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
        research: researchData,
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
