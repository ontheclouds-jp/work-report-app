import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { toSafeOwnerFileName } from "@/lib/ownerName";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONの解析に失敗しました" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "リクエストの形式が正しくありません" }, { status: 400 });
  }
  const { ownerName, data } = body as { ownerName?: unknown; data?: unknown };
  if (typeof ownerName !== "string" || ownerName.trim() === "" || data === undefined) {
    return NextResponse.json(
      { error: "ownerNameとdataが必要です" },
      { status: 400 }
    );
  }

  const fileName = toSafeOwnerFileName(ownerName);
  try {
    const blob = await put(`auto-backups/${fileName}.json`, JSON.stringify(data), {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
    });
    return NextResponse.json({ url: blob.url });
  } catch (err) {
    console.error("[api/auto-backup] Blobへの保存に失敗しました", err);
    return NextResponse.json({ error: "バックアップの保存に失敗しました" }, { status: 500 });
  }
}
