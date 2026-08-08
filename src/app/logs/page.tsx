"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db/db";
import { formatCurrency, formatHours } from "@/lib/calculations";
import {
  getCurrentPeriodLabel,
  getPeriodDisplayLabel,
  listRecentPeriodLabels,
  shiftPeriodLabel,
} from "@/lib/period";
import type { WorkLog } from "@/types";

const RECENT_PERIOD_COUNT = 24;
const PERIOD_ALL = "all";

type SortOrder =
  | "date-desc"
  | "date-asc"
  | "workType"
  | "amount-desc"
  | "amount-asc";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "date-desc", label: "日付が新しい順" },
  { value: "date-asc", label: "日付が古い順" },
  { value: "workType", label: "作業名順" },
  { value: "amount-desc", label: "金額が高い順" },
  { value: "amount-asc", label: "金額が低い順" },
];

export default function WorkLogsPage() {
  const currentPeriodLabel = getCurrentPeriodLabel();
  const previousPeriodLabel = shiftPeriodLabel(currentPeriodLabel, -1);

  const workLogs = useLiveQuery(() => db.workLogs.toArray(), []);
  const workTypes = useLiveQuery(
    () => db.workTypes.orderBy("name").toArray(),
    []
  );
  const existingPeriodLabels = useLiveQuery(
    () => db.workLogs.orderBy("periodLabel").uniqueKeys(),
    []
  ) as string[] | undefined;

  const [periodFilter, setPeriodFilter] = useState<string>(PERIOD_ALL);
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("date-desc");

  const workTypeNameById = useMemo(
    () => new Map(workTypes?.map((w) => [w.id, w.name]) ?? []),
    [workTypes]
  );

  const availablePeriods = useMemo(() => {
    const set = new Set<string>(listRecentPeriodLabels(RECENT_PERIOD_COUNT));
    for (const label of existingPeriodLabels ?? []) set.add(label);
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [existingPeriodLabels]);

  function periodOptionLabel(label: string): string {
    if (label === currentPeriodLabel) return `${getPeriodDisplayLabel(label)}（今期間）`;
    if (label === previousPeriodLabel) return `${getPeriodDisplayLabel(label)}（前期間）`;
    return getPeriodDisplayLabel(label);
  }

  const filteredLogs = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase();
    const filtered = (workLogs ?? []).filter((log) => {
      if (periodFilter !== PERIOD_ALL && log.periodLabel !== periodFilter) {
        return false;
      }
      if (workTypeFilter !== "all" && log.workTypeId !== workTypeFilter) {
        return false;
      }
      if (keywordLower) {
        const haystack = `${log.content}\n${log.memo ?? ""}`.toLowerCase();
        if (!haystack.includes(keywordLower)) return false;
      }
      return true;
    });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "date-asc":
          return a.workDate.localeCompare(b.workDate);
        case "workType": {
          const nameA = workTypeNameById.get(a.workTypeId) ?? "";
          const nameB = workTypeNameById.get(b.workTypeId) ?? "";
          return nameA.localeCompare(nameB, "ja") || b.workDate.localeCompare(a.workDate);
        }
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        case "date-desc":
        default:
          return b.workDate.localeCompare(a.workDate);
      }
    });

    return sorted;
  }, [workLogs, periodFilter, workTypeFilter, keyword, sortOrder, workTypeNameById]);

  const hasActiveFilter =
    periodFilter !== PERIOD_ALL || workTypeFilter !== "all" || keyword.trim() !== "";

  function clearFilters() {
    setPeriodFilter(PERIOD_ALL);
    setWorkTypeFilter("all");
    setKeyword("");
  }

  return (
    <div>
      <PageHeader
        title="日報一覧"
        action={
          <Link href="/logs/new">
            <Button>+ 日報を入力</Button>
          </Link>
        }
      />

      <Card className="mb-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            aria-label="期間で絞り込み"
          >
            <option value={PERIOD_ALL}>すべての期間</option>
            {availablePeriods.map((label) => (
              <option key={label} value={label}>
                {periodOptionLabel(label)}
              </option>
            ))}
          </Select>
          <Select
            value={workTypeFilter}
            onChange={(e) => setWorkTypeFilter(e.target.value)}
            aria-label="作業名で絞り込み"
          >
            <option value="all">すべての作業名</option>
            {workTypes?.map((workType) => (
              <option key={workType.id} value={workType.id}>
                {workType.name}
              </option>
            ))}
          </Select>
        </div>

        <Input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="作業内容・メモをキーワード検索"
          aria-label="キーワード検索"
        />

        <div className="flex items-center gap-3">
          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            aria-label="並び替え"
            className="flex-1"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          {hasActiveFilter && (
            <Button variant="ghost" onClick={clearFilters}>
              絞り込みをクリア
            </Button>
          )}
        </div>
      </Card>

      {workLogs !== undefined && (
        <p className="mb-3 text-sm text-slate-400">{filteredLogs.length}件</p>
      )}

      {workLogs === undefined && <p className="text-slate-400">読み込み中...</p>}

      {workLogs && workLogs.length > 0 && filteredLogs.length === 0 && (
        <Card className="text-center text-slate-400">
          条件に一致する日報がありません。
        </Card>
      )}

      {workLogs && workLogs.length === 0 && (
        <Card className="text-center text-slate-400">
          日報がまだ登録されていません。
        </Card>
      )}

      <ul className="flex flex-col gap-3">
        {filteredLogs.map((log: WorkLog) => (
          <li key={log.id}>
            <Link href={`/logs/${log.id}`}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-400">{log.workDate}</p>
                    <p className="text-base font-semibold text-slate-50">
                      {workTypeNameById.get(log.workTypeId) ?? "（不明な作業名）"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {log.startTime}〜{log.endTime}（{formatHours(log.workHours)}）
                    </p>
                    <p className="mt-1 line-clamp-1 text-sm text-slate-400">
                      {log.content}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-lg font-bold text-amber-400">
                    {formatCurrency(log.amount)}
                  </p>
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
