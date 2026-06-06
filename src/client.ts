import type { Action, ClientFilter } from './types.js';

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL ?? 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY ?? '';

type McpResult = { isError: boolean; content: Array<{ type: 'text'; text: string }> };

function ok(text: string): McpResult {
  return { isError: false, content: [{ type: 'text', text }] };
}

function fail(text: string): McpResult {
  return { isError: true, content: [{ type: 'text', text }] };
}

export async function callEvolution(
  action: Action,
  params: Record<string, unknown>,
  clientFilter?: ClientFilter
): Promise<McpResult> {
  try {
    // 1. Substitute path params
    let path = action.path;
    const pathParamDefs = action.params.filter(p => p.in === 'path');
    for (const p of pathParamDefs) {
      if (params[p.name] !== undefined) {
        path = path.replace(`:${p.name}`, String(params[p.name]));
      } else if (p.required) {
        return fail(`Param obrigatório ausente no path: ${p.name}`);
      }
    }

    // 2. Separate query and body params
    const queryParams: Record<string, string> = {};
    const bodyParams: Record<string, unknown> = {};

    for (const param of action.params) {
      if (param.in === 'path') continue;
      if (params[param.name] === undefined) continue;
      if (param.in === 'query') {
        queryParams[param.name] = String(params[param.name]);
      } else if (param.in === 'body') {
        bodyParams[param.name] = params[param.name];
      }
    }

    // 3. Build URL
    const queryString =
      Object.keys(queryParams).length > 0
        ? '?' + new URLSearchParams(queryParams).toString()
        : '';
    const url = `${EVOLUTION_API_URL}${path}${queryString}`;

    // 4. Fetch
    const hasBody = Object.keys(bodyParams).length > 0 && action.method !== 'GET';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    let response: Response;
    try {
      response = await fetch(url, {
        method: action.method,
        headers: {
          apikey: EVOLUTION_API_KEY,
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        },
        body: hasBody ? JSON.stringify(bodyParams) : undefined,
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return fail('Timeout: a Evolution API não respondeu em 30 segundos');
      }
      throw fetchErr;
    }
    clearTimeout(timeoutId);

    const responseText = await response.text();

    // 5. Error status
    if (response.status >= 400) {
      return fail(`HTTP ${response.status}: ${responseText}`);
    }

    // Parse JSON
    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      return ok(responseText);
    }

    // 6. Apply client-side filter if requested
    let filtered: unknown = data;
    if (clientFilter && Array.isArray(data)) {
      const { field, contains, mode } = clientFilter;
      const needle = mode === 'insensitive' ? contains.toLowerCase() : contains;
      filtered = data.filter((item: unknown) => {
        if (typeof item !== 'object' || item === null) return false;
        const val = (item as Record<string, unknown>)[field];
        if (typeof val !== 'string') return false;
        const hay = mode === 'insensitive' ? val.toLowerCase() : val;
        return hay.includes(needle);
      });
    }

    // 7. Truncate large responses
    const serialized = JSON.stringify(filtered, null, 2);
    const originalCount = Array.isArray(data) ? data.length : null;
    const filteredCount = Array.isArray(filtered) ? filtered.length : null;

    if (serialized.length > 10_000) {
      if (Array.isArray(filtered)) {
        const truncated = (filtered as unknown[]).slice(0, 20);
        const label = clientFilter
          ? `\n\n[Filtro aplicado: ${filteredCount} de ${originalCount} itens. Mostrando 20.]`
          : `\n\n[Resposta truncada — mostrando 20 de ${originalCount} itens]`;
        return ok(JSON.stringify(truncated, null, 2) + label);
      }
      return ok(
        serialized.slice(0, 10_000) +
          `\n\n[Resposta truncada — ${serialized.length} chars no total. Refine com filtros/limit.]`
      );
    }

    // 8. Success — include filter summary if applied
    if (clientFilter && Array.isArray(data)) {
      return ok(serialized + `\n\n[Filtro aplicado: ${filteredCount} de ${originalCount} itens]`);
    }

    return ok(serialized);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`Erro de rede: ${message}`);
  }
}
