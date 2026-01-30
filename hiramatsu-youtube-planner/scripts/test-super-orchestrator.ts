/**
 * Super Orchestrator テストスクリプト
 * 小規模（3件）でテスト実行
 */

import { SuperOrchestrator } from '../src/lib/agents/super-orchestrator';

async function main() {
  console.log('🚀 Super Orchestrator テスト開始\n');
  console.log('========================================');

  const superOrch = new SuperOrchestrator({
    targetCount: 3,  // テスト用に3件
    strategy: 'balanced',
    concurrency: 2,  // 同時実行数
    llmProvider: 'claude',
  });

  try {
    console.log('\n📊 キーワード戦略AIを実行中...');
    const result = await superOrch.runWeeklyGeneration('manual');

    console.log('\n========================================');
    console.log('✅ テスト完了!\n');
    console.log('バッチID:', result.batchId);
    console.log('ステータス:', result.status);
    console.log('成功:', result.completedPlans, '件');
    console.log('失敗:', result.failedPlans, '件');

    if (result.topPlans.length > 0) {
      console.log('\n🏆 生成された企画:');
      result.topPlans.forEach((plan, i) => {
        console.log(`  ${i + 1}. ${plan.title || plan.keyword}`);
        console.log(`     キーワード: ${plan.keyword}`);
        console.log(`     優先順位: ${plan.priorityRank}位`);
      });
    }

  } catch (error) {
    console.error('\n❌ エラー発生:', error);
    process.exit(1);
  }
}

main();
