---
name: evolution-chat-groups
description: Use ao trabalhar com chats, contatos, perfil, privacidade ou grupos WhatsApp na Evolution API — buscar mensagens/contatos/chats, marcar como lido, arquivar, deletar mensagem, atualizar perfil, criar grupo, gerenciar participantes, links de convite. Cobre os domínios `chat` e `group`.
---

# Evolution API — Chats, Contatos e Grupos

Mistura de **leitura** (buscas, perfis) e **escrita** (mutações, grupos). Escolha a tool pelo `readOnly` da action. Siga `evolution-api-workflow`.

## Domínio `chat` (leitura)

| actionId | O que retorna |
|----------|---------------|
| `chat.whatsappNumbers` | Quais números têm WhatsApp |
| `chat.findContacts` | Contatos |
| `chat.findMessages` | Mensagens de um chat |
| `chat.findChats` | Lista de chats |
| `chat.findChatByRemoteJid` | Chat por JID |
| `chat.findStatusMessage` | Status |
| `chat.fetchProfile` / `chat.fetchBusinessProfile` | Perfil |
| `chat.fetchProfilePictureUrl` | URL da foto |
| `chat.getBase64FromMediaMessage` | Baixa mídia em base64 |
| `chat.fetchPrivacySettings` | Configs de privacidade |

## Domínio `chat` (escrita)

`chat.markMessageAsRead`, `chat.markChatUnread`, `chat.archiveChat`, `chat.sendPresence` (digitando…), `chat.updateMessage`, `chat.deleteMessageForEveryone` ⚠️, `chat.updateBlockStatus`, `chat.updateProfileName`, `chat.updateProfileStatus`, `chat.updateProfilePicture`, `chat.removeProfilePicture`, `chat.updatePrivacySettings`.

## Domínio `group`

Leitura: `group.findGroupInfos`, `group.fetchAllGroups`, `group.participants`, `group.inviteCode`, `group.inviteInfo`.

Escrita: `group.create`, `group.updateGroupSubject`, `group.updateGroupPicture`, `group.updateGroupDescription`, `group.updateParticipant` (add/remove/promote/demote), `group.updateSetting`, `group.toggleEphemeral`, `group.sendInvite`, `group.acceptInviteCode`, `group.revokeInviteCode`, `group.leaveGroup` ⚠️.

## Regras

- **Confirme params com `get_action_schema`** — grupos usam JID (`...@g.us`), participantes vão como array de números com DDI, e `group.updateParticipant` exige uma `action` (`add`/`remove`/`promote`/`demote`).
- **Destrutivo, confirme antes:** `chat.deleteMessageForEveryone`, `group.leaveGroup`, `group.revokeInviteCode`, `chat.updateBlockStatus` (bloquear).
- **Foto/grupo por URL ou base64** conforme o schema da action.

## Exemplos

- "esse número tem WhatsApp? 5511999999999" → `chat.whatsappNumbers` (read)
- "cria um grupo Equipe com fulano e ciclano" → `group.create` (write) → confirmar participantes
- "promove o 5511988887777 a admin no grupo X" → `group.updateParticipant` `{ action: "promote", ... }`
- "me dá o link de convite do grupo X" → `group.inviteCode` (read)
