"use client";

import { useRouter } from "next/navigation";
import { WorkTypeForm } from "@/components/workTypes/WorkTypeForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { createWorkType } from "@/lib/repositories/workTypeRepository";
import type { WorkTypeInput } from "@/types";

export default function NewWorkTypePage() {
  const router = useRouter();

  async function handleSubmit(input: WorkTypeInput) {
    await createWorkType(input);
    router.push("/work-types");
  }

  return (
    <div>
      <PageHeader title="作業名の新規登録" backHref="/work-types" />
      <WorkTypeForm submitLabel="登録する" onSubmit={handleSubmit} />
    </div>
  );
}
