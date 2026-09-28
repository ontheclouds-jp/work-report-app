import { db } from "@/lib/db/db";
import { triggerAutoBackup } from "@/lib/autoBackup";
import type { WorkPlace, WorkPlaceInput } from "@/types";

/** 作業場所が未設定（v1.0.13より前の日報）または見つからない場合の画面表示 */
export const WORK_PLACE_UNSET_LABEL = "未設定";

export async function listWorkPlaces(): Promise<WorkPlace[]> {
  return db.workPlaces.orderBy("name").toArray();
}

export async function createWorkPlace(input: WorkPlaceInput): Promise<WorkPlace> {
  const now = new Date().toISOString();
  const workPlace: WorkPlace = {
    id: crypto.randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  await db.workPlaces.add(workPlace);
  triggerAutoBackup();
  return workPlace;
}

export async function updateWorkPlace(
  id: string,
  input: WorkPlaceInput
): Promise<WorkPlace> {
  const existing = await db.workPlaces.get(id);
  if (!existing) throw new Error("作業場所が見つかりません");
  const updated: WorkPlace = {
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await db.workPlaces.put(updated);
  triggerAutoBackup();
  return updated;
}

export async function deleteWorkPlace(id: string): Promise<void> {
  await db.workPlaces.delete(id);
  triggerAutoBackup();
}

export async function hasWorkLogsForWorkPlace(
  workPlaceId: string
): Promise<boolean> {
  const count = await db.workLogs
    .where("workPlaceId")
    .equals(workPlaceId)
    .count();
  return count > 0;
}
