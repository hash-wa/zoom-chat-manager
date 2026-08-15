import { notFound } from "next/navigation";
import { getChat, listChatTags, listMessageTags } from "@/lib/repo";
import ChatTagEditor from "@/components/ChatTagEditor";
import ChatTitleEditor from "@/components/ChatTitleEditor";
import ChatMessageList from "@/components/ChatMessageList";
import DeleteChatButton from "@/components/DeleteChatButton";
import DuplicateReviewPanel from "@/components/DuplicateReviewPanel";
import LowValueReviewPanel from "@/components/LowValueReviewPanel";
import ReviewedToggle from "@/components/ReviewedToggle";
import ChatNotes from "@/components/ChatNotes";

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chat = getChat(Number(id));
  if (!chat) notFound();

  const chatTags = listChatTags();
  const messageTags = listMessageTags();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <ChatTitleEditor chatId={chat.id} title={chat.title} />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {new Date(chat.chatDate.replace(" ", "T")).toLocaleString()} · {chat.messageCount}{" "}
            messages
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <a
            href={`/api/chats/${chat.id}/export`}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            Export
          </a>
          <ReviewedToggle chatId={chat.id} initialReviewed={chat.reviewed} />
          <DeleteChatButton chatId={chat.id} chatTitle={chat.title} />
        </div>
      </div>

      <ChatTagEditor chatId={chat.id} tags={chat.tags} allTags={chatTags} />

      <ChatNotes chatId={chat.id} initialNotes={chat.notes} />

      <DuplicateReviewPanel messages={chat.messages} />

      <LowValueReviewPanel messages={chat.messages} />

      <ChatMessageList messages={chat.messages} allTags={messageTags} />
    </div>
  );
}
