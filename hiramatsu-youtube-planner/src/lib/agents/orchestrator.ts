/**
 * Orchestrator - 22ステップのマルチエージェントシステムを統括
 */

import type { AgentResult } from '@/types/agent';
import {
  PurposeAgent,
  SEOKeywordAgent,
  SearchAnalysisAgent,
  PersonaAgent,
  PsychologyAgent,
  KnowledgeLevelAgent,
  CompetitorInfoAgent,
  ResolvedIssuesAgent,
  UnresolvedIssuesAgent,
  DifferentiationAgent,
  NewFactAgent,
} from './sub-agents/phase1';
import {
  CompetitorTitleAgent,
  ConformistAgent,
  ContrarianAgent,
  TitleNarrowingAgent,
  PowerWordAgent,
  FinalTitleAgent,
  ThumbnailWordAgent,
} from './sub-agents/phase2';
import {
  HookAgent,
  ActionAgent,
  StructureAgent,
  ExampleAgent,
} from './sub-agents/phase3';
import {
  ScriptWriterAgent,
  QualityCheckAgent,
} from './sub-agents/phase4';

export interface OrchestratorState {
  userInstruction: string;
  purpose?: string;
  keyword?: string;
  competitor_data?: string;
  persona?: string;
  psychology?: string;
  // ... 他のステップの結果
  finalScript?: string;
}

export interface ProgressCallback {
  (phase: number, step: number, stepName: string, result?: AgentResult): void;
}

export class Orchestrator {
  public state: Map<string, any>;
  private llmProvider: 'claude' | 'openai';

  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    this.state = new Map();
    this.llmProvider = llmProvider;
  }

  /**
   * Phase 1: 企画立案・リサーチ（11ステップ）
   */
  async runPhase1(
    userInstruction: string,
    onProgress?: ProgressCallback
  ): Promise<Record<string, AgentResult>> {
    const results: Record<string, AgentResult> = {};

    // ユーザー指示を保存
    this.state.set('userInstruction', userInstruction);

    // Step 1: 目的決定
    onProgress?.(1, 1, '目的決定');
    const purposeAgent = new PurposeAgent(this.llmProvider);
    const purposeResult = await purposeAgent.run({ userInstruction: userInstruction });
    results.purpose = purposeResult;
    this.state.set('purpose', purposeResult.purpose);

    // Step 2: SEOキーワード選定
    onProgress?.(1, 2, 'SEOキーワード選定');
    const seoAgent = new SEOKeywordAgent(this.llmProvider);
    const seoResult = await seoAgent.run({
      purpose: this.state.get('purpose'),
      keyword_list: '住宅ローン、補助金、太陽光発電、蓄電池、断熱材、外壁、間取り、住宅会社選び、コスト削減、注文住宅、新築、リフォーム',
    });
    results.seo_keyword = seoResult;
    this.state.set('keyword', seoResult.selected_keyword);

    // Step 3: 検索結果分析
    onProgress?.(1, 3, '検索結果分析');
    const searchAgent = new SearchAnalysisAgent(this.llmProvider);
    const searchResult = await searchAgent.run({
      keyword: this.state.get('keyword'),
      competitor_data: '検索上位の動画分析データ（競合チャンネルの動画タイトル、再生回数、投稿日など）',
    });
    results.search_analysis = searchResult;
    this.state.set('search_data', searchResult);

    // Step 4: ペルソナ作成
    onProgress?.(1, 4, 'ペルソナ作成');
    const personaAgent = new PersonaAgent(this.llmProvider);
    const personaResult = await personaAgent.run({
      keyword: this.state.get('keyword'),
      search_data: this.state.get('search_data'),
    });
    results.persona = personaResult;
    this.state.set('persona', personaResult.persona);

    // Step 5: 検索直前心理分析
    onProgress?.(1, 5, '検索直前心理分析');
    const psychologyAgent = new PsychologyAgent(this.llmProvider);
    const psychologyResult = await psychologyAgent.run({
      keyword: this.state.get('keyword'),
      persona: this.state.get('persona'),
    });
    results.psychology = psychologyResult;
    this.state.set('pain_points', psychologyResult.pain_points);

    // Step 6: 知識レベル判定
    onProgress?.(1, 6, '知識レベル判定');
    const knowledgeAgent = new KnowledgeLevelAgent(this.llmProvider);
    const knowledgeResult = await knowledgeAgent.run({
      keyword: this.state.get('keyword'),
      persona: this.state.get('persona'),
    });
    results.knowledge_level = knowledgeResult;
    this.state.set('knowledge_level', knowledgeResult.level);

    // Step 7: 競合情報分析
    onProgress?.(1, 7, '競合情報分析');
    const competitorAgent = new CompetitorInfoAgent(this.llmProvider);
    const competitorResult = await competitorAgent.run({
      keyword: this.state.get('keyword'),
      competitor_data: '競合チャンネルの動画データ（タイトル、再生回数、サムネイル傾向など）',
    });
    results.competitor_info = competitorResult;
    this.state.set('competitor_info', competitorResult);

    // Step 8: 競合解決済み分析
    onProgress?.(1, 8, '競合解決済み分析');
    const resolvedAgent = new ResolvedIssuesAgent(this.llmProvider);
    const resolvedResult = await resolvedAgent.run({
      keyword: this.state.get('keyword'),
      competitor_info: this.state.get('competitor_info'),
      pain_points: this.state.get('pain_points'),
    });
    results.resolved_issues = resolvedResult;
    this.state.set('resolved_issues', resolvedResult.resolved_issues);

    // Step 9: 競合未解決分析
    onProgress?.(1, 9, '競合未解決分析');
    const unresolvedAgent = new UnresolvedIssuesAgent(this.llmProvider);
    const unresolvedResult = await unresolvedAgent.run({
      keyword: this.state.get('keyword'),
      competitor_info: this.state.get('competitor_info'),
      pain_points: this.state.get('pain_points'),
      resolved_issues: this.state.get('resolved_issues'),
    });
    results.unresolved_issues = unresolvedResult;
    this.state.set('unresolved_issues', unresolvedResult.unresolved_issues);

    // Step 10: 差別化ポイント発見
    onProgress?.(1, 10, '差別化ポイント発見');
    const differentiationAgent = new DifferentiationAgent(this.llmProvider);
    const differentiationResult = await differentiationAgent.run({
      keyword: this.state.get('keyword'),
      resolved_issues: this.state.get('resolved_issues'),
      unresolved_issues: this.state.get('unresolved_issues'),
    });
    results.differentiation = differentiationResult;
    this.state.set('differentiation_points', differentiationResult.differentiation_points);

    // Step 11: 新事実発見
    onProgress?.(1, 11, '新事実発見');
    const newFactAgent = new NewFactAgent(this.llmProvider);
    const newFactResult = await newFactAgent.run({
      keyword: this.state.get('keyword'),
      differentiation_points: this.state.get('differentiation_points'),
      knowledge_base: '平松建築の専門知識ベース',
    });
    results.new_fact = newFactResult;
    this.state.set('new_facts', newFactResult.new_facts);
    this.state.set('best_new_fact', newFactResult.best_new_fact);

    return results;
  }

  /**
   * Phase 2: タイトル・サムネ決定（7ステップ）
   */
  async runPhase2(onProgress?: ProgressCallback): Promise<Record<string, AgentResult>> {
    const results: Record<string, AgentResult> = {};

    // Step 12: 競合タイトル収集
    onProgress?.(2, 12, '競合タイトル収集');
    const competitorTitleAgent = new CompetitorTitleAgent(this.llmProvider);
    const competitorTitleResult = await competitorTitleAgent.run({
      keyword: this.state.get('keyword'),
      competitor_data: this.state.get('competitor_info'),
    });
    results.competitor_titles = competitorTitleResult;
    this.state.set('competitor_titles', competitorTitleResult);

    // Step 13: 順張り企画生成
    onProgress?.(2, 13, '順張り企画生成');
    const conformistAgent = new ConformistAgent(this.llmProvider);
    const conformistResult = await conformistAgent.run({
      keyword: this.state.get('keyword'),
      competitor_titles: this.state.get('competitor_titles'),
      differentiation_points: this.state.get('differentiation_points'),
    });
    results.conformist = conformistResult;
    this.state.set('conformist_ideas', conformistResult.conformist_ideas);

    // Step 14: 逆張り企画生成
    onProgress?.(2, 14, '逆張り企画生成');
    const contrarianAgent = new ContrarianAgent(this.llmProvider);
    const contrarianResult = await contrarianAgent.run({
      keyword: this.state.get('keyword'),
      competitor_titles: this.state.get('competitor_titles'),
      unresolved_issues: this.state.get('unresolved_issues'),
      new_facts: this.state.get('new_facts'),
    });
    results.contrarian = contrarianResult;
    this.state.set('contrarian_ideas', contrarianResult.contrarian_ideas);

    // Step 15: タイトル候補絞込
    onProgress?.(2, 15, 'タイトル候補絞込');
    const titleNarrowingAgent = new TitleNarrowingAgent(this.llmProvider);
    const titleNarrowingResult = await titleNarrowingAgent.run({
      conformist_ideas: this.state.get('conformist_ideas'),
      contrarian_ideas: this.state.get('contrarian_ideas'),
      persona: this.state.get('persona'),
    });
    results.title_narrowing = titleNarrowingResult;
    this.state.set('top_3_titles', titleNarrowingResult.top_3_titles);

    // Step 16: パワーワード提案
    onProgress?.(2, 16, 'パワーワード提案');
    const powerWordAgent = new PowerWordAgent(this.llmProvider);
    const powerWordResult = await powerWordAgent.run({
      top_3_titles: this.state.get('top_3_titles'),
    });
    results.power_word = powerWordResult;
    this.state.set('power_word_suggestions', powerWordResult.power_word_suggestions);

    // Step 17: 最終タイトル決定
    onProgress?.(2, 17, '最終タイトル決定');
    const finalTitleAgent = new FinalTitleAgent(this.llmProvider);
    const finalTitleResult = await finalTitleAgent.run({
      power_word_suggestions: this.state.get('power_word_suggestions'),
      keyword: this.state.get('keyword'),
      persona: this.state.get('persona'),
    });
    results.final_title = finalTitleResult;
    this.state.set('final_title', finalTitleResult.final_title);

    // Step 18: サムネワード決定
    onProgress?.(2, 18, 'サムネワード決定');
    const thumbnailWordAgent = new ThumbnailWordAgent(this.llmProvider);
    const thumbnailWordResult = await thumbnailWordAgent.run({
      final_title: this.state.get('final_title'),
    });
    results.thumbnail_word = thumbnailWordResult;
    this.state.set('thumbnail_word', thumbnailWordResult.thumbnail_word);

    return results;
  }

  /**
   * Phase 3: 台本生成（4ステップ）
   */
  async runPhase3(onProgress?: ProgressCallback): Promise<Record<string, AgentResult>> {
    const results: Record<string, AgentResult> = {};

    // Step 19: 冒頭フック作成
    onProgress?.(3, 19, '冒頭フック作成');
    const hookAgent = new HookAgent(this.llmProvider);
    const hookResult = await hookAgent.run({
      final_title: this.state.get('final_title'),
      pain_points: this.state.get('pain_points'),
    });
    results.hook = hookResult;
    this.state.set('hook_script', hookResult.hook_script);

    // Step 20: アクション整理
    onProgress?.(3, 20, 'アクション整理');
    const actionAgent = new ActionAgent(this.llmProvider);
    const actionResult = await actionAgent.run({
      new_facts: this.state.get('new_facts'),
      differentiation_points: this.state.get('differentiation_points'),
      unresolved_issues: this.state.get('unresolved_issues'),
    });
    results.action = actionResult;
    this.state.set('action_steps', actionResult.action_steps);

    // Step 21: 構成案作成
    onProgress?.(3, 21, '構成案作成');
    const structureAgent = new StructureAgent(this.llmProvider);
    const structureResult = await structureAgent.run({
      hook_script: this.state.get('hook_script'),
      action_steps: this.state.get('action_steps'),
      final_title: this.state.get('final_title'),
    });
    results.structure = structureResult;
    this.state.set('structure', structureResult.structure);

    // Step 22: 事例ピックアップ
    onProgress?.(3, 22, '事例ピックアップ');
    const exampleAgent = new ExampleAgent(this.llmProvider);
    const exampleResult = await exampleAgent.run({
      structure: this.state.get('structure'),
      knowledge_base: '平松建築の過去事例データベース',
    });
    results.example = exampleResult;
    this.state.set('examples', exampleResult.examples);

    return results;
  }

  /**
   * Phase 4: 最終台本執筆
   */
  async runPhase4(onProgress?: ProgressCallback): Promise<Record<string, AgentResult>> {
    const results: Record<string, AgentResult> = {};

    // 台本執筆
    onProgress?.(4, 23, '台本執筆');
    const scriptWriterAgent = new ScriptWriterAgent(this.llmProvider);
    const scriptResult = await scriptWriterAgent.run({
      final_title: this.state.get('final_title'),
      thumbnail_word: this.state.get('thumbnail_word'),
      hook_script: this.state.get('hook_script'),
      structure: this.state.get('structure'),
      examples: this.state.get('examples'),
      action_steps: this.state.get('action_steps'),
    });
    results.final_script = scriptResult;
    this.state.set('final_script', scriptResult.script);

    // 品質チェック
    onProgress?.(4, 24, '品質チェック');
    const qualityCheckAgent = new QualityCheckAgent(this.llmProvider);
    const qualityResult = await qualityCheckAgent.run({
      script: this.state.get('final_script'),
    });
    results.quality_check = qualityResult;

    return results;
  }

  /**
   * 全フェーズを一括実行
   */
  async runAll(
    userInstruction: string,
    onProgress?: ProgressCallback
  ): Promise<{
    phase1: Record<string, AgentResult>;
    phase2: Record<string, AgentResult>;
    phase3: Record<string, AgentResult>;
    phase4: Record<string, AgentResult>;
  }> {
    const phase1 = await this.runPhase1(userInstruction, onProgress);
    const phase2 = await this.runPhase2(onProgress);
    const phase3 = await this.runPhase3(onProgress);
    const phase4 = await this.runPhase4(onProgress);

    return { phase1, phase2, phase3, phase4 };
  }

  /**
   * 現在の状態を取得
   */
  getState(): OrchestratorState {
    return Object.fromEntries(this.state.entries()) as OrchestratorState;
  }

  /**
   * 特定のステップを実行（ステップバイステップモード用）
   */
  async runStep(step: number, onProgress?: ProgressCallback): Promise<AgentResult> {
    const stepMap: { [key: number]: () => Promise<AgentResult> } = {
      // Phase 1
      1: async () => {
        const agent = new PurposeAgent(this.llmProvider);
        const result = await agent.run({ user_instruction: this.state.get('user_instruction') });
        this.state.set('purpose', result.purpose);
        onProgress?.(1, 1, '目的決定', result);
        return result;
      },
      2: async () => {
        const agent = new SEOKeywordAgent(this.llmProvider);
        const result = await agent.run({
          purpose: this.state.get('purpose'),
          knowledge_base: '平松建築の過去の成功パターン',
        });
        this.state.set('keyword', result.keyword);
        onProgress?.(1, 2, 'SEOキーワード選定', result);
        return result;
      },
      3: async () => {
        const agent = new SearchAnalysisAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          knowledge_base: '検索上位の動画分析データ',
        });
        this.state.set('search_data', result);
        onProgress?.(1, 3, '検索結果分析', result);
        return result;
      },
      4: async () => {
        const agent = new PersonaAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          search_data: this.state.get('search_data'),
        });
        this.state.set('persona', result.persona);
        onProgress?.(1, 4, 'ペルソナ作成', result);
        return result;
      },
      5: async () => {
        const agent = new PsychologyAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          persona: this.state.get('persona'),
        });
        this.state.set('pain_points', result.pain_points);
        onProgress?.(1, 5, '検索直前心理分析', result);
        return result;
      },
      6: async () => {
        const agent = new KnowledgeLevelAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          persona: this.state.get('persona'),
        });
        this.state.set('knowledge_level', result.level);
        onProgress?.(1, 6, '知識レベル判定', result);
        return result;
      },
      7: async () => {
        const agent = new CompetitorInfoAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          knowledge_base: '競合チャンネルのデータ',
        });
        this.state.set('competitor_info', result);
        onProgress?.(1, 7, '競合情報分析', result);
        return result;
      },
      8: async () => {
        const agent = new ResolvedIssuesAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          competitor_info: this.state.get('competitor_info'),
          pain_points: this.state.get('pain_points'),
        });
        this.state.set('resolved_issues', result.resolved_issues);
        onProgress?.(1, 8, '競合解決済み分析', result);
        return result;
      },
      9: async () => {
        const agent = new UnresolvedIssuesAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          competitor_info: this.state.get('competitor_info'),
          pain_points: this.state.get('pain_points'),
          resolved_issues: this.state.get('resolved_issues'),
        });
        this.state.set('unresolved_issues', result.unresolved_issues);
        onProgress?.(1, 9, '競合未解決分析', result);
        return result;
      },
      10: async () => {
        const agent = new DifferentiationAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          resolved_issues: this.state.get('resolved_issues'),
          unresolved_issues: this.state.get('unresolved_issues'),
        });
        this.state.set('differentiation_points', result.differentiation_points);
        onProgress?.(1, 10, '差別化ポイント発見', result);
        return result;
      },
      11: async () => {
        const agent = new NewFactAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          differentiation_points: this.state.get('differentiation_points'),
          knowledge_base: '平松建築の専門知識ベース',
        });
        this.state.set('new_facts', result.new_facts);
        this.state.set('best_new_fact', result.best_new_fact);
        onProgress?.(1, 11, '新事実発見', result);
        return result;
      },
      // Phase 2
      12: async () => {
        const agent = new CompetitorTitleAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          competitor_data: this.state.get('competitor_info'),
        });
        this.state.set('competitor_titles', result);
        onProgress?.(2, 12, '競合タイトル収集', result);
        return result;
      },
      13: async () => {
        const agent = new ConformistAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          competitor_titles: this.state.get('competitor_titles'),
          differentiation_points: this.state.get('differentiation_points'),
        });
        this.state.set('conformist_ideas', result.conformist_ideas);
        onProgress?.(2, 13, '順張り企画生成', result);
        return result;
      },
      14: async () => {
        const agent = new ContrarianAgent(this.llmProvider);
        const result = await agent.run({
          keyword: this.state.get('keyword'),
          competitor_titles: this.state.get('competitor_titles'),
          unresolved_issues: this.state.get('unresolved_issues'),
          new_facts: this.state.get('new_facts'),
        });
        this.state.set('contrarian_ideas', result.contrarian_ideas);
        onProgress?.(2, 14, '逆張り企画生成', result);
        return result;
      },
      15: async () => {
        const agent = new TitleNarrowingAgent(this.llmProvider);
        const result = await agent.run({
          conformist_ideas: this.state.get('conformist_ideas'),
          contrarian_ideas: this.state.get('contrarian_ideas'),
          persona: this.state.get('persona'),
        });
        this.state.set('top_3_titles', result.top_3_titles);
        onProgress?.(2, 15, 'タイトル候補絞込', result);
        return result;
      },
      16: async () => {
        const agent = new PowerWordAgent(this.llmProvider);
        const result = await agent.run({
          top_3_titles: this.state.get('top_3_titles'),
        });
        this.state.set('power_word_suggestions', result.power_word_suggestions);
        onProgress?.(2, 16, 'パワーワード提案', result);
        return result;
      },
      17: async () => {
        const agent = new FinalTitleAgent(this.llmProvider);
        const result = await agent.run({
          power_word_suggestions: this.state.get('power_word_suggestions'),
          keyword: this.state.get('keyword'),
          persona: this.state.get('persona'),
        });
        this.state.set('final_title', result.final_title);
        onProgress?.(2, 17, '最終タイトル決定', result);
        return result;
      },
      18: async () => {
        const agent = new ThumbnailWordAgent(this.llmProvider);
        const result = await agent.run({
          final_title: this.state.get('final_title'),
        });
        this.state.set('thumbnail_word', result.thumbnail_word);
        onProgress?.(2, 18, 'サムネワード決定', result);
        return result;
      },
      // Phase 3
      19: async () => {
        const agent = new HookAgent(this.llmProvider);
        const result = await agent.run({
          final_title: this.state.get('final_title'),
          pain_points: this.state.get('pain_points'),
        });
        this.state.set('hook_script', result.hook_script);
        onProgress?.(3, 19, '冒頭フック作成', result);
        return result;
      },
      20: async () => {
        const agent = new ActionAgent(this.llmProvider);
        const result = await agent.run({
          new_facts: this.state.get('new_facts'),
          differentiation_points: this.state.get('differentiation_points'),
          unresolved_issues: this.state.get('unresolved_issues'),
        });
        this.state.set('action_steps', result.action_steps);
        onProgress?.(3, 20, 'アクション整理', result);
        return result;
      },
      21: async () => {
        const agent = new StructureAgent(this.llmProvider);
        const result = await agent.run({
          hook_script: this.state.get('hook_script'),
          action_steps: this.state.get('action_steps'),
          final_title: this.state.get('final_title'),
        });
        this.state.set('structure', result.structure);
        onProgress?.(3, 21, '構成案作成', result);
        return result;
      },
      22: async () => {
        const agent = new ExampleAgent(this.llmProvider);
        const result = await agent.run({
          structure: this.state.get('structure'),
          knowledge_base: '平松建築の過去事例データベース',
        });
        this.state.set('examples', result.examples);
        onProgress?.(3, 22, '事例ピックアップ', result);
        return result;
      },
      // Phase 4
      23: async () => {
        const agent = new ScriptWriterAgent(this.llmProvider);
        const result = await agent.run({
          final_title: this.state.get('final_title'),
          thumbnail_word: this.state.get('thumbnail_word'),
          hook_script: this.state.get('hook_script'),
          structure: this.state.get('structure'),
          examples: this.state.get('examples'),
          action_steps: this.state.get('action_steps'),
        });
        this.state.set('final_script', result.script);
        onProgress?.(4, 23, '台本執筆', result);
        return result;
      },
      24: async () => {
        const agent = new QualityCheckAgent(this.llmProvider);
        const result = await agent.run({
          script: this.state.get('final_script'),
        });
        onProgress?.(4, 24, '品質チェック', result);
        return result;
      },
    };

    const stepFn = stepMap[step];
    if (!stepFn) {
      throw new Error(`Invalid step number: ${step}`);
    }

    return await stepFn();
  }

  /**
   * ステップ情報を取得
   */
  getStepInfo(step: number): { phase: number; stepName: string; description: string } | null {
    const stepInfoMap: { [key: number]: { phase: number; stepName: string; description: string } } = {
      1: { phase: 1, stepName: '目的決定', description: '動画の目的を明確化' },
      2: { phase: 1, stepName: 'SEOキーワード選定', description: '最適なキーワードを選定' },
      3: { phase: 1, stepName: '検索結果分析', description: '競合動画の分析' },
      4: { phase: 1, stepName: 'ペルソナ作成', description: 'ターゲット視聴者を定義' },
      5: { phase: 1, stepName: '検索直前心理分析', description: '視聴者の悩みを深掘り' },
      6: { phase: 1, stepName: '知識レベル判定', description: '視聴者の知識レベルを判定' },
      7: { phase: 1, stepName: '競合情報分析', description: '競合チャンネルを分析' },
      8: { phase: 1, stepName: '競合解決済み分析', description: '既に解決済みの課題を特定' },
      9: { phase: 1, stepName: '競合未解決分析', description: '未解決の課題を発見' },
      10: { phase: 1, stepName: '差別化ポイント発見', description: '独自の強みを特定' },
      11: { phase: 1, stepName: '新事実発見', description: '新しい価値提供を発見' },
      12: { phase: 2, stepName: '競合タイトル収集', description: '上位動画のタイトル分析' },
      13: { phase: 2, stepName: '順張り企画生成', description: '成功パターンに沿った企画' },
      14: { phase: 2, stepName: '逆張り企画生成', description: '差別化された企画' },
      15: { phase: 2, stepName: 'タイトル候補絞込', description: '最適な3案を選定' },
      16: { phase: 2, stepName: 'パワーワード提案', description: 'クリック率を高める言葉' },
      17: { phase: 2, stepName: '最終タイトル決定', description: '最終タイトルを決定' },
      18: { phase: 2, stepName: 'サムネワード決定', description: 'サムネイル文言を決定' },
      19: { phase: 3, stepName: '冒頭フック作成', description: '視聴者を引き込むフック' },
      20: { phase: 3, stepName: 'アクション整理', description: '具体的な行動ステップ' },
      21: { phase: 3, stepName: '構成案作成', description: '動画全体の流れを設計' },
      22: { phase: 3, stepName: '事例ピックアップ', description: '説得力のある事例を選定' },
      23: { phase: 4, stepName: '台本執筆', description: '完成度の高い台本を作成' },
      24: { phase: 4, stepName: '品質チェック', description: 'NGワード・リスクをチェック' },
    };

    return stepInfoMap[step] || null;
  }
}
