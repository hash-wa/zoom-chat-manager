import { NextRequest, NextResponse } from "next/server";
import { createChat, listChats, previewChatDate, findChatByChatDate } from "@/lib/repo";

export async function GET(req: NextRequest) {
  const tagParam = req.nextUrl.searchParams.get("tag");
  const tagId = tagParam ? Number(tagParam) : undefined;
  const sort = req.nextUrl.searchParams.get("sort") === "asc" ? "asc" : "desc";
  const chats = listChats(tagId && !Number.isNaN(tagId) ? tagId : undefined, sort);
  return NextResponse.json({ chats });
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  const text = form.get("text");
  const titleField = form.get("title");
  const force = form.get("force") === "true";

  let rawText: string;
  let filename: string | null = null;

  if (file instanceof File && file.size > 0) {
    rawText = await file.text();
    filename = file.name;
  } else if (typeof text === "string" && text.trim().length > 0) {
    rawText = text;
  } else {
    return NextResponse.json(
      { error: "Provide a .txt file or pasted chat text" },
      { status: 400 }
    );
  }

  if (!force) {
    const chatDate = previewChatDate(rawText);
    const existing = findChatByChatDate(chatDate);
    if (existing) {
      return NextResponse.json(
        {
          duplicate: existing,
          error: `This looks like a duplicate of "${existing.title}"`,
        },
        { status: 409 }
      );
    }
  }

  const title =
    (typeof titleField === "string" && titleField.trim()) ||
    filename ||
    `Chat ${new Date().toLocaleString()}`;

  const id = createChat(title, filename, rawText);
  return NextResponse.json({ id }, { status: 201 });
}
