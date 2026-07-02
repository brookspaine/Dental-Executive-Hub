import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 5173;

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    // When no API proxy is configured, return 503 for /api/* so React Query
    // error-states and uses the = [] defaults instead of receiving Vite's
    // SPA fallback HTML as data (which crashes .map calls).
    {
      name: "api-stub",
      configureServer(server) {
        server.middlewares.use("/api", (_req, res, next) => {
          if ((server.config.server.proxy ?? {})["/api"]) return next();
          res.statusCode = 503;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ error: "API server not running locally" }));
        });
      },
    },
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    // Proxy to the API server when running locally.
    // Start the api-server on port 3001 (PORT=3001 pnpm run dev in artifacts/api-server)
    // then uncomment:
    proxy: { "/api": { target: "http://localhost:3001", changeOrigin: true } },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
