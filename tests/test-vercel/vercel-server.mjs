/**
 * Local Vercel Functions Server
 *
 * This server simulates Vercel's serverless function runtime locally.
 * It serves static files from .vercel/output/static and handles
 * serverless functions from .vercel/output/functions.
 */

import { createServer } from "node:http";
import { readFile, stat, readdir } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { AsyncLocalStorage } from "node:async_hooks";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERCEL_OUTPUT = join(__dirname, ".vercel", "output");
const STATIC_DIR = join(VERCEL_OUTPUT, "static");
const FUNCTIONS_DIR = join(VERCEL_OUTPUT, "functions");

const PORT = process.env.PORT || 3456;

// Set up AsyncLocalStorage for request isolation
// This allows each request to have its own context instead of sharing a global one
const requestAsyncLocalStore = new AsyncLocalStorage();
globalThis.__vxrnrequestAsyncLocalStore = requestAsyncLocalStore;

// Don't set VERCEL=1 - this would make the One framework use a global context
// instead of per-request AsyncLocalStorage isolation
process.env.VERCEL_URL = `localhost:${PORT}`;
// Required for SSR mode detection in One
process.env.VITE_ENVIRONMENT = "ssr";

// Load Edge Middleware if it exists
let middleware = null;
try {
  const middlewarePath = join(FUNCTIONS_DIR, "_middleware.func", "_wrapped_middleware.js");
  await stat(middlewarePath);
  const middlewareModule = await import(pathToFileURL(middlewarePath).href);
  middleware = middlewareModule.default;
  console.log("Loaded Edge Middleware");
} catch (err) {
  // Middleware doesn't exist, that's fine
}

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

// Loader request pattern: /assets/dynamic_123_vxrn_loader.js or /assets/ssr-page_vxrn_loader.js
const LOADER_REGEX = /^\/assets\/(.+?)_\d+_vxrn_loader\.js$/;

// Load routes from config.json
let configRoutes = [];
try {
  const configPath = join(VERCEL_OUTPUT, "config.json");
  const config = JSON.parse(await readFile(configPath, "utf-8"));
  configRoutes = config.routes || [];
  console.log("Loaded", configRoutes.length, "routes from config.json");
} catch (err) {
  console.log("No config.json found or error loading routes");
}

/**
 * Process routes from config.json and return rewritten pathname if matched
 * skipCatchAll: if true, skip catch-all routes (used before checking files/functions)
 */
function processRoutes(pathname, skipCatchAll = false) {
  let inRewritePhase = false;

  for (const route of configRoutes) {
    // Handle phase markers
    if (route.handle === "rewrite") {
      inRewritePhase = true;
      continue;
    }

    // Skip middleware routes (handled separately)
    if (route.middlewarePath) {
      continue;
    }

    // Only process rewrite routes after the 'rewrite' handle marker
    if (!inRewritePhase) continue;

    // Match the route pattern
    if (route.src && route.dest) {
      // Skip catch-all routes if requested (they should only apply after files/functions fail)
      // Catch-all routes typically have patterns like "^(?:/.*)?$" or match everything
      if (skipCatchAll && route.dest.includes("notfound=")) {
        continue;
      }

      const regex = new RegExp(route.src);
      const match = pathname.match(regex);

      if (match) {
        // Apply the rewrite - replace $param with captured groups
        let dest = route.dest;

        // Handle named groups
        if (match.groups) {
          for (const [name, value] of Object.entries(match.groups)) {
            const before = dest;
            dest = dest.replace(new RegExp(`\\$${name}`, "g"), value);
            if (before !== dest) {
              console.log(`  Replaced $${name} -> ${value}`);
            }
          }
        }

        // Handle numbered groups
        for (let i = 1; i < match.length; i++) {
          dest = dest.replace(new RegExp(`\\$${i}`, "g"), match[i]);
        }

        console.log(`Route rewrite: ${pathname} -> ${dest}`);
        return dest;
      }
    }
  }

  return null;
}

/**
 * Parse a loader request path and return the original page path
 * e.g., /assets/dynamic_123_12345_vxrn_loader.js -> /dynamic/123
 * e.g., /assets/ssr-page_12345_vxrn_loader.js -> /ssr-page
 */
function parseLoaderPath(pathname) {
  const match = pathname.match(LOADER_REGEX);
  if (!match) return null;

  // Convert underscores back to slashes, but handle special cases
  // dynamic_123 -> /dynamic/123
  // ssr-page -> /ssr-page
  let pagePath = "/" + match[1].replace(/_/g, "/");

  return pagePath;
}

/**
 * Find a matching function directory for a given path
 */
async function findFunction(pathname) {
  // Normalize pathname
  const normalizedPath = pathname.endsWith("/") ? pathname.slice(0, -1) || "/" : pathname;

  // Try exact match first (for API routes)
  const exactPaths = [
    join(FUNCTIONS_DIR, normalizedPath + ".func"),
    join(FUNCTIONS_DIR, normalizedPath, "index.func"),
  ];

  for (const funcPath of exactPaths) {
    try {
      const stats = await stat(funcPath);
      if (stats.isDirectory()) {
        return funcPath;
      }
    } catch {}
  }

  // Try dynamic route matching
  const parts = normalizedPath.split("/").filter(Boolean);
  const candidates = [];

  async function scanDir(dir, depth = 0) {
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const entryName = entry.name;

          if (entryName.endsWith(".func")) {
            candidates.push({
              path: join(dir, entryName),
              name: entryName.slice(0, -5),
            });
          } else {
            await scanDir(join(dir, entryName), depth + 1);
          }
        }
      }
    } catch {}
  }

  await scanDir(FUNCTIONS_DIR);

  // Match dynamic routes
  for (const candidate of candidates) {
    const funcPath = candidate.path
      .replace(FUNCTIONS_DIR, "")
      .replace(".func", "")
      .replace(/\\/g, "/");

    // Convert Vercel path params to regex
    // :param -> matches single segment
    // * -> matches rest
    let pattern = funcPath
      .replace(/\[([^\]]+)\]/g, ":$1") // [param] -> :param for internal use
      .replace(/:([^/]+)/g, "([^/]+)") // :param -> regex group
      .replace(/\*/g, "(.+)"); // * -> matches rest

    const regex = new RegExp(`^${pattern}$`);
    const match = normalizedPath.match(regex);

    if (match) {
      return funcPath.endsWith(".func") ? funcPath : candidate.path;
    }
  }

  return null;
}

/**
 * Serve a static file
 */
async function serveStatic(res, pathname) {
  let filePath = join(STATIC_DIR, pathname);

  try {
    let stats = await stat(filePath);

    // If directory, look for index.html
    if (stats.isDirectory()) {
      filePath = join(filePath, "index.html");
      stats = await stat(filePath);
    }

    const ext = extname(filePath);
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    const content = await readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeType });
    res.end(content);
    return true;
  } catch (err) {
    // Try with .html extension
    try {
      const htmlPath = filePath + ".html";
      await stat(htmlPath);
      const content = await readFile(htmlPath);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(content);
      return true;
    } catch {}

    return false;
  }
}

/**
 * Execute a serverless function
 */
async function executeFunction(funcDir, req, res, pathname) {
  try {
    // Read the function config
    const configPath = join(funcDir, ".vc-config.json");
    const config = JSON.parse(await readFile(configPath, "utf-8"));

    // Import the function entrypoint
    const entrypointPath = join(funcDir, "entrypoint", "index.js");
    const entrypointUrl = pathToFileURL(entrypointPath).href;
    const funcModule = await import(entrypointUrl);

    // Build the request URL
    const protocol = "http";
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(
      pathname + (req.url.includes("?") ? "?" + req.url.split("?")[1] : ""),
      `${protocol}://${host}`,
    );

    // Check if it's an API route (exports GET, POST, etc.) or SSR (exports default handler)
    if (funcModule.default && typeof funcModule.default === "function") {
      // SSR-style handler (req, res)
      const mockReq = {
        url: url.toString(),
        method: req.method,
        headers: Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, v])),
      };

      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      if (chunks.length > 0) {
        mockReq.body = Buffer.concat(chunks).toString();
      }

      // Mock response object for SSR handlers
      let statusCode = 200;
      const headers = {};

      const mockRes = {
        setHeader: (key, value) => {
          headers[key] = value;
        },
        writeHead: (code, hdrs) => {
          statusCode = code;
          if (hdrs) Object.assign(headers, hdrs);
        },
        end: (body) => {
          res.writeHead(statusCode, headers);
          res.end(body);
        },
      };

      // Set VERCEL_URL for SSR functions
      process.env.VERCEL_URL = host;

      await funcModule.default(mockReq, mockRes);
    } else {
      // API-style handler (Web API Request/Response)
      const method = req.method.toUpperCase();
      const handler = funcModule[method];

      if (!handler) {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: `Method ${method} not allowed` }));
        return;
      }

      // Extract route params from the func directory path (e.g., "api/echo/:param.func")
      // Vercel adds route params as query params via rewrites
      // Only extract from pathname if not already set in query (rewrites already set them)
      const funcRelPath = funcDir.replace(FUNCTIONS_DIR + "/", "").replace(".func", "");
      const paramPattern = funcRelPath
        .replace(/\[\.\.\.(\w+)\]/g, "(?<$1>.+)")
        .replace(/\[(\w+)\]/g, "(?<$1>[^/]+)")
        .replace(/:(\w+)/g, "(?<$1>[^/]+)");

      const paramMatch = pathname.match(new RegExp(`^/${paramPattern}$`));
      if (paramMatch?.groups) {
        // Add route params as query params (simulating Vercel's routing)
        // But don't overwrite if already set by rewrite rules
        for (const [key, value] of Object.entries(paramMatch.groups)) {
          if (!url.searchParams.has(key)) {
            url.searchParams.set(key, value);
          }
        }
      }

      // Build a Web API Request
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

      const request = new Request(url.toString(), {
        method,
        headers: req.headers,
        body: method !== "GET" && method !== "HEAD" ? body : undefined,
      });

      const response = await handler(request);

      if (response instanceof Response) {
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
        const responseBody = await response.text();
        res.end(responseBody);
      } else {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid response from handler" }));
      }
    }
  } catch (err) {
    console.error("Function execution error:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: err.message, stack: err.stack }));
  }
}

/**
 * Run Edge Middleware and collect headers to add to response
 */
async function runMiddleware(req, pathname) {
  if (!middleware) return {};

  const protocol = "http";
  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(
    pathname + (req.url.includes("?") ? "?" + req.url.split("?")[1] : ""),
    `${protocol}://${host}`,
  );

  const request = new Request(url.toString(), {
    method: req.method,
    headers: req.headers,
  });

  try {
    const response = await middleware(request, {});

    // Collect headers to pass along (excluding internal headers)
    // Don't copy content-length, content-type, or other headers that should come from the actual response
    const excludeHeaders = new Set([
      "x-middleware-next",
      "content-length",
      "content-type",
      "accept",
      "host",
      "user-agent",
    ]);
    const middlewareHeaders = {};
    for (const [key, value] of response.headers.entries()) {
      if (!excludeHeaders.has(key.toLowerCase())) {
        middlewareHeaders[key] = value;
      }
    }
    return middlewareHeaders;
  } catch (err) {
    console.error("Middleware error:", err);
    return {};
  }
}

const server = createServer((req, res) => {
  // Run each request in its own AsyncLocalStorage context for proper isolation
  // This ensures each request has its own server context (loaderProps, params, etc.)
  const requestContext = { _id: Math.random() };

  requestAsyncLocalStore.run(requestContext, async () => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = url.pathname;
    console.log(`${req.method} ${pathname}`);

    // Run middleware and collect headers
    const middlewareHeaders = await runMiddleware(req, pathname);

    // Wrap the response to add middleware headers
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = (statusCode, ...args) => {
      // Add middleware headers
      for (const [key, value] of Object.entries(middlewareHeaders)) {
        res.setHeader(key, value);
      }
      return originalWriteHead(statusCode, ...args);
    };

    // Process routes from config.json (rewrites, etc.)
    // Skip catch-all routes initially - they should only apply after checking files/functions
    const rewrittenDest = processRoutes(pathname, true /* skipCatchAll */);
    const isLoaderRewrite = rewrittenDest && rewrittenDest.includes("__loader=1");

    if (rewrittenDest) {
      // Parse the rewritten destination (may include query params)
      const rewrittenUrl = new URL(rewrittenDest, `http://localhost:${PORT}`);
      pathname = rewrittenUrl.pathname;

      // Merge query params from rewrite with original request
      for (const [key, value] of rewrittenUrl.searchParams.entries()) {
        url.searchParams.set(key, value);
      }

      // Update the request URL for the function handler
      req.url = pathname + "?" + url.searchParams.toString();
    }

    // Try to find a matching function first
    const funcDir = await findFunction(pathname);

    if (funcDir) {
      await executeFunction(funcDir, req, res, pathname);
      return;
    }

    // Try serving static file
    // For loader rewrites, we explicitly DON'T serve static files (we want dynamic data)
    // For other rewrites (like the catch-all), still try static files
    if (!isLoaderRewrite) {
      // For rewrites, try the rewritten path; for non-rewrites, use original path
      const staticPath = rewrittenDest ? pathname : url.pathname;
      const served = await serveStatic(res, staticPath);
      if (served) return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });
});

server.listen(PORT, () => {
  console.log(`Vercel local server running at http://localhost:${PORT}`);
  console.log(`Serving from ${VERCEL_OUTPUT}`);
});
