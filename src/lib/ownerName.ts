const OWNER_NAME_KEY = "workReportApp:ownerName";

export function getOwnerName(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(OWNER_NAME_KEY);
}

export function setOwnerName(name: string): void {
  window.localStorage.setItem(OWNER_NAME_KEY, name);
}

/**
 * 作業者名をクラウドバックアップのファイル名に使える英数字文字列に変換する。
 * 英数字（と - _）のみで構成される名前はそのまま使い、それ以外（日本語名など）は
 * UTF-8バイト列を16進数化して安全かつ同名なら常に同じ文字列になるようにする。
 */
export function toSafeOwnerFileName(rawName: string): string {
  const trimmed = rawName.normalize("NFC").trim();
  if (trimmed.length === 0) return "unknown";
  if (/^[A-Za-z0-9](?:[A-Za-z0-9_-]*[A-Za-z0-9])?$/.test(trimmed)) {
    return trimmed;
  }
  const bytes = new TextEncoder().encode(trimmed);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return `u${hex}`;
}
