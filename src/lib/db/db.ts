import Dexie, { type EntityTable } from "dexie";
import type { AppSettings, PeriodAdjustment, WorkType, WorkLog } from "@/types";
import {
  calcAmount,
  calcOvertimeSplit,
  calcWorkHours,
  getDayType,
  DAY_MULTIPLIERS,
} from "@/lib/calculations";

class WorkReportDatabase extends Dexie {
  workTypes!: EntityTable<WorkType, "id">;
  workLogs!: EntityTable<WorkLog, "id">;
  appSettings!: EntityTable<AppSettings, "id">;
  periodAdjustments!: EntityTable<PeriodAdjustment, "id">;

  constructor() {
    super("WorkReportDatabase");
    this.version(1).stores({
      clients: "id, name, status, createdAt",
      workLogs:
        "id, clientId, workDate, periodLabel, [clientId+workDate], createdAt",
    });
    this.version(2)
      .stores({
        clients: null,
        workTypes: "id, name, status, createdAt",
        workLogs:
          "id, workTypeId, workDate, periodLabel, [workTypeId+workDate], createdAt",
      })
      .upgrade(async (tx) => {
        const oldClients = await tx.table("clients").toArray();
        if (oldClients.length > 0) {
          await tx.table("workTypes").bulkAdd(oldClients);
        }
        await tx
          .table("workLogs")
          .toCollection()
          .modify((log: Record<string, unknown>) => {
            log.workTypeId = log.clientId;
            delete log.clientId;
          });
      });
    this.version(3)
      .stores({
        appSettings: "id",
      })
      .upgrade(async (tx) => {
        // 残業しきい値を9時間から8時間に変更し、曜日割増を新設したため、
        // 既存の日報（曜日区分・残業内訳を持たない旧データ）を新しい計算式で再計算する。
        await tx
          .table("workLogs")
          .toCollection()
          .modify((log: Record<string, unknown>) => {
            const workDate = log.workDate as string;
            const workHours = log.workHours as number;
            const hourlyRate = log.hourlyRate as number;
            const dayType = getDayType(workDate);
            const dayMultiplier = DAY_MULTIPLIERS[dayType];
            const { regularHours, overtimeHours } = calcOvertimeSplit(workHours);
            log.dayType = dayType;
            log.dayMultiplier = dayMultiplier;
            log.regularHours = regularHours;
            log.overtimeHours = overtimeHours;
            log.amount = calcAmount(regularHours, overtimeHours, hourlyRate, dayMultiplier);
          });
      });
    this.version(4).stores({}).upgrade(async (tx) => {
      // 昼休憩の差し引きを「常に1時間」から「勤務時間帯が12:00〜13:00と重なる場合のみ1時間」に変更したため、
      // 既存の日報（常に1時間差し引かれて保存されている旧データ）を新しい判定で再計算する。
      await tx
        .table("workLogs")
        .toCollection()
        .modify((log: Record<string, unknown>) => {
          const startTime = log.startTime as string;
          const endTime = log.endTime as string;
          const rawDuration = log.rawDuration as number;
          const hourlyRate = log.hourlyRate as number;
          const workDate = log.workDate as string;
          const workHoursResult = calcWorkHours(startTime, endTime, rawDuration);
          if (workHoursResult === null) return;
          const dayType = getDayType(workDate);
          const dayMultiplier = DAY_MULTIPLIERS[dayType];
          const { regularHours, overtimeHours } = calcOvertimeSplit(workHoursResult.workHours);
          log.breakHours = workHoursResult.breakHours;
          log.workHours = workHoursResult.workHours;
          log.dayType = dayType;
          log.dayMultiplier = dayMultiplier;
          log.regularHours = regularHours;
          log.overtimeHours = overtimeHours;
          log.amount = calcAmount(regularHours, overtimeHours, hourlyRate, dayMultiplier);
        });
    });
    this.version(5).stores({
      periodAdjustments: "id, periodLabel, createdAt",
    });
  }
}

export const db = new WorkReportDatabase();
