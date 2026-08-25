import { NextResponse } from "next/server";
import {
  deleteMessage,
  setMessageStarred,
  setMessageConnected,
  setMessageLowValueDismissed,
} from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const body = (await req.json()) as {
    starred?: boolean;
    connected?: boolean;
    lowValueDismissed?: boolean;
  };

  if (body.starred !== undefined) {
    await setMessageStarred(Number(id), body.starred);
  }
  if (body.connected !== undefined) {
    await setMessageConnected(Number(id), body.connected);
  }
  if (body.lowValueDismissed !== undefined) {
    await setMessageLowValueDismissed(Number(id), body.lowValueDismissed);
  }
  if (
    body.starred === undefined &&
    body.connected === undefined &&
    body.lowValueDismissed === undefined
  ) {
    return NextResponse.json(
      { error: "starred, connected, or lowValueDismissed is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteMessage(Number(id));
  return NextResponse.json({ ok: true });
}
