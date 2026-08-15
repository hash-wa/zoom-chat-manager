import Link from "next/link";
import { listChats, listChatTags } from "@/lib/repo";
import ChatTagFilterBar from "@/components/ChatTagFilterBar";
import ChatsBulkManager from "@/components/ChatsBulkManager";

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; sort?: string }>;
}) {
  const { tag, sort: sortParam } = await searchParams;
  const tagId = tag ? Number(tag) : undefined;
  const sort = sortParam === "asc" ? "asc" : "desc";
  const [chats, chatTags] = await Promise.all([
    listChats(tagId && !Number.isNaN(tagId) ? tagId : undefined, sort),
    listChatTags(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Chats</h1>
        <Link
          href="/upload"
          className="text-sm bg-indigo-600 text-white rounded-lg px-3 py-1.5 hover:bg-indigo-700"
        >
          Upload chat
        </Link>
      </div>

      <ChatTagFilterBar tags={chatTags} activeTagId={tagId} sort={sort} />

      {chats.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          No chats yet.{" "}
          <Link href="/upload" className="text-indigo-600 dark:text-indigo-400 hover:underline">
            Upload your first one
          </Link>
          .
        </p>
      ) : (
        <ChatsBulkManager chats={chats} allTags={chatTags} />
      )}
    </div>
  );
}
