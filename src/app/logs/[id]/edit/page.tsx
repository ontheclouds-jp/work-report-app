"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkLogForm } from "@/components/logs/WorkLogForm";
import { db } from "@/lib/db/db";
import { deleteWorkLog, updateWorkLog } from "@/lib/repositories/workLogRepository";
import type { WorkLogInput } from "@/types";

export default function EditWorkLogPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const workLog = useLiveQuery(() => db.workLogs.get(params.id), [params.id]);

  async function handleSubmit(input: WorkLogInput, overwriteLogId?: string) {
    if (overwriteLogId && overwriteLogId !== params.id) {
      await deleteWorkLog(overwriteLogId);
    }
    await updateWorkLog(params.id, input);
    router.push(`/logs/${params.id}`);
  }

  if (workLog === undefined) {
    return <p className="text-slate-400">読み込み中...</p>;
  }

  if (!workLog) {
    return <p className="text-slate-400">日報が見つかりませんでした。</p>;
  }

  return (
    <div>
      <PageHeader title="日報の編集" backHref={`/logs/${params.id}`} />
      <WorkLogForm
        initialValue={workLog}
        submitLabel="更新する"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
