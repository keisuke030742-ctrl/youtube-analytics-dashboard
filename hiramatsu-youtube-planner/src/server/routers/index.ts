/**
 * Root Router - 全てのルーターを統合
 */

import { createTRPCRouter } from '../trpc';
import { projectRouter } from './project';
import { plannerRouter } from './planner';
import { keywordRouter } from './keyword';
import { batchRouter } from './batch';

export const appRouter = createTRPCRouter({
  project: projectRouter,
  planner: plannerRouter,
  keyword: keywordRouter,
  batch: batchRouter,
});

export type AppRouter = typeof appRouter;
