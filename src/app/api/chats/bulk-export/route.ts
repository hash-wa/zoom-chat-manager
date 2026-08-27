import { NextResponse } from "next/server";
import JSZip from "jszip";
import { exportChatMarkdown } from "@/lib/repo";

export async function POST(req: Request) {
  const body = (await req.json()) as { chatIds?: number[] };
  if (!body.chatIds?.length) {
    return NextResponse.json({ error: "chatIds is required" }, { status: 400 });
  }

  const zip = new JSZip();
  const usedNames = new Set<string>();

  for (const id of body.chatIds) {
    const result = await exportChatMarkdown(id);
    if (!result) continue;

    const safeName = result.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "chat";
    let filename = `${safeName}.md`;
    let suffix = 2;
    while (usedNames.has(filename)) {
      filename = `${safeName}-${suffix}.md`;
      suffix++;
    }
    usedNames.add(filename);
    zip.file(filename, result.markdown);
  }

  if (usedNames.size === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="chats-export.zip"`,
    },
  });
}
