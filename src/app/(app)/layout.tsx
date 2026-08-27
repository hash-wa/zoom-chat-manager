import { Suspense } from "react";
import { listChats } from "@/lib/repo";
import Sidebar from "@/components/Sidebar";
import Skeleton from "@/components/Skeleton";
import KeyboardShortcutsOverlay from "@/components/KeyboardShortcutsOverlay";

// A separate component (rather than fetching in AppLayout itself) so the
// Suspense boundary below actually has something to suspend on - an async
// layout component blocks on its own top-level awaits before React ever
// gets to render its returned JSX, which would make the fallback dead code.
async function SidebarData() {
  const chats = await listChats();
  return <Sidebar chats={chats} />;
}

function SidebarSkeleton() {
  return (
    <div className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-screen sticky top-0 p-4 space-y-4">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-full rounded-lg" />
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarData />
      </Suspense>
      <main className="flex-1 min-w-0 px-4 py-6 max-w-4xl w-full mx-auto">{children}</main>
      <KeyboardShortcutsOverlay />
    </div>
  );
}
