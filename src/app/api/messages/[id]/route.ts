import { NextResponse } from "next/server";
import { deleteMessage, setMessageStarred, setMessageConnected } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as { starred?: boolean; connected?: boolean };

  if (body.starred !== undefined) {
    setMessageStarred(Number(id), body.starred);
  }
  if (body.connected !== undefined) {
    setMessageConnected(Number(id), body.connected);
  }
  if (body.starred === undefined && body.connected === undefined) {
    return NextResponse.json(
      { error: "starred or connected is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  deleteMessage(Number(id));
  return NextResponse.json({ ok: true });
}
