import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist", "public");
const indexHtml = path.join(distDir, "index.html");

const port = Number(process.env.PORT);
if (!port || Number.isNaN(port)) {
  throw new Error("PORT environment variable is required");
}

const app = express();

app.use(
  express.static(distDir, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith("index.html")) {
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, max-age=0",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      } else if (/\.(js|css|woff2?|png|jpe?g|svg|gif|webp|avif|ico)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    },
  }),
);

app.get(/.*/, (_req, res) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.sendFile(indexHtml);
});

if (!fs.existsSync(indexHtml)) {
  throw new Error(`index.html not found at ${indexHtml}. Did the build run?`);
}

app.listen(port, "0.0.0.0", () => {
  console.log(`[dental-dashboard] serving ${distDir} on port ${port}`);
});
