import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { createOperationsApiResponse } from "./src/server/operations-api.js";

function titanOperationsApi(): Plugin {
  let cachedInternal: ReturnType<typeof createOperationsApiResponse> | null = null;
  return {
    name: "titan-operations-local-api",
    configureServer(server) {
      server.middlewares.use("/api/operations", async (request, response) => {
        try {
          const url = new URL(request.url ?? "/", "http://localhost");
          const mode = url.searchParams.get("mode") === "masked" ? "MASKED_DEMO" : "INTERNAL_DATA";
          const workbookPath = process.env.TITAN_RC0_WORKBOOK_PATH;
          if (!workbookPath) throw new Error("Authorized workbook path is not configured for this local session.");
          cachedInternal ??= createOperationsApiResponse(workbookPath, "INTERNAL_DATA", null);
          const payload = mode === "INTERNAL_DATA"
            ? await cachedInternal
            : await createOperationsApiResponse(workbookPath, mode, process.env.TITAN_RC0_MASK_KEY ?? null);
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store, max-age=0");
          response.end(JSON.stringify(payload));
        } catch (error) {
          response.statusCode = 503;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store, max-age=0");
          response.end(JSON.stringify({ error: error instanceof Error ? error.message : "Local data service unavailable" }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), titanOperationsApi()],
  server: { host: "127.0.0.1", port: 4173, strictPort: true },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
  build: { target: "es2022", outDir: "dist/ui" },
});
