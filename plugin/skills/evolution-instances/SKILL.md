---
name: evolution-instances
description: Use when creating, connecting (QR code), restarting, logging out, deleting, or checking the connection state of a WhatsApp instance in the Evolution API. Covers the instance lifecycle (`instance` domain) via the evolution-api MCP.
---

# Evolution API — Instances

An **instance** is a WhatsApp connection. Everything starts here: without a connected instance (`open`), no messages are sent. Follow the `evolution-api-workflow` skill flow.

## `instance` Domain Actions

| actionId | R/W | What it does |
|----------|-----|--------------|
| `instance.fetchInstances` | read | Lists instances (what `list_instances` calls). |
| `instance.connectionState` | read | State of an instance: `open`, `connecting`, `close`. |
| `instance.create` | write | Creates a new instance. |
| `instance.connect` | write | Initiates connection and returns the **QR code** / pairing code. |
| `instance.restart` | write | Restarts the instance. |
| `instance.setPresence` | write | Sets global presence (available/unavailable). |
| `instance.logout` | write | Logs out of WhatsApp (keeps the instance). ⚠️ destructive |
| `instance.delete` | write | Removes the instance entirely. ⚠️ destructive |

> Confirm the exact `actionId` and params with `get_action_schema` before executing — this table is a map, not a substitute.

## Create and Connect (typical flow)

1. `execute_write_action` with `instance.create`, minimum params: `{ "instanceName": "my-bot" }`. Useful optionals: `integration` (`WHATSAPP-BAILEYS` is the default), `qrcode: true`, `number`, `token`.
2. `execute_write_action` with `instance.connect` (param `instance: "my-bot"`) → returns QR code (base64) or pairing code. The user scans it in their WhatsApp mobile app.
3. `execute_read_action` with `instance.connectionState` until it becomes `open`.

## Connection States

- `open` — connected, ready to send/receive. ✅
- `connecting` — waiting for QR scan / pairing.
- `close` — disconnected. Run `instance.connect` again.

## Destructive — Confirm First

`instance.logout` and `instance.delete` break the connection. **Always confirm with the user** the exact instance name before executing. `delete` is irreversible: loses session and configs.

## Intent → Action Examples

- "create an instance called sales" → `instance.create` `{ instanceName: "sales", qrcode: true }`
- "give me the QR code for the sales instance" → `instance.connect` `{ instance: "sales" }`
- "is the sales instance connected?" → `instance.connectionState` `{ instance: "sales" }`
- "delete the test instance" → confirm → `instance.delete` `{ instance: "test" }`
