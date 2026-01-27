import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AnalyticsInput {
  channelName: string;
  period: string;
  metrics: {
    views: number;
    watchTime: number;
    subscribers: number;
    subscribersGained: number;
    subscribersLost: number;
    averageViewDuration: number;
    likes: number;
    comments: number;
    shares: number;
  };
  topVideos: Array<{
    title: string;
    views: number;
    watchTime: number;
    likes: number;
    comments: number;
  }>;
  trafficSources: Array<{
    source: string;
    views: number;
    percentage: number;
  }>;
  demographics?: {
    ageGroups: Array<{ group: string; percentage: number }>;
    genderSplit: { male: number; female: number };
  };
  previousPeriodMetrics?: {
    views: number;
    watchTime: number;
    subscribers: number;
  };
}

export async function analyzeChannelPerformance(input: AnalyticsInput) {
  const prompt = `あなたはYouTubeチャンネル運用の専門家です。以下のアナリティクスデータを分析し、詳細なインサイトと改善提案を提供してください。

## チャンネル情報
- チャンネル名: ${input.channelName}
- 分析期間: ${input.period}

## 主要指標
- 総再生回数: ${input.metrics.views.toLocaleString()}回
- 総視聴時間: ${Math.round(input.metrics.watchTime / 60)}時間
- チャンネル登録者: ${input.metrics.subscribers.toLocaleString()}人
- 新規登録者: +${input.metrics.subscribersGained.toLocaleString()}人
- 登録解除: -${input.metrics.subscribersLost.toLocaleString()}人
- 平均視聴時間: ${Math.round(input.metrics.averageViewDuration)}秒
- 高評価数: ${input.metrics.likes.toLocaleString()}
- コメント数: ${input.metrics.comments.toLocaleString()}
- 共有数: ${input.metrics.shares.toLocaleString()}

${input.previousPeriodMetrics ? `
## 前期比較
- 再生回数: ${((input.metrics.views / input.previousPeriodMetrics.views - 1) * 100).toFixed(1)}%
- 視聴時間: ${((input.metrics.watchTime / input.previousPeriodMetrics.watchTime - 1) * 100).toFixed(1)}%
- 登録者: ${((input.metrics.subscribers / input.previousPeriodMetrics.subscribers - 1) * 100).toFixed(1)}%
` : ''}

## トップ動画
${input.topVideos.map((v, i) => `${i + 1}. "${v.title}" - ${v.views.toLocaleString()}回再生, ${Math.round(v.watchTime / 60)}分視聴, ${v.likes}高評価, ${v.comments}コメント`).join('\n')}

## トラフィックソース
${input.trafficSources.map(t => `- ${t.source}: ${t.views.toLocaleString()}回 (${t.percentage.toFixed(1)}%)`).join('\n')}

${input.demographics ? `
## 視聴者層
年齢層:
${input.demographics.ageGroups.map(a => `- ${a.group}: ${a.percentage.toFixed(1)}%`).join('\n')}

性別:
- 男性: ${input.demographics.genderSplit.male.toFixed(1)}%
- 女性: ${input.demographics.genderSplit.female.toFixed(1)}%
` : ''}

以下の形式でJSON形式で回答してください：

{
  "summary": "全体的なパフォーマンスの要約（2-3文）",
  "strengths": ["強み1", "強み2", "強み3"],
  "weaknesses": ["課題1", "課題2", "課題3"],
  "opportunities": ["機会1", "機会2", "機会3"],
  "recommendations": ["改善提案1", "改善提案2", "改善提案3", "改善提案4", "改善提案5"],
  "nextActions": [
    {
      "priority": "high",
      "action": "具体的なアクション",
      "reason": "その理由"
    },
    {
      "priority": "medium",
      "action": "具体的なアクション",
      "reason": "その理由"
    },
    {
      "priority": "low",
      "action": "具体的なアクション",
      "reason": "その理由"
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Extract JSON from the response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from response");
  }

  return JSON.parse(jsonMatch[0]);
}

export async function generateVideoSuggestions(
  channelName: string,
  topVideos: Array<{ title: string; views: number; engagement: number }>,
  recentTrends: string[]
) {
  const prompt = `あなたはYouTubeコンテンツ戦略の専門家です。以下の情報を基に、次に作成すべき動画のアイデアを提案してください。

## チャンネル: ${channelName}

## 過去の人気動画
${topVideos.map((v, i) => `${i + 1}. "${v.title}" - ${v.views.toLocaleString()}回再生, エンゲージメント率: ${v.engagement.toFixed(1)}%`).join('\n')}

## 最近のトレンド
${recentTrends.map(t => `- ${t}`).join('\n')}

以下のJSON形式で5つの動画アイデアを提案してください：

{
  "suggestions": [
    {
      "title": "動画タイトル案",
      "description": "動画の概要",
      "targetAudience": "ターゲット視聴者",
      "expectedPerformance": "予想される効果",
      "keywords": ["キーワード1", "キーワード2", "キーワード3"]
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from response");
  }

  return JSON.parse(jsonMatch[0]);
}

export async function generateReport(
  channelName: string,
  period: string,
  metrics: Record<string, number>,
  insights: string[]
) {
  const prompt = `あなたはYouTubeチャンネルのレポート作成専門家です。以下のデータを基に、クライアント向けの週次/月次レポートのサマリーを作成してください。

## チャンネル: ${channelName}
## 期間: ${period}

## 主要指標
${Object.entries(metrics).map(([key, value]) => `- ${key}: ${value.toLocaleString()}`).join('\n')}

## AI分析による主なインサイト
${insights.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

以下のJSON形式でレポートサマリーを作成してください：

{
  "executiveSummary": "エグゼクティブサマリー（3-4文）",
  "highlights": ["ハイライト1", "ハイライト2", "ハイライト3"],
  "concerns": ["懸念点1", "懸念点2"],
  "nextSteps": ["次のステップ1", "次のステップ2", "次のステップ3"],
  "outlook": "今後の見通し（2-3文）"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from response");
  }

  return JSON.parse(jsonMatch[0]);
}
