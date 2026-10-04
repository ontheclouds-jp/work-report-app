import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { toSafeOwnerFileName } from "@/lib/ownerName";

// 最新ファイルが誤ったデータで上書きされても過去の状態に戻せるよう、日付（日本時間）ごとの履歴も残す
const HISTORY_DIR = "auto-backups/history";

function todayInJapan(): string {
  // sv-SEロケールは YYYY-MM-DD 形式で出力される
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

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
    const json = JSON.stringify(data);
    const options = {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
    } as const;
    const [latest, history] = await Promise.all([
      put(`auto-backups/${fileName}.json`, json, options),
      put(`${HISTORY_DIR}/${fileName}/${todayInJapan()}.json`, json, options),
    ]);
    return NextResponse.json({ url: latest.url, historyUrl: history.url });
  } catch (err) {
    console.error("[api/auto-backup] Blobへの保存に失敗しました", err);
    return NextResponse.json({ error: "バックアップの保存に失敗しました" }, { status: 500 });
  }
}
