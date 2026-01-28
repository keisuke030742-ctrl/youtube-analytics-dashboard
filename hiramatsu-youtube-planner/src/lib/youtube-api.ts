/**
 * YouTube Data API v3 ユーティリティ
 * 競合動画のリサーチに使用
 */

export interface YouTubeVideo {
  videoId: string;
  title: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string;
  thumbnail: string;
}

export interface YouTubeResearchResult {
  keyword: string;
  totalResults: number;
  videos: YouTubeVideo[];
  analysis: {
    avgViews: number;
    medianViews: number;  // 中央値（より現実的な指標）
    maxViews: number;
    minViews: number;
    topTitles: string[];
    commonPatterns: string[];
  };
}

/**
 * YouTube Data API v3 で動画を検索
 */
export async function searchYouTubeVideos(
  apiKey: string,
  keyword: string,
  maxResults: number = 100
): Promise<YouTubeResearchResult> {
  // YouTube APIは1回最大50件なので、ページネーションで取得
  const allVideoIds: string[] = [];
  let nextPageToken: string | undefined;
  let totalResults = 0;
  const perPage = Math.min(maxResults, 50);
  const pages = Math.ceil(maxResults / 50);

  for (let page = 0; page < pages && allVideoIds.length < maxResults; page++) {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', keyword);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('maxResults', perPage.toString());
    searchUrl.searchParams.set('regionCode', 'JP');
    searchUrl.searchParams.set('relevanceLanguage', 'ja');
    searchUrl.searchParams.set('key', apiKey);

    if (nextPageToken) {
      searchUrl.searchParams.set('pageToken', nextPageToken);
    }

    const searchResponse = await fetch(searchUrl.toString());
    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      throw new Error(`YouTube Search API Error: ${error.error?.message || 'Unknown error'}`);
    }

    const searchData = await searchResponse.json();
    totalResults = searchData.pageInfo?.totalResults || 0;
    nextPageToken = searchData.nextPageToken;

    const pageVideoIds = searchData.items?.map((item: any) => item.id.videoId) || [];
    allVideoIds.push(...pageVideoIds);

    // 次のページがない場合は終了
    if (!nextPageToken) break;
  }

  if (allVideoIds.length === 0) {
    return {
      keyword,
      totalResults: 0,
      videos: [],
      analysis: {
        avgViews: 0,
        medianViews: 0,
        maxViews: 0,
        minViews: 0,
        topTitles: [],
        commonPatterns: [],
      },
    };
  }

  // 2. Videos APIで詳細情報を取得（50件ずつバッチ処理）
  const videos: YouTubeVideo[] = [];
  const batchSize = 50;

  for (let i = 0; i < allVideoIds.length; i += batchSize) {
    const batchIds = allVideoIds.slice(i, i + batchSize).join(',');

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
    videosUrl.searchParams.set('id', batchIds);
    videosUrl.searchParams.set('key', apiKey);

    const videosResponse = await fetch(videosUrl.toString());
    if (!videosResponse.ok) {
      const error = await videosResponse.json();
      throw new Error(`YouTube Videos API Error: ${error.error?.message || 'Unknown error'}`);
    }

    const videosData = await videosResponse.json();

    // バッチの動画を追加
    const batchVideos: YouTubeVideo[] = videosData.items?.map((item: any) => ({
      videoId: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics.viewCount || '0', 10),
      likeCount: parseInt(item.statistics.likeCount || '0', 10),
      commentCount: parseInt(item.statistics.commentCount || '0', 10),
      duration: item.contentDetails.duration,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    })) || [];

    videos.push(...batchVideos);
  }

  // 4. 分析データを生成（外れ値除外 + 中央値）
  const viewCounts = videos.map(v => v.viewCount).sort((a, b) => a - b);

  // 外れ値を除外（IQR法：上位・下位25%の外れ値を除外）
  const filteredViewCounts = removeOutliers(viewCounts);

  // 中央値を計算（より現実的な「平均的な再生回数」）
  const medianViews = calculateMedian(filteredViewCounts);

  // 参考用に平均も計算（外れ値除外後）
  const avgViews = filteredViewCounts.length > 0
    ? Math.round(filteredViewCounts.reduce((a, b) => a + b, 0) / filteredViewCounts.length)
    : 0;

  // タイトルパターンを抽出
  const titles = videos.map(v => v.title);
  const commonPatterns = extractTitlePatterns(titles);

  return {
    keyword,
    totalResults,
    videos,
    analysis: {
      avgViews,
      medianViews,
      maxViews: Math.max(...viewCounts, 0),
      minViews: Math.min(...viewCounts, 0),
      topTitles: titles.slice(0, 5),
      commonPatterns,
    },
  };
}

/**
 * 中央値を計算
 */
function calculateMedian(sortedNumbers: number[]): number {
  if (sortedNumbers.length === 0) return 0;

  const mid = Math.floor(sortedNumbers.length / 2);

  if (sortedNumbers.length % 2 === 0) {
    // 偶数の場合は中央2つの平均
    return Math.round((sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2);
  } else {
    // 奇数の場合は中央の値
    return sortedNumbers[mid];
  }
}

/**
 * IQR法で外れ値を除外
 * 下位25%と上位25%の範囲外を除外
 */
function removeOutliers(sortedNumbers: number[]): number[] {
  if (sortedNumbers.length < 4) return sortedNumbers;

  const q1Index = Math.floor(sortedNumbers.length * 0.25);
  const q3Index = Math.floor(sortedNumbers.length * 0.75);

  const q1 = sortedNumbers[q1Index];
  const q3 = sortedNumbers[q3Index];
  const iqr = q3 - q1;

  // 外れ値の境界（IQRの1.5倍を超えるものを除外）
  const lowerBound = q1 - iqr * 1.5;
  const upperBound = q3 + iqr * 1.5;

  return sortedNumbers.filter(n => n >= lowerBound && n <= upperBound);
}

/**
 * タイトルからパターンを抽出
 */
function extractTitlePatterns(titles: string[]): string[] {
  const patterns: string[] = [];

  // よく使われるパターンをチェック
  const patternChecks = [
    { pattern: /【.*?】/, name: '【】で囲む' },
    { pattern: /TOP\s?\d+|トップ\s?\d+/i, name: 'TOP○○形式' },
    { pattern: /\d+選/, name: '○選形式' },
    { pattern: /知らないと.*損|知らなきゃ.*損/, name: '損失回避訴求' },
    { pattern: /絶対|必ず|100%/, name: '断定表現' },
    { pattern: /\?|？/, name: '疑問形' },
    { pattern: /注意|危険|やばい|ヤバい/, name: '警告訴求' },
    { pattern: /プロ|専門家|○○歴\d+年/, name: '権威性訴求' },
    { pattern: /\d+万|億|万円/, name: '具体的数字' },
    { pattern: /裏技|秘密|内緒/, name: '秘匿性訴求' },
  ];

  for (const check of patternChecks) {
    const matchCount = titles.filter(t => check.pattern.test(t)).length;
    if (matchCount >= 2) {
      patterns.push(`${check.name}（${matchCount}/${titles.length}本）`);
    }
  }

  return patterns;
}

/**
 * リサーチ結果をプロンプト用のテキストに変換
 */
export function formatResearchForPrompt(research: YouTubeResearchResult): string {
  if (research.videos.length === 0) {
    return `## YouTube競合リサーチ結果\n\n「${research.keyword}」の検索結果が見つかりませんでした。`;
  }

  const lines = [
    `## YouTube競合リサーチ結果（実データ）`,
    ``,
    `**検索キーワード**: ${research.keyword}`,
    `**検索結果総数**: 約${research.totalResults.toLocaleString()}件`,
    ``,
    `### 再生回数データ（外れ値除外済み）`,
    `- 中央値再生回数: ${research.analysis.medianViews.toLocaleString()}回 ← この数値が現実的な目標`,
    `- 平均再生回数: ${research.analysis.avgViews.toLocaleString()}回`,
    `- 最高再生回数: ${research.analysis.maxViews.toLocaleString()}回`,
    ``,
    `### 上位動画タイトル（実データ）`,
  ];

  research.videos.slice(0, 10).forEach((video, index) => {
    lines.push(`${index + 1}. 「${video.title}」`);
    lines.push(`   - チャンネル: ${video.channelTitle}`);
    lines.push(`   - 再生回数: ${video.viewCount.toLocaleString()}回`);
    lines.push(`   - いいね: ${video.likeCount.toLocaleString()}`);
  });

  if (research.analysis.commonPatterns.length > 0) {
    lines.push(``);
    lines.push(`### 発見されたタイトルパターン`);
    research.analysis.commonPatterns.forEach(pattern => {
      lines.push(`- ${pattern}`);
    });
  }

  lines.push(``);
  lines.push(`### リサーチに基づく戦略示唆`);
  lines.push(`- 中央値 ${research.analysis.medianViews.toLocaleString()}回 を超える企画を目指す（現実的な目標）`);
  lines.push(`- 競合が使っているパターンを参考にしつつ、差別化ポイントを見つける`);
  lines.push(`- 再生回数が多い動画のフック（冒頭）を分析して活用する`);

  return lines.join('\n');
}

/**
 * ショート動画専用のリサーチ（#shortsフィルター付き）
 */
export async function searchYouTubeShorts(
  apiKey: string,
  keyword: string,
  maxResults: number = 10
): Promise<YouTubeResearchResult> {
  // ショート動画は通常1分以内なので、キーワードに#shortsを追加
  return searchYouTubeVideos(apiKey, `${keyword} #shorts`, maxResults);
}
