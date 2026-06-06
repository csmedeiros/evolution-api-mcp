---
name: evolution-chatbots
description: Use ao configurar integrações de chatbot/IA na Evolution API — OpenAI, Dify, Flowise, n8n, Typebot, EvolutionBot, EvoAI ou Chatwoot. Criar/atualizar/deletar bots, ajustar settings, mudar status, listar sessões, ignorar JIDs. Cobre o domínio `chatbot`.
---

# Evolution API — Chatbots e Integrações de IA

Conecta uma instância WhatsApp a um motor de bot/IA. Cada provedor segue o **mesmo padrão de actions** (CRUD + settings + sessões). Siga `evolution-api-workflow`.

## Provedores

`openai` · `dify` · `flowise` · `n8n` · `typebot` · `evolutionBot` · `evoai` · `chatwoot`

## Padrão de actions (por provedor `<p>`)

| actionId | R/W | O que faz |
|----------|-----|-----------|
| `chatbot.<p>.create` | write | Cria um bot |
| `chatbot.<p>.find` | read | Lista bots do provedor |
| `chatbot.<p>.fetch` | read | Detalhe de um bot |
| `chatbot.<p>.update` | write | Atualiza um bot |
| `chatbot.<p>.delete` | write ⚠️ | Remove um bot |
| `chatbot.<p>.settings` | write | Define settings padrão (expire, delay, fallback, etc.) |
| `chatbot.<p>.fetchSettings` | read | Lê settings padrão |
| `chatbot.<p>.changeStatus` | write | Liga/desliga ou muda status do bot |
| `chatbot.<p>.fetchSessions` | read | Sessões ativas |
| `chatbot.<p>.ignoreJid` | write | Adiciona/remove JIDs ignorados |

Exceções:
- **OpenAI** tem actions extras de credenciais: `chatbot.openai.createCreds`, `findCreds`, `deleteCreds`, `getModels`.
- **Typebot** tem `chatbot.typebot.start` (inicia um fluxo) além do padrão.
- **Chatwoot** usa apenas `chatbot.chatwoot.set` (write) e `chatbot.chatwoot.find` (read).

## Params típicos de `create`

Campos do bot (confirme com `get_action_schema`): `enabled`, `description`, `triggerType` (`all|keyword|none|advanced`), `triggerOperator` (`contains|equals|startsWith|endsWith|regex`), `triggerValue`, `expire`, `keywordFinish`, `delayMessage`, `unknownMessage`, `listeningFromMe`, `stopBotFromMe`, `keepOpen`, `debounceTime`, `ignoreJids`. Cada provedor adiciona campos próprios (ex.: OpenAI: model/credentials; Typebot: url/typebot; n8n/dify/flowise: endpoint/apiKey).

## Regras

- **`get_action_schema` é obrigatório aqui** — os campos específicos por provedor (URLs, API keys, model) variam muito; nunca chute.
- **OpenAI:** crie credenciais (`createCreds`) antes do bot, e use `getModels` para escolher um model válido.
- **Destrutivo:** `chatbot.<p>.delete` remove o bot. Confirme provedor + id antes.
- **Credenciais** entram só nos params da action; trate como sensíveis.

## Exemplos

- "cria um bot OpenAI na instância suporte que responde tudo" → `createCreds` → `chatbot.openai.create` `{ triggerType: "all", ... }`
- "lista os bots Typebot da instância vendas" → `chatbot.typebot.find` (read)
- "desliga o bot dify X" → `chatbot.dify.changeStatus`
