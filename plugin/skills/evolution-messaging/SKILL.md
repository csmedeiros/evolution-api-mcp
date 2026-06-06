---
name: evolution-messaging
description: Use when sending any WhatsApp message via Evolution API — text, media (image/video/document/audio), sticker, location, contact, reaction, poll, list, buttons, template or status. Covers the `message` domain via the evolution-api MCP.
---

# Evolution API — Messages

Sending a message is a **write** operation (`execute_write_action`) and an **irreversible external action**: confirm the recipient and content before sending, and ALWAYS before bulk sends. Follow `evolution-api-workflow`.

## Prerequisites

1. Instance in `open` state (check with `list_instances`).
2. `number` with country code, digits only: `5511999999999`. For groups, use the group JID (`...@g.us`).

## `message` Domain Actions

| actionId | Sends |
|----------|-------|
| `message.sendText` | Text |
| `message.sendMedia` | Image, video, document, audio (via URL or base64) |
| `message.sendWhatsAppAudio` | Voice audio (PTT) |
| `message.sendPtv` | Round video (PTV) |
| `message.sendSticker` | Sticker |
| `message.sendLocation` | Location |
| `message.sendContact` | Contact card |
| `message.sendReaction` | Reaction (emoji) to a message |
| `message.sendPoll` | Poll |
| `message.sendList` | Interactive list |
| `message.sendButtons` | Buttons |
| `message.sendTemplate` | Template (WhatsApp Business) |
| `message.sendStatus` | Status/stories |

All are **write** → `execute_write_action`. Confirm params with `get_action_schema`.

## Common Params (sendText)

```json
{
  "actionId": "message.sendText",
  "params": {
    "instance": "my-bot",
    "number": "5511999999999",
    "text": "Hello!",
    "delay": 1200,
    "linkPreview": true
  }
}
```
Optional: `quoted` (quote a message), `mentioned` (array of numbers to mention).

## Common Params (sendMedia)

```json
{
  "actionId": "message.sendMedia",
  "params": {
    "instance": "my-bot",
    "number": "5511999999999",
    "mediatype": "image",
    "media": "https://example.com/photo.jpg",
    "caption": "Check this out",
    "fileName": "photo.jpg"
  }
}
```
`mediatype`: `image | document | video | audio | ptv`. `media` accepts URL or base64.

## Rules

- **Confirm before sending** — who is the recipient and what is the exact content. For recipient lists (broadcast), confirm the entire list and content.
- **No guessed `actionId`** — if unsure of the type (list vs buttons vs poll), run `search_actions` on the `message` domain.
- **Delivery error?** Almost always the instance is not `open` or the number is missing the country code. Check both.
- To verify if a number has WhatsApp before sending: `chat.whatsappNumbers` (read) — see skill `evolution-chat-groups`.
