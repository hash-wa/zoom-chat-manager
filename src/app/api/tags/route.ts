import { NextRequest, NextResponse } from "next/server";
import { listChatTags, listMessageTags } from "@/lib/repo";

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope");
  const tags = scope === "message" ? listMessageTags() : listChatTags();
  return NextResponse.json({ tags });
}
