import { calcConsumptionTax } from "@/lib/calculations";
import type { PeriodAdjustment, WorkLog, WorkType } from "@/types";

export interface PeriodTotals {
  amount: number;
  hours: number;
  count: number;
}

function emptyTotals(): PeriodTotals {
  return { amount: 0, hours: 0, count: 0 };
}

/** 日報の配列から合計金額・合計作業時間・件数を集計する。 */
export function summarizeLogs(logs: WorkLog[]): PeriodTotals {
  return logs.reduce(
    (acc, log) => ({
      amount: acc.amount + log.amount,
      hours: acc.hours + log.workHours,
      count: acc.count + 1,
    }),
    emptyTotals()
  );
}

export interface PeriodAmountBreakdown {
  workAmount: number; // 日報の合計
  otherAmount: number; // 「その他」項目の合計（マイナス含む）
  subtotal: number; // 税抜合計 = workAmount + otherAmount
  tax: number; // 消費税（10%、円未満切り捨て）
  totalWithTax: number; // 税込合計
}

/** 日報と「その他」項目から、締め期間の金額内訳（税抜・消費税・税込）を計算する。 */
export function calcPeriodAmounts(
  logs: WorkLog[],
  adjustments: PeriodAdjustment[]
): PeriodAmountBreakdown {
  const workAmount = logs.reduce((sum, log) => sum + log.amount, 0);
  const otherAmount = adjustments.reduce((sum, a) => sum + a.amount, 0);
  const subtotal = workAmount + otherAmount;
  const tax = calcConsumptionTax(subtotal);
  return { workAmount, otherAmount, subtotal, tax, totalWithTax: subtotal + tax };
}

export interface WorkTypeSummary extends PeriodTotals {
  workTypeId: string;
  workTypeName: string;
}

/** 日報を作業名ごとにグループ化し、金額の多い順に集計する。 */
export function summarizeByWorkType(
  logs: WorkLog[],
  workTypes: WorkType[]
): WorkTypeSummary[] {
  const nameById = new Map(workTypes.map((w) => [w.id, w.name]));
  const map = new Map<string, WorkTypeSummary>();

  for (const log of logs) {
    const existing = map.get(log.workTypeId);
    if (existing) {
      existing.amount += log.amount;
      existing.hours += log.workHours;
      existing.count += 1;
    } else {
      map.set(log.workTypeId, {
        workTypeId: log.workTypeId,
        workTypeName: nameById.get(log.workTypeId) ?? "（不明な作業名）",
        amount: log.amount,
        hours: log.workHours,
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

export interface DateSummary extends PeriodTotals {
  workDate: string;
}

/** 日報を日付ごとにグループ化し、新しい日付順に集計する。 */
export function summarizeByDate(logs: WorkLog[]): DateSummary[] {
  const map = new Map<string, DateSummary>();

  for (const log of logs) {
    const existing = map.get(log.workDate);
    if (existing) {
      existing.amount += log.amount;
      existing.hours += log.workHours;
      existing.count += 1;
    } else {
      map.set(log.workDate, {
        workDate: log.workDate,
        amount: log.amount,
        hours: log.workHours,
        count: 1,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => (a.workDate < b.workDate ? 1 : -1));
}
