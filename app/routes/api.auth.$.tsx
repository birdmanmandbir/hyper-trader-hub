import type { Route } from "./+types/api.auth.$";
import { getAuth } from "~/lib/better-auth.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = getAuth(context.cloudflare.env);
  return auth.handler(request);
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = getAuth(context.cloudflare.env);
  return auth.handler(request);
}