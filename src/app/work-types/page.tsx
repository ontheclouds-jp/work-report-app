"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db/db";
import { deleteWorkType, hasWorkLogsForWorkType } from "@/lib/repositories/workTypeRepository";
import { formatCurrency, formatHours } from "@/lib/calculations";
import {
  getCurrentPeriodLabel,
  getPeriodDisplayLabel,
  getPeriodRangeDisplayLabel,
} from "@/lib/period";
import { WORK_TYPE_STATUS_LABEL, type WorkType } from "@/types";

const STATUS_BADGE_CLASS: Record<WorkType["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  paused: "bg-amber-500/15 text-amber-300",
  ended: "bg-slate-600/30 text-slate-400",
};

interface WorkTypeStats {
  periodAmount: number;
  periodHours: number;
  lastWorkDate?: string;
}

export default function WorkTypesPage() {
  const currentPeriodLabel = getCurrentPeriodLabel();
  const workTypes = useLiveQuery(
    () => db.workTypes.orderBy("name").toArray(),
    []
  );
  const workLogs = useLiveQuery(() => db.workLogs.toArray(), []);
  const [deleteTarget, setDeleteTarget] = useState<WorkType | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const statsByWorkType = useMemo(() => {
    const map = new Map<string, WorkTypeStats>();
    for (const log of workLogs ?? []) {
      const stats = map.get(log.workTypeId) ?? { periodAmount: 0, periodHours: 0 };
      if (log.periodLabel === currentPeriodLabel) {
        stats.periodAmount += log.amount;
        stats.periodHours += log.workHours;
      }
      if (!stats.lastWorkDate || log.workDate > stats.lastWorkDate) {
        stats.lastWorkDate = log.workDate;
      }
      map.set(log.workTypeId, stats);
    }
    return map;
  }, [workLogs, currentPeriodLabel]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const inUse = await hasWorkLogsForWorkType(deleteTarget.id);
    if (inUse) {
      setDeleteError(
        "この作業名に紐づく日報が存在するため削除できません。先に日報を削除してください。"
      );
      setDeleteTarget(null);
      return;
    }
    await deleteWorkType(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div>
      <PageHeader
        title="作業名一覧"
        action={
          <Link href="/work-types/new">
            <Button>+ 新規登録</Button>
          </Link>
        }
      />

      <p className="mb-4 text-sm text-slate-400">
        {getPeriodDisplayLabel(currentPeriodLabel)}（
        {getPeriodRangeDisplayLabel(currentPeriodLabel)}）の累計を表示しています
      </p>

      {deleteError && (
        <div className="mb-4 rounded-lg bg-red-950/40 border border-red-800/50 p-3 text-sm text-red-300">
          {deleteError}
        </div>
      )}

      {workTypes === undefined && (
        <p className="text-slate-400">読み込み中...</p>
      )}

      {workTypes && workTypes.length === 0 && (
        <Card className="text-center text-slate-400">
          作業名がまだ登録されていません。まずは作業名を登録してください。
        </Card>
      )}

      <ul className="flex flex-col gap-3">
        {workTypes?.map((workType) => {
          const stats = statsByWorkType.get(workType.id);
          return (
            <li key={workType.id}>
              <Card className="flex items-center justify-between gap-3">
                <Link href={`/work-types/${workType.id}/edit`} className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-slate-50">
                      {workType.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_BADGE_CLASS[workType.status]
                      }`}
                    >
                      {WORK_TYPE_STATUS_LABEL[workType.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-amber-400">
                    今期間：{formatCurrency(stats?.periodAmount ?? 0)}（
                    {formatHours(stats?.periodHours ?? 0)}）
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    直近の作業日：{stats?.lastWorkDate ?? "―"}
                    {workType.defaultRate !== undefined && (
                      <>　基本単価：{formatCurrency(workType.defaultRate)}/時間</>
                    )}
                  </p>
                </Link>
                <Button
                  variant="danger"
                  className="h-9 px-3 text-sm"
                  onClick={() => setDeleteTarget(workType)}
                >
                  削除
                </Button>
              </Card>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="作業名を削除します"
        message={`「${deleteTarget?.name}」を削除します。元に戻せません。`}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
