import { Pool } from "pg";

export interface OAuthClient {
  client_id: string;
  client_secret: string | null;
  redirect_uris: string[];
  metadata: Record<string, unknown>;
  created_at: Date;
}

export interface OAuthCode {
  code: string;
  client_id: string;
  code_challenge: string;
  redirect_uri: string;
  scopes: string[];
  resource: string | null;
  expires_at: Date;
  used: boolean;
}

export interface OAuthRefreshToken {
  token: string;
  client_id: string;
  scopes: string[];
  resource: string | null;
  expires_at: Date;
  revoked: boolean;
}

// ---------------------------------------------------------------------------
// Client store
// ---------------------------------------------------------------------------

export async function getClient(
  pool: Pool,
  clientId: string
): Promise<OAuthClient | null> {
  const result = await pool.query<OAuthClient>(
    `SELECT client_id, client_secret, redirect_uris, metadata, created_at
       FROM oauth_clients
      WHERE client_id = $1`,
    [clientId]
  );
  if (result.rowCount === 0) return null;
  return result.rows[0];
}

export async function insertClient(
  pool: Pool,
  client: Omit<OAuthClient, "created_at">
): Promise<OAuthClient> {
  const result = await pool.query<OAuthClient>(
    `INSERT INTO oauth_clients (client_id, client_secret, redirect_uris, metadata)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (client_id) DO UPDATE
           SET client_secret  = EXCLUDED.client_secret,
               redirect_uris  = EXCLUDED.redirect_uris,
               metadata       = EXCLUDED.metadata
     RETURNING client_id, client_secret, redirect_uris, metadata, created_at`,
    [
      client.client_id,
      client.client_secret,
      JSON.stringify(client.redirect_uris),
      JSON.stringify(client.metadata),
    ]
  );
  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Auth code store
// ---------------------------------------------------------------------------

export async function insertCode(
  pool: Pool,
  code: Omit<OAuthCode, "used">
): Promise<void> {
  await pool.query(
    `INSERT INTO oauth_codes
            (code, client_id, code_challenge, redirect_uri, scopes, resource, expires_at)
     VALUES ($1,   $2,        $3,             $4,           $5,     $6,       $7)`,
    [
      code.code,
      code.client_id,
      code.code_challenge,
      code.redirect_uri,
      code.scopes,
      code.resource ?? null,
      code.expires_at,
    ]
  );
}

export async function getCode(
  pool: Pool,
  code: string
): Promise<OAuthCode | null> {
  const result = await pool.query<OAuthCode>(
    `SELECT code, client_id, code_challenge, redirect_uri, scopes, resource, expires_at, used
       FROM oauth_codes
      WHERE code = $1
        AND used = false
        AND expires_at > NOW()`,
    [code]
  );
  if (result.rowCount === 0) return null;
  return result.rows[0];
}

export async function markCodeUsed(pool: Pool, code: string): Promise<void> {
  await pool.query(
    `UPDATE oauth_codes SET used = true WHERE code = $1`,
    [code]
  );
}

// ---------------------------------------------------------------------------
// Refresh token store
// ---------------------------------------------------------------------------

export async function insertRefreshToken(
  pool: Pool,
  token: Omit<OAuthRefreshToken, "revoked">
): Promise<void> {
  await pool.query(
    `INSERT INTO oauth_refresh_tokens
            (token, client_id, scopes, resource, expires_at)
     VALUES ($1,    $2,        $3,     $4,       $5)`,
    [
      token.token,
      token.client_id,
      token.scopes,
      token.resource ?? null,
      token.expires_at,
    ]
  );
}

export async function getRefreshToken(
  pool: Pool,
  token: string
): Promise<OAuthRefreshToken | null> {
  const result = await pool.query<OAuthRefreshToken>(
    `SELECT token, client_id, scopes, resource, expires_at, revoked
       FROM oauth_refresh_tokens
      WHERE token = $1
        AND revoked = false
        AND expires_at > NOW()`,
    [token]
  );
  if (result.rowCount === 0) return null;
  return result.rows[0];
}

export async function revokeRefreshToken(
  pool: Pool,
  token: string
): Promise<void> {
  await pool.query(
    `UPDATE oauth_refresh_tokens SET revoked = true WHERE token = $1`,
    [token]
  );
}

// ---------------------------------------------------------------------------
// Cleanup helpers
// ---------------------------------------------------------------------------

export async function deleteExpiredCodes(pool: Pool): Promise<void> {
  await pool.query(
    `DELETE FROM oauth_codes WHERE expires_at <= NOW() OR used = true`
  );
}
