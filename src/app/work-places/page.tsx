"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db/db";
import {
  deleteWorkPlace,
  hasWorkLogsForWorkPlace,
} from "@/lib/repositories/workPlaceRepository";
import { formatHours } from "@/lib/calculations";
import {
  getCurrentPeriodLabel,
  getPeriodDisplayLabel,
  getPeriodRangeDisplayLabel,
} from "@/lib/period";
import { WORK_TYPE_STATUS_LABEL, type WorkPlace } from "@/types";

const STATUS_BADGE_CLASS: Record<WorkPlace["status"], string> = {
  active: "bg-emerald-500/15 text-emerald-300",
  paused: "bg-amber-500/15 text-amber-300",
  ended: "bg-slate-600/30 text-slate-400",
};

interface WorkPlaceStats {
  periodCount: number;
  periodHours: number;
  lastWorkDate?: string;
}

export default function WorkPlacesPage() {
  const currentPeriodLabel = getCurrentPeriodLabel();
  const workPlaces = useLiveQuery(
    () => db.workPlaces.orderBy("name").toArray(),
    []
  );
  const workLogs = useLiveQuery(() => db.workLogs.toArray(), []);
  const [deleteTarget, setDeleteTarget] = useState<WorkPlace | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const statsByWorkPlace = useMemo(() => {
    const map = new Map<string, WorkPlaceStats>();
    for (const log of workLogs ?? []) {
      if (!log.workPlaceId) continue;
      const stats = map.get(log.workPlaceId) ?? { periodCount: 0, periodHours: 0 };
      if (log.periodLabel === currentPeriodLabel) {
        stats.periodCount += 1;
        stats.periodHours += log.workHours;
      }
      if (!stats.lastWorkDate || log.workDate > stats.lastWorkDate) {
        stats.lastWorkDate = log.workDate;
      }
      map.set(log.workPlaceId, stats);
    }
    return map;
  }, [workLogs, currentPeriodLabel]);

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    const inUse = await hasWorkLogsForWorkPlace(deleteTarget.id);
    if (inUse) {
      setDeleteError(
        "この作業場所が設定された日報が存在するため削除できません。先に日報の作業場所を変更するか、日報を削除してください。"
      );
      setDeleteTarget(null);
      return;
    }
    await deleteWorkPlace(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div>
      <PageHeader
        title="作業場所一覧"
        action={
          <Link href="/work-places/new">
            <Button>+ 新規登録</Button>
          </Link>
        }
      />

      <p className="mb-4 text-sm text-slate-400">
        {getPeriodDisplayLabel(currentPeriodLabel)}（
        {getPeriodRangeDisplayLabel(currentPeriodLabel)}）の日報件数を表示しています
      </p>

      {deleteError && (
        <div className="mb-4 rounded-lg bg-red-950/40 border border-red-800/50 p-3 text-sm text-red-300">
          {deleteError}
        </div>
      )}

      {workPlaces === undefined && (
        <p className="text-slate-400">読み込み中...</p>
      )}

      {workPlaces && workPlaces.length === 0 && (
        <Card className="text-center text-slate-400">
          作業場所がまだ登録されていません。まずは作業場所を登録してください。
        </Card>
      )}

      <ul className="flex flex-col gap-3">
        {workPlaces?.map((workPlace) => {
          const stats = statsByWorkPlace.get(workPlace.id);
          return (
            <li key={workPlace.id}>
              <Card className="flex items-center justify-between gap-3">
                <Link href={`/work-places/${workPlace.id}/edit`} className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-slate-50">
                      {workPlace.name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_BADGE_CLASS[workPlace.status]
                      }`}
                    >
                      {WORK_TYPE_STATUS_LABEL[workPlace.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-amber-400">
                    今期間：{stats?.periodCount ?? 0}件（
                    {formatHours(stats?.periodHours ?? 0)}）
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    直近の作業日：{stats?.lastWorkDate ?? "―"}
                  </p>
                </Link>
                <Button
                  variant="danger"
                  className="h-9 px-3 text-sm"
                  onClick={() => setDeleteTarget(workPlace)}
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
        title="作業場所を削除します"
        message={`「${deleteTarget?.name}」を削除します。元に戻せません。`}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
