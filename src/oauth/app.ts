import express from "express";
import cookieParser from "cookie-parser";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { SingleUserOAuthProvider } from "./provider.js";
import { apiKeyOrBearer } from "./middleware.js";
import type { IncomingMessage } from "node:http";

const MAX_BODY_BYTES = 1024 * 1024;

async function bodyBuffer(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.setTimeout(30_000, () => { req.destroy(new Error("Request timeout")); });
    req.on("data", (c: Buffer) => {
      total += c.length;
      if (total > MAX_BODY_BYTES) { req.destroy(new Error("Request body too large")); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function makeAuthCookie(secret: string): string {
  const exp = Date.now() + 10 * 60 * 1000;
  const nonce = randomBytes(16).toString("hex");
  const payload = `${exp}.${nonce}`;
  const mac = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${mac}`;
}

function checkAuthCookie(req: express.Request, secret: string): boolean {
  const cookie = req.cookies?.["mcp_auth"];
  if (!cookie) return false;
  const parts = cookie.split(".");
  if (parts.length !== 3) return false;
  const [exp, nonce, mac] = parts;
  if (!exp || !nonce || !mac) return false;
  const expected = createHmac("sha256", secret).update(`${exp}.${nonce}`).digest("hex");
  const a = Buffer.from(mac, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(exp) > Date.now();
}

export interface CreateMcpHttpAppOptions {
  createServer: () => McpServer;
  publicUrl: string;        // e.g. "https://evolution.ovalordaia.com.br"
  apiKey: string;           // MCP_API_KEY for backward compat
  tokenSecret: string;      // OAUTH_TOKEN_SECRET for JWT signing
  dbPool: Pool;
  resourceName: string;     // e.g. "evolution-api"
}

export function createMcpHttpApp(opts: CreateMcpHttpAppOptions): express.Application {
  const { createServer, publicUrl, apiKey, tokenSecret, dbPool, resourceName } = opts;

  const provider = new SingleUserOAuthProvider(dbPool, tokenSecret, publicUrl);

  const app = express();

  // Trust the first proxy (nginx) so express-rate-limit can read X-Forwarded-For
  app.set("trust proxy", 1);

  app.use(cookieParser());

  // Protected resource metadata URL for WWW-Authenticate header
  const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(new URL(`${publicUrl}/mcp`));

  // Bearer auth middleware (OAuth path)
  const bearerAuth = requireBearerAuth({ verifier: provider, resourceMetadataUrl });

  // Combined auth: x-api-key (CLI) OR Bearer JWT (claude.ai)
  const auth = apiKeyOrBearer(apiKey, bearerAuth);

  // /authorize: browser gets HTML login form, programmatic passes through
  app.get("/authorize", (req, res, next) => {
    const rawKey = req.headers["x-api-key"];
    const key = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    const keyBuf = Buffer.from(String(key ?? ""), "utf8");
    const expectedBuf = Buffer.from(apiKey, "utf8");
    const keyOk = keyBuf.length === expectedBuf.length && timingSafeEqual(keyBuf, expectedBuf);

    if (keyOk || checkAuthCookie(req, tokenSecret)) {
      return next(); // pass to mcpAuthRouter
    }

    // Show HTML login form — preserve all query params in hidden field
    const returnTo = req.url; // full path + query string
    res.status(401).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>MCP Login</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 320px; }
  h2 { margin: 0 0 1.5rem; font-size: 1.2rem; color: #333; }
  input[type=password] { width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box; margin-bottom: 1rem; }
  button { width: 100%; padding: 0.7rem; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  .error { color: #dc2626; font-size: 0.9rem; margin-bottom: 1rem; }
  p { color: #666; font-size: 0.85rem; margin: 1rem 0 0; }
</style>
</head>
<body>
<div class="card">
  <h2>${resourceName}</h2>
  <form method="POST" action="/authorize/login">
    <input type="hidden" name="return_to" value="${returnTo.replace(/"/g, "&quot;")}">
    <input type="password" name="api_key" placeholder="API Key" autofocus autocomplete="current-password">
    <button type="submit">Entrar</button>
  </form>
  <p>Use o MCP_API_KEY configurado no servidor.</p>
</div>
</body>
</html>`);
  });

  app.post("/authorize/login", express.urlencoded({ extended: false }), (req, res) => {
    const submittedKey = String((req.body as Record<string, string> | undefined)?.["api_key"] ?? "");
    const returnTo = String((req.body as Record<string, string> | undefined)?.["return_to"] ?? "/authorize");

    const keyBuf = Buffer.from(submittedKey, "utf8");
    const expectedBuf = Buffer.from(apiKey, "utf8");
    const valid = keyBuf.length === expectedBuf.length && timingSafeEqual(keyBuf, expectedBuf);

    if (!valid) {
      const safeReturn = returnTo.replace(/"/g, "&quot;");
      return res.status(401).send(`<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>MCP Login</title>
<style>
  body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f5f5f5; }
  .card { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); width: 320px; }
  h2 { margin: 0 0 1.5rem; font-size: 1.2rem; color: #333; }
  input[type=password] { width: 100%; padding: 0.6rem; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; box-sizing: border-box; margin-bottom: 1rem; }
  button { width: 100%; padding: 0.7rem; background: #2563eb; color: white; border: none; border-radius: 4px; font-size: 1rem; cursor: pointer; }
  button:hover { background: #1d4ed8; }
  .error { color: #dc2626; font-size: 0.9rem; margin-bottom: 1rem; }
  p { color: #666; font-size: 0.85rem; margin: 1rem 0 0; }
</style>
</head>
<body>
<div class="card">
  <h2>${resourceName}</h2>
  <form method="POST" action="/authorize/login">
    <input type="hidden" name="return_to" value="${safeReturn}">
    <div class="error">API Key invalida. Tente novamente.</div>
    <input type="password" name="api_key" placeholder="API Key" autofocus autocomplete="current-password">
    <button type="submit">Entrar</button>
  </form>
  <p>Use o MCP_API_KEY configurado no servidor.</p>
</div>
</body>
</html>`);
    }

    // Set auth cookie (10 min) and redirect back to /authorize
    res.cookie("mcp_auth", makeAuthCookie(tokenSecret), {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      secure: true,
    });
    res.redirect(302, returnTo.startsWith("/authorize") ? returnTo : "/authorize");
  });

  // Mount OAuth 2.1 auth router at root (serves /.well-known/*, /authorize, /token, /register, /revoke)
  app.use(mcpAuthRouter({
    provider,
    issuerUrl: new URL(publicUrl),
    resourceServerUrl: new URL(`${publicUrl}/mcp`),
    scopesSupported: ["mcp"],
    resourceName,
  }));

  // MCP endpoint — one transport instance per request, raw body buffering
  app.all("/mcp", auth, async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", async () => { await transport.close(); });
    const server = createServer();
    await server.connect(transport);
    const raw = await bodyBuffer(req);
    let parsedBody: unknown = undefined;
    if (raw.length > 0) {
      try {
        parsedBody = JSON.parse(raw.toString("utf8"));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error: Invalid JSON" }, id: null }));
        return;
      }
    }
    await transport.handleRequest(req, res, parsedBody);
  });

  return app;
}
