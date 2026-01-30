/**
 * tRPC Server Configuration
 */

import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';
import prisma from '@/lib/prisma';

/**
 * Context creation
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    prisma,
    ...opts,
  };
};

/**
 * Initialize tRPC
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 */
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
