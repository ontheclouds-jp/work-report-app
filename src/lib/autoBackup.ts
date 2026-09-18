import { buildBackupData } from "@/lib/backup";
import { getOwnerName } from "@/lib/ownerName";

const LAST_AUTO_BACKUP_KEY = "workReportApp:lastAutoBackupAt";

export function getLastAutoBackupAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_AUTO_BACKUP_KEY);
}

function setLastAutoBackupAt(isoDate: string): void {
  window.localStorage.setItem(LAST_AUTO_BACKUP_KEY, isoDate);
}

/**
 * クラウド（Vercel Blob）への自動バックアップをfire-and-forgetで実行する。
 * 作業者名が未設定の場合は何もしない。失敗してもユーザーには通知せず、
 * コンソールにログを残すのみとする（呼び出し元のローカル保存処理を妨げないため）。
 */
export function triggerAutoBackup(): void {
  void performAutoBackup();
}

async function performAutoBackup(): Promise<void> {
  try {
    const ownerName = getOwnerName();
    if (!ownerName) return;
    const data = await buildBackupData();
    const res = await fetch("/api/auto-backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerName, data }),
    });
    if (!res.ok) {
      throw new Error(`auto-backup request failed with status ${res.status}`);
    }
    setLastAutoBackupAt(new Date().toISOString());
  } catch (err) {
    console.error("[auto-backup] 自動バックアップに失敗しました", err);
  }
}
