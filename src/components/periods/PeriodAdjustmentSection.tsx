"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { formatCurrency } from "@/lib/calculations";
import { periodAdjustmentFormSchema } from "@/lib/validations";
import {
  createPeriodAdjustment,
  deletePeriodAdjustment,
  updatePeriodAdjustment,
} from "@/lib/repositories/periodAdjustmentRepository";
import type { PeriodAdjustment } from "@/types";

type Sign = "plus" | "minus";

interface FormState {
  editingId: string | null; // null = 新規追加
  name: string;
  sign: Sign;
  amountText: string;
}

interface PeriodAdjustmentSectionProps {
  periodLabel: string;
  adjustments: PeriodAdjustment[];
}

/** 全角数字・カンマ・「円」を許容して金額の絶対値を数値に変換する。変換できない場合はNaN。 */
function parseAmountText(text: string): number {
  const normalized = text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，円\s]/g, "");
  if (!/^\d+$/.test(normalized)) return NaN;
  return Number(normalized);
}

/** 締め期間（月度）ごとの「その他」項目（外注費・値引きなど）の一覧と追加・編集・削除。 */
export function PeriodAdjustmentSection({
  periodLabel,
  adjustments,
}: PeriodAdjustmentSectionProps) {
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<{ name?: string; amount?: string }>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<PeriodAdjustment | null>(null);

  function openNewForm() {
    setForm({ editingId: null, name: "", sign: "plus", amountText: "" });
    setErrors({});
  }

  function openEditForm(adjustment: PeriodAdjustment) {
    setForm({
      editingId: adjustment.id,
      name: adjustment.name,
      sign: adjustment.amount < 0 ? "minus" : "plus",
      amountText: String(Math.abs(adjustment.amount)),
    });
    setErrors({});
  }

  async function handleSave() {
    if (!form) return;
    const absolute = parseAmountText(form.amountText);
    const result = periodAdjustmentFormSchema.safeParse({
      name: form.name,
      amount: form.sign === "minus" ? -absolute : absolute,
    });
    if (!result.success) {
      const fieldErrors: { name?: string; amount?: string } = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if ((key === "name" || key === "amount") && !fieldErrors[key]) {
          fieldErrors[key] = Number.isNaN(absolute) && key === "amount"
            ? "金額は数字で入力してください"
            : issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }
    setSaving(true);
    try {
      if (form.editingId) {
        await updatePeriodAdjustment(form.editingId, result.data);
      } else {
        await createPeriodAdjustment(periodLabel, result.data);
      }
      setForm(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deleting) return;
    await deletePeriodAdjustment(deleting.id);
    if (form?.editingId === deleting.id) setForm(null);
    setDeleting(null);
  }

  return (
    <div className="mt-6">
      <h2 className="mb-1 text-lg font-semibold text-slate-50">その他</h2>
      <p className="mb-2 text-sm text-slate-400">
        外注費や値引きなど、日報とは別の金額をこの月度に追加できます。合計金額・消費税・PDFに反映されます。
      </p>

      {adjustments.length > 0 && (
        <ul className="mb-2 flex flex-col gap-2">
          {adjustments.map((item) => (
            <li key={item.id}>
              <Card className="flex items-center justify-between gap-3">
                <p className="min-w-0 flex-1 break-words font-medium text-slate-50">
                  {item.name}
                </p>
                <p
                  className={`shrink-0 text-lg font-bold ${
                    item.amount < 0 ? "text-rose-400" : "text-amber-400"
                  }`}
                >
                  {formatCurrency(item.amount)}
                </p>
                <div className="flex shrink-0 gap-1">
                  <Button variant="ghost" className="px-2" onClick={() => openEditForm(item)}>
                    編集
                  </Button>
                  <Button variant="ghost" className="px-2 text-red-400" onClick={() => setDeleting(item)}>
                    削除
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <Card className="flex flex-col gap-4">
          <p className="font-medium text-slate-100">
            {form.editingId ? "その他項目を編集" : "その他項目を追加"}
          </p>
          <Field label="項目名" htmlFor="adjustmentName" required error={errors.name}>
            <Input
              id="adjustmentName"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="例：外注費（○○工業）、設計ミス分値引き"
            />
          </Field>
          <Field label="金額（円）" htmlFor="adjustmentAmount" required error={errors.amount}>
            <div className="flex gap-2">
              <div className="flex shrink-0 overflow-hidden rounded-lg border border-slate-600" role="group" aria-label="金額の符号">
                {(["plus", "minus"] as const).map((sign) => (
                  <button
                    key={sign}
                    type="button"
                    aria-pressed={form.sign === sign}
                    onClick={() => setForm({ ...form, sign })}
                    className={`h-11 px-3 text-base font-medium ${
                      form.sign === sign
                        ? sign === "plus"
                          ? "bg-blue-600 text-white"
                          : "bg-rose-600 text-white"
                        : "bg-slate-900 text-slate-300"
                    }`}
                  >
                    {sign === "plus" ? "＋ プラス" : "− マイナス"}
                  </button>
                ))}
              </div>
              <Input
                id="adjustmentAmount"
                inputMode="numeric"
                value={form.amountText}
                onChange={(e) => setForm({ ...form, amountText: e.target.value })}
                placeholder="例：120000"
              />
            </div>
            <p className="text-sm text-slate-400">
              追加費用は「プラス」、値引き・相殺は「マイナス」を選んでください。
            </p>
          </Field>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving ? "保存中..." : "保存する"}
            </Button>
            <Button variant="secondary" onClick={() => setForm(null)} className="flex-1">
              キャンセル
            </Button>
          </div>
        </Card>
      ) : (
        <Button variant="secondary" fullWidth onClick={openNewForm}>
          ＋ その他項目を追加
        </Button>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="その他項目を削除します"
        message={`「${deleting?.name ?? ""}」（${formatCurrency(deleting?.amount ?? 0)}）を削除します。元に戻せません。`}
        confirmLabel="削除する"
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
