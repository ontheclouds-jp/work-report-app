"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams, useRouter } from "next/navigation";
import { WorkPlaceForm } from "@/components/workPlaces/WorkPlaceForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { db } from "@/lib/db/db";
import { updateWorkPlace } from "@/lib/repositories/workPlaceRepository";
import type { WorkPlaceInput } from "@/types";

export default function EditWorkPlacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // 見つからない場合は null（読み込み中の undefined と区別する）
  const workPlace = useLiveQuery(
    async () => (await db.workPlaces.get(params.id)) ?? null,
    [params.id]
  );

  async function handleSubmit(input: WorkPlaceInput) {
    await updateWorkPlace(params.id, input);
    router.push("/work-places");
  }

  if (workPlace === undefined) {
    return <p className="text-slate-400">読み込み中...</p>;
  }

  if (workPlace === null) {
    return <p className="text-slate-400">作業場所が見つかりませんでした。</p>;
  }

  return (
    <div>
      <PageHeader title="作業場所の編集" backHref="/work-places" />
      <WorkPlaceForm
        initialValue={workPlace}
        submitLabel="更新する"
        onSubmit={handleSubmit}
      />
    </div>
  );
}
