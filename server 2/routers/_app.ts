import { router } from '../trpc';
import { aiRouter } from './ai';

export const appRouter = router({
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;

