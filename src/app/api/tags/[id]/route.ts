import { NextResponse } from "next/server";
import { deleteTag, renameTag } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { name } = (await req.json()) as { name?: string };
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    await renameTag(Number(id), name);
  } catch {
    return NextResponse.json(
      { error: "A tag with that name already exists" },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await deleteTag(Number(id));
  return NextResponse.json({ ok: true });
}
