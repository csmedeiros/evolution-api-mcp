# evolution-api (skills plugin)

Claude Code plugin with a set of **skills** that teach Claude how to operate the `evolution-api` MCP (WhatsApp via Evolution API) with the correct flow: discover before executing, respect the read/write split, and confirm destructive actions.

## Skills

| Skill | Purpose |
|-------|---------|
| `evolution-api-workflow` | **Orchestrator.** Flow `list_instances → search_actions → get_action_schema → execute_*`, read/write split, security rules. Load this first. |
| `evolution-instances` | Instance lifecycle: create, connect (QR), restart, logout, delete, state. |
| `evolution-messaging` | Send text, media, audio, poll, list, buttons, reaction, location, contact, status. |
| `evolution-chat-groups` | Chats, contacts, profile, privacy, and group operations. |
| `evolution-events-webhooks` | Webhook, websocket, queues (rabbitmq/nats/sqs/kafka/pusher), settings, proxy, labels. |
| `evolution-chatbots` | AI integrations: openai, dify, flowise, n8n, typebot, evolutionBot, evoai, chatwoot. |

## Prerequisite

The `evolution-api` MCP must be registered in Claude Code:

```bash
claude mcp add evolution-api -- node ~/Documents/evolution-api-mcp/dist/server.js \
  --env EVOLUTION_API_URL=http://localhost:8080 \
  --env EVOLUTION_API_KEY=your_api_key
```

## Install this plugin

Via local marketplace (the repo root contains `.claude-plugin/marketplace.json`):

```bash
claude plugin marketplace add ~/Documents/evolution-api-mcp
claude plugin install evolution-api@evolution-api-mcp
```

Or copy/symlink the `plugin/` folder to `~/.claude/plugins/evolution-api`.

## How it works

Skills trigger by intent (send WhatsApp, instance, group, webhook, chatbot). The `evolution-api-workflow` enforces the **discover → confirm schema → execute** discipline, preventing invented `actionId`/params and protecting against accidental sends and deletions.
