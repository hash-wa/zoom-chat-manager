import { NextResponse } from "next/server";
import { bulkAddChatTag, bulkRemoveChatTag } from "@/lib/repo";

export async function POST(req: Request) {
  const body = (await req.json()) as { chatIds?: number[]; tagName?: string };
  if (!body.chatIds?.length || !body.tagName?.trim()) {
    return NextResponse.json({ error: "chatIds and tagName are required" }, { status: 400 });
  }
  const tag = await bulkAddChatTag(body.chatIds, body.tagName);
  return NextResponse.json({ tag });
}

export async function DELETE(req: Request) {
  const body = (await req.json()) as { chatIds?: number[]; tagId?: number };
  if (!body.chatIds?.length || !body.tagId) {
    return NextResponse.json({ error: "chatIds and tagId are required" }, { status: 400 });
  }
  await bulkRemoveChatTag(body.chatIds, body.tagId);
  return NextResponse.json({ ok: true });
}
