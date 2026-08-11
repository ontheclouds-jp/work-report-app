import { db } from "@/lib/db/db";
import type { AppSettings } from "@/types";

const SETTINGS_ID = "default";

export const DEFAULT_END_TIME = "18:00";

export async function getAppSettings(): Promise<AppSettings | undefined> {
  return db.appSettings.get(SETTINGS_ID);
}

export async function updateAppSettings(
  input: Partial<Omit<AppSettings, "id" | "updatedAt">>
): Promise<AppSettings> {
  const existing = await db.appSettings.get(SETTINGS_ID);
  const updated: AppSettings = {
    id: SETTINGS_ID,
    ...existing,
    ...input,
    updatedAt: new Date().toISOString(),
  };
  await db.appSettings.put(updated);
  return updated;
}
