---
name: evolution-chat-groups
description: Use when working with chats, contacts, profile, privacy, or WhatsApp groups in the Evolution API — searching messages/contacts/chats, marking as read, archiving, deleting messages, updating profile, creating groups, managing participants, invite links. Covers the `chat` and `group` domains.
---

# Evolution API — Chats, Contacts and Groups

A mix of **read** (searches, profiles) and **write** (mutations, groups). Choose the tool by the action's `readOnly`. Follow `evolution-api-workflow`.

## `chat` Domain (read)

| actionId | What it returns |
|----------|-----------------|
| `chat.whatsappNumbers` | Which numbers have WhatsApp |
| `chat.findContacts` | Contacts |
| `chat.findMessages` | Messages from a chat |
| `chat.findChats` | List of chats |
| `chat.findChatByRemoteJid` | Chat by JID |
| `chat.findStatusMessage` | Status |
| `chat.fetchProfile` / `chat.fetchBusinessProfile` | Profile |
| `chat.fetchProfilePictureUrl` | Profile picture URL |
| `chat.getBase64FromMediaMessage` | Download media as base64 |
| `chat.fetchPrivacySettings` | Privacy settings |

## `chat` Domain (write)

`chat.markMessageAsRead`, `chat.markChatUnread`, `chat.archiveChat`, `chat.sendPresence` (typing…), `chat.updateMessage`, `chat.deleteMessageForEveryone` ⚠️, `chat.updateBlockStatus`, `chat.updateProfileName`, `chat.updateProfileStatus`, `chat.updateProfilePicture`, `chat.removeProfilePicture`, `chat.updatePrivacySettings`.

## `group` Domain

Read: `group.findGroupInfos`, `group.fetchAllGroups`, `group.participants`, `group.inviteCode`, `group.inviteInfo`.

Write: `group.create`, `group.updateGroupSubject`, `group.updateGroupPicture`, `group.updateGroupDescription`, `group.updateParticipant` (add/remove/promote/demote), `group.updateSetting`, `group.toggleEphemeral`, `group.sendInvite`, `group.acceptInviteCode`, `group.revokeInviteCode`, `group.leaveGroup` ⚠️.

## Rules

- **Confirm params with `get_action_schema`** — groups use JID (`...@g.us`), participants go as an array of numbers with country code, and `group.updateParticipant` requires an `action` (`add`/`remove`/`promote`/`demote`).
- **Destructive, confirm first:** `chat.deleteMessageForEveryone`, `group.leaveGroup`, `group.revokeInviteCode`, `chat.updateBlockStatus` (block).
- **Photo/group by URL or base64** as per the action schema.

## Examples

- "does this number have WhatsApp? 5511999999999" → `chat.whatsappNumbers` (read)
- "create a group Team with user1 and user2" → `group.create` (write) → confirm participants
- "promote 5511988887777 to admin in group X" → `group.updateParticipant` `{ action: "promote", ... }`
- "give me the invite link for group X" → `group.inviteCode` (read)
