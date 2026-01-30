/**
 * Planner Router - 企画生成API
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { ProjectStatus } from '@prisma/client';

export const plannerRouter = createTRPCRouter({
  /**
   * Phase 1のみ実行
   */
  /**
   * Phase 1 (企画立案) 実行
   */
  runPhase1: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        userInstruction: z.string(),
        llmProvider: z.enum(['claude', 'openai']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // プロジェクトを取得
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // ステータスを実行中に更新
      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      try {
        // Orchestratorを使ってPhase 1を実行
        const orchestrator = new Orchestrator(input.llmProvider ?? 'claude');

        // 実行ログを記録するコールバック
        const onProgress = async (
          phase: number,
          step: number,
          stepName: string,
          result?: any
        ) => {
          console.log(`Phase ${phase}, Step ${step}: ${stepName}`);

          // 実行ログを保存
          await ctx.prisma.execution.create({
            data: {
              projectId: input.projectId,
              phase,
              step,
              agentName: stepName,
              status: result ? 'COMPLETED' : 'RUNNING',
              input: {},
              output: result ?? {},
              startedAt: new Date(),
              completedAt: result ? new Date() : null,
            },
          });
        };

        const phase1Result = await orchestrator.runPhase1(
          input.userInstruction,
          onProgress
        );

        // 結果を保存
        const updatedProject = await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: {
            phase1Result: phase1Result as any,
            keyword: phase1Result.seo_keyword?.keyword,
          },
        });

        return {
          success: true,
          project: updatedProject,
          phase1Result,
        };
      } catch (error) {
        // エラー時はFAILEDステータスに
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { status: ProjectStatus.FAILED },
        });

        throw error;
      }
    }),

  /**
   * Phase 2 (タイトル・サムネ) 実行
   */
  runPhase2: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        llmProvider: z.enum(['claude', 'openai']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) throw new Error('Project not found');

      // ステータス更新
      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      try {
        const orchestrator = new Orchestrator(input.llmProvider ?? 'claude');
        
        // 以前のフェーズの結果をステートに復元
        if (project.phase1Result) {
          const p1 = project.phase1Result as any;
          orchestrator.state.set('keyword', p1.seo_keyword?.keyword);
          orchestrator.state.set('competitor_info', p1.competitor_info);
          orchestrator.state.set('differentiation_points', p1.differentiation.differentiation_points);
          orchestrator.state.set('unresolved_issues', p1.unresolved_issues.unresolved_issues);
          orchestrator.state.set('new_facts', p1.new_fact.new_facts);
          orchestrator.state.set('persona', p1.persona.persona);
        }

        const onProgress = async (phase: number, step: number, stepName: string, result?: any) => {
          console.log(`Phase ${phase}, Step ${step}: ${stepName}`);
          await ctx.prisma.execution.create({
            data: {
              projectId: input.projectId,
              phase,
              step,
              agentName: stepName,
              status: result ? 'COMPLETED' : 'RUNNING',
              output: result ?? {},
              startedAt: new Date(),
              completedAt: result ? new Date() : null,
            },
          });
        };

        const results = await orchestrator.runPhase2(onProgress);

        const updatedProject = await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: {
            phase2Result: results as any,
            title: results.final_title?.final_title,
            thumbnailWord: results.thumbnail_word?.thumbnail_word,
          },
        });

        return { success: true, project: updatedProject, results };
      } catch (error) {
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { status: ProjectStatus.FAILED },
        });
        throw error;
      }
    }),

  /**
   * Phase 3 (構成) 実行
   */
  runPhase3: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        llmProvider: z.enum(['claude', 'openai']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) throw new Error('Project not found');

      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      try {
        const orchestrator = new Orchestrator(input.llmProvider ?? 'claude');
        
        // 前フェーズの復元
        if (project.phase1Result) {
          const p1 = project.phase1Result as any;
          orchestrator.state.set('pain_points', p1.psychology.pain_points);
          orchestrator.state.set('new_facts', p1.new_fact.new_facts);
          orchestrator.state.set('differentiation_points', p1.differentiation.differentiation_points);
          orchestrator.state.set('unresolved_issues', p1.unresolved_issues.unresolved_issues);
        }
        if (project.phase2Result) {
          const p2 = project.phase2Result as any;
          orchestrator.state.set('final_title', p2.final_title.final_title);
        }

        const onProgress = async (phase: number, step: number, stepName: string, result?: any) => {
          console.log(`Phase ${phase}, Step ${step}: ${stepName}`);
          await ctx.prisma.execution.create({
            data: {
              projectId: input.projectId,
              phase,
              step,
              agentName: stepName,
              status: result ? 'COMPLETED' : 'RUNNING',
              output: result ?? {},
              startedAt: new Date(),
              completedAt: result ? new Date() : null,
            },
          });
        };

        const results = await orchestrator.runPhase3(onProgress);

        const updatedProject = await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: {
            phase3Result: results as any,
          },
        });

        return { success: true, project: updatedProject, results };
      } catch (error) {
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { status: ProjectStatus.FAILED },
        });
        throw error;
      }
    }),

  /**
   * Phase 4 (台本) 実行
   */
  runPhase4: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        llmProvider: z.enum(['claude', 'openai']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) throw new Error('Project not found');

      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      try {
        const orchestrator = new Orchestrator(input.llmProvider ?? 'claude');
        
        // 前フェーズの復元
        if (project.phase2Result) {
          const p2 = project.phase2Result as any;
          orchestrator.state.set('final_title', p2.final_title.final_title);
          orchestrator.state.set('thumbnail_word', p2.thumbnail_word.thumbnail_word);
        }
        if (project.phase3Result) {
          const p3 = project.phase3Result as any;
          orchestrator.state.set('hook_script', p3.hook.hook_script);
          orchestrator.state.set('structure', p3.structure.structure);
          orchestrator.state.set('examples', p3.example.examples);
          orchestrator.state.set('action_steps', p3.action.action_steps);
        }

        const onProgress = async (phase: number, step: number, stepName: string, result?: any) => {
          console.log(`Phase ${phase}, Step ${step}: ${stepName}`);
          await ctx.prisma.execution.create({
            data: {
              projectId: input.projectId,
              phase,
              step,
              agentName: stepName,
              status: result ? 'COMPLETED' : 'RUNNING',
              output: result ?? {},
              startedAt: new Date(),
              completedAt: result ? new Date() : null,
            },
          });
        };

        const results = await orchestrator.runPhase4(onProgress);

        const updatedProject = await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: {
            phase4Result: results as any,
            finalScript: results.final_script?.script,
            status: ProjectStatus.COMPLETED,
          },
        });

        return { success: true, project: updatedProject, results };
      } catch (error) {
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { status: ProjectStatus.FAILED },
        });
        throw error;
      }
    }),

  /**
   * 全フェーズを一括実行
   */
  runAll: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        userInstruction: z.string(),
        llmProvider: z.enum(['claude', 'openai']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // プロジェクトを取得
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // ステータスを実行中に更新
      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      try {
        // Orchestratorを使って全フェーズを実行
        const orchestrator = new Orchestrator(input.llmProvider ?? 'claude');

        // 実行ログを記録するコールバック
        const onProgress = async (
          phase: number,
          step: number,
          stepName: string,
          result?: any
        ) => {
          console.log(`Phase ${phase}, Step ${step}: ${stepName}`);

          await ctx.prisma.execution.create({
            data: {
              projectId: input.projectId,
              phase,
              step,
              agentName: stepName,
              status: result ? 'COMPLETED' : 'RUNNING',
              input: {},
              output: result ?? {},
              startedAt: new Date(),
              completedAt: result ? new Date() : null,
            },
          });
        };

        const allResults = await orchestrator.runAll(
          input.userInstruction,
          onProgress
        );

        // 結果を保存
        const updatedProject = await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: {
            status: ProjectStatus.COMPLETED,
            phase1Result: allResults.phase1 as any,
            phase2Result: allResults.phase2 as any,
            phase3Result: allResults.phase3 as any,
            phase4Result: allResults.phase4 as any,
            keyword: allResults.phase1.seo_keyword?.keyword,
            title: allResults.phase2.final_title?.title,
            thumbnailWord: allResults.phase2.thumbnail_word?.word,
            finalScript: allResults.phase4.final_script?.script,
          },
        });

        return {
          success: true,
          project: updatedProject,
          results: allResults,
        };
      } catch (error) {
        // エラー時はFAILEDステータスに
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { status: ProjectStatus.FAILED },
        });

        throw error;
      }
    }),

  /**
   * ステップ情報を取得
   */
  getStepInfo: publicProcedure
    .input(
      z.object({
        step: z.number().min(1).max(24),
      })
    )
    .query(({ input }) => {
      const orchestrator = new Orchestrator('claude');
      const stepInfo = orchestrator.getStepInfo(input.step);

      if (!stepInfo) {
        throw new Error(`Invalid step number: ${input.step}`);
      }

      return stepInfo;
    }),

  /**
   * 単一ステップを実行
   */
  runSingleStep: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        step: z.number().min(1).max(24),
        userInstruction: z.string().optional(),
        currentState: z.record(z.any()).optional(),
        llmProvider: z.enum(['claude', 'openai']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // プロジェクトを取得
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.projectId },
      });

      if (!project) {
        throw new Error('Project not found');
      }

      // ステータスを実行中に更新
      await ctx.prisma.project.update({
        where: { id: input.projectId },
        data: { status: ProjectStatus.IN_PROGRESS },
      });

      try {
        // Orchestratorを作成
        const orchestrator = new Orchestrator(input.llmProvider ?? 'claude');

        // 既存のステートを復元（前のステップの結果を引き継ぐ）
        if (input.currentState) {
          for (const [key, value] of Object.entries(input.currentState)) {
            orchestrator.state.set(key, value);
          }
        }

        // 初回実行の場合はuser_instructionを設定
        if (input.step === 1 && input.userInstruction) {
          orchestrator.state.set('user_instruction', input.userInstruction);
        }

        // ステップ情報を取得
        const stepInfo = orchestrator.getStepInfo(input.step);
        if (!stepInfo) {
          throw new Error(`Invalid step number: ${input.step}`);
        }

        // 実行ログを記録するコールバック
        const onProgress = async (
          phase: number,
          step: number,
          stepName: string,
          result?: any
        ) => {
          console.log(`Phase ${phase}, Step ${step}: ${stepName}`);

          await ctx.prisma.execution.create({
            data: {
              projectId: input.projectId,
              phase,
              step,
              agentName: stepName,
              status: result ? 'COMPLETED' : 'RUNNING',
              input: {},
              output: result ?? {},
              startedAt: new Date(),
              completedAt: result ? new Date() : null,
            },
          });
        };

        // 単一ステップを実行
        const result = await orchestrator.runStep(input.step, onProgress);

        // 更新されたステートを取得
        const updatedState = orchestrator.getState() as any;

        // 結果を保存（該当フェーズのResultカラムに保存）
        const updateData: any = {};

        if (stepInfo.phase === 1) {
          updateData.phase1Result = updatedState;
          if (updatedState.seo_keyword) {
            updateData.keyword = updatedState.seo_keyword.keyword;
          }
        } else if (stepInfo.phase === 2) {
          updateData.phase2Result = updatedState;
          if (updatedState.final_title) {
            updateData.title = updatedState.final_title.title;
          }
          if (updatedState.thumbnail_word) {
            updateData.thumbnailWord = updatedState.thumbnail_word.word;
          }
        } else if (stepInfo.phase === 3) {
          updateData.phase3Result = updatedState;
        } else if (stepInfo.phase === 4) {
          updateData.phase4Result = updatedState;
          if (updatedState.script) {
            updateData.finalScript = updatedState.script;
          }
          // 最後のステップ（品質チェック）が完了したらCOMPLETEDに
          if (input.step === 24) {
            updateData.status = ProjectStatus.COMPLETED;
          }
        }

        const updatedProject = await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: updateData,
        });

        return {
          success: true,
          project: updatedProject,
          stepResult: result,
          updatedState,
          stepInfo,
        };
      } catch (error) {
        // エラー時はFAILEDステータスに
        await ctx.prisma.project.update({
          where: { id: input.projectId },
          data: { status: ProjectStatus.FAILED },
        });

        throw error;
      }
    }),
});
