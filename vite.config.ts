import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  ssr: {
    target: "webworker",
    noExternal: true,
    resolve: {
      conditions: ["workerd", "worker", "node", "browser"],
      mainFields: ["module", "main", "browser"],
      externalConditions: ["workerd", "worker", "node"],
    },
  },
  resolve: {
    conditions: ["workerd", "worker", "node", "browser"],
    mainFields: ["module", "main", "browser"],
  },
  define: {
    global: "globalThis",
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress "/*#__PURE__*/" annotation warnings
        if (warning.code === 'INVALID_ANNOTATION') return;
        // Suppress all externalization warnings
        if (warning.message?.includes('externalized')) return;
        // Suppress webcrypto warnings
        if (warning.message?.includes('webcrypto') || warning.message?.includes('__vite-browser-external')) return;
        warn(warning);
      },
    },
  },
  plugins: [
    cloudflare({
      persistState: true,
    }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
  ],
});
