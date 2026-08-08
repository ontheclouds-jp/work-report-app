"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { db } from "@/lib/db/db";
import { formatCurrency, formatHours } from "@/lib/calculations";
import { summarizeByWorkType, summarizeLogs } from "@/lib/aggregation";
import {
  getCurrentPeriodLabel,
  getDaysUntilClosing,
  getPeriodDisplayLabel,
  getPeriodRangeDisplayLabel,
  todayISODate,
} from "@/lib/period";

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
  return `${y}年${m}月${d}日（${weekday}）`;
}

function closingUrgencyClass(daysUntilClosing: number): string {
  if (daysUntilClosing <= 3) return "text-red-400 font-semibold";
  if (daysUntilClosing <= 7) return "text-amber-400 font-medium";
  return "text-slate-400";
}

function closingMessage(daysUntilClosing: number): string {
  if (daysUntilClosing < 0) return "締め日を過ぎています。";
  if (daysUntilClosing === 0) return "本日が締め日です。";
  return `締め日まであと${daysUntilClosing}日です。`;
}

export default function HomePage() {
  const today = todayISODate();
  const currentPeriodLabel = getCurrentPeriodLabel();

  const todaysLogs = useLiveQuery(
    () => db.workLogs.where("workDate").equals(today).toArray(),
    [today]
  );
  const periodLogs = useLiveQuery(
    () => db.workLogs.where("periodLabel").equals(currentPeriodLabel).toArray(),
    [currentPeriodLabel]
  );
  const workTypes = useLiveQuery(() => db.workTypes.toArray(), []);
  const workTypeNameById = new Map(workTypes?.map((w) => [w.id, w.name]) ?? []);

  const loading = todaysLogs === undefined;
  const hasLogsToday = (todaysLogs?.length ?? 0) > 0;

  const periodTotals = summarizeLogs(periodLogs ?? []);
  const periodByWorkType = summarizeByWorkType(periodLogs ?? [], workTypes ?? []);
  const daysUntilClosing = getDaysUntilClosing(currentPeriodLabel);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-slate-400">今日</p>
        <h1 className="text-xl font-bold text-slate-50">
          {formatDateLabel(today)}
        </h1>
      </div>

      {!loading && !hasLogsToday && (
        <Card className="border-blue-800/50 bg-blue-950/30 text-center">
          <p className="mb-3 text-base text-slate-200">
            今日の日報がまだ入力されていません。
          </p>
          <Link href="/logs/new">
            <Button fullWidth>今日の日報を入力する</Button>
          </Link>
        </Card>
      )}

      {!loading && hasLogsToday && (
        <div className="flex flex-col gap-3">
          <p className="text-base font-medium text-slate-200">
            今日の日報（{todaysLogs!.length}件）
          </p>
          {todaysLogs!.map((log) => (
            <Link key={log.id} href={`/logs/${log.id}`}>
              <Card className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-50">
                    {workTypeNameById.get(log.workTypeId) ?? "（不明な作業名）"}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {log.startTime}〜{log.endTime}（{formatHours(log.workHours)}）
                  </p>
                </div>
                <p className="text-lg font-bold text-amber-400">
                  {formatCurrency(log.amount)}
                </p>
              </Card>
            </Link>
          ))}
          <Link href="/logs/new">
            <Button variant="secondary" fullWidth>
              別の作業名の日報を追加する
            </Button>
          </Link>
        </div>
      )}

      <Card>
        <p className="text-sm text-slate-400">
          {getPeriodDisplayLabel(currentPeriodLabel)}（
          {getPeriodRangeDisplayLabel(currentPeriodLabel)}）の累計
        </p>
        <p className="mt-1 text-2xl font-bold text-amber-400">
          {formatCurrency(periodTotals.amount)}
          <span className="ml-2 text-base font-medium text-slate-400">
            （{formatHours(periodTotals.hours)}）
          </span>
        </p>
        <p className={`mt-1 text-sm ${closingUrgencyClass(daysUntilClosing)}`}>
          {closingMessage(daysUntilClosing)}
        </p>

        {periodByWorkType.length > 0 && (
          <ul className="mt-4 flex flex-col gap-2 border-t border-slate-700 pt-3">
            {periodByWorkType.map((item) => (
              <li
                key={item.workTypeId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-300">{item.workTypeName}</span>
                <span className="font-medium text-amber-400">
                  {formatCurrency(item.amount)}
                  <span className="ml-1 font-normal text-slate-400">
                    （{formatHours(item.hours)}）
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}

        <Link href="/periods">
          <Button variant="ghost" fullWidth className="mt-3">
            締め期間集計を見る
          </Button>
        </Link>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/logs">
          <Button variant="secondary" fullWidth>
            日報一覧を見る
          </Button>
        </Link>
        <Link href="/work-types">
          <Button variant="secondary" fullWidth>
            作業名一覧を見る
          </Button>
        </Link>
      </div>
    </div>
  );
}
