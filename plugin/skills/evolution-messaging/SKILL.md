---
name: evolution-messaging
description: Use ao enviar qualquer mensagem WhatsApp via Evolution API — texto, mídia (imagem/vídeo/documento/áudio), sticker, localização, contato, reação, enquete, lista, botões, template ou status. Cobre o domínio `message` via MCP evolution-api.
---

# Evolution API — Mensagens

Enviar mensagem é **escrita** (`execute_write_action`) e é uma **ação externa irreversível**: confirme destinatário e conteúdo antes de disparar, e SEMPRE antes de envios em massa. Siga `evolution-api-workflow`.

## Pré-requisitos

1. Instância em estado `open` (cheque com `list_instances`).
2. `number` com DDI, só dígitos: `5511999999999`. Para grupo, use o JID do grupo (`...@g.us`).

## Actions do domínio `message`

| actionId | Envia |
|----------|-------|
| `message.sendText` | Texto |
| `message.sendMedia` | Imagem, vídeo, documento, áudio (via URL ou base64) |
| `message.sendWhatsAppAudio` | Áudio de voz (PTT) |
| `message.sendPtv` | Vídeo redondo (PTV) |
| `message.sendSticker` | Sticker |
| `message.sendLocation` | Localização |
| `message.sendContact` | Cartão de contato |
| `message.sendReaction` | Reação (emoji) a uma mensagem |
| `message.sendPoll` | Enquete |
| `message.sendList` | Lista interativa |
| `message.sendButtons` | Botões |
| `message.sendTemplate` | Template (WhatsApp Business) |
| `message.sendStatus` | Status/stories |

Todas são **write** → `execute_write_action`. Confirme params com `get_action_schema`.

## Params comuns (sendText)

```json
{
  "actionId": "message.sendText",
  "params": {
    "instance": "meu-bot",
    "number": "5511999999999",
    "text": "Olá!",
    "delay": 1200,
    "linkPreview": true
  }
}
```
Opcionais: `quoted` (citar mensagem), `mentioned` (array de números a mencionar).

## Params comuns (sendMedia)

```json
{
  "actionId": "message.sendMedia",
  "params": {
    "instance": "meu-bot",
    "number": "5511999999999",
    "mediatype": "image",
    "media": "https://exemplo.com/foto.jpg",
    "caption": "Veja isto",
    "fileName": "foto.jpg"
  }
}
```
`mediatype`: `image | document | video | audio | ptv`. `media` aceita URL ou base64.

## Regras

- **Confirme antes de enviar** — quem é o destinatário e qual o texto exato. Para listas de destinatários (broadcast), confirme a lista inteira e o conteúdo.
- **Sem `actionId` chutado** — se não tem certeza do tipo (lista vs botões vs enquete), rode `search_actions` no domínio `message`.
- **Erro de não-entrega?** Quase sempre instância não está `open` ou número sem DDI. Verifique ambos.
- Para checar se um número tem WhatsApp antes de enviar: `chat.whatsappNumbers` (read) — ver skill `evolution-chat-groups`.
