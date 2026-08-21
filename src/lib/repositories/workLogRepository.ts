import { db } from "@/lib/db/db";
import {
  DAY_MULTIPLIERS,
  calcAmount,
  calcOvertimeSplit,
  calcRawDuration,
  calcWorkHours,
  getDayType,
} from "@/lib/calculations";
import { calcPeriodLabel } from "@/lib/period";
import type { WorkLog, WorkLogInput } from "@/types";

function buildComputedFields(input: WorkLogInput) {
  const rawDuration = calcRawDuration(input.startTime, input.endTime);
  if (rawDuration === null) {
    throw new Error(
      "終了時刻は開始時刻より後にしてください（日をまたぐ入力には対応していません）"
    );
  }
  const workHoursResult = calcWorkHours(input.startTime, input.endTime, rawDuration);
  if (workHoursResult === null) {
    throw new Error(
      "休憩時間を差し引くと作業時間が0以下になります。時刻を確認してください"
    );
  }
  const dayType = getDayType(input.workDate);
  const dayMultiplier = DAY_MULTIPLIERS[dayType];
  const { regularHours, overtimeHours } = calcOvertimeSplit(workHoursResult.workHours);
  const amount = calcAmount(regularHours, overtimeHours, input.hourlyRate, dayMultiplier);
  const periodLabel = calcPeriodLabel(input.workDate);
  return {
    ...workHoursResult,
    dayType,
    dayMultiplier,
    regularHours,
    overtimeHours,
    amount,
    periodLabel,
  };
}

export async function listWorkLogs(): Promise<WorkLog[]> {
  return db.workLogs.orderBy("workDate").reverse().toArray();
}

export async function getWorkLog(id: string): Promise<WorkLog | undefined> {
  return db.workLogs.get(id);
}

export async function listWorkLogsByPeriod(periodLabel: string): Promise<WorkLog[]> {
  return db.workLogs.where("periodLabel").equals(periodLabel).toArray();
}

/** 指定した作業名について、直前に入力された（＝最後に登録・更新された）日報を返す。単価の初期値提案に使う。 */
export async function getLatestWorkLogForWorkType(
  workTypeId: string,
  excludeId?: string
): Promise<WorkLog | undefined> {
  const logs = await db.workLogs.where("workTypeId").equals(workTypeId).toArray();
  const candidates = excludeId ? logs.filter((log) => log.id !== excludeId) : logs;
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, log) =>
    log.createdAt > latest.createdAt ? log : latest
  );
}

/** 直前に入力された（＝最後に登録・更新された）日報の開始時刻を返す。開始時刻の初期値提案に使う。 */
export async function getLatestWorkLogStartTime(
  excludeId?: string
): Promise<string | undefined> {
  const logs = await db.workLogs.toArray();
  const candidates = excludeId ? logs.filter((log) => log.id !== excludeId) : logs;
  if (candidates.length === 0) return undefined;
  return candidates.reduce((latest, log) =>
    log.createdAt > latest.createdAt ? log : latest
  ).startTime;
}

export async function findWorkLogByWorkTypeAndDate(
  workTypeId: string,
  workDate: string,
  excludeId?: string
): Promise<WorkLog | undefined> {
  const matches = await db.workLogs
    .where("[workTypeId+workDate]")
    .equals([workTypeId, workDate])
    .toArray();
  return matches.find((log) => log.id !== excludeId);
}

export async function createWorkLog(input: WorkLogInput): Promise<WorkLog> {
  const computed = buildComputedFields(input);
  const now = new Date().toISOString();
  const workLog: WorkLog = {
    id: crypto.randomUUID(),
    ...input,
    ...computed,
    createdAt: now,
    updatedAt: now,
  };
  await db.workLogs.add(workLog);
  return workLog;
}

export async function updateWorkLog(
  id: string,
  input: WorkLogInput
): Promise<WorkLog> {
  const existing = await db.workLogs.get(id);
  if (!existing) throw new Error("日報が見つかりません");
  const computed = buildComputedFields(input);
  const updated: WorkLog = {
    ...existing,
    ...input,
    ...computed,
    updatedAt: new Date().toISOString(),
  };
  await db.workLogs.put(updated);
  return updated;
}

export async function deleteWorkLog(id: string): Promise<void> {
  await db.workLogs.delete(id);
}
