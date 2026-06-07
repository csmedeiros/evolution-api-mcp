import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Pool } from "pg";
import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  getClient,
  insertClient,
  insertCode,
  getCode,
  markCodeUsed,
  insertRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
} from "./store.js";

export class SingleUserOAuthProvider implements OAuthServerProvider {
  private pool: Pool;
  private tokenSecret: string;
  private publicUrl: string;
  readonly clientsStore: OAuthRegisteredClientsStore;

  constructor(pool: Pool, tokenSecret: string, publicUrl: string) {
    this.pool = pool;
    this.tokenSecret = tokenSecret;
    this.publicUrl = publicUrl;
    this.clientsStore = {
      getClient: async (clientId: string) => {
        const c = await getClient(pool, clientId);
        if (!c) return undefined;
        return {
          client_id: c.client_id,
          client_secret: c.client_secret ?? undefined,
          redirect_uris: c.redirect_uris,
          ...c.metadata,
        } as OAuthClientInformationFull;
      },
      registerClient: async (client: OAuthClientInformationFull) => {
        await insertClient(pool, {
          client_id: client.client_id,
          client_secret: client.client_secret ?? null,
          redirect_uris: client.redirect_uris,
          metadata: {
            client_name: client.client_name,
            grant_types: client.grant_types,
            response_types: client.response_types,
          },
        });
        return client;
      },
    };
  }

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    // Validate redirect_uri is registered
    if (!client.redirect_uris.includes(params.redirectUri)) {
      res
        .status(400)
        .json({ error: "invalid_request", error_description: "redirect_uri not registered" });
      return;
    }

    // Generate code
    const code = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60_000); // 60s TTL
    await insertCode(this.pool, {
      code,
      client_id: client.client_id,
      code_challenge: params.codeChallenge,
      redirect_uri: params.redirectUri,
      scopes: params.scopes ?? ["mcp"],
      resource: params.resource?.toString() ?? null,
      expires_at: expiresAt,
    });

    // Auto-approve: redirect immediately (single trusted user, no consent screen)
    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set("code", code);
    if (params.state) redirectUrl.searchParams.set("state", params.state);
    res.redirect(302, redirectUrl.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const row = await getCode(this.pool, authorizationCode);
    if (!row) throw new Error("invalid_grant");
    return row.code_challenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    _codeVerifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    const row = await getCode(this.pool, authorizationCode);
    if (!row || row.used) throw new Error("invalid_grant");
    if (redirectUri && row.redirect_uri !== redirectUri) throw new Error("invalid_grant");
    await markCodeUsed(this.pool, authorizationCode);

    const effectiveResource = resource?.toString() ?? row.resource;
    const accessToken = this.mintAccessToken(client.client_id, row.scopes, effectiveResource);
    const refreshToken = randomBytes(32).toString("hex");
    await insertRefreshToken(this.pool, {
      token: refreshToken,
      client_id: client.client_id,
      scopes: row.scopes,
      resource: row.resource,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });

    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: row.scopes.join(" "),
    };
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const row = await getRefreshToken(this.pool, refreshToken);
    if (!row || row.revoked) throw new Error("invalid_grant");
    if (row.client_id !== client.client_id) throw new Error("invalid_grant");

    // Rotate refresh token
    await revokeRefreshToken(this.pool, refreshToken);
    const newRefreshToken = randomBytes(32).toString("hex");
    const effectiveScopes = scopes ?? row.scopes;
    const effectiveResource = resource?.toString() ?? row.resource;
    await insertRefreshToken(this.pool, {
      token: newRefreshToken,
      client_id: client.client_id,
      scopes: effectiveScopes,
      resource: effectiveResource,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const accessToken = this.mintAccessToken(client.client_id, effectiveScopes, effectiveResource);
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: effectiveScopes.join(" "),
    };
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      const payload = jwt.verify(token, this.tokenSecret, {
        algorithms: ["HS256"],
        issuer: this.publicUrl,
      }) as {
        sub: string;
        client_id: string;
        scope: string;
        aud?: string | string[];
        exp: number;
        iss: string;
      };
      // Validate audience when present
      const expectedAud = `${this.publicUrl}/mcp`;
      if (payload.aud !== undefined) {
        const auds = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
        if (!auds.includes(expectedAud)) {
          throw new Error("invalid_token: audience mismatch");
        }
      }
      return {
        token,
        clientId: payload.client_id,
        scopes: payload.scope ? payload.scope.split(" ") : [],
        expiresAt: payload.exp,
      };
    } catch {
      throw new Error("invalid_token");
    }
  }

  async revokeToken(
    _client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    await revokeRefreshToken(this.pool, request.token);
  }

  private mintAccessToken(
    clientId: string,
    scopes: string[],
    resource: string | null,
  ): string {
    return jwt.sign(
      {
        sub: "owner",
        client_id: clientId,
        scope: scopes.join(" "),
        ...(resource ? { aud: resource } : {}),
      },
      this.tokenSecret,
      { expiresIn: "1h", algorithm: "HS256", issuer: this.publicUrl },
    );
  }
}
