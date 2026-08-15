import { NextResponse } from "next/server";
import { deleteChat, getChat, renameChat, setChatReviewed, setChatNotes } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const chat = await getChat(Number(id));
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ chat });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as { title?: string; reviewed?: boolean; notes?: string };

  if (body.title !== undefined) {
    if (!body.title.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    await renameChat(Number(id), body.title);
  }
  if (body.reviewed !== undefined) {
    await setChatReviewed(Number(id), body.reviewed);
  }
  if (body.notes !== undefined) {
    await setChatNotes(Number(id), body.notes);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteChat(Number(id));
  return NextResponse.json({ ok: true });
}
