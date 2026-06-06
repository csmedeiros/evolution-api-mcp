---
name: evolution-instances
description: Use ao criar, conectar (QR code), reiniciar, deslogar, deletar ou checar o estado de conexão de uma instância WhatsApp na Evolution API. Cobre o ciclo de vida da instância (domínio `instance`) via MCP evolution-api.
---

# Evolution API — Instâncias

Uma **instância** é uma conexão WhatsApp. Tudo começa aqui: sem instância conectada (`open`), nenhuma mensagem é enviada. Siga o fluxo da skill `evolution-api-workflow`.

## Actions do domínio `instance`

| actionId | R/W | O que faz |
|----------|-----|-----------|
| `instance.fetchInstances` | read | Lista instâncias (é o que `list_instances` chama). |
| `instance.connectionState` | read | Estado de uma instância: `open`, `connecting`, `close`. |
| `instance.create` | write | Cria uma instância nova. |
| `instance.connect` | write | Inicia conexão e retorna o **QR code** / pairing code. |
| `instance.restart` | write | Reinicia a instância. |
| `instance.setPresence` | write | Define presença global (available/unavailable). |
| `instance.logout` | write | Desloga o WhatsApp (mantém a instância). ⚠️ destrutivo |
| `instance.delete` | write | Remove a instância por completo. ⚠️ destrutivo |

> Confirme `actionId` e params exatos com `get_action_schema` antes de executar — esta tabela é mapa, não substituto.

## Criar e conectar (fluxo típico)

1. `execute_write_action` com `instance.create`, params mínimos: `{ "instanceName": "meu-bot" }`. Opcionais úteis: `integration` (`WHATSAPP-BAILEYS` é o padrão), `qrcode: true`, `number`, `token`.
2. `execute_write_action` com `instance.connect` (param `instance: "meu-bot"`) → retorna QR code (base64) ou pairing code. O usuário escaneia no WhatsApp do celular.
3. `execute_read_action` com `instance.connectionState` até virar `open`.

## Estados de conexão

- `open` — conectada, pronta para enviar/receber. ✅
- `connecting` — aguardando leitura do QR / pareando.
- `close` — desconectada. Rode `instance.connect` de novo.

## Destrutivo — confirme primeiro

`instance.logout` e `instance.delete` quebram a conexão. **Sempre confirme com o usuário** o nome exato da instância antes de executar. `delete` é irreversível: perde sessão e configs.

## Exemplos de intenção → action

- "crie uma instância chamada vendas" → `instance.create` `{ instanceName: "vendas", qrcode: true }`
- "me dá o QR code da instância vendas" → `instance.connect` `{ instance: "vendas" }`
- "a instância vendas está conectada?" → `instance.connectionState` `{ instance: "vendas" }`
- "deleta a instância de teste" → confirmar → `instance.delete` `{ instance: "teste" }`
