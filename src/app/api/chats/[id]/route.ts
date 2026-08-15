import { NextResponse } from "next/server";
import { deleteChat, getChat, renameChat, setChatReviewed, setChatNotes } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const chat = getChat(Number(id));
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
    renameChat(Number(id), body.title);
  }
  if (body.reviewed !== undefined) {
    setChatReviewed(Number(id), body.reviewed);
  }
  if (body.notes !== undefined) {
    setChatNotes(Number(id), body.notes);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  deleteChat(Number(id));
  return NextResponse.json({ ok: true });
}
