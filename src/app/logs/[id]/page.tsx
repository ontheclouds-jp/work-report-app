"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db/db";
import { deleteWorkLog } from "@/lib/repositories/workLogRepository";
import { DAY_TYPE_LABEL, formatCurrency, formatHours } from "@/lib/calculations";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-700 py-2 last:border-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-base text-slate-100">{value}</span>
    </div>
  );
}

export default function WorkLogDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const workLog = useLiveQuery(() => db.workLogs.get(params.id), [params.id]);
  const workType = useLiveQuery(
    () => (workLog ? db.workTypes.get(workLog.workTypeId) : undefined),
    [workLog]
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function handleDelete() {
    await deleteWorkLog(params.id);
    router.push("/logs");
  }

  if (workLog === undefined) {
    return <p className="text-slate-400">読み込み中...</p>;
  }

  if (!workLog) {
    return <p className="text-slate-400">日報が見つかりませんでした。</p>;
  }

  return (
    <div>
      <PageHeader
        title="日報の詳細"
        backHref="/logs"
        action={
          <Link href={`/logs/${workLog.id}/edit`}>
            <Button variant="secondary">編集</Button>
          </Link>
        }
      />

      <Card className="mb-4 text-center">
        <p className="text-sm text-slate-400">金額</p>
        <p className="text-3xl font-bold text-amber-400">
          {formatCurrency(workLog.amount)}
        </p>
      </Card>

      <Card>
        <DetailRow label="日付" value={workLog.workDate} />
        <DetailRow label="作業名" value={workType?.name ?? "（不明な作業名）"} />
        <DetailRow
          label="時間"
          value={`${workLog.startTime}〜${workLog.endTime}`}
        />
        <DetailRow label="拘束時間" value={formatHours(workLog.rawDuration)} />
        <DetailRow label="休憩時間" value={formatHours(workLog.breakHours)} />
        <DetailRow label="作業時間" value={formatHours(workLog.workHours)} />
        <DetailRow
          label="通常時間／残業時間"
          value={`${formatHours(workLog.regularHours)} ／ ${formatHours(workLog.overtimeHours)}`}
        />
        <DetailRow
          label="曜日区分・割増"
          value={`${DAY_TYPE_LABEL[workLog.dayType]}（${workLog.dayMultiplier}倍）`}
        />
        <DetailRow
          label="時間単価"
          value={`${formatCurrency(workLog.hourlyRate)}/時間`}
        />
      </Card>

      <Card className="mt-4">
        <p className="text-sm text-slate-400">作業内容</p>
        <p className="mt-1 whitespace-pre-line text-base text-slate-100">
          {workLog.content}
        </p>
        {workLog.memo && (
          <>
            <p className="mt-3 text-sm text-slate-400">メモ</p>
            <p className="mt-1 whitespace-pre-line text-base text-slate-100">
              {workLog.memo}
            </p>
          </>
        )}
      </Card>

      <Button
        variant="danger"
        fullWidth
        className="mt-6"
        onClick={() => setConfirmingDelete(true)}
      >
        削除する
      </Button>

      <ConfirmDialog
        open={confirmingDelete}
        title="日報を削除します"
        message="この日報を削除します。元に戻せません。"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
