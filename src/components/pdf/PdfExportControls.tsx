"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { db } from "@/lib/db/db";
import { triggerFileDownload } from "@/lib/download";
import { getPeriodDisplayLabel } from "@/lib/period";
import { getAppSettings } from "@/lib/repositories/settingsRepository";

interface PdfExportControlsProps {
  periodLabel: string; // YYYY-MM
  disabled?: boolean;
  buttonLabel?: string;
  buttonVariant?: "primary" | "secondary";
}

/**
 * 締め期間の日報一覧をPDF出力するボタン。宛先が2件以上登録されている場合のみ、
 * どの宛先を使うかを選ぶプルダウンを表示する。
 */
export function PdfExportControls({
  periodLabel,
  disabled,
  buttonLabel = "PDF出力",
  buttonVariant = "secondary",
}: PdfExportControlsProps) {
  const settings = useLiveQuery(
    async () => (await getAppSettings()) ?? null,
    []
  );
  const recipients = settings?.pdfRecipients ?? [];
  const [selectedRecipient, setSelectedRecipient] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 設定変更で選択中の宛先が消えた場合は先頭の宛先に戻す
  const recipient =
    selectedRecipient !== null && recipients.includes(selectedRecipient)
      ? selectedRecipient
      : recipients[0];

  async function handleExport() {
    setBusy(true);
    setError(null);
    try {
      const [logs, workTypes, latestSettings] = await Promise.all([
        db.workLogs.where("periodLabel").equals(periodLabel).toArray(),
        db.workTypes.toArray(),
        getAppSettings(),
      ]);
      // pdf-libと日本語フォントは大きいため、出力時にだけ読み込む
      const { generateWorkReportPdf } = await import("@/lib/pdf");
      const bytes = await generateWorkReportPdf({
        periodLabel,
        logs,
        workTypes,
        recipient,
        companyName: latestSettings?.pdfCompanyName,
        personName: latestSettings?.pdfPersonName,
        createdDate: new Date(),
      });
      triggerFileDownload(
        bytes as Uint8Array<ArrayBuffer>,
        `${getPeriodDisplayLabel(periodLabel)}_作業日報.pdf`,
        "application/pdf"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDFの出力に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  const hasHeaderInfo =
    recipients.length > 0 || !!settings?.pdfCompanyName || !!settings?.pdfPersonName;

  return (
    <div className="flex flex-col gap-2">
      {recipients.length > 1 && (
        <label className="flex flex-col gap-1 text-left text-sm text-slate-400">
          宛先
          <Select
            value={recipient}
            onChange={(e) => setSelectedRecipient(e.target.value)}
          >
            {recipients.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </label>
      )}
      <Button
        variant={buttonVariant}
        onClick={handleExport}
        disabled={disabled || busy}
      >
        {busy ? "PDF作成中..." : buttonLabel}
      </Button>
      {settings !== undefined && !hasHeaderInfo && (
        <p className="text-sm text-slate-400">
          宛先・会社名・氏名は
          <Link href="/pdf-settings" className="text-blue-400 underline">
            PDF出力設定
          </Link>
          で登録できます。
        </p>
      )}
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
