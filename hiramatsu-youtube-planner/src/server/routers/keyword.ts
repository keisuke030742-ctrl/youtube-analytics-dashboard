/**
 * Keyword Router - キーワード管理API
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';

export const keywordRouter = createTRPCRouter({
  /**
   * 全キーワードを取得
   */
  list: publicProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        category: z.string().optional(),
        limit: z.number().min(1).max(500).optional().default(100),
        offset: z.number().min(0).optional().default(0),
        orderBy: z.enum(['volume', 'usageCount', 'priority', 'createdAt']).optional().default('createdAt'),
        orderDir: z.enum(['asc', 'desc']).optional().default('desc'),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { isActive, category, limit, offset, orderBy, orderDir } = input ?? {};

      const where = {
        ...(isActive !== undefined && { isActive }),
        ...(category && { category }),
      };

      const [keywords, total] = await Promise.all([
        ctx.prisma.keyword.findMany({
          where,
          orderBy: { [orderBy ?? 'createdAt']: orderDir ?? 'desc' },
          take: limit,
          skip: offset,
        }),
        ctx.prisma.keyword.count({ where }),
      ]);

      return { keywords, total };
    }),

  /**
   * キーワードをIDで取得
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.keyword.findUnique({
        where: { id: input.id },
      });
    }),

  /**
   * キーワードを検索
   */
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.keyword.findMany({
        where: {
          keyword: {
            contains: input.query,
          },
        },
        take: 20,
      });
    }),

  /**
   * 新規キーワードを作成
   */
  create: publicProcedure
    .input(
      z.object({
        keyword: z.string().min(1),
        volume: z.number().int().positive().optional(),
        difficulty: z.number().int().min(0).max(100).optional(),
        category: z.string().optional(),
        priority: z.number().int().optional().default(0),
        notes: z.string().optional(),
        source: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.keyword.create({
        data: input,
      });
    }),

  /**
   * キーワードを一括作成（インポート用）
   */
  bulkCreate: publicProcedure
    .input(
      z.object({
        keywords: z.array(
          z.object({
            keyword: z.string().min(1),
            volume: z.number().int().positive().optional(),
            difficulty: z.number().int().min(0).max(100).optional(),
            category: z.string().optional(),
            source: z.string().optional(),
          })
        ),
        skipDuplicates: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { keywords, skipDuplicates } = input;

      if (skipDuplicates) {
        // 既存キーワードを取得
        const existingKeywords = await ctx.prisma.keyword.findMany({
          where: {
            keyword: {
              in: keywords.map((k) => k.keyword),
            },
          },
          select: { keyword: true },
        });
        const existingSet = new Set(existingKeywords.map((k) => k.keyword));

        // 重複を除外
        const newKeywords = keywords.filter((k) => !existingSet.has(k.keyword));

        if (newKeywords.length === 0) {
          return { created: 0, skipped: keywords.length };
        }

        await ctx.prisma.keyword.createMany({
          data: newKeywords,
        });

        return { created: newKeywords.length, skipped: keywords.length - newKeywords.length };
      }

      await ctx.prisma.keyword.createMany({
        data: keywords,
        skipDuplicates: true,
      });

      return { created: keywords.length, skipped: 0 };
    }),

  /**
   * キーワードを更新
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        keyword: z.string().min(1).optional(),
        volume: z.number().int().positive().nullable().optional(),
        difficulty: z.number().int().min(0).max(100).nullable().optional(),
        category: z.string().nullable().optional(),
        priority: z.number().int().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().nullable().optional(),
        source: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.prisma.keyword.update({
        where: { id },
        data,
      });
    }),

  /**
   * キーワードの使用回数を更新
   */
  incrementUsage: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.keyword.update({
        where: { id: input.id },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }),

  /**
   * キーワードを削除
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.keyword.delete({
        where: { id: input.id },
      });
    }),

  /**
   * キーワードを一括削除
   */
  bulkDelete: publicProcedure
    .input(z.object({ ids: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.keyword.deleteMany({
        where: { id: { in: input.ids } },
      });
      return { deleted: result.count };
    }),

  /**
   * 統計情報を取得
   */
  stats: publicProcedure.query(async ({ ctx }) => {
    const [total, active, inactive, categories, avgStats] = await Promise.all([
      ctx.prisma.keyword.count(),
      ctx.prisma.keyword.count({ where: { isActive: true } }),
      ctx.prisma.keyword.count({ where: { isActive: false } }),
      ctx.prisma.keyword.groupBy({
        by: ['category'],
        _count: true,
      }),
      ctx.prisma.keyword.aggregate({
        _avg: {
          volume: true,
          usageCount: true,
        },
      }),
    ]);

    const byCategory: Record<string, number> = {};
    categories.forEach((c) => {
      byCategory[c.category ?? 'uncategorized'] = c._count;
    });

    return {
      total,
      active,
      inactive,
      avgVolume: avgStats._avg.volume ?? 0,
      avgUsageCount: avgStats._avg.usageCount ?? 0,
      byCategory,
    };
  }),

  /**
   * 企画生成用のキーワードを選定
   */
  selectForPlanning: publicProcedure
    .input(
      z.object({
        count: z.number().int().min(1).max(100).default(30),
        minVolume: z.number().int().optional(),
        maxUsageCount: z.number().int().optional(),
        categories: z.array(z.string()).optional(),
        excludeCategories: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { count, minVolume, maxUsageCount, categories, excludeCategories } = input;

      const where = {
        isActive: true,
        ...(minVolume && { volume: { gte: minVolume } }),
        ...(maxUsageCount !== undefined && { usageCount: { lte: maxUsageCount } }),
        ...(categories && categories.length > 0 && { category: { in: categories } }),
        ...(excludeCategories && excludeCategories.length > 0 && {
          NOT: { category: { in: excludeCategories } },
        }),
      };

      // スコアリング: 使用回数が少なく、ボリュームが高いものを優先
      const keywords = await ctx.prisma.keyword.findMany({
        where,
        orderBy: [
          { usageCount: 'asc' },
          { volume: 'desc' },
          { priority: 'desc' },
          { lastUsedAt: 'asc' },
        ],
        take: count,
      });

      return keywords;
    }),
});
