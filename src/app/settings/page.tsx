"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/layout/PageHeader";
import { getOwnerName, setOwnerName } from "@/lib/ownerName";
import {
  DEFAULT_END_TIME,
  getAppSettings,
  updateAppSettings,
} from "@/lib/repositories/settingsRepository";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [defaultStartTime, setDefaultStartTime] = useState("");
  const [defaultEndTime, setDefaultEndTime] = useState(DEFAULT_END_TIME);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const [ownerNameLoaded, setOwnerNameLoaded] = useState(false);
  const [ownerNameInput, setOwnerNameInput] = useState("");
  const [ownerNameSaved, setOwnerNameSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const settings = await getAppSettings();
      setDefaultStartTime(settings?.defaultStartTime ?? "");
      setDefaultEndTime(settings?.defaultEndTime ?? DEFAULT_END_TIME);
      setLoading(false);
    })();
    // localStorage is unavailable during SSR, so the real value is read
    // client-side only, after hydration, to avoid a server/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnerNameInput(getOwnerName() ?? "");
    setOwnerNameLoaded(true);
  }, []);

  function handleSaveOwnerName() {
    const trimmed = ownerNameInput.trim();
    if (trimmed === "") return;
    setOwnerName(trimmed);
    setOwnerNameSaved(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateAppSettings({
        defaultStartTime: defaultStartTime === "" ? undefined : defaultStartTime,
        defaultEndTime: defaultEndTime === "" ? undefined : defaultEndTime,
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
          <h2 className="text-lg font-semibold text-slate-50">作業者名</h2>
          <p className="mt-1 text-sm text-slate-400">
            クラウド自動バックアップの保存先ファイル名に使用します。日本語で入力しても構いません（自動的に英数字に変換されます）。
          </p>
          {ownerNameLoaded && (
            <div className="mt-4">
              <Field label="作業者名" htmlFor="ownerName" required>
                <Input
                  id="ownerName"
                  value={ownerNameInput}
                  onChange={(e) => {
                    setOwnerNameInput(e.target.value);
                    setOwnerNameSaved(false);
                  }}
                  placeholder="例：山田太郎"
                />
              </Field>
              <Button
                onClick={handleSaveOwnerName}
                disabled={ownerNameInput.trim() === ""}
                className="mt-4"
                fullWidth
              >
                作業者名を保存する
              </Button>
              {ownerNameSaved && (
                <p className="mt-2 text-sm text-slate-400">
                  作業者名を保存しました。
                </p>
              )}
            </div>
          )}
        </Card>

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
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-50">
            基本の終了時刻
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            日報入力画面の終了時刻の初期値として提案します（初期値：18:00）。入力時に自由に変更できます。
          </p>
          {!loading && (
            <div className="mt-4">
              <Field label="基本の終了時刻" htmlFor="defaultEndTime">
                <Input
                  id="defaultEndTime"
                  type="time"
                  value={defaultEndTime}
                  onChange={(e) => {
                    setDefaultEndTime(e.target.value);
                    setSavedMessage(false);
                  }}
                />
              </Field>
            </div>
          )}
        </Card>

        <Button onClick={handleSave} disabled={loading || saving} fullWidth>
          {saving ? "保存中..." : "保存する"}
        </Button>
        {savedMessage && (
          <p className="text-sm text-slate-400">設定を保存しました。</p>
        )}

        <Link href="/data">
          <Button variant="secondary" fullWidth>
            データ管理（書き出し・バックアップ・復元）
          </Button>
        </Link>

        <Link href="/pdf-settings">
          <Button variant="secondary" fullWidth>
            PDF出力設定（宛先・会社名・氏名）
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
