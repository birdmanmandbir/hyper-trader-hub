import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import devtoolsJson from "vite-plugin-devtools-json";

export default defineConfig({
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress "/*#__PURE__*/" annotation warnings
        if (warning.code === 'INVALID_ANNOTATION') return;
        warn(warning);
      },
    },
  },
  plugins: [
    cloudflare({
      persistState: true,
      viteEnvironment: { name: "ssr" }
    }),
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    devtoolsJson(),
  ],
});
