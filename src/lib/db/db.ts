import Dexie, { type EntityTable } from "dexie";
import type { WorkType, WorkLog } from "@/types";

class WorkReportDatabase extends Dexie {
  workTypes!: EntityTable<WorkType, "id">;
  workLogs!: EntityTable<WorkLog, "id">;

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
  }
}

export const db = new WorkReportDatabase();
