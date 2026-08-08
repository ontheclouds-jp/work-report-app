import { addMonths, differenceInCalendarDays, parseISO, subMonths } from "date-fns";

const DEFAULT_CLOSING_START_DAY = 21;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayISODate(baseDate: Date = new Date()): string {
  return `${baseDate.getFullYear()}-${pad2(baseDate.getMonth() + 1)}-${pad2(baseDate.getDate())}`;
}

/**
 * 対象日が属する締め期間のラベル（YYYY-MM、締め月基準）を返す。
 * 締め開始日（初期値21日）を基準に、日が21日以上なら翌月、20日以下ならその月が締め月となる。
 */
export function calcPeriodLabel(
  workDate: string,
  closingStartDay: number = DEFAULT_CLOSING_START_DAY
): string {
  const [yearStr, monthStr, dayStr] = workDate.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const day = Number(dayStr);

  let closingYear = year;
  let closingMonth = month;

  if (day >= closingStartDay) {
    closingMonth += 1;
    if (closingMonth > 12) {
      closingMonth = 1;
      closingYear += 1;
    }
  }

  return `${closingYear}-${pad2(closingMonth)}`;
}

/** 今日が属する締め期間のラベルを返す。 */
export function getCurrentPeriodLabel(
  closingStartDay: number = DEFAULT_CLOSING_START_DAY,
  today: string = todayISODate()
): string {
  return calcPeriodLabel(today, closingStartDay);
}

/** 締め期間ラベル（YYYY-MM）から実際の開始日・終了日（YYYY-MM-DD）を返す。 */
export function getPeriodRange(
  periodLabel: string,
  closingStartDay: number = DEFAULT_CLOSING_START_DAY
): { startDate: string; endDate: string } {
  const [year, month] = periodLabel.split("-").map(Number);
  const endDay = closingStartDay - 1;
  const endDate = `${year}-${pad2(month)}-${pad2(endDay)}`;

  const startAnchor = subMonths(new Date(year, month - 1, 1), 1);
  const startDate = `${startAnchor.getFullYear()}-${pad2(startAnchor.getMonth() + 1)}-${pad2(closingStartDay)}`;

  return { startDate, endDate };
}

/** 締め期間ラベルを「◯年◯月度」の表示形式に変換する。 */
export function getPeriodDisplayLabel(periodLabel: string): string {
  const [year, month] = periodLabel.split("-").map(Number);
  return `${year}年${month}月度`;
}

/** 締め期間の日付範囲を「7/21〜8/20」の表示形式に変換する。 */
export function getPeriodRangeDisplayLabel(
  periodLabel: string,
  closingStartDay: number = DEFAULT_CLOSING_START_DAY
): string {
  const { startDate, endDate } = getPeriodRange(periodLabel, closingStartDay);
  const [, sm, sd] = startDate.split("-").map(Number);
  const [, em, ed] = endDate.split("-").map(Number);
  return `${sm}/${sd}〜${em}/${ed}`;
}

/** 締め日（期間終了日）までの残り日数を返す（締め日当日は0、過ぎている場合は負数）。 */
export function getDaysUntilClosing(
  periodLabel: string,
  closingStartDay: number = DEFAULT_CLOSING_START_DAY,
  today: string = todayISODate()
): number {
  const { endDate } = getPeriodRange(periodLabel, closingStartDay);
  return differenceInCalendarDays(parseISO(endDate), parseISO(today));
}

/** 締め期間ラベルを月単位でずらす（offsetが負なら過去、正なら未来）。 */
export function shiftPeriodLabel(periodLabel: string, offset: number): string {
  const [year, month] = periodLabel.split("-").map(Number);
  const base = new Date(year, month - 1, 1);
  const shifted = offset >= 0 ? addMonths(base, offset) : subMonths(base, -offset);
  return `${shifted.getFullYear()}-${pad2(shifted.getMonth() + 1)}`;
}

/** 現在の締め期間から遡ってcount件分の期間ラベルを新しい順に返す（期間選択用）。 */
export function listRecentPeriodLabels(
  count: number,
  closingStartDay: number = DEFAULT_CLOSING_START_DAY
): string[] {
  const current = getCurrentPeriodLabel(closingStartDay);
  return Array.from({ length: count }, (_, i) => shiftPeriodLabel(current, -i));
}
