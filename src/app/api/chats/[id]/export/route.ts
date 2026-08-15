import { NextResponse } from "next/server";
import { exportChatMarkdown } from "@/lib/repo";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const result = exportChatMarkdown(Number(id));
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const safeName = result.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "chat";
  return new NextResponse(result.markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.md"`,
    },
  });
}
