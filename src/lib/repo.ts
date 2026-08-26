import { client, queryAll, queryOne, run, batch } from "@/lib/db";
import { parseZoomChat, extractSortableDate, type ParsedMessage } from "@/lib/parseZoomChat";
import { hasLinkedInLink, hasOtherLink } from "@/lib/links";

export type Tag = { id: number; name: string; color: string };
export type TagWithCount = Tag & { count: number };
export type TagScope = "chat" | "message";

export type Message = {
  id: number;
  chatId: number;
  seq: number;
  timestampRaw: string;
  sender: string;
  body: string;
  starred: boolean;
  connected: boolean;
  lowValueDismissed: boolean;
  tags: Tag[];
  replyToMessageId: number | null;
  replies: Message[];
};

export type ChatSummary = {
  id: number;
  title: string;
  filename: string | null;
  uploadedAt: string;
  chatDate: string;
  messageCount: number;
  reviewed: boolean;
  tags: Tag[];
};

export type ChatDetail = ChatSummary & {
  rawText: string;
  notes: string | null;
  messages: Message[]; // top-level only; replies nest under their parent
};

export type Highlight = Message & {
  chatTitle: string;
};

async function getOrCreateTag(name: string, scope: TagScope): Promise<Tag> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name cannot be empty");
  const existing = await queryOne<Tag>(
    "SELECT id, name, color FROM tags WHERE name = ? AND scope = ?",
    [trimmed, scope]
  );
  if (existing) return existing;
  const info = await run("INSERT INTO tags (name, scope) VALUES (?, ?)", [trimmed, scope]);
  return { id: info.lastInsertRowid, name: trimmed, color: "#6366f1" };
}

async function tagsForChat(chatId: number): Promise<Tag[]> {
  return queryAll<Tag>(
    `SELECT t.id, t.name, t.color FROM tags t
     JOIN chat_tags ct ON ct.tag_id = t.id
     WHERE ct.chat_id = ? ORDER BY t.name`,
    [chatId]
  );
}

async function tagsForMessage(messageId: number): Promise<Tag[]> {
  return queryAll<Tag>(
    `SELECT t.id, t.name, t.color FROM tags t
     JOIN message_tags mt ON mt.tag_id = t.id
     WHERE mt.message_id = ? ORDER BY t.name`,
    [messageId]
  );
}

// Chat tags and message tags are separate pools (same tag name can exist
// independently in each scope), so each gets its own listing.
export async function listChatTags(): Promise<TagWithCount[]> {
  return queryAll<TagWithCount>(
    `SELECT t.id, t.name, t.color, COUNT(ct.chat_id) as count
     FROM tags t
     LEFT JOIN chat_tags ct ON ct.tag_id = t.id
     WHERE t.scope = 'chat'
     GROUP BY t.id
     ORDER BY t.name`
  );
}

export async function listMessageTags(): Promise<TagWithCount[]> {
  return queryAll<TagWithCount>(
    `SELECT t.id, t.name, t.color, COUNT(mt.message_id) as count
     FROM tags t
     LEFT JOIN message_tags mt ON mt.tag_id = t.id
     WHERE t.scope = 'message'
     GROUP BY t.id
     ORDER BY t.name`
  );
}

export async function deleteTag(id: number): Promise<void> {
  await batch([
    { sql: "DELETE FROM chat_tags WHERE tag_id = ?", args: [id] },
    { sql: "DELETE FROM message_tags WHERE tag_id = ?", args: [id] },
    { sql: "DELETE FROM tags WHERE id = ?", args: [id] },
  ]);
}

export async function renameTag(id: number, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name cannot be empty");
  await run("UPDATE tags SET name = ? WHERE id = ?", [trimmed, id]);
}

// Used both by createChat (to store the date) and by upload-time duplicate
// detection (to check for an existing chat before inserting a new one).
export function previewChatDate(rawText: string): string {
  const messages = parseZoomChat(rawText);
  const derivedDate = messages.length > 0 ? extractSortableDate(messages[0].timestampRaw) : null;
  return derivedDate ?? new Date().toISOString().slice(0, 19).replace("T", " ");
}

export async function findChatByChatDate(
  chatDate: string
): Promise<{ id: number; title: string } | undefined> {
  return queryOne<{ id: number; title: string }>("SELECT id, title FROM chats WHERE chat_date = ?", [
    chatDate,
  ]);
}

export async function createChat(
  title: string,
  filename: string | null,
  rawText: string
): Promise<number> {
  const messages: ParsedMessage[] = parseZoomChat(rawText);
  const chatDate = previewChatDate(rawText);

  // An interactive transaction is required here (not batch()) because each
  // insert's id feeds the next statement's args - batch() can't do that.
  const tx = await client.transaction("write");
  try {
    const chatInfo = await tx.execute({
      sql: "INSERT INTO chats (title, filename, raw_text, chat_date) VALUES (?, ?, ?, ?)",
      args: [title, filename, rawText, chatDate],
    });
    const chatId = Number(chatInfo.lastInsertRowid);

    const seqToId: number[] = [];
    for (let idx = 0; idx < messages.length; idx++) {
      const m = messages[idx];
      const msgInfo = await tx.execute({
        sql: `INSERT INTO messages (chat_id, seq, timestamp_raw, sender, body)
              VALUES (?, ?, ?, ?, ?)`,
        args: [chatId, idx, m.timestampRaw, m.sender, m.body],
      });
      seqToId[idx] = Number(msgInfo.lastInsertRowid);
    }
    for (let idx = 0; idx < messages.length; idx++) {
      const m = messages[idx];
      if (m.replyToSeq !== undefined) {
        await tx.execute({
          sql: "UPDATE messages SET reply_to_message_id = ? WHERE id = ?",
          args: [seqToId[m.replyToSeq], seqToId[idx]],
        });
      }
    }

    await tx.commit();
    return chatId;
  } finally {
    tx.close();
  }
}

export async function listChats(
  tagId?: number,
  sort: "asc" | "desc" = "desc"
): Promise<ChatSummary[]> {
  const direction = sort === "asc" ? "ASC" : "DESC";
  const rows = tagId
    ? await queryAll<Omit<ChatSummary, "tags" | "reviewed"> & { reviewed: number }>(
        `SELECT c.id, c.title, c.filename, c.uploaded_at as uploadedAt, c.chat_date as chatDate,
                c.reviewed as reviewed,
                (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as messageCount
         FROM chats c
         JOIN chat_tags ct ON ct.chat_id = c.id
         WHERE ct.tag_id = ?
         ORDER BY c.chat_date ${direction}`,
        [tagId]
      )
    : await queryAll<Omit<ChatSummary, "tags" | "reviewed"> & { reviewed: number }>(
        `SELECT c.id, c.title, c.filename, c.uploaded_at as uploadedAt, c.chat_date as chatDate,
                c.reviewed as reviewed,
                (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as messageCount
         FROM chats c
         ORDER BY c.chat_date ${direction}`
      );

  return Promise.all(
    rows.map(async (r) => ({ ...r, reviewed: !!r.reviewed, tags: await tagsForChat(r.id) }))
  );
}

export async function getChat(id: number): Promise<ChatDetail | undefined> {
  const chat = await queryOne<
    Omit<ChatDetail, "tags" | "messages" | "messageCount" | "reviewed"> & { reviewed: number }
  >(
    `SELECT id, title, filename, uploaded_at as uploadedAt, chat_date as chatDate,
            raw_text as rawText, reviewed as reviewed, notes as notes
     FROM chats WHERE id = ?`,
    [id]
  );
  if (!chat) return undefined;

  const messageRows = await queryAll<
    Omit<Message, "starred" | "connected" | "lowValueDismissed" | "tags" | "replies"> & {
      starred: number;
      connected: number;
      lowValueDismissed: number;
    }
  >(
    `SELECT id, chat_id as chatId, seq, timestamp_raw as timestampRaw, sender, body, starred,
            connected, low_value_dismissed as lowValueDismissed, reply_to_message_id as replyToMessageId
     FROM messages WHERE chat_id = ? ORDER BY seq ASC`,
    [id]
  );

  const byId = new Map<number, Message>();
  await Promise.all(
    messageRows.map(async (m) => {
      byId.set(m.id, {
        ...m,
        starred: !!m.starred,
        connected: !!m.connected,
        lowValueDismissed: !!m.lowValueDismissed,
        tags: await tagsForMessage(m.id),
        replies: [],
      });
    })
  );

  const topLevel: Message[] = [];
  for (const m of messageRows) {
    const message = byId.get(m.id)!;
    const parent = m.replyToMessageId != null ? byId.get(m.replyToMessageId) : undefined;
    if (parent) {
      parent.replies.push(message);
    } else {
      topLevel.push(message);
    }
  }

  return {
    ...chat,
    reviewed: !!chat.reviewed,
    tags: await tagsForChat(id),
    messageCount: messageRows.length,
    messages: topLevel,
  };
}

function messageToMarkdown(m: Message, depth: number): string {
  const prefix = "> ".repeat(depth);
  const lines = [
    `${prefix}**${m.sender}** _${m.timestampRaw}_${m.starred ? " ⭐" : ""}`,
    ...m.body.split("\n").map((line) => `${prefix}${line}`),
  ];
  const own = lines.join("\n");
  const replies = m.replies.map((r) => messageToMarkdown(r, depth + 1)).join("\n\n");
  return replies ? `${own}\n\n${replies}` : own;
}

export async function exportChatMarkdown(
  id: number
): Promise<{ title: string; markdown: string } | undefined> {
  const chat = await getChat(id);
  if (!chat) return undefined;

  const header = [
    `# ${chat.title}`,
    "",
    `_${new Date(chat.chatDate.replace(" ", "T")).toLocaleString()} · ${chat.messageCount} messages_`,
  ];
  if (chat.tags.length > 0) {
    header.push(`_Tags: ${chat.tags.map((t) => t.name).join(", ")}_`);
  }
  if (chat.notes?.trim()) {
    header.push("", "## Notes", "", chat.notes.trim());
  }
  header.push("", "---", "");

  const body = chat.messages.map((m) => messageToMarkdown(m, 0)).join("\n\n");
  return { title: chat.title, markdown: `${header.join("\n")}\n${body}\n` };
}

export async function deleteChat(id: number): Promise<void> {
  await batch([
    {
      sql: "DELETE FROM message_tags WHERE message_id IN (SELECT id FROM messages WHERE chat_id = ?)",
      args: [id],
    },
    { sql: "DELETE FROM messages WHERE chat_id = ?", args: [id] },
    { sql: "DELETE FROM chat_tags WHERE chat_id = ?", args: [id] },
    { sql: "DELETE FROM chats WHERE id = ?", args: [id] },
  ]);
}

export async function renameChat(id: number, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error("Title cannot be empty");
  await run("UPDATE chats SET title = ? WHERE id = ?", [trimmed, id]);
}

export async function setChatReviewed(id: number, reviewed: boolean): Promise<void> {
  await run("UPDATE chats SET reviewed = ? WHERE id = ?", [reviewed ? 1 : 0, id]);
}

export async function setChatNotes(id: number, notes: string): Promise<void> {
  await run("UPDATE chats SET notes = ? WHERE id = ?", [notes, id]);
}

export async function addChatTag(chatId: number, tagName: string): Promise<Tag> {
  const tag = await getOrCreateTag(tagName, "chat");
  await run("INSERT OR IGNORE INTO chat_tags (chat_id, tag_id) VALUES (?, ?)", [chatId, tag.id]);
  return tag;
}

export async function removeChatTag(chatId: number, tagId: number): Promise<void> {
  await run("DELETE FROM chat_tags WHERE chat_id = ? AND tag_id = ?", [chatId, tagId]);
}

export async function bulkAddChatTag(chatIds: number[], tagName: string): Promise<Tag> {
  const tag = await getOrCreateTag(tagName, "chat");
  await batch(
    chatIds.map((chatId) => ({
      sql: "INSERT OR IGNORE INTO chat_tags (chat_id, tag_id) VALUES (?, ?)",
      args: [chatId, tag.id],
    }))
  );
  return tag;
}

export async function bulkRemoveChatTag(chatIds: number[], tagId: number): Promise<void> {
  await batch(
    chatIds.map((chatId) => ({
      sql: "DELETE FROM chat_tags WHERE chat_id = ? AND tag_id = ?",
      args: [chatId, tagId],
    }))
  );
}

export async function setMessageStarred(messageId: number, starred: boolean): Promise<void> {
  await run("UPDATE messages SET starred = ? WHERE id = ?", [starred ? 1 : 0, messageId]);
}

export async function setMessageConnected(messageId: number, connected: boolean): Promise<void> {
  await run("UPDATE messages SET connected = ? WHERE id = ?", [connected ? 1 : 0, messageId]);
}

export async function setMessageLowValueDismissed(
  messageId: number,
  dismissed: boolean
): Promise<void> {
  await run("UPDATE messages SET low_value_dismissed = ? WHERE id = ?", [
    dismissed ? 1 : 0,
    messageId,
  ]);
}

// Any replies nested under this message become top-level (mirroring the
// schema's ON DELETE SET NULL intent) rather than being deleted along with it.
export async function deleteMessage(id: number): Promise<void> {
  await batch([
    { sql: "UPDATE messages SET reply_to_message_id = NULL WHERE reply_to_message_id = ?", args: [id] },
    { sql: "DELETE FROM message_tags WHERE message_id = ?", args: [id] },
    { sql: "DELETE FROM messages WHERE id = ?", args: [id] },
  ]);
}

export async function addMessageTag(messageId: number, tagName: string): Promise<Tag> {
  const tag = await getOrCreateTag(tagName, "message");
  await run("INSERT OR IGNORE INTO message_tags (message_id, tag_id) VALUES (?, ?)", [
    messageId,
    tag.id,
  ]);
  return tag;
}

export async function removeMessageTag(messageId: number, tagId: number): Promise<void> {
  await run("DELETE FROM message_tags WHERE message_id = ? AND tag_id = ?", [messageId, tagId]);
}

export async function listHighlights(): Promise<Highlight[]> {
  const rows = await queryAll<
    Omit<Highlight, "starred" | "lowValueDismissed" | "connected" | "tags" | "replies"> & {
      starred: number;
      lowValueDismissed: number;
      connected: number;
    }
  >(
    `SELECT m.id, m.chat_id as chatId, m.seq, m.timestamp_raw as timestampRaw,
            m.sender, m.body, m.starred, m.low_value_dismissed as lowValueDismissed,
            m.connected as connected, m.reply_to_message_id as replyToMessageId,
            c.title as chatTitle
     FROM messages m
     JOIN chats c ON c.id = m.chat_id
     WHERE m.starred = 1
     ORDER BY c.chat_date DESC, m.seq ASC`
  );

  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      starred: !!r.starred,
      lowValueDismissed: !!r.lowValueDismissed,
      connected: !!r.connected,
      tags: await tagsForMessage(r.id),
      replies: [],
    }))
  );
}

export type LinkMessage = {
  id: number;
  chatId: number;
  chatTitle: string;
  seq: number;
  timestampRaw: string;
  sender: string;
  body: string;
  connected: boolean;
  starred: boolean;
  tags: Tag[];
};

// Not tied to starring/tagging at all - every message in every chat,
// independent of the highlight system. Used to scan for URLs and to let the
// highlights page pull in matches (tag, LinkedIn, Links) regardless of
// starred status.
export async function listAllMessages(): Promise<LinkMessage[]> {
  const rows = await queryAll<
    Omit<LinkMessage, "connected" | "starred" | "tags"> & { connected: number; starred: number }
  >(
    `SELECT m.id, m.chat_id as chatId, c.title as chatTitle, m.seq,
            m.timestamp_raw as timestampRaw, m.sender, m.body, m.connected as connected,
            m.starred as starred
     FROM messages m
     JOIN chats c ON c.id = m.chat_id
     ORDER BY c.chat_date DESC, m.seq ASC`
  );
  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      connected: !!r.connected,
      starred: !!r.starred,
      tags: await tagsForMessage(r.id),
    }))
  );
}

export async function listLinkedInLinkMessages(): Promise<LinkMessage[]> {
  const all = await listAllMessages();
  return all.filter((m) => hasLinkedInLink(m.body));
}

export async function listOtherLinkMessages(): Promise<LinkMessage[]> {
  const all = await listAllMessages();
  return all.filter((m) => hasOtherLink(m.body));
}

export type SearchFilters = {
  sender?: string;
  dateFrom?: string; // YYYY-MM-DD, inclusive
  dateTo?: string; // YYYY-MM-DD, inclusive
};

export async function searchMessages(
  query: string,
  filters: SearchFilters = {}
): Promise<LinkMessage[]> {
  const q = query.trim();
  if (!q) return [];

  const conditions = ["(LOWER(m.body) LIKE ? OR LOWER(m.sender) LIKE ?)"];
  const params: (string | number)[] = [`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`];

  if (filters.sender?.trim()) {
    conditions.push("m.sender LIKE ? COLLATE NOCASE");
    params.push(`%${filters.sender.trim()}%`);
  }
  if (filters.dateFrom) {
    conditions.push("c.chat_date >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("c.chat_date <= ?");
    params.push(`${filters.dateTo} 23:59:59`);
  }

  const rows = await queryAll<
    Omit<LinkMessage, "connected" | "starred" | "tags"> & { connected: number; starred: number }
  >(
    `SELECT m.id, m.chat_id as chatId, c.title as chatTitle, m.seq,
            m.timestamp_raw as timestampRaw, m.sender, m.body, m.connected as connected,
            m.starred as starred
     FROM messages m
     JOIN chats c ON c.id = m.chat_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.chat_date DESC, m.seq ASC`,
    params
  );

  return Promise.all(
    rows.map(async (r) => ({
      ...r,
      connected: !!r.connected,
      starred: !!r.starred,
      tags: await tagsForMessage(r.id),
    }))
  );
}

export async function searchChatsByTitle(
  query: string,
  filters: SearchFilters = {}
): Promise<ChatSummary[]> {
  const q = query.trim();
  if (!q) return [];

  const conditions = ["LOWER(c.title) LIKE ?"];
  const params: (string | number)[] = [`%${q.toLowerCase()}%`];

  if (filters.dateFrom) {
    conditions.push("c.chat_date >= ?");
    params.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("c.chat_date <= ?");
    params.push(`${filters.dateTo} 23:59:59`);
  }

  const rows = await queryAll<Omit<ChatSummary, "tags" | "reviewed"> & { reviewed: number }>(
    `SELECT c.id, c.title, c.filename, c.uploaded_at as uploadedAt, c.chat_date as chatDate,
            c.reviewed as reviewed,
            (SELECT COUNT(*) FROM messages m WHERE m.chat_id = c.id) as messageCount
     FROM chats c
     WHERE ${conditions.join(" AND ")}
     ORDER BY c.chat_date DESC`,
    params
  );

  return Promise.all(
    rows.map(async (r) => ({ ...r, reviewed: !!r.reviewed, tags: await tagsForChat(r.id) }))
  );
}
