"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { WorkLogForm } from "@/components/logs/WorkLogForm";
import { createWorkLog, updateWorkLog } from "@/lib/repositories/workLogRepository";
import type { WorkLogInput } from "@/types";

export default function NewWorkLogPage() {
  const router = useRouter();

  async function handleSubmit(input: WorkLogInput, overwriteLogId?: string) {
    if (overwriteLogId) {
      await updateWorkLog(overwriteLogId, input);
    } else {
      await createWorkLog(input);
    }
    router.push("/logs");
  }

  return (
    <div>
      <PageHeader title="日報の入力" backHref="/logs" />
      <WorkLogForm submitLabel="登録する" onSubmit={handleSubmit} />
    </div>
  );
}
