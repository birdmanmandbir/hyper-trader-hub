import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1500, // Increase warning limit to 1.5MB for vendor chunks
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress "/*#__PURE__*/" annotation warnings
        if (warning.code === 'INVALID_ANNOTATION') return;
        warn(warning);
      },
      output: {
        manualChunks: (id) => {
          // Split vendor libraries into separate chunks
          if (id.includes('node_modules')) {
            if (id.includes('@rainbow-me/rainbowkit')) {
              return 'rainbowkit';
            }
            if (id.includes('wagmi') || id.includes('viem')) {
              return 'web3';
            }
            if (id.includes('react-router') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'react-query';
            }
          }
        },
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
  ],
});
