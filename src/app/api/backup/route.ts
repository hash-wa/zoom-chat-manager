import { NextResponse } from "next/server";
import fs from "node:fs";
import { checkpointForBackup, dbPath } from "@/lib/db";

export async function GET() {
  checkpointForBackup();
  const bytes = fs.readFileSync(dbPath);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.sqlite3",
      "Content-Disposition": `attachment; filename="zoom-chat-manager-backup-${date}.db"`,
    },
  });
}
