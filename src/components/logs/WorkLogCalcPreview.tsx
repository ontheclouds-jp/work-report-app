import { DAY_TYPE_LABEL, formatCurrency, formatHours, type DayType } from "@/lib/calculations";

interface WorkLogCalcPreviewProps {
  rawDuration: number | null;
  workHours: number | null;
  regularHours: number | null;
  overtimeHours: number | null;
  dayType: DayType;
  dayMultiplier: number;
  amount: number | null;
  error: string | null;
}

export function WorkLogCalcPreview({
  rawDuration,
  workHours,
  regularHours,
  overtimeHours,
  dayType,
  dayMultiplier,
  amount,
  error,
}: WorkLogCalcPreviewProps) {
  return (
    <div className="rounded-xl border border-blue-800/50 bg-blue-950/30 p-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-400">拘束時間</dt>
          <dd className="text-base font-semibold text-slate-100">
            {rawDuration !== null ? formatHours(rawDuration) : "―"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">作業時間（休憩1h差引後）</dt>
          <dd className="text-base font-semibold text-slate-100">
            {workHours !== null ? formatHours(workHours) : "―"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">通常時間／残業時間</dt>
          <dd className="text-base font-semibold text-slate-100">
            {regularHours !== null && overtimeHours !== null
              ? `${formatHours(regularHours)} ／ ${formatHours(overtimeHours)}`
              : "―"}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">適用される割増</dt>
          <dd className="text-base font-semibold text-slate-100">
            {DAY_TYPE_LABEL[dayType]}（{dayMultiplier}倍）
            {overtimeHours !== null && overtimeHours > 0 && " ＋残業1.25倍"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-400">本日の金額</dt>
          <dd className="text-2xl font-bold text-amber-400">
            {amount !== null ? formatCurrency(amount) : "―"}
          </dd>
        </div>
      </dl>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
