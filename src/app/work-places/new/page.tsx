"use client";

import { useRouter } from "next/navigation";
import { WorkPlaceForm } from "@/components/workPlaces/WorkPlaceForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { createWorkPlace } from "@/lib/repositories/workPlaceRepository";
import type { WorkPlaceInput } from "@/types";

export default function NewWorkPlacePage() {
  const router = useRouter();

  async function handleSubmit(input: WorkPlaceInput) {
    await createWorkPlace(input);
    router.push("/work-places");
  }

  return (
    <div>
      <PageHeader title="作業場所の新規登録" backHref="/work-places" />
      <WorkPlaceForm submitLabel="登録する" onSubmit={handleSubmit} />
    </div>
  );
}
