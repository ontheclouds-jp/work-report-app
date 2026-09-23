"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  getAppSettings,
  updateAppSettings,
} from "@/lib/repositories/settingsRepository";

function emptyToUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export default function PdfSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [recipients, setRecipients] = useState<string[]>([""]);
  const [companyName, setCompanyName] = useState("");
  const [personName, setPersonName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getAppSettings();
      const saved = settings?.pdfRecipients ?? [];
      setRecipients(saved.length > 0 ? saved : [""]);
      setCompanyName(settings?.pdfCompanyName ?? "");
      setPersonName(settings?.pdfPersonName ?? "");
      setLoading(false);
    })();
  }, []);

  function updateRecipient(index: number, value: string) {
    setRecipients((prev) => prev.map((r, i) => (i === index ? value : r)));
    setSavedMessage(false);
  }

  function addRecipient() {
    setRecipients((prev) => [...prev, ""]);
    setSavedMessage(false);
  }

  function removeRecipient(index: number) {
    setRecipients((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
    setSavedMessage(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // 空欄と重複を取り除いて保存する
      const cleanedRecipients = Array.from(
        new Set(recipients.map((r) => r.trim()).filter((r) => r !== ""))
      );
      await updateAppSettings({
        pdfRecipients: cleanedRecipients,
        pdfCompanyName: emptyToUndefined(companyName),
        pdfPersonName: emptyToUndefined(personName),
      });
      setRecipients(cleanedRecipients.length > 0 ? cleanedRecipients : [""]);
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
            <div className="mt-4 flex flex-col gap-3">
              {recipients.map((recipient, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    aria-label={`宛先${index + 1}`}
                    value={recipient}
                    onChange={(e) => updateRecipient(index, e.target.value)}
                    placeholder="例：○○様作業"
                    className="flex-1"
                  />
                  {(recipients.length > 1 || recipient !== "") && (
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
