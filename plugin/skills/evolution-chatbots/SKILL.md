---
name: evolution-chatbots
description: Use when configuring chatbot/AI integrations in the Evolution API — OpenAI, Dify, Flowise, n8n, Typebot, EvolutionBot, EvoAI or Chatwoot. Create/update/delete bots, adjust settings, change status, list sessions, ignore JIDs. Covers the `chatbot` domain.
---

# Evolution API — Chatbots and AI Integrations

Connects a WhatsApp instance to a bot/AI engine. Each provider follows the **same action pattern** (CRUD + settings + sessions). Follow `evolution-api-workflow`.

## Providers

`openai` · `dify` · `flowise` · `n8n` · `typebot` · `evolutionBot` · `evoai` · `chatwoot`

## Action Pattern (per provider `<p>`)

| actionId | R/W | What it does |
|----------|-----|--------------|
| `chatbot.<p>.create` | write | Creates a bot |
| `chatbot.<p>.find` | read | Lists bots for the provider |
| `chatbot.<p>.fetch` | read | Details of a bot |
| `chatbot.<p>.update` | write | Updates a bot |
| `chatbot.<p>.delete` | write ⚠️ | Removes a bot |
| `chatbot.<p>.settings` | write | Sets default settings (expire, delay, fallback, etc.) |
| `chatbot.<p>.fetchSettings` | read | Reads default settings |
| `chatbot.<p>.changeStatus` | write | Enables/disables or changes the bot status |
| `chatbot.<p>.fetchSessions` | read | Active sessions |
| `chatbot.<p>.ignoreJid` | write | Adds/removes ignored JIDs |

Exceptions:
- **OpenAI** has extra credential actions: `chatbot.openai.createCreds`, `findCreds`, `deleteCreds`, `getModels`.
- **Typebot** has `chatbot.typebot.start` (starts a flow) in addition to the standard pattern.
- **Chatwoot** only uses `chatbot.chatwoot.set` (write) and `chatbot.chatwoot.find` (read).

## Typical `create` Params

Bot fields (confirm with `get_action_schema`): `enabled`, `description`, `triggerType` (`all|keyword|none|advanced`), `triggerOperator` (`contains|equals|startsWith|endsWith|regex`), `triggerValue`, `expire`, `keywordFinish`, `delayMessage`, `unknownMessage`, `listeningFromMe`, `stopBotFromMe`, `keepOpen`, `debounceTime`, `ignoreJids`. Each provider adds its own fields (e.g. OpenAI: model/credentials; Typebot: url/typebot; n8n/dify/flowise: endpoint/apiKey).

## Rules

- **`get_action_schema` is required here** — provider-specific fields (URLs, API keys, model) vary greatly; never guess.
- **OpenAI:** create credentials (`createCreds`) before the bot, and use `getModels` to pick a valid model.
- **Destructive:** `chatbot.<p>.delete` removes the bot. Confirm provider + id before executing.
- **Credentials** go only in the action params; treat them as sensitive.

## Examples

- "create an OpenAI bot on the support instance that responds to everything" → `createCreds` → `chatbot.openai.create` `{ triggerType: "all", ... }`
- "list Typebot bots on the sales instance" → `chatbot.typebot.find` (read)
- "disable dify bot X" → `chatbot.dify.changeStatus`
