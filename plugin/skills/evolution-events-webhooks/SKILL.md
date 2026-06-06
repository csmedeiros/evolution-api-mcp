---
name: evolution-events-webhooks
description: Use when configuring or querying event delivery from the Evolution API — HTTP webhook, websocket, or queues (RabbitMQ, NATS, SQS, Kafka, Pusher). Also settings, proxy and labels. Covers the `event`, `settings`, `proxy` and `label` domains.
---

# Evolution API — Events, Webhooks and Output Integrations

Configures **where** the Evolution API delivers events from an instance (received messages, connection status, etc.). Each transport has a `set` (write) and `find` (read) pair. Follow `evolution-api-workflow`.

## `event` Domain — set/find pairs

| Transport | Configure (write) | Query (read) |
|-----------|-------------------|--------------|
| HTTP Webhook | `event.webhook.set` | `event.webhook.find` |
| WebSocket | `event.websocket.set` | `event.websocket.find` |
| RabbitMQ | `event.rabbitmq.set` | `event.rabbitmq.find` |
| NATS | `event.nats.set` | `event.nats.find` |
| Pusher | `event.pusher.set` | `event.pusher.find` |
| Amazon SQS | `event.sqs.set` | `event.sqs.find` |
| Kafka | `event.kafka.set` | `event.kafka.find` |

## Other Domains

- **`settings`** — `settings.set` (write), `settings.find` (read): instance behavior (reject calls, ignore groups, always online, read messages, etc.).
- **`proxy`** — `proxy.set` (write), `proxy.find` (read): outgoing proxy for the instance.
- **`label`** — `label.findLabels` (read), `label.handleLabel` (write): labels (add/remove) on chats.

## How to Configure a Webhook

1. `get_action_schema` on `event.webhook.set` to see the fields (typically `url`, `enabled`, list of `events`/`webhookByEvents`, `webhookBase64`).
2. `execute_write_action` with `instance` + the URL and the list of events to subscribe to.
3. Verify with `event.webhook.find` (read).

## Rules

- **Confirm the schema** with `get_action_schema` — each transport has its own fields (URLs, credentials, queue/topic names).
- **Be careful with credentials** (RabbitMQ/SQS/Kafka): don't log secrets unnecessarily; pass them only in the action params.
- **`set` replaces the config** of that transport on the instance — run `find` first if you want to preserve the current state.

## Examples

- "configure a webhook to https://my-app/events on the sales instance" → `event.webhook.set`
- "which webhook is active on the sales instance?" → `event.webhook.find` (read)
- "make the instance automatically reject calls" → `settings.set`
