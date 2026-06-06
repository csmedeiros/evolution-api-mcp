---
name: evolution-events-webhooks
description: Use ao configurar ou consultar entrega de eventos da Evolution API — webhook HTTP, websocket, ou filas (RabbitMQ, NATS, SQS, Kafka, Pusher). Também settings, proxy e labels. Cobre os domínios `event`, `settings`, `proxy` e `label`.
---

# Evolution API — Eventos, Webhooks e Integrações de Saída

Configura **para onde** a Evolution API entrega os eventos de uma instância (mensagens recebidas, status de conexão, etc.). Cada transporte tem um par `set` (write) e `find` (read). Siga `evolution-api-workflow`.

## Domínio `event` — pares set/find

| Transporte | Configurar (write) | Consultar (read) |
|------------|--------------------|------------------|
| Webhook HTTP | `event.webhook.set` | `event.webhook.find` |
| WebSocket | `event.websocket.set` | `event.websocket.find` |
| RabbitMQ | `event.rabbitmq.set` | `event.rabbitmq.find` |
| NATS | `event.nats.set` | `event.nats.find` |
| Pusher | `event.pusher.set` | `event.pusher.find` |
| Amazon SQS | `event.sqs.set` | `event.sqs.find` |
| Kafka | `event.kafka.set` | `event.kafka.find` |

## Outros domínios

- **`settings`** — `settings.set` (write), `settings.find` (read): comportamento da instância (rejeitar chamadas, ignorar grupos, always online, ler mensagens, etc.).
- **`proxy`** — `proxy.set` (write), `proxy.find` (read): proxy de saída da instância.
- **`label`** — `label.findLabels` (read), `label.handleLabel` (write): etiquetas (add/remove) em chats.

## Como configurar um webhook

1. `get_action_schema` em `event.webhook.set` para ver os campos (tipicamente `url`, `enabled`, lista de `events`/`webhookByEvents`, `webhookBase64`).
2. `execute_write_action` com `instance` + a URL e a lista de eventos a assinar.
3. Verifique com `event.webhook.find` (read).

## Regras

- **Confirme o schema** com `get_action_schema` — cada transporte tem campos próprios (URLs, credenciais, nomes de fila/tópico).
- **Cuidado com credenciais** (RabbitMQ/SQS/Kafka): não logue segredos desnecessariamente; passe-os apenas nos params da action.
- **`set` substitui a config** daquele transporte na instância — rode o `find` antes se quiser preservar o estado atual.

## Exemplos

- "configura um webhook pra https://meu-app/eventos na instância vendas" → `event.webhook.set`
- "qual webhook está ativo na instância vendas?" → `event.webhook.find` (read)
- "faz a instância rejeitar chamadas automaticamente" → `settings.set`
