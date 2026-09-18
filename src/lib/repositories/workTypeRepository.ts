import { db } from "@/lib/db/db";
import { triggerAutoBackup } from "@/lib/autoBackup";
import type { WorkType, WorkTypeInput } from "@/types";

export async function listWorkTypes(): Promise<WorkType[]> {
  return db.workTypes.orderBy("name").toArray();
}

export async function getWorkType(id: string): Promise<WorkType | undefined> {
  return db.workTypes.get(id);
}

export async function createWorkType(input: WorkTypeInput): Promise<WorkType> {
  const now = new Date().toISOString();
  const workType: WorkType = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db.workTypes.add(workType);
  triggerAutoBackup();
  return workType;
}

export async function updateWorkType(
  id: string,
  input: WorkTypeInput
): Promise<WorkType> {
  const existing = await db.workTypes.get(id);
  if (!existing) throw new Error("作業名が見つかりません");
  const updated: WorkType = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await db.workTypes.put(updated);
  triggerAutoBackup();
  return updated;
}

export async function deleteWorkType(id: string): Promise<void> {
  await db.workTypes.delete(id);
  triggerAutoBackup();
}

export async function hasWorkLogsForWorkType(
  workTypeId: string
): Promise<boolean> {
  const count = await db.workLogs
    .where("workTypeId")
    .equals(workTypeId)
    .count();
  return count > 0;
}
