"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { db } from "@/lib/db/db";
import { calcAmount, calcRawDuration, calcWorkHours } from "@/lib/calculations";
import { workLogFormSchema } from "@/lib/validations";
import {
  findWorkLogByWorkTypeAndDate,
  getLatestWorkLogForWorkType,
} from "@/lib/repositories/workLogRepository";
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

  const [workDate, setWorkDate] = useState(
    initialValue?.workDate ?? todayISODate()
  );
  const [workTypeId, setWorkTypeId] = useState(initialValue?.workTypeId ?? "");
  const [startTime, setStartTime] = useState(initialValue?.startTime ?? "");
  const [endTime, setEndTime] = useState(initialValue?.endTime ?? "");
  const [content, setContent] = useState(initialValue?.content ?? "");
  const [hourlyRate, setHourlyRate] = useState(
    initialValue?.hourlyRate !== undefined ? String(initialValue.hourlyRate) : ""
  );
  const [memo, setMemo] = useState(initialValue?.memo ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [overwriteTarget, setOverwriteTarget] = useState<WorkLog | null>(null);
  const [pendingInput, setPendingInput] = useState<WorkLogInput | null>(null);
  const [rateSuggestionNote, setRateSuggestionNote] = useState<string | null>(null);

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
    if (!startTime || !endTime) {
      return { rawDuration: null, workHours: null, amount: null, error: null };
    }
    const rawDuration = calcRawDuration(startTime, endTime);
    if (rawDuration === null) {
      return {
        rawDuration: null,
        workHours: null,
        amount: null,
        error:
          "終了時刻は開始時刻より後にしてください（日をまたぐ入力には対応していません）",
      };
    }
    const workHoursResult = calcWorkHours(rawDuration);
    if (workHoursResult === null) {
      return {
        rawDuration,
        workHours: null,
        amount: null,
        error:
          "拘束時間が1時間以下のため、休憩を差し引いた作業時間を計算できません",
      };
    }
    const rate = Number(hourlyRate);
    const amount =
      hourlyRate !== "" && !Number.isNaN(rate)
        ? calcAmount(workHoursResult.workHours, rate)
        : null;
    return {
      rawDuration,
      workHours: workHoursResult.workHours,
      amount,
      error: null,
    };
  }, [startTime, endTime, hourlyRate]);

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
      workDate,
      startTime,
      endTime,
      content,
      hourlyRate: hourlyRate === "" ? undefined : Number(hourlyRate),
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
              onChange={(e) => setStartTime(e.target.value)}
            />
          </Field>
          <Field label="終了時刻" required error={errors.endTime} htmlFor="endTime">
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </Field>
        </div>

        <WorkLogCalcPreview
          rawDuration={preview.rawDuration}
          workHours={preview.workHours}
          amount={preview.amount}
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

        <Field label="作業内容" required error={errors.content} htmlFor="content">
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={200}
            rows={3}
          />
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
