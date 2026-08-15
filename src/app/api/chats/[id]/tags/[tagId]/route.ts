import { NextResponse } from "next/server";
import { removeChatTag } from "@/lib/repo";

type Params = { params: Promise<{ id: string; tagId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id, tagId } = await params;
  removeChatTag(Number(id), Number(tagId));
  return NextResponse.json({ ok: true });
}
