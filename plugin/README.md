# evolution-api (plugin de skills)

Plugin do Claude Code com um conjunto de **skills** que ensinam o Claude a operar o MCP `evolution-api` (WhatsApp via Evolution API) com o fluxo correto: descobrir antes de executar, respeitar o split read/write e confirmar ações destrutivas.

## Skills

| Skill | Para quê |
|-------|----------|
| `evolution-api-workflow` | **Orquestradora.** Fluxo `list_instances → search_actions → get_action_schema → execute_*`, split read/write, regras de segurança. Carregue primeiro. |
| `evolution-instances` | Ciclo de vida de instâncias: criar, conectar (QR), reiniciar, deslogar, deletar, estado. |
| `evolution-messaging` | Enviar texto, mídia, áudio, enquete, lista, botões, reação, localização, contato, status. |
| `evolution-chat-groups` | Chats, contatos, perfil, privacidade e operações de grupo. |
| `evolution-events-webhooks` | Webhook, websocket, filas (rabbitmq/nats/sqs/kafka/pusher), settings, proxy, labels. |
| `evolution-chatbots` | Integrações de IA: openai, dify, flowise, n8n, typebot, evolutionBot, evoai, chatwoot. |

## Pré-requisito

O MCP `evolution-api` precisa estar registrado no Claude Code:

```bash
claude mcp add evolution-api -- node ~/Documents/evolution-api-mcp/dist/server.js \
  --env EVOLUTION_API_URL=http://localhost:8080 \
  --env EVOLUTION_API_KEY=sua_api_key
```

## Instalar este plugin

Via marketplace local (a raiz do repo contém `.claude-plugin/marketplace.json`):

```bash
claude plugin marketplace add ~/Documents/evolution-api-mcp
claude plugin install evolution-api@evolution-api-mcp
```

Ou copie/symlink a pasta `plugin/` para `~/.claude/plugins/evolution-api`.

## Como funciona

As skills disparam por intenção (enviar WhatsApp, instância, grupo, webhook, chatbot). A `evolution-api-workflow` impõe a disciplina **descobrir → confirmar schema → executar**, evitando `actionId`/params inventados e protegendo contra envios e deleções acidentais.
