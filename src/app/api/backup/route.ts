import { NextResponse } from "next/server";
import { exportAllTables } from "@/lib/db";

// There's no local file to copy against a remote Turso database (and
// Vercel's filesystem is ephemeral anyway), so this dumps every table as
// JSON instead of streaming a raw .db file.
export async function GET() {
  const dump = await exportAllTables();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(dump, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="zoom-chat-manager-backup-${date}.json"`,
    },
  });
}
