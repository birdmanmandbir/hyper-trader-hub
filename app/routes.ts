import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("connect-wallet", "routes/connect-wallet.tsx"),
  route("daily-target", "routes/daily-target.tsx"),
  route("advanced-settings", "routes/advanced-settings.tsx"),
  route("tips", "routes/tips.tsx"),
  route("checklist", "routes/checklist.tsx")
] satisfies RouteConfig;
