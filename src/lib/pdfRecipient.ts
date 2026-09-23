import type { AppSettings } from "@/types";

/** PDFで宛先の後ろに自動で付ける敬称 */
export const PDF_RECIPIENT_HONORIFIC = "御中";

// 末尾の「様」「御中」と前後の空白（全角スペースを含む）。「○○様御中」のような重ね書きもまとめて取り除く。
const TRAILING_HONORIFIC_PATTERN = /(?:[\s　]*(?:様|御中))+[\s　]*$/;

/** 宛先の末尾に付いた敬称（「様」「御中」）を取り除き、会社名だけにする。 */
export function stripRecipientHonorific(name: string): string {
  return name.replace(TRAILING_HONORIFIC_PATTERN, "").trim();
}

/** PDFに記載する宛先（会社名＋「御中」）。 */
export function formatRecipientForPdf(name: string): string {
  return `${name}${PDF_RECIPIENT_HONORIFIC}`;
}

type RecipientSettings = Pick<AppSettings, "pdfRecipients" | "pdfRecipientTaxModes">;

/**
 * 宛先一覧から敬称を取り除き、空欄・重複を整理する（税区分は整形後の名前に引き継ぐ）。
 * 重複した場合は先に登録されていた宛先とその税区分を残す。
 */
export function normalizeRecipientSettings(settings: RecipientSettings): RecipientSettings {
  if (!settings.pdfRecipients) return settings;
  const oldTaxModes = settings.pdfRecipientTaxModes ?? {};
  const recipients: string[] = [];
  const taxModes: NonNullable<AppSettings["pdfRecipientTaxModes"]> = {};
  for (const original of settings.pdfRecipients) {
    const name = stripRecipientHonorific(original);
    if (name === "" || recipients.includes(name)) continue;
    recipients.push(name);
    const taxMode = oldTaxModes[original];
    if (taxMode) taxModes[name] = taxMode;
  }
  return { pdfRecipients: recipients, pdfRecipientTaxModes: taxModes };
}
