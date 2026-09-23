"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  getAppSettings,
  updateAppSettings,
} from "@/lib/repositories/settingsRepository";
import { PDF_TAX_MODE_LABEL, type PdfTaxMode } from "@/types";

interface RecipientRow {
  name: string;
  taxMode: PdfTaxMode;
}

const EMPTY_ROW: RecipientRow = { name: "", taxMode: "exclusive" };

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export default function PdfSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<RecipientRow[]>([EMPTY_ROW]);
  const [companyName, setCompanyName] = useState("");
  const [personName, setPersonName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getAppSettings();
      const saved = settings?.pdfRecipients ?? [];
      const taxModes = settings?.pdfRecipientTaxModes ?? {};
      setRecipients(
        saved.length > 0
          ? saved.map((name) => ({ name, taxMode: taxModes[name] ?? "exclusive" }))
          : [EMPTY_ROW]
      );
      setCompanyName(settings?.pdfCompanyName ?? "");
      setPersonName(settings?.pdfPersonName ?? "");
      setLoading(false);
    })();
  }, []);

  function updateRecipient(index: number, patch: Partial<RecipientRow>) {
    setRecipients((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
    setSavedMessage(false);
  }

  function addRecipient() {
    setRecipients((prev) => [...prev, EMPTY_ROW]);
    setSavedMessage(false);
  }

  function removeRecipient(index: number) {
    setRecipients((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [EMPTY_ROW];
    });
    setSavedMessage(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // 空欄と重複を取り除いて保存する（重複した宛先は先に入力した行の税区分を使う）
      const cleanedRecipients: RecipientRow[] = [];
      for (const row of recipients) {
        const name = row.name.trim();
        if (name !== "" && !cleanedRecipients.some((r) => r.name === name)) {
          cleanedRecipients.push({ name, taxMode: row.taxMode });
        }
      }
      await updateAppSettings({
        pdfRecipients: cleanedRecipients.map((r) => r.name),
        pdfRecipientTaxModes: Object.fromEntries(
          cleanedRecipients.map((r) => [r.name, r.taxMode])
        ),
        pdfCompanyName: emptyToUndefined(companyName),
        pdfPersonName: emptyToUndefined(personName),
      });
      setRecipients(cleanedRecipients.length > 0 ? cleanedRecipients : [EMPTY_ROW]);
      setSavedMessage(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="PDF出力設定" backHref="/settings" />

      <p className="mb-4 text-sm text-slate-400">
        締め期間の日報をPDF出力するときに、ヘッダーへ記載する内容です。一度保存すると、PDF出力のたびに自動で反映されます。
      </p>

      {!loading && (
        <div className="flex flex-col gap-6">
          <Card>
            <h2 className="text-lg font-semibold text-slate-50">宛先</h2>
            <p className="mt-1 text-sm text-slate-400">
              取引先名などを入力します。入力した文字はそのままPDFに記載されます。複数登録すると、PDF出力時にどの宛先を使うか選べます。
            </p>
            <p className="mt-1 text-sm text-slate-400">
              税区分は宛先ごとに選べます。「外税」は日報の金額を税抜として消費税・税込合計を記載し、「内税」は日報の金額を税込として税抜き金額を記載します。
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    aria-label={`宛先${index + 1}`}
                    value={recipient.name}
                    onChange={(e) => updateRecipient(index, { name: e.target.value })}
                    placeholder="例：○○様作業"
                    className="min-w-0 flex-1"
                  />
                  <Select
                    aria-label={`宛先${index + 1}の税区分`}
                    value={recipient.taxMode}
                    onChange={(e) =>
                      updateRecipient(index, { taxMode: e.target.value as PdfTaxMode })
                    }
                    className="w-24! shrink-0"
                  >
                    {(Object.keys(PDF_TAX_MODE_LABEL) as PdfTaxMode[]).map((mode) => (
                      <option key={mode} value={mode}>
                        {PDF_TAX_MODE_LABEL[mode]}
                      </option>
                    ))}
                  </Select>
                  {(recipients.length > 1 || recipient.name !== "") && (
                    <Button
                      variant="secondary"
                      onClick={() => removeRecipient(index)}
                      aria-label={`宛先${index + 1}を削除`}
                    >
                      削除
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="ghost" onClick={addRecipient} className="mt-3">
              ＋ 宛先を追加
            </Button>
          </Card>

          <Card className="flex flex-col gap-4">
            <Field label="会社名" htmlFor="pdfCompanyName">
              <Input
                id="pdfCompanyName"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  setSavedMessage(false);
                }}
                placeholder="例：株式会社○○"
              />
            </Field>
            <Field label="氏名" htmlFor="pdfPersonName">
              <Input
                id="pdfPersonName"
                value={personName}
                onChange={(e) => {
                  setPersonName(e.target.value);
                  setSavedMessage(false);
                }}
                placeholder="例：山田太郎"
              />
            </Field>
          </Card>

          <Button onClick={handleSave} disabled={saving} fullWidth>
            {saving ? "保存中..." : "保存する"}
          </Button>
          {savedMessage && (
            <p className="text-sm text-slate-400">PDF出力設定を保存しました。</p>
          )}
        </div>
      )}
    </div>
  );
}
