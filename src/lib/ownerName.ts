const OWNER_NAME_KEY = "workReportApp:ownerName";

export function getOwnerName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(OWNER_NAME_KEY);
}

export function setOwnerName(name: string): void {
  window.localStorage.setItem(OWNER_NAME_KEY, name);
}

/**
 * 作業者名をクラウドバックアップのファイル名に変換する。Vercelダッシュボードで
 * 誰のバックアップか分かるよう、日本語名などもそのまま使い、ファイルパスとして
 * 問題になる記号（スラッシュや制御文字など）だけを "_" に置換する。
 */
export function toSafeOwnerFileName(rawName: string): string {
  const trimmed = rawName.normalize("NFC").trim();
  if (trimmed.length === 0) return "unknown";
  const sanitized = trimmed
    .replace(/[\x00-\x1f\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "_");
  return sanitized.length === 0 ? "unknown" : sanitized;
}
