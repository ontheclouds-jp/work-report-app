"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { db } from "@/lib/db/db";
import {
  DAY_MULTIPLIERS,
  calcAmount,
  calcOvertimeSplit,
  calcRawDuration,
  calcWorkHours,
  formatCurrency,
  getDayType,
} from "@/lib/calculations";
import { workLogFormSchema } from "@/lib/validations";
import {
  findWorkLogByWorkTypeAndDate,
  getLatestWorkLogForWorkType,
  getLatestWorkLogStartTime,
} from "@/lib/repositories/workLogRepository";
import { DEFAULT_END_TIME, getAppSettings } from "@/lib/repositories/settingsRepository";
import { todayISODate } from "@/lib/period";
import { WorkLogCalcPreview } from "./WorkLogCalcPreview";
import type { WorkLog, WorkLogInput } from "@/types";

interface WorkLogFormProps {
  initialValue?: WorkLog;
  submitLabel: string;
  onSubmit: (input: WorkLogInput, overwriteLogId?: string) => Promise<void>;
}

export function WorkLogForm({
  initialValue,
  submitLabel,
  onSubmit,
}: WorkLogFormProps) {
  const workTypes = useLiveQuery(
    () => db.workTypes.orderBy("name").toArray(),
    []
  );
  const workPlaces = useLiveQuery(
    () => db.workPlaces.orderBy("name").toArray(),
    []
  );

  const [workDate, setWorkDate] = useState(
    initialValue?.workDate ?? todayISODate()
  );
  const [workTypeId, setWorkTypeId] = useState(initialValue?.workTypeId ?? "");
  // v1.0.13より前の日報は作業場所が未設定のため空欄から選択してもらう
  const [workPlaceId, setWorkPlaceId] = useState(initialValue?.workPlaceId ?? "");
  const [startTime, setStartTime] = useState(initialValue?.startTime ?? "");
  const [endTime, setEndTime] = useState(initialValue?.endTime ?? "");
  const [content, setContent] = useState(initialValue?.content ?? "");
  const [hourlyRate, setHourlyRate] = useState(
    initialValue?.hourlyRate !== undefined ? String(initialValue.hourlyRate) : ""
  );
  const [isSudden, setIsSudden] = useState(initialValue?.isSudden ?? false);
  const [memo, setMemo] = useState(initialValue?.memo ?? "");
  // 設定が未保存の場合は null（読み込み中の undefined と区別する）
  const appSettings = useLiveQuery(async () => (await getAppSettings()) ?? null, []);
  const configuredSuddenAllowance = appSettings?.suddenAllowanceAmount ?? 0;
  // 保存時に現在の設定額で再計算されるため、プレビューも現在の設定額で表示する
  const suddenAllowance = isSudden ? configuredSuddenAllowance : 0;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [overwriteTarget, setOverwriteTarget] = useState<WorkLog | null>(null);
  const [pendingInput, setPendingInput] = useState<WorkLogInput | null>(null);
  const [rateSuggestionNote, setRateSuggestionNote] = useState<string | null>(null);
  const [startTimeSuggestionNote, setStartTimeSuggestionNote] = useState<
    string | null
  >(null);
  const [endTimeSuggestionNote, setEndTimeSuggestionNote] = useState<
    string | null
  >(null);
  const startTimeSuggested = useRef(false);

  useEffect(() => {
    if (initialValue || startTimeSuggested.current) return;
    startTimeSuggested.current = true;
    (async () => {
      const settings = await getAppSettings();
      if (settings?.defaultStartTime) {
        setStartTime(settings.defaultStartTime);
        setStartTimeSuggestionNote("設定した基本の開始時刻を入力しました");
      } else {
        const latestStartTime = await getLatestWorkLogStartTime();
        if (latestStartTime) {
          setStartTime(latestStartTime);
          setStartTimeSuggestionNote("前回入力した開始時刻を入力しました");
        }
      }
      setEndTime(settings?.defaultEndTime ?? DEFAULT_END_TIME);
      setEndTimeSuggestionNote("設定した基本の終了時刻を入力しました");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStartTimeChange(value: string) {
    setStartTime(value);
    setStartTimeSuggestionNote(null);
  }

  function handleEndTimeChange(value: string) {
    setEndTime(value);
    setEndTimeSuggestionNote(null);
  }

  async function handleWorkTypeChange(nextWorkTypeId: string) {
    setWorkTypeId(nextWorkTypeId);
    setRateSuggestionNote(null);
    if (initialValue || hourlyRate !== "" || !nextWorkTypeId) return;

    const latestLog = await getLatestWorkLogForWorkType(nextWorkTypeId);
    if (latestLog) {
      setHourlyRate(String(latestLog.hourlyRate));
      setRateSuggestionNote(`前回（${latestLog.workDate}）と同じ単価を入力しました`);
      return;
    }

    const workType = workTypes?.find((w) => w.id === nextWorkTypeId);
    if (workType?.defaultRate !== undefined) {
      setHourlyRate(String(workType.defaultRate));
      setRateSuggestionNote("登録されている基本単価を入力しました");
    }
  }

  function handleHourlyRateChange(value: string) {
    setHourlyRate(value);
    setRateSuggestionNote(null);
  }

  const preview = useMemo(() => {
    const dayType = getDayType(workDate);
    const dayMultiplier = DAY_MULTIPLIERS[dayType];
    const empty = {
      rawDuration: null,
      breakHours: null,
      workHours: null,
      regularHours: null,
      overtimeHours: null,
      amount: null,
      suddenAllowance,
      dayType,
      dayMultiplier,
      error: null,
    };
    if (!startTime || !endTime) {
      return empty;
    }
    const rawDuration = calcRawDuration(startTime, endTime);
    if (rawDuration === null) {
      return {
        ...empty,
        error:
          "終了時刻は開始時刻より後にしてください（日をまたぐ入力には対応していません）",
      };
    }
    const workHoursResult = calcWorkHours(startTime, endTime, rawDuration);
    if (workHoursResult === null) {
      return {
        ...empty,
        rawDuration,
        error:
          "休憩時間を差し引くと作業時間が0以下になります。時刻を確認してください",
      };
    }
    const { regularHours, overtimeHours } = calcOvertimeSplit(workHoursResult.workHours);
    const rate = Number(hourlyRate);
    const amount =
      hourlyRate !== "" && !Number.isNaN(rate)
        ? calcAmount(regularHours, overtimeHours, rate, dayMultiplier) + suddenAllowance
        : null;
    return {
      rawDuration,
      breakHours: workHoursResult.breakHours,
      workHours: workHoursResult.workHours,
      regularHours,
      overtimeHours,
      amount,
      suddenAllowance,
      dayType,
      dayMultiplier,
      error: null,
    };
  }, [workDate, startTime, endTime, hourlyRate, suddenAllowance]);

  async function proceedSave(input: WorkLogInput, overwriteId?: string) {
    setSubmitting(true);
    try {
      await onSubmit(input, overwriteId);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = workLogFormSchema.safeParse({
      workTypeId,
      workPlaceId,
      workDate,
      startTime,
      endTime,
      content,
      hourlyRate: hourlyRate === "" ? undefined : Number(hourlyRate),
      isSudden,
      memo: memo === "" ? undefined : memo,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    const input = parsed.data;

    const existing = await findWorkLogByWorkTypeAndDate(
      input.workTypeId,
      input.workDate,
      initialValue?.id
    );

    if (existing) {
      setOverwriteTarget(existing);
      setPendingInput(input);
      return;
    }

    await proceedSave(input);
  }

  async function handleConfirmOverwrite() {
    if (!pendingInput || !overwriteTarget) return;
    const target = overwriteTarget;
    setOverwriteTarget(null);
    await proceedSave(pendingInput, target.id);
    setPendingInput(null);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Field label="日付" required error={errors.workDate} htmlFor="workDate">
          <Input
            id="workDate"
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
          />
        </Field>

        <Field
          label="作業名"
          required
          error={errors.workTypeId}
          htmlFor="workTypeId"
        >
          <Select
            id="workTypeId"
            value={workTypeId}
            onChange={(e) => handleWorkTypeChange(e.target.value)}
          >
            <option value="">選択してください</option>
            {workTypes?.map((workType) => (
              <option key={workType.id} value={workType.id}>
                {workType.name}
              </option>
            ))}
          </Select>
          {workTypes?.length === 0 && (
            <p className="mt-1 text-sm text-amber-400">
              作業名が未登録です。先に作業名を登録してください。
            </p>
          )}
        </Field>

        <Field
          label="作業場所"
          required
          error={errors.workPlaceId}
          htmlFor="workPlaceId"
        >
          <Select
            id="workPlaceId"
            value={workPlaceId}
            onChange={(e) => setWorkPlaceId(e.target.value)}
          >
            <option value="">選択してください</option>
            {workPlaces?.map((workPlace) => (
              <option key={workPlace.id} value={workPlace.id}>
                {workPlace.name}
              </option>
            ))}
          </Select>
          {workPlaces?.length === 0 && (
            <p className="mt-1 text-sm text-amber-400">
              作業場所が未登録です。
              <Link href="/work-places/new" className="underline">
                作業場所を登録
              </Link>
              してください。
            </p>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="開始時刻"
            required
            error={errors.startTime}
            htmlFor="startTime"
          >
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />
            {startTimeSuggestionNote && (
              <p className="mt-1 text-sm text-slate-400">{startTimeSuggestionNote}</p>
            )}
          </Field>
          <Field label="終了時刻" required error={errors.endTime} htmlFor="endTime">
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => handleEndTimeChange(e.target.value)}
            />
            {endTimeSuggestionNote && (
              <p className="mt-1 text-sm text-slate-400">{endTimeSuggestionNote}</p>
            )}
          </Field>
        </div>

        <WorkLogCalcPreview
          rawDuration={preview.rawDuration}
          breakHours={preview.breakHours}
          workHours={preview.workHours}
          regularHours={preview.regularHours}
          overtimeHours={preview.overtimeHours}
          dayType={preview.dayType}
          dayMultiplier={preview.dayMultiplier}
          amount={preview.amount}
          suddenAllowance={preview.suddenAllowance}
          error={preview.error}
        />

        <Field
          label="時間単価（円）"
          required
          error={errors.hourlyRate}
          htmlFor="hourlyRate"
        >
          <Input
            id="hourlyRate"
            type="number"
            inputMode="numeric"
            min={0}
            value={hourlyRate}
            onChange={(e) => handleHourlyRateChange(e.target.value)}
            placeholder="例：3000"
          />
          {rateSuggestionNote && (
            <p className="mt-1 text-sm text-slate-400">{rateSuggestionNote}</p>
          )}
        </Field>

        <div
          className={`rounded-xl border p-4 ${
            isSudden ? "border-orange-500/70 bg-orange-950/30" : "border-slate-700"
          }`}
        >
          <label htmlFor="isSudden" className="flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-base font-medium text-slate-100">⚡ 突発業務</span>
              <span className="block text-sm text-slate-400">
                ONにすると突発手当 {formatCurrency(configuredSuddenAllowance)} を加算します
              </span>
            </span>
            <span className="relative inline-flex shrink-0 items-center">
              <input
                id="isSudden"
                type="checkbox"
                role="switch"
                className="peer sr-only"
                checked={isSudden}
                onChange={(e) => setIsSudden(e.target.checked)}
              />
              <span className="h-7 w-12 rounded-full bg-slate-600 transition-colors peer-checked:bg-orange-500 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-300" />
              <span className="absolute left-1 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
          {isSudden && appSettings !== undefined && configuredSuddenAllowance === 0 && (
            <p className="mt-2 text-sm text-amber-400">
              突発手当の金額が未設定（0円）です。
              <Link href="/settings" className="underline">
                設定画面
              </Link>
              で金額を登録してください。
            </p>
          )}
        </div>

        <Field label="作業内容" required error={errors.content} htmlFor="content">
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="例：配管の溶接作業"
          />
          <p className="mt-1 text-sm text-slate-400">
            作業場所は上の「作業場所」で選ぶため、ここには作業の説明だけを書いてください
          </p>
        </Field>

        <Field label="メモ（任意）" error={errors.memo} htmlFor="memo">
          <Textarea
            id="memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
          />
        </Field>

        {submitError && <p className="text-sm text-red-400">{submitError}</p>}

        <Button type="submit" disabled={submitting} fullWidth>
          {submitting ? "保存中..." : submitLabel}
        </Button>
      </form>

      <ConfirmDialog
        open={overwriteTarget !== null}
        title="日報を上書きします"
        message="この日付・作業名の日報は既に登録されています。上書きしますか？"
        confirmLabel="上書きする"
        onConfirm={handleConfirmOverwrite}
        onCancel={() => {
          setOverwriteTarget(null);
          setPendingInput(null);
        }}
      />
    </>
  );
}
