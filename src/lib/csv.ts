import { DAY_TYPE_LABEL } from "@/lib/calculations";
import { getPeriodDisplayLabel } from "@/lib/period";
import type { WorkLog, WorkType } from "@/types";

const CSV_HEADERS = [
  "日付",
  "作業名",
  "開始時刻",
  "終了時刻",
  "拘束時間",
  "休憩時間",
  "作業時間",
  "曜日区分",
  "曜日倍率",
  "通常時間",
  "残業時間",
  "時間単価",
  "金額",
  "作業内容",
  "メモ",
  "締め期間",
];

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toRow(values: (string | number)[]): string {
  return values.map((v) => escapeCsvField(String(v))).join(",");
}

/** 日報データをCSV文字列に変換する。Excelでの文字化けを防ぐためUTF-8 BOM付き。 */
export function workLogsToCsv(logs: WorkLog[], workTypes: WorkType[]): string {
  const workTypeNameById = new Map(workTypes.map((w) => [w.id, w.name]));
  const rows = logs.map((log) =>
    toRow([
      log.workDate,
      workTypeNameById.get(log.workTypeId) ?? "（不明な作業名）",
      log.startTime,
      log.endTime,
      log.rawDuration,
      log.breakHours,
      log.workHours,
      DAY_TYPE_LABEL[log.dayType],
      log.dayMultiplier,
      log.regularHours,
      log.overtimeHours,
      log.hourlyRate,
      log.amount,
      log.content,
      log.memo ?? "",
      getPeriodDisplayLabel(log.periodLabel),
    ])
  );
  const BOM = "﻿";
  const body = [toRow(CSV_HEADERS), ...rows].join("\r\n");
  return BOM + body;
}
