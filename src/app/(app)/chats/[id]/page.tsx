import { notFound } from "next/navigation";
import { getChat, listChatTags, listMessageTags } from "@/lib/repo";
import ChatDetailView from "@/components/ChatDetailView";

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chat = await getChat(Number(id));
  if (!chat) notFound();

  const [chatTags, messageTags] = await Promise.all([listChatTags(), listMessageTags()]);

  return <ChatDetailView chat={chat} chatTags={chatTags} messageTags={messageTags} />;
}
