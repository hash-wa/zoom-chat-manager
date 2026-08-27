import Link from "next/link";
import {
  listChats,
  listChatTags,
  listMessageTags,
  searchMessages,
  searchChatsByTitle,
  type SearchFilters,
  type LinkMessage,
} from "@/lib/repo";
import ChatsBulkManager from "@/components/ChatsBulkManager";

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tag?: string;
    sort?: string;
    q?: string;
    from?: string;
    to?: string;
    checked?: string;
  }>;
}) {
  const { tag, sort: sortParam, q, from, to, checked: checkedParam } = await searchParams;
  const tagId = tag ? Number(tag) : undefined;
  const sort = sortParam === "asc" ? "asc" : "desc";
  const query = (q ?? "").trim();
  const checkedState = checkedParam === "1" ? "checked" : checkedParam === "0" ? "unchecked" : null;
  const filters: SearchFilters = {
    dateFrom: from || undefined,
    dateTo: to || undefined,
  };

  const [chats, chatTags] = await Promise.all([
    listChats(tagId && !Number.isNaN(tagId) ? tagId : undefined, sort),
    listChatTags(),
  ]);

  let visibleChats = chats;
  const matchesByChat = new Map<number, LinkMessage[]>();
  let messageTags: Awaited<ReturnType<typeof listMessageTags>> = [];
  let checkedCount = 0;
  let uncheckedCount = 0;

  if (query) {
    const [messageMatches, titleMatches, allMessageTags] = await Promise.all([
      searchMessages(query, filters),
      searchChatsByTitle(query, filters),
      listMessageTags(),
    ]);
    messageTags = allMessageTags;
    checkedCount = messageMatches.filter((m) => m.connected).length;
    uncheckedCount = messageMatches.filter((m) => !m.connected).length;

    const filteredMatches =
      checkedState === "checked"
        ? messageMatches.filter((m) => m.connected)
        : checkedState === "unchecked"
          ? messageMatches.filter((m) => !m.connected)
          : messageMatches;
    for (const m of filteredMatches) {
      const list = matchesByChat.get(m.chatId) ?? [];
      list.push(m);
      matchesByChat.set(m.chatId, list);
    }
    // Once a checked/unchecked filter narrows the messages, a chat that
    // only matched by title (with no qualifying message) has nothing left
    // to show, so title-only matches stop counting as visible.
    const matchingIds = checkedState
      ? new Set(matchesByChat.keys())
      : new Set([...matchesByChat.keys(), ...titleMatches.map((c) => c.id)]);
    visibleChats = chats.filter((c) => matchingIds.has(c.id));
  }

  const chatsWithMatches = visibleChats.map((c) => ({ ...c, matches: matchesByChat.get(c.id) ?? [] }));

  if (chats.length === 0 && tagId === undefined) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Chats</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No chats yet.{" "}
          <Link href="/upload" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Upload your first one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <ChatsBulkManager
      key={`${tagId ?? ""}-${sort}-${query}-${from ?? ""}-${to ?? ""}-${checkedParam ?? ""}`}
      chats={chatsWithMatches}
      allTags={chatTags}
      messageTags={messageTags}
      activeTagId={tagId}
      sort={sort}
      query={query}
      from={from ?? ""}
      to={to ?? ""}
      checkedState={checkedState}
      checkedCount={checkedCount}
      uncheckedCount={uncheckedCount}
    />
  );
}
