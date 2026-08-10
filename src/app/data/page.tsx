"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db/db";
import { workLogsToCsv } from "@/lib/csv";
import { triggerFileDownload } from "@/lib/download";
import {
  buildBackupData,
  deleteAllData,
  getLastBackupAt,
  getLastRestoreAt,
  parseBackupFile,
  restoreFromBackup,
  setLastBackupAt,
  type BackupData,
} from "@/lib/backup";
import {
  getCurrentPeriodLabel,
  getPeriodDisplayLabel,
  listRecentPeriodLabels,
  todayISODate,
} from "@/lib/period";

const RECENT_PERIOD_COUNT = 24;
const PERIOD_ALL = "all";
const DELETE_CONFIRM_PHRASE = "削除する";

function formatDateTime(
  isoDate: string | null,
  emptyLabel = "まだバックアップされていません"
): string {
  if (!isoDate) return emptyLabel;
  const date = new Date(isoDate);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

export default function DataManagementPage() {
  const workTypes = useLiveQuery(() => db.workTypes.toArray(), []);
  const existingPeriodLabels = useLiveQuery(
    () => db.workLogs.orderBy("periodLabel").uniqueKeys(),
    []
  ) as string[] | undefined;

  const availablePeriods = useMemo(() => {
    const set = new Set<string>(listRecentPeriodLabels(RECENT_PERIOD_COUNT));
    for (const label of existingPeriodLabels ?? []) set.add(label);
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [existingPeriodLabels]);

  const [csvPeriod, setCsvPeriod] = useState<string>(PERIOD_ALL);
  const [csvBusy, setCsvBusy] = useState(false);

  const [lastBackupAt, setLastBackupAtState] = useState<string | null>(null);
  const [lastRestoreAt, setLastRestoreAtState] = useState<string | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);

  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupData | null>(null);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteDone, setDeleteDone] = useState(false);

  useEffect(() => {
    // localStorage is unavailable during SSR, so the real value is read
    // client-side only, after hydration, to avoid a server/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastBackupAtState(getLastBackupAt());
    setLastRestoreAtState(getLastRestoreAt());
  }, []);

  async function handleExportCsv() {
    setCsvBusy(true);
    try {
      const logs =
        csvPeriod === PERIOD_ALL
          ? await db.workLogs.toArray()
          : await db.workLogs.where("periodLabel").equals(csvPeriod).toArray();
      const csv = workLogsToCsv(logs, workTypes ?? []);
      const periodPart =
        csvPeriod === PERIOD_ALL ? "全期間" : getPeriodDisplayLabel(csvPeriod);
      triggerFileDownload(
        csv,
        `日報_${periodPart}_${todayISODate()}.csv`,
        "text/csv;charset=utf-8"
      );
    } finally {
      setCsvBusy(false);
    }
  }

  async function handleExportBackup() {
    setBackupBusy(true);
    try {
      const data = await buildBackupData();
      triggerFileDownload(
        JSON.stringify(data, null, 2),
        `作業日報帳_バックアップ_${todayISODate()}.json`,
        "application/json"
      );
      setLastBackupAt(data.exportedAt);
      setLastBackupAtState(data.exportedAt);
    } finally {
      setBackupBusy(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setRestoreError(null);
    try {
      const text = await file.text();
      const data = parseBackupFile(text);
      setPendingRestore(data);
    } catch (err) {
      setRestoreError(
        err instanceof Error ? err.message : "ファイルの読み込みに失敗しました"
      );
    }
  }

  async function handleConfirmRestore() {
    if (!pendingRestore) return;
    setRestoreBusy(true);
    try {
      await restoreFromBackup(pendingRestore);
      setLastRestoreAtState(getLastRestoreAt());
      setPendingRestore(null);
    } catch (err) {
      setRestoreError(
        err instanceof Error ? err.message : "復元に失敗しました"
      );
      setPendingRestore(null);
    } finally {
      setRestoreBusy(false);
    }
  }

  async function handleDeleteAll() {
    setDeleteBusy(true);
    try {
      await deleteAllData();
      setDeleteDone(true);
      setDeleteConfirmText("");
    } finally {
      setDeleteBusy(false);
      setConfirmingDeleteAll(false);
    }
  }

  return (
    <div>
      <PageHeader title="データ管理" backHref="/settings" />

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="text-lg font-semibold text-slate-50">CSV書き出し</h2>
          <p className="mt-1 text-sm text-slate-400">
            日報データをCSV形式で書き出します。期間を指定して絞り込めます。
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Select
              value={csvPeriod}
              onChange={(e) => setCsvPeriod(e.target.value)}
              className="sm:flex-1"
            >
              <option value={PERIOD_ALL}>全期間</option>
              {availablePeriods.map((label) => (
                <option key={label} value={label}>
                  {getPeriodDisplayLabel(label)}
                  {label === getCurrentPeriodLabel() ? "（今期間）" : ""}
                </option>
              ))}
            </Select>
            <Button onClick={handleExportCsv} disabled={csvBusy}>
              {csvBusy ? "書き出し中..." : "CSVを書き出す"}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-50">
            JSONバックアップ
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            全データ（作業名・日報）を1つのJSONファイルに書き出します。
          </p>
          <p className="mt-2 text-sm text-slate-400">
            前回のバックアップ：
            <span className="text-slate-200">{formatDateTime(lastBackupAt)}</span>
          </p>
          <Button onClick={handleExportBackup} disabled={backupBusy} className="mt-4">
            {backupBusy ? "書き出し中..." : "バックアップを書き出す"}
          </Button>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-50">JSON復元</h2>
          <p className="mt-1 text-sm text-slate-400">
            バックアップファイルから復元します。現在のデータはすべて置き換えられます。
          </p>
          <p className="mt-2 text-sm text-slate-400">
            前回の復元：
            <span className="text-slate-200">
              {formatDateTime(lastRestoreAt, "まだ復元されていません")}
            </span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleFileSelected}
          />
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            ファイルを選択して復元する
          </Button>
          {restoreError && (
            <p className="mt-2 text-sm text-red-400">{restoreError}</p>
          )}
        </Card>

        <Card className="border-red-800/50">
          <h2 className="text-lg font-semibold text-red-300">全データ削除</h2>
          <p className="mt-1 text-sm text-slate-400">
            作業名・日報のすべてのデータを削除します。元に戻せません。実行するには下に「{DELETE_CONFIRM_PHRASE}」と入力してください。
          </p>
          <Input
            value={deleteConfirmText}
            onChange={(e) => {
              setDeleteConfirmText(e.target.value);
              setDeleteDone(false);
            }}
            placeholder={DELETE_CONFIRM_PHRASE}
            className="mt-3"
          />
          <Button
            variant="danger"
            className="mt-3"
            disabled={deleteConfirmText !== DELETE_CONFIRM_PHRASE}
            onClick={() => setConfirmingDeleteAll(true)}
          >
            全データを削除する
          </Button>
          {deleteDone && (
            <p className="mt-2 text-sm text-slate-400">
              すべてのデータを削除しました。
            </p>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={pendingRestore !== null}
        title="データを復元します"
        message={`このバックアップ（作業名${pendingRestore?.workTypes.length ?? 0}件、日報${
          pendingRestore?.workLogs.length ?? 0
        }件）で現在のデータを置き換えます。元に戻せません。`}
        confirmLabel={restoreBusy ? "復元中..." : "復元する"}
        danger
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestore(null)}
      />

      <ConfirmDialog
        open={confirmingDeleteAll}
        title="全データを削除します"
        message="作業名・日報のすべてのデータを削除します。元に戻せません。"
        confirmLabel={deleteBusy ? "削除中..." : "削除する"}
        danger
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmingDeleteAll(false)}
      />
    </div>
  );
}
