import "dotenv/config";
import { createRequestHandler } from "@react-router/express";
import express from "express";
import { createServer } from "http";
import { initializeSocketIO } from "./app/lib/realtime.server";
import { db } from './app/lib/db.server';

const viteDevServer = 
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );
      

      
const app = express();
app.set('trust proxy', true);

// (diagnostics removed)

// Debug middleware
app.use((req, res, next) => {
  if (req.path.includes('auth/login')) {
    console.log('[REQUEST]', req.method, req.path, 'Content-Type:', req.headers['content-type']);
  }
  next();
});

// Note: Do not parse request bodies here - React Router's request handlers
// (loaders/actions) need access to the raw request body. Parsing JSON with
// Express here would consume the stream and make `request.json()` in route
// actions throw "Unexpected end of JSON input". If you need an Express-only
// JSON endpoint, mount `express.json()` on that specific route instead.

// Handle .well-known requests (Chrome DevTools, etc.)
app.use((req, res, next) => {
  if (req.path.startsWith("/.well-known/")) {
    return res.status(404).end();
  }
  next();
});

// Serve static files in production; in dev the Vite middleware is mounted after
// the app routes/SSR handler so API routes are not intercepted by Vite's index.html fallback.
if (!viteDevServer) {
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
  app.use(express.static("build/client", { maxAge: "1h" }));
}

// Note: preview requests are handled by the React Router loader
// (`app/routes/api.posts.$postId.preview.tsx`). No Express fallback here.

// Vite dev server middleware: mount before the SSR handler in dev, but
// skip handling for API routes so Vite doesn't serve index.html for them.
if (viteDevServer) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/.well-known/')) {
      console.log('[SKIP VITE]', req.method, req.path);
      return next();
    }
    return viteDevServer.middlewares(req, res, next);
  });
}


// Permanent Express JSON preview endpoint — placed after static/Vite handling
// but before the SSR handler to guarantee deterministic JSON responses.
app.get('/api/posts/:postId/preview', async (req, res) => {
  try {
    const { postId } = req.params;
    if (!postId) return res.status(400).json({ error: 'missing_postId' });

    const sanitizedId = String(postId).split(/\s+/).join('').trim();

    const post = await db.post.findUnique({
      where: { id: sanitizedId },
      include: { user: true },
    });

    if (!post) return res.status(404).json({ error: 'not_found' });

    const preview = {
      id: post.id,
      textContent: post.textContent ?? '',
      mediaUrls: post.mediaUrls || [],
      user: {
        id: post.user.id,
        displayName: post.user.displayName ?? post.user.displayName,
        profilePhotoUrl: post.user.profilePhotoUrl ?? null,
      },
      caption: post.textContent ? post.textContent.slice(0, 120) : null,
    };

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Accept');
    return res.status(200).json(preview);
  } catch (err) {
    console.error('[preview api] error', err);
    return res.status(500).json({ error: 'internal_error' });
  }
});

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
