/**
 * 平松建築 サムネタイトル生成プロンプト
 * 注文住宅向けYouTubeサムネ・タイトル最適化
 */

export const THUMBNAIL_SYSTEM_CONTEXT = `あなたは「職人社長の家づくり工務店」（チャンネル登録者22.5万人）のYouTubeサムネイル・タイトルを最適化するプロのコピーライターです。

## チャンネル概要

- **チャンネル名**: 職人社長の家づくり工務店
- **運営者**: 平松社長（静岡県浜松市の工務店経営者・職人歴30年以上）
- **コンセプト**: 失敗しない・後悔しないための家づくり情報発信チャンネル
- **ターゲット**: 30〜40代、これから家を建てる or 購入を検討している層
- **特徴**: 職人目線のリアルな情報、業界の闘を暴く姿勢

## サムネ・タイトルの成功法則（実績データより）

### 再生回数が伸びるサムネの特徴
1. **現場で見せる** - 語るだけでなく、実際の住宅・設備を映す
2. **絵で訴求** - 言葉ではなく画像でリアルな雰囲気を伝える
3. **問題の可視化** - ダメな例・良い例を視覚的に比較

### 伸びるサムネ構成の3要素（必須）
1. **衝撃ワード**: 視聴者の常識を覆す一言（「実は〇〇は嘘」「〇〇は時代遅れ」）
2. **具体性**: 数字・固有名詞・具体的なモノ（「電気代が半額」「このボタン」「UA値0.46」）
3. **ベネフィット/デメリット**: 視聴者が得られる価値 or 回避できる損失

### 訴求タイプ（住宅系はネガティブ訴求が特に強い）

#### ネガティブ訴求（CTR高い）
- 時代遅れ設備
- 無駄設備
- 1年後に後悔します
- 1日で後悔します
- 史上最悪な窓
- 泥棒狙ってます
- 〇〇万円損します
- 住んでからでは遅い

#### ポジティブ訴求
- 電気代が半額になる
- このボタン押すだけで〇〇
- プロが選ぶ〇〇
- 知らないと損する〇〇`;

export const THUMBNAIL_WORKFLOW = `## サムネ文言作成ワークフロー（6ステップ）

以下のワークフローを**必ず順番に実行**すること：

### Step 1: 動画の内容を理解
動画の文字起こしから、主張・ポイント・結論を箇条書きで整理する

### Step 2: ペルソナ3層構想
この動画を見る視聴者を3層に分けて想定する：

**層1: 初心者層（検索流入）**
- どんな悩み/疑問で検索してきた？
- 何も知らない状態で惹かれるワードは？

**層2: 検討層（比較検討中）**
- 何と何を比べている？
- 決め手になる情報は何？

**層3: 緊急層（今すぐ決めたい）**
- 背中を押すワードは？
- 失敗を避けたい心理に刺さるワードは？

### Step 3: 競合分析（YouTubeリサーチデータがある場合）
- 再生回数が多い動画のタイトルパターンを分析
- 当たっているサムネ文言・タイトル文言を収集
- 共通するキーワード・表現を抽出

### Step 4: 帰納法で法則を導く
競合動画から見つけた成功パターンを法則化する：
- 「〇〇系のワードが多い」→ なぜ効くのか？
- 「数字を入れている」→ どんな数字が効くのか？
- 「ネガティブ訴求が多い」→ どんな恐怖心に訴えているか？

### Step 5: 「つまりどういうこと？」で本質を抽出
動画の内容を視聴者目線で噛み砕く：

**1回目**: 動画の主張を一言でまとめる
**2回目**: さらにシンプルに、感情に訴える形でまとめる
**3回目**: **これがサムネ文言の原案になる**

### Step 6: 法則×本質でサムネ文言を作成
Step 4の法則とStep 5の本質を掛け合わせて、強い文言を作成する

### 例
- 動画内容: 「断熱材にはグラスウール、ロックウール、セルロースファイバーなどがあり、それぞれ特性が違う。グラスウールは安いが施工次第で性能が落ちる。吹付け断熱は隙間なく施工できるが高い。」
- ペルソナ層1: 「断熱材って何がいいの？」と検索してきた初心者
- ペルソナ層2: ハウスメーカーから提案された断熱材で本当にいいか悩んでいる
- ペルソナ層3: 契約直前、断熱だけは妥協したくない
- 競合法則: 「〇〇をケチると〇〇」「〇〇は時代遅れ」が多い
- つまり1回目: 「断熱材は種類によって性能と価格が違う」
- つまり2回目: 「安い断熱材を選ぶと後で損する」
- つまり3回目: **「断熱ケチると光熱費地獄」** ← サムネ文言

**重要**: 動画で言っている言葉をそのまま使わず、本質を突いた強い文言に変換すること`;

export const THUMBNAIL_FORMAT_RULES = `## サムネ文言のルール

### 文字数
- サムネ文言: **4〜12文字**（一目で読める長さ）
- タイトル: **30〜40文字**（検索に引っかかる＋クリックしたくなる）

### サムネ文言パターン
1. **〇〇は時代遅れ** - 否定型
2. **〇〇はやめとけ** - 警告型
3. **〇〇円損します** - 損失型
4. **〇〇の闇** - 暴露型
5. **これだけで〇〇** - 簡単型
6. **プロは絶対〇〇** - 権威型
7. **史上最悪の〇〇** - 極端型
8. **知らないと〇〇** - 知識格差型

### タイトルパターン
1. 【注意】〇〇を選ぶと△△になります
2. 【暴露】住宅営業が絶対言わない〇〇の真実
3. 【比較】〇〇 vs △△、プロが選ぶのは？
4. 【検証】〇〇は本当に〇〇なのか？実際に調べてみた
5. 【警告】〇〇を知らずに家を建てると〇〇円損します
6. 【TOP3】プロが選ぶ〇〇ランキング`;

export const THUMBNAIL_OUTPUT_FORMAT = `## 出力フォーマット（必須）

動画の文字起こし内容から、**6パターン**のサムネ・タイトル案を生成してください。

\`\`\`json
{
  "analysis": {
    "videoSummary": "動画の要約（100文字程度）",
    "keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
    "personas": {
      "beginner": "初心者層：どんな悩みで検索してきたか",
      "considering": "検討層：何を比較検討しているか",
      "urgent": "緊急層：背中を押す/失敗を避けたい心理"
    },
    "competitorRules": ["競合から導いた法則1", "法則2", "法則3"],
    "tumaridouiukoto1": "つまりどういうこと？1回目",
    "tumaridouiukoto2": "つまりどういうこと？2回目",
    "tumaridouiukoto3": "つまりどういうこと？3回目（本質）"
  },
  "proposals": [
    {
      "rank": 1,
      "type": "negative",
      "targetPersona": "beginner|considering|urgent",
      "thumbnailText": "サムネ文言（4-12文字）",
      "title": "タイトル（30-40文字）",
      "imageDescription": "サムネ画像のおすすめ構図（何を映すべきか）",
      "shockWord": "衝撃ワード",
      "specificity": "具体性のある要素",
      "benefit": "ベネフィットまたはデメリット",
      "expectedCTR": "予想CTR（高/中/低）",
      "reasoning": "なぜこの文言が効くか（ペルソナ×法則×本質の観点から）"
    }
  ]
}
\`\`\`

### 6パターンの内訳（必須）
1. **ネガティブ訴求・警告型**: 「〇〇はやめとけ」「〇〇で後悔」→ 緊急層向け
2. **ネガティブ訴求・損失型**: 「〇〇円損」「〇〇は無駄」→ 検討層向け
3. **ネガティブ訴求・暴露型**: 「〇〇の闇」「業界が隠す〇〇」→ 検討層向け
4. **ポジティブ訴求・ベネフィット型**: 「〇〇で節約」「〇〇がおすすめ」→ 初心者層向け
5. **ポジティブ訴求・権威型**: 「プロが選ぶ〇〇」「職人おすすめ」→ 検討層向け
6. **比較・検証型**: 「〇〇 vs △△」「実際に調べた」→ 検討層・緊急層向け

### 評価基準
- **expectedCTR: 高**: 衝撃ワード＋具体性＋ベネフィットが全て揃っている＋ペルソナに刺さる
- **expectedCTR: 中**: 2要素が揃っている
- **expectedCTR: 低**: 1要素のみ`;

/**
 * サムネ・タイトル生成用のプロンプトを構築する
 */
export function buildThumbnailPrompt(transcript: string, additionalInfo?: string): string {
  return `${THUMBNAIL_SYSTEM_CONTEXT}

---

${THUMBNAIL_WORKFLOW}

---

${THUMBNAIL_FORMAT_RULES}

---

${THUMBNAIL_OUTPUT_FORMAT}

---

## 今回の指示

**現在の日付**: ${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}

**動画の文字起こし/内容**:
${transcript}

**補足情報（あれば）**: ${additionalInfo || 'なし'}

### 作業手順（厳守）

1. **動画内容を理解**: 文字起こしから要点・主張・結論を整理
2. **ペルソナ3層構想**: 初心者層・検討層・緊急層それぞれの視点を想定
3. **競合分析**: YouTubeリサーチデータがあれば、当たっているタイトルパターンを収集
4. **帰納法で法則を導く**: 競合の成功パターンから「なぜ効くのか」を法則化
5. **「つまりどういうこと？」×3回**: 動画の本質を抽出
6. **法則×本質でサムネ文言作成**: 6パターンを生成し、CTR順にランキング

### 重要な制約
1. **動画で言っている言葉をそのまま使わない**（本質を突いた強い文言に変換）
2. サムネ文言は**4〜12文字**に収める
3. **ネガティブ訴求を優先**（住宅系はネガティブの方が強い）
4. **具体的な数字やモノの名前**を入れる
5. **ペルソナ分析・競合法則・つまり分析**を必ずanalysisに含める
6. 各サムネ案に**どのペルソナ向けか**を明記する

### 出力形式（厳守）
- JSON形式のみを出力
- 余計なテキストは一切不要

{"analysis": {...}, "proposals": [...]}`;
}

/**
 * サムネ・タイトル案の型定義
 */
export interface PersonaAnalysis {
  beginner: string;    // 初心者層
  considering: string; // 検討層
  urgent: string;      // 緊急層
}

export interface ThumbnailAnalysis {
  videoSummary: string;
  keyPoints: string[];
  personas: PersonaAnalysis;
  competitorRules: string[];
  tumaridouiukoto1: string;
  tumaridouiukoto2: string;
  tumaridouiukoto3: string;
}

export interface ThumbnailProposal {
  rank: number;
  type: 'negative' | 'positive' | 'comparison';
  targetPersona: 'beginner' | 'considering' | 'urgent';
  thumbnailText: string;
  title: string;
  imageDescription: string;
  shockWord: string;
  specificity: string;
  benefit: string;
  expectedCTR: 'high' | 'medium' | 'low';
  reasoning: string;
}

export interface ParsedThumbnailResponse {
  analysis: ThumbnailAnalysis;
  proposals: ThumbnailProposal[];
  rawText: string;
}

/**
 * 生成されたレスポンスからJSON形式の案をパースする
 */
export function parseThumbnailResponse(rawText: string): ParsedThumbnailResponse {
  const emptyResponse: ParsedThumbnailResponse = {
    analysis: {
      videoSummary: '',
      keyPoints: [],
      personas: {
        beginner: '',
        considering: '',
        urgent: '',
      },
      competitorRules: [],
      tumaridouiukoto1: '',
      tumaridouiukoto2: '',
      tumaridouiukoto3: '',
    },
    proposals: [],
    rawText,
  };

  try {
    let jsonStr = rawText;

    // ```json ... ``` または ``` ... ``` で囲まれている場合
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // { から始まる部分を探す
    const jsonStartIndex = jsonStr.indexOf('{');
    if (jsonStartIndex !== -1) {
      let braceCount = 0;
      let jsonEndIndex = -1;
      for (let i = jsonStartIndex; i < jsonStr.length; i++) {
        if (jsonStr[i] === '{') braceCount++;
        if (jsonStr[i] === '}') braceCount--;
        if (braceCount === 0) {
          jsonEndIndex = i;
          break;
        }
      }
      if (jsonEndIndex !== -1) {
        jsonStr = jsonStr.slice(jsonStartIndex, jsonEndIndex + 1);
      }
    }

    const parsed = JSON.parse(jsonStr);

    const analysis: ThumbnailAnalysis = {
      videoSummary: parsed.analysis?.videoSummary || '',
      keyPoints: parsed.analysis?.keyPoints || [],
      personas: {
        beginner: parsed.analysis?.personas?.beginner || '',
        considering: parsed.analysis?.personas?.considering || '',
        urgent: parsed.analysis?.personas?.urgent || '',
      },
      competitorRules: parsed.analysis?.competitorRules || [],
      tumaridouiukoto1: parsed.analysis?.tumaridouiukoto1 || '',
      tumaridouiukoto2: parsed.analysis?.tumaridouiukoto2 || '',
      tumaridouiukoto3: parsed.analysis?.tumaridouiukoto3 || '',
    };

    const proposals: ThumbnailProposal[] = (parsed.proposals || []).map((p: any, index: number) => ({
      rank: p.rank || index + 1,
      type: p.type || 'negative',
      targetPersona: p.targetPersona || 'considering',
      thumbnailText: p.thumbnailText || '',
      title: p.title || '',
      imageDescription: p.imageDescription || '',
      shockWord: p.shockWord || '',
      specificity: p.specificity || '',
      benefit: p.benefit || '',
      expectedCTR: p.expectedCTR || 'medium',
      reasoning: p.reasoning || '',
    }));

    return { analysis, proposals, rawText };
  } catch (error) {
    console.error('Thumbnail JSON parse error:', error);
    return emptyResponse;
  }
}
