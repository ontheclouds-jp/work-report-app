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
  breakHours: number; // fixed 1.0 in stage 1
  workHours: number; // rawDuration - breakHours
  hourlyRate: number;
  amount: number; // workHours * hourlyRate
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
  | "amount"
  | "periodLabel"
  | "createdAt"
  | "updatedAt"
>;

export const WORK_TYPE_STATUS_LABEL: Record<WorkTypeStatus, string> = {
  active: "使用中",
  paused: "休止中",
  ended: "終了",
};
