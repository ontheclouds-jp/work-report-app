import type { DayType } from "@/lib/calculations";

export type WorkTypeStatus = "active" | "paused" | "ended";

export interface WorkType {
  id: string;
  name: string;
  defaultRate?: number;
  status: WorkTypeStatus;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export type WorkTypeInput = Omit<WorkType, "id" | "createdAt" | "updatedAt">;

export interface WorkLog {
  id: string;
  workTypeId: string;
  workDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  rawDuration: number; // hours, before break deduction
  breakHours: number; // 1.0 if work span overlaps 12:00-13:00, else 0
  workHours: number; // rawDuration - breakHours
  dayType: DayType; // weekday / saturday / sunday, derived from workDate
  dayMultiplier: number; // 1.0 / 1.25 / 1.35, derived from dayType
  regularHours: number; // portion of workHours up to 8 hours
  overtimeHours: number; // portion of workHours beyond 8 hours
  hourlyRate: number;
  amount: number; // (regularHours * hourlyRate * dayMultiplier) + (overtimeHours * hourlyRate * dayMultiplier * 1.25)
  content: string;
  memo?: string;
  periodLabel: string; // YYYY-MM, closing period this log belongs to
  createdAt: string;
  updatedAt: string;
}

export type WorkLogInput = Omit<
  WorkLog,
  | "id"
  | "rawDuration"
  | "breakHours"
  | "workHours"
  | "dayType"
  | "dayMultiplier"
  | "regularHours"
  | "overtimeHours"
  | "amount"
  | "periodLabel"
  | "createdAt"
  | "updatedAt"
>;

/** 締め期間（月度）ごとの「その他」項目（外注費・値引きなど、日報とは別の金額調整） */
export interface PeriodAdjustment {
  id: string;
  periodLabel: string; // YYYY-MM
  name: string;
  amount: number; // yen, integer; negative for discounts/offsets
  createdAt: string;
  updatedAt: string;
}

export type PeriodAdjustmentInput = Pick<PeriodAdjustment, "name" | "amount">;

export interface AppSettings {
  id: string; // fixed singleton id "default"
  defaultStartTime?: string; // HH:mm, initial value proposal for 日報入力画面
  defaultEndTime?: string; // HH:mm, initial value proposal for 日報入力画面 (falls back to DEFAULT_END_TIME)
  pdfRecipients?: string[]; // PDF出力の宛先（複数登録可）
  pdfCompanyName?: string; // PDF出力の会社名
  pdfPersonName?: string; // PDF出力の氏名
  updatedAt: string;
}

export const WORK_TYPE_STATUS_LABEL: Record<WorkTypeStatus, string> = {
  active: "使用中",
  paused: "休止中",
  ended: "終了",
};
