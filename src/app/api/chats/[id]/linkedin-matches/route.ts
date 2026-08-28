import { NextResponse } from "next/server";
import { findPreviouslyCheckedLinkedIn } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const matches = await findPreviouslyCheckedLinkedIn(Number(id));
  return NextResponse.json({ matches });
}
