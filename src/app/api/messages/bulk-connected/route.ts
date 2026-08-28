import { NextResponse } from "next/server";
import { bulkSetMessageConnected } from "@/lib/repo";

export async function POST(req: Request) {
  const body = (await req.json()) as { messageIds?: number[]; connected?: boolean };
  if (!body.messageIds?.length) {
    return NextResponse.json({ error: "messageIds is required" }, { status: 400 });
  }
  await bulkSetMessageConnected(body.messageIds, body.connected ?? true);
  return NextResponse.json({ ok: true });
}
