"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db/db";
import { formatCurrency, formatHours } from "@/lib/calculations";
import { summarizeByDate, summarizeByWorkType, summarizeLogs } from "@/lib/aggregation";
import { workLogsToCsv } from "@/lib/csv";
import { triggerFileDownload } from "@/lib/download";
import {
  getCurrentPeriodLabel,
  getPeriodDisplayLabel,
  getPeriodRangeDisplayLabel,
  listRecentPeriodLabels,
  shiftPeriodLabel,
} from "@/lib/period";
import { Select } from "@/components/ui/Select";
import { PdfExportControls } from "@/components/pdf/PdfExportControls";

const RECENT_PERIOD_COUNT = 24;

export default function PeriodsPage() {
  const currentPeriodLabel = getCurrentPeriodLabel();
  const previousPeriodLabel = shiftPeriodLabel(currentPeriodLabel, -1);
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodLabel);

  const existingPeriodLabels = useLiveQuery(
    () => db.workLogs.orderBy("periodLabel").uniqueKeys(),
    []
  ) as string[] | undefined;

  const availablePeriods = useMemo(() => {
    const set = new Set<string>(listRecentPeriodLabels(RECENT_PERIOD_COUNT));
    for (const label of existingPeriodLabels ?? []) set.add(label);
    return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
  }, [existingPeriodLabels]);

  const logs = useLiveQuery(
    () => db.workLogs.where("periodLabel").equals(selectedPeriod).toArray(),
    [selectedPeriod]
  );
  const workTypes = useLiveQuery(() => db.workTypes.toArray(), []);

  const totals = summarizeLogs(logs ?? []);
  const byWorkType = summarizeByWorkType(logs ?? [], workTypes ?? []);
  const byDate = summarizeByDate(logs ?? []);

  function handleExportCsv() {
    const csv = workLogsToCsv(logs ?? [], workTypes ?? []);
    triggerFileDownload(
      csv,
      `日報_${getPeriodDisplayLabel(selectedPeriod)}.csv`,
      "text/csv;charset=utf-8"
    );
  }

  return (
    <div>
      <PageHeader title="締め期間集計" backHref="/" />

      <div className="mb-4 flex gap-2">
        <Button
          variant={selectedPeriod === currentPeriodLabel ? "primary" : "secondary"}
          onClick={() => setSelectedPeriod(currentPeriodLabel)}
        >
          今月
        </Button>
        <Button
          variant={selectedPeriod === previousPeriodLabel ? "primary" : "secondary"}
          onClick={() => setSelectedPeriod(previousPeriodLabel)}
        >
          前月
        </Button>
        <Select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="flex-1"
        >
          {availablePeriods.map((label) => (
            <option key={label} value={label}>
              {getPeriodDisplayLabel(label)}
            </option>
          ))}
        </Select>
      </div>

      <Card className="text-center">
        <p className="text-sm text-slate-400">
          {getPeriodDisplayLabel(selectedPeriod)}（
          {getPeriodRangeDisplayLabel(selectedPeriod)}）
        </p>
        <p className="mt-1 text-3xl font-bold text-amber-400">
          {formatCurrency(totals.amount)}
        </p>
        <p className="mt-1 text-base text-slate-400">
          {formatHours(totals.hours)}　{totals.count}件
        </p>
        <div className="mx-auto mt-4 flex max-w-xs flex-col gap-2">
          <Button
            variant="secondary"
            onClick={handleExportCsv}
            disabled={(logs ?? []).length === 0}
          >
            この期間をCSV書き出し
          </Button>
          <PdfExportControls
            periodLabel={selectedPeriod}
            disabled={(logs ?? []).length === 0}
            buttonLabel="この期間をPDF出力"
          />
        </div>
      </Card>

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-50">作業名別内訳</h2>
        {byWorkType.length === 0 && (
          <Card className="text-center text-slate-400">
            この期間の日報はありません。
          </Card>
        )}
        <ul className="flex flex-col gap-2">
          {byWorkType.map((item) => (
            <li key={item.workTypeId}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-50">{item.workTypeName}</p>
                  <p className="text-sm text-slate-400">
                    {formatHours(item.hours)}　{item.count}件
                  </p>
                </div>
                <p className="text-lg font-bold text-amber-400">
                  {formatCurrency(item.amount)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-lg font-semibold text-slate-50">日別内訳</h2>
        {byDate.length === 0 && (
          <Card className="text-center text-slate-400">
            この期間の日報はありません。
          </Card>
        )}
        <ul className="flex flex-col gap-2">
          {byDate.map((item) => (
            <li key={item.workDate}>
              <Card className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-50">{item.workDate}</p>
                  <p className="text-sm text-slate-400">
                    {formatHours(item.hours)}　{item.count}件
                  </p>
                </div>
                <p className="text-lg font-bold text-amber-400">
                  {formatCurrency(item.amount)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
