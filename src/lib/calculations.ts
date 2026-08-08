const FIXED_BREAK_HOURS = 1.0;

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

export function calcAmount(workHours: number, hourlyRate: number): number {
  return Math.round(workHours * hourlyRate);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount) + "円";
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(2)}時間`;
}
