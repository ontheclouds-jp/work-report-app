import { z } from "zod";
import { db } from "@/lib/db/db";
import type { AppSettings, WorkType, WorkLog } from "@/types";

const BACKUP_VERSION = 1;
const LAST_BACKUP_KEY = "workReportApp:lastBackupAt";
const LAST_RESTORE_KEY = "workReportApp:lastRestoreAt";

export interface BackupData {
  version: number;
  exportedAt: string;
  workTypes: WorkType[];
  workLogs: WorkLog[];
  appSettings?: AppSettings;
}

export async function buildBackupData(): Promise<BackupData> {
  const [workTypes, workLogs, appSettings] = await Promise.all([
    db.workTypes.toArray(),
    db.workLogs.toArray(),
    db.appSettings.get("default"),
  ]);
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    workTypes,
    workLogs,
    appSettings,
  };
}

export function getLastBackupAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_BACKUP_KEY);
}

export function setLastBackupAt(isoDate: string): void {
  window.localStorage.setItem(LAST_BACKUP_KEY, isoDate);
}

export function getLastRestoreAt(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_RESTORE_KEY);
}

function setLastRestoreAt(isoDate: string): void {
  window.localStorage.setItem(LAST_RESTORE_KEY, isoDate);
}

const workTypeBackupSchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultRate: z.number().optional(),
  status: z.enum(["active", "paused", "ended"]),
  memo: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const workLogBackupSchema = z.object({
  id: z.string(),
  workTypeId: z.string(),
  workDate: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  rawDuration: z.number(),
  breakHours: z.number(),
  workHours: z.number(),
  dayType: z.enum(["weekday", "saturday", "sunday"]),
  dayMultiplier: z.number(),
  regularHours: z.number(),
  overtimeHours: z.number(),
  hourlyRate: z.number(),
  amount: z.number(),
  content: z.string(),
  memo: z.string().optional(),
  periodLabel: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const appSettingsBackupSchema = z.object({
  id: z.string(),
  defaultStartTime: z.string().optional(),
  defaultEndTime: z.string().optional(),
  pdfRecipients: z.array(z.string()).optional(),
  pdfCompanyName: z.string().optional(),
  pdfPersonName: z.string().optional(),
  updatedAt: z.string(),
});

const backupSchema = z.object({
  version: z.number(),
  exportedAt: z.string(),
  workTypes: z.array(workTypeBackupSchema),
  workLogs: z.array(workLogBackupSchema),
  appSettings: appSettingsBackupSchema.optional(),
});

/** JSONテキストをバックアップデータとして検証・変換する。形式が不正な場合は例外を投げる。 */
export function parseBackupFile(jsonText: string): BackupData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("JSONファイルの形式が正しくありません");
  }
  const result = backupSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("バックアップファイルの形式が正しくありません");
  }
  return result.data;
}

/** バックアップデータで全データを置き換える。既存データは失われる。 */
export async function restoreFromBackup(data: BackupData): Promise<void> {
  await db.transaction("rw", db.workTypes, db.workLogs, db.appSettings, async () => {
    await db.workTypes.clear();
    await db.workLogs.clear();
    await db.appSettings.clear();
    if (data.workTypes.length > 0) {
      await db.workTypes.bulkAdd(data.workTypes);
    }
    if (data.workLogs.length > 0) {
      await db.workLogs.bulkAdd(data.workLogs);
    }
    if (data.appSettings) {
      await db.appSettings.add(data.appSettings);
    }
  });
  setLastRestoreAt(new Date().toISOString());
}

export async function deleteAllData(): Promise<void> {
  await db.transaction("rw", db.workTypes, db.workLogs, db.appSettings, async () => {
    await db.workTypes.clear();
    await db.workLogs.clear();
    await db.appSettings.clear();
  });
}
