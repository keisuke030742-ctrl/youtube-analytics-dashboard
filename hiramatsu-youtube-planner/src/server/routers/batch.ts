/**
 * Batch Router - 自動生成バッチ管理API
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { BatchStatus } from '@prisma/client';

export const batchRouter = createTRPCRouter({
  /**
   * バッチ一覧を取得
   */
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        offset: z.number().min(0).optional().default(0),
        status: z.nativeEnum(BatchStatus).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset, status } = input ?? {};

      const where = status ? { status } : {};

      const [batches, total] = await Promise.all([
        ctx.prisma.autoPlanBatch.findMany({
          where,
          orderBy: { triggeredAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            projects: {
              select: {
                id: true,
                title: true,
                keyword: true,
                status: true,
              },
            },
          },
        }),
        ctx.prisma.autoPlanBatch.count({ where }),
      ]);

      return { batches, total };
    }),

  /**
   * バッチをIDで取得
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.autoPlanBatch.findUnique({
        where: { id: input.id },
        include: {
          projects: {
            include: {
              executions: {
                orderBy: { startedAt: 'asc' },
              },
            },
          },
        },
      });
    }),

  /**
   * 最新のバッチを取得
   */
  latest: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.autoPlanBatch.findFirst({
      orderBy: { triggeredAt: 'desc' },
      include: {
        projects: {
          select: {
            id: true,
            title: true,
            keyword: true,
            status: true,
          },
        },
      },
    });
  }),

  /**
   * バッチを作成（通常はAutoPlanner経由で作成）
   */
  create: publicProcedure
    .input(
      z.object({
        triggeredBy: z.enum(['cron', 'manual']).default('manual'),
        targetCount: z.number().int().min(1).max(100).default(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.autoPlanBatch.create({
        data: {
          triggeredBy: input.triggeredBy,
          targetCount: input.targetCount,
          status: BatchStatus.RUNNING,
        },
      });
    }),

  /**
   * バッチを更新
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.nativeEnum(BatchStatus).optional(),
        totalPlans: z.number().int().optional(),
        completedPlans: z.number().int().optional(),
        failedPlans: z.number().int().optional(),
        trendData: z.any().optional(),
        selectedKeywords: z.any().optional(),
        error: z.string().nullable().optional(),
        completedAt: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.prisma.autoPlanBatch.update({
        where: { id },
        data,
      });
    }),

  /**
   * バッチを削除
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // 関連するプロジェクトのbatchIdをnullに更新
      await ctx.prisma.project.updateMany({
        where: { batchId: input.id },
        data: { batchId: null },
      });

      return await ctx.prisma.autoPlanBatch.delete({
        where: { id: input.id },
      });
    }),

  /**
   * 統計情報を取得
   */
  stats: publicProcedure.query(async ({ ctx }) => {
    const [total, byStatus, recent] = await Promise.all([
      ctx.prisma.autoPlanBatch.count(),
      ctx.prisma.autoPlanBatch.groupBy({
        by: ['status'],
        _count: true,
      }),
      ctx.prisma.autoPlanBatch.findMany({
        orderBy: { triggeredAt: 'desc' },
        take: 10,
        select: {
          id: true,
          triggeredAt: true,
          status: true,
          totalPlans: true,
          completedPlans: true,
          failedPlans: true,
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      PARTIAL: 0,
    };
    byStatus.forEach((s) => {
      statusCounts[s.status] = s._count;
    });

    const successRate =
      recent.length > 0
        ? recent.reduce((acc, b) => {
            const rate = b.totalPlans > 0 ? b.completedPlans / b.totalPlans : 0;
            return acc + rate;
          }, 0) / recent.length
        : 0;

    return {
      total,
      byStatus: statusCounts,
      recentSuccessRate: Math.round(successRate * 100),
      recentBatches: recent,
    };
  }),

  /**
   * 実行中のバッチがあるかチェック
   */
  hasRunning: publicProcedure.query(async ({ ctx }) => {
    const running = await ctx.prisma.autoPlanBatch.findFirst({
      where: { status: BatchStatus.RUNNING },
    });
    return !!running;
  }),
});
