import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

export function apiKeyOrBearer(apiKey: string, bearerMiddleware: RequestHandler): RequestHandler {
  const expectedBuf = Buffer.from(apiKey, "utf8");
  return (req, res, next) => {
    const raw = req.headers["x-api-key"];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (key) {
      const keyBuf = Buffer.from(key, "utf8");
      if (keyBuf.length === expectedBuf.length && timingSafeEqual(keyBuf, expectedBuf)) {
        return next();
      }
    }
    // Fall through to OAuth Bearer auth
    return bearerMiddleware(req, res, next);
  };
}
