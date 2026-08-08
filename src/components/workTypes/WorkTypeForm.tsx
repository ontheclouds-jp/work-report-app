"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { workTypeFormSchema } from "@/lib/validations";
import { WORK_TYPE_STATUS_LABEL, type WorkType, type WorkTypeInput } from "@/types";

interface WorkTypeFormProps {
  initialValue?: WorkType;
  submitLabel: string;
  onSubmit: (input: WorkTypeInput) => Promise<void>;
}

export function WorkTypeForm({
  initialValue,
  submitLabel,
  onSubmit,
}: WorkTypeFormProps) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [defaultRate, setDefaultRate] = useState(
    initialValue?.defaultRate !== undefined
      ? String(initialValue.defaultRate)
      : ""
  );
  const [status, setStatus] = useState(initialValue?.status ?? "active");
  const [memo, setMemo] = useState(initialValue?.memo ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsed = workTypeFormSchema.safeParse({
      name,
      defaultRate: defaultRate === "" ? undefined : Number(defaultRate),
      status,
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
    setSubmitting(true);
    try {
      await onSubmit(parsed.data);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="作業名" required error={errors.name} htmlFor="name">
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="例：株式会社サンプル向け開発"
        />
      </Field>

      <Field
        label="基本の時間単価（任意）"
        error={errors.defaultRate}
        htmlFor="defaultRate"
      >
        <Input
          id="defaultRate"
          type="number"
          inputMode="numeric"
          min={0}
          value={defaultRate}
          onChange={(e) => setDefaultRate(e.target.value)}
          placeholder="例：3000"
        />
      </Field>

      <Field label="ステータス" required error={errors.status} htmlFor="status">
        <Select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value as WorkType["status"])}
        >
          {Object.entries(WORK_TYPE_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="メモ・契約内容など（任意）" error={errors.memo} htmlFor="memo">
        <Textarea
          id="memo"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={4}
        />
      </Field>

      {submitError && <p className="text-sm text-red-400">{submitError}</p>}

      <Button type="submit" disabled={submitting} fullWidth>
        {submitting ? "保存中..." : submitLabel}
      </Button>
    </form>
  );
}
