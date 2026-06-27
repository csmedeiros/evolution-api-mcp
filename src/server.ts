import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { catalog } from './catalog.js';
import { buildParams, callEvolution } from './client.js';
import type { ClientFilter } from './types.js';

// Validate required env var at boot
if (!process.env.EVOLUTION_API_KEY) {
  process.stderr.write(
    'ERRO: A variável de ambiente EVOLUTION_API_KEY é obrigatória. ' +
      'Defina-a antes de iniciar o servidor MCP.\n'
  );
  process.exit(1);
}

function createServer(): McpServer {
  const server = new McpServer(
    {
      name: 'evolution-api',
      version: '1.0.0',
    },
    {
      instructions:
        'Para operar a Evolution API: 1) Use list_instances para ver instâncias disponíveis. ' +
        '2) Use search_actions para descobrir o actionId pelo que você quer fazer. ' +
        '3) Use get_action_schema para ver os params detalhados. ' +
        '4) Use execute_read_action para leituras e execute_write_action para escritas/mutações.',
    }
  );

  // 1. list_instances
  server.tool(
    'list_instances',
    'Lista todas as instâncias WhatsApp e seus estados de conexão. Use esta tool primeiro para descobrir as instâncias disponíveis antes de qualquer operação.',
    { readOnlyHint: true },
    async () => {
      const action = catalog.find(a => a.id === 'instance.fetchInstances');
      if (!action) return { isError: true, content: [{ type: 'text' as const, text: 'Action instance.fetchInstances não encontrada no catálogo' }] };
      return callEvolution(action, {});
    }
  );

  const DOMAINS = [
    'instance',
    'message',
    'chat',
    'group',
    'call',
    'settings',
    'label',
    'proxy',
    'event',
    'chatbot',
  ] as const;

  // 2. search_actions
  server.tool(
    'search_actions',
    'Busca ações da Evolution API por intenção em linguagem natural. Retorna id, method, path, summary e params de cada resultado. USE ESTA TOOL para descobrir o actionId correto antes de chamar execute_read_action ou execute_write_action.',
    {
      query: z.string().describe("Intenção em linguagem natural, ex: 'enviar mensagem de texto'"),
      domain: z.enum(DOMAINS).optional(),
      limit: z.number().int().min(1).max(30).default(10),
    },
    { readOnlyHint: true },
    async ({ query, domain, limit }) => {
      const q = query.toLowerCase();
      let results = catalog.filter(action => {
        const matchesQuery =
          action.id.toLowerCase().includes(q) ||
          action.domain.toLowerCase().includes(q) ||
          action.summary.toLowerCase().includes(q);
        const matchesDomain = domain ? action.domain === domain : true;
        return matchesQuery && matchesDomain;
      });
      results = results.slice(0, limit);
      return {
        isError: false,
        content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }],
      };
    }
  );

  // 3. get_action_schema
  server.tool(
    'get_action_schema',
    "Retorna o schema completo (todos os params com tipos, descrições e obrigatoriedade) de uma action pelo seu ID. Use quando search_actions trouxe um resumo e você precisa de detalhes antes de executar.",
    {
      actionId: z.string().describe("ID da action, ex: 'message.sendText'"),
    },
    { readOnlyHint: true },
    async ({ actionId }) => {
      const action = catalog.find(a => a.id === actionId);
      if (!action) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Action '${actionId}' não encontrada no catálogo.` }],
        };
      }
      return {
        isError: false,
        content: [{ type: 'text' as const, text: JSON.stringify(action, null, 2) }],
      };
    }
  );

  // 4. execute_read_action
  server.tool(
    'execute_read_action',
    'Executa uma action de LEITURA (readOnly: true) da Evolution API. Recebe o actionId e os params necessários. Para saber quais params usar, chame search_actions ou get_action_schema primeiro. NÃO execute ações de escrita aqui — use execute_write_action. Opcional: clientFilter={field, contains, mode} para filtrar arrays grandes client-side antes do truncamento (ex: buscar contatos por pushName parcial).',
    {
      actionId: z.string(),
      instance: z.string().optional().describe('Nome da instância (path param). Atalho para params.instance — tem precedência se ambos forem passados.'),
      params: z.union([z.record(z.unknown()), z.string()]).optional().describe('Parâmetros da action num único objeto plano (aceita também string JSON).'),
      body: z.union([z.record(z.unknown()), z.string()]).optional().describe('Alias para params — mesclado por cima de params.'),
      clientFilter: z.object({
        field: z.string(),
        contains: z.string(),
        mode: z.enum(['insensitive', 'sensitive']).optional(),
      }).optional(),
    },
    { readOnlyHint: true },
    async ({ actionId, instance, params, body, clientFilter }) => {
      const action = catalog.find(a => a.id === actionId);
      if (!action) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Action '${actionId}' não encontrada no catálogo.` }],
        };
      }
      if (action.readOnly === false) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Esta action é de escrita. Use execute_write_action.' }],
        };
      }
      return callEvolution(action, buildParams(params, body, instance), clientFilter as ClientFilter | undefined);
    }
  );

  // 5. execute_write_action
  server.tool(
    'execute_write_action',
    'Executa uma action de ESCRITA/MUTAÇÃO (readOnly: false) da Evolution API — envia mensagens, cria/deleta instâncias, configura webhooks, etc. Requer confirmação do usuário para operações destrutivas. NÃO execute ações de leitura aqui — use execute_read_action.',
    {
      actionId: z.string(),
      instance: z.string().optional().describe('Nome da instância (path param). Atalho para params.instance — tem precedência se ambos forem passados.'),
      params: z.union([z.record(z.unknown()), z.string()]).optional().describe('Parâmetros da action num único objeto plano (aceita também string JSON).'),
      body: z.union([z.record(z.unknown()), z.string()]).optional().describe('Alias para params — mesclado por cima de params.'),
    },
    { readOnlyHint: false, destructiveHint: true },
    async ({ actionId, instance, params, body }) => {
      const action = catalog.find(a => a.id === actionId);
      if (!action) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: `Action '${actionId}' não encontrada no catálogo.` }],
        };
      }
      if (action.readOnly === true) {
        return {
          isError: true,
          content: [{ type: 'text' as const, text: 'Esta action é de leitura. Use execute_read_action.' }],
        };
      }
      return callEvolution(action, buildParams(params, body, instance));
    }
  );

  return server;
}

const transport = process.env.MCP_TRANSPORT ?? "stdio";

if (transport === "http") {
  // HTTP mode with OAuth 2.1
  const apiKey = process.env.MCP_API_KEY;
  const issuerUrl = process.env.OAUTH_ISSUER_URL;
  const tokenSecret = process.env.OAUTH_TOKEN_SECRET;

  if (!apiKey) {
    process.stderr.write("ERRO: MCP_API_KEY é obrigatória no modo http.\n");
    process.exit(1);
  }
  if (!issuerUrl) {
    process.stderr.write("ERRO: OAUTH_ISSUER_URL é obrigatória no modo http.\n");
    process.exit(1);
  }
  if (!tokenSecret) {
    process.stderr.write("ERRO: OAUTH_TOKEN_SECRET é obrigatória no modo http.\n");
    process.exit(1);
  }

  const { Pool } = await import("pg");
  const { createMcpHttpApp } = await import("./oauth/app.js");

  const dbPool = new Pool({
    host: process.env.PG_HOST ?? "localhost",
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_USER ?? "postgres",
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE_PERSONAL ?? "personal",
  });

  const PORT = Number(process.env.MCP_PORT ?? 3004);

  const app = createMcpHttpApp({
    createServer,
    publicUrl: issuerUrl,
    apiKey,
    tokenSecret,
    dbPool,
    resourceName: "evolution-api",
  });

  app.listen(PORT, () => {
    process.stderr.write(`evolution-api-mcp HTTP server listening on port ${PORT}\n`);
  });
} else {
  // stdio mode (default)
  const server = createServer();
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
