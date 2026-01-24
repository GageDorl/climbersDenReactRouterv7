import "dotenv/config";
import { createRequestHandler } from "@react-router/express";
import express from "express";
import { createServer } from "http";
import { initializeSocketIO } from "./app/lib/realtime.server";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const app = express();

// Debug middleware
app.use((req, res, next) => {
  if (req.path.includes('auth/login')) {
    console.log('[REQUEST]', req.method, req.path, 'Content-Type:', req.headers['content-type']);
  }
  next();
});

// Configure body size limits for file uploads
// Note: Only use JSON parser - React Router handles form data parsing itself
// including both urlencoded and multipart (FormData with files)
app.use(express.json({ limit: "100mb" }));

// Handle .well-known requests (Chrome DevTools, etc.)
app.use((req, res, next) => {
  if (req.path.startsWith("/.well-known/")) {
    return res.status(404).end();
  }
  next();
});

// Vite dev server in development
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Serve static files in production
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
  app.use(express.static("build/client", { maxAge: "1h" }));
}

// React Router request handler
app.use(
  createRequestHandler({
    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule("virtual:react-router/server-build")
      : // @ts-expect-error - Production build path
        () => import("./build/server/index.js"),
  })
);

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO
initializeSocketIO(httpServer);

const port = process.env.PORT || 3000;
httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
