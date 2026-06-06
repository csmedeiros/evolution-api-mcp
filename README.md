# evolution-api-mcp

MCP server para a [Evolution API](https://github.com/evolution-foundation/evolution-api) — acesse 160+ endpoints WhatsApp via linguagem natural no Claude Code.

## Instalação

### Pré-requisitos

- Node.js 20+
- Evolution API rodando localmente ou em servidor

### Instalar dependências e fazer build

```bash
cd ~/Documents/evolution-api-mcp
npm install && npm run build
```

### Registrar no Claude Code

```bash
claude mcp add evolution-api -- node ~/Documents/evolution-api-mcp/dist/server.js \
  --env EVOLUTION_API_URL=http://localhost:8080 \
  --env EVOLUTION_API_KEY=sua_api_key
```

## Tools disponíveis

| Tool | Descrição |
|------|-----------|
| `list_instances` | Lista instâncias WhatsApp e seus estados de conexão |
| `search_actions` | Busca endpoints por intenção em linguagem natural |
| `get_action_schema` | Retorna schema completo de um endpoint por ID |
| `execute_read_action` | Executa operações de leitura (GET, consultas) |
| `execute_write_action` | Executa operações de escrita (enviar mensagem, criar instância, etc.) |

## Exemplos de uso

Após registrar, em uma nova sessão do Claude Code:

- "liste minhas instâncias WhatsApp"
- "como envio uma mensagem de texto?"
- "crie uma instância chamada meu-bot"
- "envie 'Olá!' para 5511999999999 via instância meu-bot"
- "qual o estado de conexão da instância meu-bot?"

## Domínios cobertos

`instance` · `message` · `chat` · `group` · `call` · `settings` · `label` · `proxy` · `webhook` · `websocket` · `rabbitmq` · `nats` · `pusher` · `sqs` · `kafka` · `chatwoot` · `evolutionBot` · `typebot` · `openai` · `dify` · `flowise` · `n8n` · `evoai`

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `EVOLUTION_API_URL` | `http://localhost:8080` | URL base da Evolution API |
| `EVOLUTION_API_KEY` | — | API key (obrigatória) |

## Smoke test

```bash
EVOLUTION_API_KEY=sua_key npm run smoke
```
