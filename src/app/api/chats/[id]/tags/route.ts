import { NextResponse } from "next/server";
import { addChatTag } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const { tagName } = (await req.json()) as { tagName?: string };
  if (!tagName || !tagName.trim()) {
    return NextResponse.json({ error: "tagName is required" }, { status: 400 });
  }
  const tag = addChatTag(Number(id), tagName);
  return NextResponse.json({ tag }, { status: 201 });
}
