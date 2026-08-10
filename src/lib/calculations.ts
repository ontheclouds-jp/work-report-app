const FIXED_BREAK_HOURS = 1.0;
const OVERTIME_THRESHOLD_HOURS = 8;
const OVERTIME_MULTIPLIER = 1.25;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * 拘束時間（終了時刻 - 開始時刻）を時間単位（小数第2位まで）で返す。
 * 終了時刻が開始時刻以下の場合は日またぎとみなし null を返す。
 */
export function calcRawDuration(startTime: string, endTime: string): number | null {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  if (endMinutes <= startMinutes) return null;
  return round2((endMinutes - startMinutes) / 60);
}

export interface WorkHoursResult {
  rawDuration: number;
  breakHours: number;
  workHours: number;
}

/**
 * 拘束時間から固定休憩1時間を差し引いた作業時間を計算する。
 * 拘束時間が1時間以下の場合は作業時間が0以下になるため null を返す。
 */
export function calcWorkHours(rawDuration: number): WorkHoursResult | null {
  const workHours = round2(rawDuration - FIXED_BREAK_HOURS);
  if (workHours <= 0) return null;
  return { rawDuration, breakHours: FIXED_BREAK_HOURS, workHours };
}

export type DayType = "weekday" | "saturday" | "sunday";

export const DAY_TYPE_LABEL: Record<DayType, string> = {
  weekday: "平日",
  saturday: "土曜",
  sunday: "日曜",
};

export const DAY_MULTIPLIERS: Record<DayType, number> = {
  weekday: 1.0,
  saturday: 1.25,
  sunday: 1.35,
};

/** 作業日（YYYY-MM-DD）の曜日から曜日区分を判定する。 */
export function getDayType(workDate: string): DayType {
  const [year, month, day] = workDate.split("-").map(Number);
  const weekday = new Date(year, month - 1, day).getDay();
  if (weekday === 6) return "saturday";
  if (weekday === 0) return "sunday";
  return "weekday";
}

export interface OvertimeSplit {
  regularHours: number;
  overtimeHours: number;
}

/**
 * 作業時間を通常時間（8時間まで）と残業時間（8時間超）に分割する。
 */
export function calcOvertimeSplit(workHours: number): OvertimeSplit {
  const regularHours = round2(Math.min(workHours, OVERTIME_THRESHOLD_HOURS));
  const overtimeHours = round2(Math.max(workHours - OVERTIME_THRESHOLD_HOURS, 0));
  return { regularHours, overtimeHours };
}

/**
 * 通常分・残業分の金額を曜日倍率・残業倍率(1.25)を掛け合わせて計算する。
 * 円未満は四捨五入する。
 */
export function calcAmount(
  regularHours: number,
  overtimeHours: number,
  hourlyRate: number,
  dayMultiplier: number
): number {
  const regularAmount = regularHours * hourlyRate * dayMultiplier;
  const overtimeAmount = overtimeHours * hourlyRate * dayMultiplier * OVERTIME_MULTIPLIER;
  return Math.round(regularAmount + overtimeAmount);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount) + "円";
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(2)}時間`;
}
