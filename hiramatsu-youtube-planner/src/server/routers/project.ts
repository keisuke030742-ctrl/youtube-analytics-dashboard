/**
 * Project Router - 企画管理API
 */

import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../trpc';
import { ProjectStatus } from '@prisma/client';

export const projectRouter = createTRPCRouter({
  /**
   * 全企画を取得
   */
  list: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.project.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }),

  /**
   * 企画をIDで取得
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          executions: {
            orderBy: { startedAt: 'asc' },
          },
        },
      });
    }),

  /**
   * 新規企画を作成
   */
  create: publicProcedure
    .input(
      z.object({
        userInstruction: z.string().min(1),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.project.create({
        data: {
          userInstruction: input.userInstruction,
          title: input.title,
          status: ProjectStatus.DRAFT,
        },
      });
    }),

  /**
   * 企画を更新
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        keyword: z.string().optional(),
        status: z.nativeEnum(ProjectStatus).optional(),
        phase1Result: z.any().optional(),
        phase2Result: z.any().optional(),
        phase3Result: z.any().optional(),
        phase4Result: z.any().optional(),
        finalScript: z.string().optional(),
        thumbnailWord: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.prisma.project.update({
        where: { id },
        data,
      });
    }),

  /**
   * 企画を削除
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.project.delete({
        where: { id: input.id },
      });
    }),
});
