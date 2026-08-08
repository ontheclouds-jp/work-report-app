"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import { WorkTypeForm } from "@/components/workTypes/WorkTypeForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db/db";
import { updateWorkType } from "@/lib/repositories/workTypeRepository";
import type { WorkTypeInput } from "@/types";

export default function EditWorkTypePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const workType = useLiveQuery(() => db.workTypes.get(params.id), [params.id]);

  async function handleSubmit(input: WorkTypeInput) {
    await updateWorkType(params.id, input);
    router.push("/work-types");
  }

  if (workType === undefined) {
    return <p className="text-slate-400">読み込み中...</p>;
  }

  if (workType === null || !workType) {
    return <p className="text-slate-400">作業名が見つかりませんでした。</p>;
  }

  return (
    <div>
      <PageHeader title="作業名の編集" backHref="/work-types" />
      <WorkTypeForm
        initialValue={workType}
        submitLabel="更新する"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
