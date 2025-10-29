import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCContext, createTRPCRouter } from "~/server/api/trpc";
import { projectRouter } from "./routers/project";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  project: projectRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);

// Helper to create a server-side caller within a valid request context.
// Use inside server components, route handlers, or server actions.
export async function getServerCaller(requestHeaders: Readonly<Headers>) {
  const ctx = await createTRPCContext({ headers: new Headers(requestHeaders) });
  return createCaller(ctx);
}
