import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
  async scheduled(event, env, ctx) {
    const { cron } = event;
    
    // Import cron handlers dynamically to avoid loading them during normal requests
    const { handleCronTrigger } = await import("../app/services/cron.server");
    
    try {
      await handleCronTrigger(cron, env, ctx);
    } catch (error) {
      console.error(`Error handling cron ${cron}:`, error);
      // Re-throw to mark the cron execution as failed
      throw error;
    }
  },
} satisfies ExportedHandler<Env>;