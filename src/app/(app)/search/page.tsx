import Link from "next/link";
import { searchMessages, searchChatsByTitle, type SearchFilters } from "@/lib/repo";
import LinkMessageCard from "@/components/LinkMessageCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sender?: string; from?: string; to?: string }>;
}) {
  const { q, sender, from, to } = await searchParams;
  const query = (q ?? "").trim();
  const filters: SearchFilters = {
    sender: sender?.trim() || undefined,
    dateFrom: from || undefined,
    dateTo: to || undefined,
  };
  const hasFilters = Boolean(filters.sender || filters.dateFrom || filters.dateTo);

  const [messages, chats] = query
    ? await Promise.all([searchMessages(query, filters), searchChatsByTitle(query, filters)])
    : [[], []];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Search</h1>

      {query && (
        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <input type="hidden" name="q" value={query} />
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Sender</label>
            <input
              type="text"
              name="sender"
              defaultValue={sender ?? ""}
              placeholder="Any sender"
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">From</label>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">To</label>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-indigo-700"
          >
            Apply
          </button>
          {hasFilters && (
            <Link
              href={`/search?q=${encodeURIComponent(query)}`}
              className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
            >
              Clear filters
            </Link>
          )}
        </form>
      )}

      {!query ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Use the search box in the sidebar to search across every chat.
        </p>
      ) : messages.length === 0 && chats.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No results for &ldquo;{query}&rdquo;.</p>
      ) : (
        <>
          {chats.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Chats ({chats.length})
              </h2>
              <div className="space-y-2">
                {chats.map((c) => (
                  <Link
                    key={c.id}
                    href={`/chats/${c.id}`}
                    className="block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
                  >
                    <span className="font-medium text-slate-900 dark:text-slate-100">{c.title}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 ml-2">{c.messageCount} messages</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Messages ({messages.length})
              </h2>
              <div className="space-y-2">
                {messages.map((m) => (
                  <LinkMessageCard key={m.id} m={m} query={query} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
