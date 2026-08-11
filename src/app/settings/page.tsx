"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { getAppSettings, updateAppSettings } from "@/lib/repositories/settingsRepository";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [defaultStartTime, setDefaultStartTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getAppSettings();
      setDefaultStartTime(settings?.defaultStartTime ?? "");
      setLoading(false);
    })();
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      await updateAppSettings({
        defaultStartTime: defaultStartTime === "" ? undefined : defaultStartTime,
      });
      setSavedMessage(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="設定" backHref="/" />

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-50">
            基本の開始時刻
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            日報入力画面の開始時刻の初期値として提案します。未設定の場合は、直前に入力した開始時刻を提案します。入力時に自由に変更できます。
          </p>
          {!loading && (
            <div className="mt-4">
              <Field label="基本の開始時刻" htmlFor="defaultStartTime">
                <Input
                  id="defaultStartTime"
                  type="time"
                  value={defaultStartTime}
                  onChange={(e) => {
                    setDefaultStartTime(e.target.value);
                    setSavedMessage(false);
                  }}
                />
              </Field>
            </div>
          )}
          <Button onClick={handleSave} disabled={loading || saving} className="mt-4">
            {saving ? "保存中..." : "保存する"}
          </Button>
          {savedMessage && (
            <p className="mt-2 text-sm text-slate-400">設定を保存しました。</p>
          )}
        </Card>

        <Link href="/data">
          <Button variant="secondary" fullWidth>
            データ管理（書き出し・バックアップ・復元）
          </Button>
        </Link>

        <Link href="/help">
          <Button variant="secondary" fullWidth>
            ヘルプ（使い方・バージョン情報）
          </Button>
        </Link>
      </div>
    </div>
  );
}
