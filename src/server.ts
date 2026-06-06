import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { catalog } from './catalog.js';
import { callEvolution } from './client.js';
import type { ClientFilter } from './types.js';

// Validate required env var at boot
if (!process.env.EVOLUTION_API_KEY) {
  process.stderr.write(
    'ERRO: A variável de ambiente EVOLUTION_API_KEY é obrigatória. ' +
      'Defina-a antes de iniciar o servidor MCP.\n'
  );
  process.exit(1);
}

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
    params: z.record(z.unknown()).default({}),
    clientFilter: z.object({
      field: z.string(),
      contains: z.string(),
      mode: z.enum(['insensitive', 'sensitive']).optional(),
    }).optional(),
  },
  { readOnlyHint: true },
  async ({ actionId, params, clientFilter }) => {
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
    return callEvolution(action, params, clientFilter as ClientFilter | undefined);
  }
);

// 5. execute_write_action
server.tool(
  'execute_write_action',
  'Executa uma action de ESCRITA/MUTAÇÃO (readOnly: false) da Evolution API — envia mensagens, cria/deleta instâncias, configura webhooks, etc. Requer confirmação do usuário para operações destrutivas. NÃO execute ações de leitura aqui — use execute_read_action.',
  {
    actionId: z.string(),
    params: z.record(z.unknown()).default({}),
  },
  { readOnlyHint: false, destructiveHint: true },
  async ({ actionId, params }) => {
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
    return callEvolution(action, params);
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
