"use client";

// 一時的な調査用の読み取り専用診断ページ。
// Dexie（@/lib/db）を経由するとデータベースが無い場合に新規作成されたり、
// バージョンアップ処理（既存データの書き換え）が走ったりするため、生のIndexedDB APIで読み取りのみを行う。

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";

const DB_NAME = "WorkReportDatabase";

interface StoreSummary {
  exists: boolean;
  count: number;
}

interface DiagnosticsResult {
  dbFound: true;
  idbVersion: number;
  storeNames: string[];
  workLogs: StoreSummary & { oldestDate?: string; newestDate?: string };
  workTypes: StoreSummary;
  workPlaces: StoreSummary;
  periodAdjustments: StoreSummary;
  appSettings: {
    exists: boolean;
    found: boolean;
    pdfRecipients: string[];
    pdfCompanyName?: string;
    pdfPersonName?: string;
  };
}

type State =
  | { status: "loading" }
  | { status: "notFound"; reason: string }
  | { status: "error"; message: string }
  | { status: "done"; result: DiagnosticsResult };

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** データベースが存在する場合のみ開く。存在しなければ新規作成せずにnullを返す */
async function openExistingDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB.databases === "function") {
    const databases = await indexedDB.databases();
    if (!databases.some((d) => d.name === DB_NAME)) return null;
  }
  return new Promise((resolve, reject) => {
    // バージョンを指定せずに開くと、既存DBは現在のバージョンのまま開かれる（アップグレード処理は発生しない）
    const request = indexedDB.open(DB_NAME);
    let createdByMistake = false;
    request.onupgradeneeded = () => {
      // ここに来るのはDBが存在しなかった場合のみ。作成トランザクションを中断して空のDBを作らないようにする
      createdByMistake = true;
      request.transaction?.abort();
    };
    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = (event) => {
      if (createdByMistake) {
        event.preventDefault();
        resolve(null);
      } else {
        reject(request.error);
      }
    };
  });
}

async function readDiagnostics(database: IDBDatabase): Promise<DiagnosticsResult> {
  const storeNames = Array.from(database.objectStoreNames);
  const has = (name: string) => storeNames.includes(name);
  const tx = database.transaction(storeNames, "readonly");

  const countStore = async (name: string): Promise<StoreSummary> =>
    has(name)
      ? { exists: true, count: await requestToPromise(tx.objectStore(name).count()) }
      : { exists: false, count: 0 };

  const firstWorkDate = async (direction: IDBCursorDirection) => {
    const store = tx.objectStore("workLogs");
    if (store.indexNames.contains("workDate")) {
      const cursor = await requestToPromise(store.index("workDate").openCursor(null, direction));
      return (cursor?.value as { workDate?: string } | undefined)?.workDate;
    }
    // workDateインデックスが無い場合は全件から求める
    const logs = (await requestToPromise(store.getAll())) as { workDate?: string }[];
    const dates = logs.map((l) => l.workDate).filter((d): d is string => !!d).sort();
    return direction === "next" ? dates[0] : dates[dates.length - 1];
  };

  const workLogs = await countStore("workLogs");
  const oldestDate = workLogs.count > 0 ? await firstWorkDate("next") : undefined;
  const newestDate = workLogs.count > 0 ? await firstWorkDate("prev") : undefined;

  const settings = has("appSettings")
    ? ((await requestToPromise(tx.objectStore("appSettings").get("default"))) as
        | { pdfRecipients?: string[]; pdfCompanyName?: string; pdfPersonName?: string }
        | undefined)
    : undefined;

  return {
    dbFound: true,
    idbVersion: database.version,
    storeNames,
    workLogs: { ...workLogs, oldestDate, newestDate },
    workTypes: await countStore("workTypes"),
    workPlaces: await countStore("workPlaces"),
    periodAdjustments: await countStore("periodAdjustments"),
    appSettings: {
      exists: has("appSettings"),
      found: !!settings,
      pdfRecipients: settings?.pdfRecipients ?? [],
      pdfCompanyName: settings?.pdfCompanyName,
      pdfPersonName: settings?.pdfPersonName,
    },
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-700 py-2 last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-medium text-slate-100">{value}</span>
    </div>
  );
}

function storeLabel(summary: StoreSummary) {
  if (!summary.exists) return "テーブルなし";
  return summary.count > 0 ? `あり（${summary.count}件）` : "なし（0件）";
}

export default function DiagnosticsPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let database: IDBDatabase | null = null;
    (async () => {
      if (typeof indexedDB === "undefined") {
        setState({ status: "notFound", reason: "このブラウザではIndexedDBが利用できません" });
        return;
      }
      database = await openExistingDatabase();
      if (!database) {
        setState({ status: "notFound", reason: `データベース「${DB_NAME}」が見つかりません` });
        return;
      }
      setState({ status: "done", result: await readDiagnostics(database) });
    })()
      .catch((e: unknown) => setState({ status: "error", message: String(e) }))
      .finally(() => database?.close());
  }, []);

  return (
    <div>
      <PageHeader title="データ診断（読み取り専用）" backHref="/settings" />
      <p className="mb-4 text-sm text-slate-400">
        この端末のブラウザに保存されている記録を確認します。データの変更・削除は行いません。
      </p>

      {state.status === "loading" && <Card>読み込み中…</Card>}
      {state.status === "notFound" && <Card className="text-amber-300">{state.reason}</Card>}
      {state.status === "error" && (
        <Card className="text-red-300">読み取り中にエラーが発生しました：{state.message}</Card>
      )}
      {state.status === "done" && (
        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-bold">日報データ</h2>
            <Row label="件数" value={storeLabel(state.result.workLogs)} />
            <Row label="最も古い記録の日付" value={state.result.workLogs.oldestDate ?? "—"} />
            <Row label="最も新しい記録の日付" value={state.result.workLogs.newestDate ?? "—"} />
          </Card>

          <Card>
            <h2 className="mb-2 font-bold">その他のデータ</h2>
            <Row label="作業名一覧" value={storeLabel(state.result.workTypes)} />
            <Row label="作業場所一覧" value={storeLabel(state.result.workPlaces)} />
            <Row label="締め期間の「その他」項目" value={storeLabel(state.result.periodAdjustments)} />
          </Card>

          <Card>
            <h2 className="mb-2 font-bold">PDF出力設定</h2>
            {!state.result.appSettings.exists ? (
              <p className="text-slate-400">テーブルなし</p>
            ) : !state.result.appSettings.found ? (
              <p className="text-slate-400">設定データなし</p>
            ) : (
              <>
                <Row
                  label="宛先"
                  value={
                    state.result.appSettings.pdfRecipients.length > 0
                      ? state.result.appSettings.pdfRecipients.join("、")
                      : "未登録"
                  }
                />
                <Row label="会社名" value={state.result.appSettings.pdfCompanyName || "未登録"} />
                <Row label="氏名" value={state.result.appSettings.pdfPersonName || "未登録"} />
              </>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 font-bold">技術情報</h2>
            <Row label="DBスキーマバージョン" value={String(state.result.idbVersion / 10)} />
            <Row label="テーブル" value={state.result.storeNames.join(", ")} />
          </Card>
        </div>
      )}
    </div>
  );
}
