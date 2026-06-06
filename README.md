# evolution-api-mcp

MCP server for the [Evolution API](https://github.com/evolution-foundation/evolution-api) — access 160+ WhatsApp endpoints via natural language in Claude Code.

## Installation

### Prerequisites

- Node.js 20+
- Evolution API running locally or on a server

### Install dependencies and build

```bash
cd ~/Documents/evolution-api-mcp
npm install && npm run build
```

### Register in Claude Code

```bash
claude mcp add evolution-api -- node ~/Documents/evolution-api-mcp/dist/server.js \
  --env EVOLUTION_API_URL=http://localhost:8080 \
  --env EVOLUTION_API_KEY=your_api_key
```

## Available Tools

| Tool | Description |
|------|-------------|
| `list_instances` | Lists WhatsApp instances and their connection states |
| `search_actions` | Searches endpoints by intent in natural language |
| `get_action_schema` | Returns the full schema of an endpoint by ID |
| `execute_read_action` | Executes read operations (GET, queries) |
| `execute_write_action` | Executes write operations (send message, create instance, etc.) |

## Usage Examples

After registering, in a new Claude Code session:

- "list my WhatsApp instances"
- "how do I send a text message?"
- "create an instance called my-bot"
- "send 'Hello!' to 5511999999999 via instance my-bot"
- "what is the connection state of instance my-bot?"

## Covered Domains

`instance` · `message` · `chat` · `group` · `call` · `settings` · `label` · `proxy` · `webhook` · `websocket` · `rabbitmq` · `nats` · `pusher` · `sqs` · `kafka` · `chatwoot` · `evolutionBot` · `typebot` · `openai` · `dify` · `flowise` · `n8n` · `evoai`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EVOLUTION_API_URL` | `http://localhost:8080` | Evolution API base URL |
| `EVOLUTION_API_KEY` | — | API key (required) |

## Smoke Test

```bash
EVOLUTION_API_KEY=your_key npm run smoke
```
