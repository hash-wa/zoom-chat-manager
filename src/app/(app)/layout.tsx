import { Suspense } from "react";
import {
  listChats,
  listMessageTags,
  countUntaggedHighlights,
  listLinkedInLinkMessages,
  listOtherLinkMessages,
} from "@/lib/repo";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const chats = listChats();
  const tags = listMessageTags();
  const untaggedCount = countUntaggedHighlights();
  const linkedInCount = listLinkedInLinkMessages().length;
  const linksCount = listOtherLinkMessages().length;

  return (
    <div className="min-h-screen flex">
      <Suspense fallback={<div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />}>
        <Sidebar
          chats={chats}
          tags={tags}
          untaggedCount={untaggedCount}
          linkedInCount={linkedInCount}
          linksCount={linksCount}
        />
      </Suspense>
      <main className="flex-1 min-w-0 px-4 py-6 max-w-4xl w-full mx-auto">{children}</main>
    </div>
  );
}
