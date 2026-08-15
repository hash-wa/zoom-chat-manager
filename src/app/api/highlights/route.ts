import { NextResponse } from "next/server";
import { listHighlights } from "@/lib/repo";

export async function GET() {
  const highlights = listHighlights();
  return NextResponse.json({ highlights });
}
