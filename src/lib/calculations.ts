const LUNCH_BREAK_HOURS = 1.0;
const LUNCH_BREAK_START_MINUTES = 12 * 60;
const LUNCH_BREAK_END_MINUTES = 13 * 60;
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
 * 勤務時間帯（開始時刻〜終了時刻）が昼休憩「12:00〜13:00」と重なるかどうかを判定する。
 * 開始時刻 < 13:00 かつ 終了時刻 > 12:00 の場合のみ重なっているとみなす。
 */
export function overlapsLunchBreak(startTime: string, endTime: string): boolean {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  return startMinutes < LUNCH_BREAK_END_MINUTES && endMinutes > LUNCH_BREAK_START_MINUTES;
}

/** 勤務時間帯が昼休憩と重なる場合のみ1.0時間、重ならない場合は0時間を返す。 */
export function calcBreakHours(startTime: string, endTime: string): number {
  return overlapsLunchBreak(startTime, endTime) ? LUNCH_BREAK_HOURS : 0;
}

/**
 * 拘束時間から昼休憩（勤務時間帯が12:00〜13:00と重なる場合のみ1時間）を差し引いた作業時間を計算する。
 * 差し引いた結果、作業時間が0以下になる場合は null を返す。
 */
export function calcWorkHours(
  startTime: string,
  endTime: string,
  rawDuration: number
): WorkHoursResult | null {
  const breakHours = calcBreakHours(startTime, endTime);
  const workHours = round2(rawDuration - breakHours);
  if (workHours <= 0) return null;
  return { rawDuration, breakHours, workHours };
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

export const CONSUMPTION_TAX_RATE_PERCENT = 10;

/** 税抜金額から消費税（10%、円未満切り捨て）を計算する。浮動小数の誤差を避けるため整数演算で行う。 */
export function calcConsumptionTax(amountExcludingTax: number): number {
  return Math.floor((Math.round(amountExcludingTax) * CONSUMPTION_TAX_RATE_PERCENT) / 100);
}

/** 税込金額から消費税10%相当を差し引いた税抜金額（税込 ÷ 1.1、円未満切り捨て）を計算する。整数演算で行う。 */
export function calcAmountExcludingTax(amountIncludingTax: number): number {
  return Math.floor(
    (Math.round(amountIncludingTax) * 100) / (100 + CONSUMPTION_TAX_RATE_PERCENT)
  );
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP").format(amount) + "円";
}

export function formatHours(hours: number): string {
  return `${hours.toFixed(2)}時間`;
}
