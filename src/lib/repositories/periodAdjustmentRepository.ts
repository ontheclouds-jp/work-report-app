import { db } from "@/lib/db/db";
import { triggerAutoBackup } from "@/lib/autoBackup";
import type { PeriodAdjustment, PeriodAdjustmentInput } from "@/types";

/** 締め期間の「その他」項目を登録順に返す。 */
export async function listPeriodAdjustments(periodLabel: string): Promise<PeriodAdjustment[]> {
  return db.periodAdjustments.where("periodLabel").equals(periodLabel).sortBy("createdAt");
}

export async function createPeriodAdjustment(
  periodLabel: string,
  input: PeriodAdjustmentInput
): Promise<PeriodAdjustment> {
  const now = new Date().toISOString();
  const adjustment: PeriodAdjustment = {
    id: crypto.randomUUID(),
    periodLabel,
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db.periodAdjustments.add(adjustment);
  triggerAutoBackup();
  return adjustment;
}

export async function updatePeriodAdjustment(
  id: string,
  input: PeriodAdjustmentInput
): Promise<PeriodAdjustment> {
  const existing = await db.periodAdjustments.get(id);
  if (!existing) throw new Error("その他項目が見つかりません");
  const updated: PeriodAdjustment = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await db.periodAdjustments.put(updated);
  triggerAutoBackup();
  return updated;
}

export async function deletePeriodAdjustment(id: string): Promise<void> {
  await db.periodAdjustments.delete(id);
  triggerAutoBackup();
}
