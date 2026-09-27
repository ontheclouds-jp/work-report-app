import { z } from "zod";
import { calcRawDuration, calcWorkHours } from "./calculations";

/** 全角数字・カンマ・「円」を許容して金額の絶対値を数値に変換する。変換できない場合はNaN。 */
export function parseAmountText(text: string): number {
  const normalized = text
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，円\s]/g, "");
  if (!/^\d+$/.test(normalized)) return NaN;
  return Number(normalized);
}

export const periodAdjustmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "項目名を入力してください")
    .max(100, "項目名は100文字以内で入力してください"),
  amount: z
    .number({ error: "金額を入力してください" })
    .int("金額は円単位の整数で入力してください")
    .refine((v) => v !== 0, "0円以外の金額を入力してください"),
});

export type PeriodAdjustmentFormValues = z.infer<typeof periodAdjustmentFormSchema>;

export const workTypeStatusSchema = z.enum(["active", "paused", "ended"]);

export const workTypeFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "作業名を入力してください")
    .max(100, "作業名は100文字以内で入力してください"),
  defaultRate: z
    .number({ error: "数値を入力してください" })
    .min(0, "基本の時間単価は0以上で入力してください")
    .optional(),
  status: workTypeStatusSchema,
  memo: z.string().max(2000, "メモは2000文字以内で入力してください").optional(),
});

export type WorkTypeFormValues = z.infer<typeof workTypeFormSchema>;

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "時刻の形式が正しくありません");

export const workLogFormSchema = z
  .object({
    workTypeId: z.string().min(1, "作業名を選択してください"),
    workDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "日付を入力してください"),
    startTime: timeSchema,
    endTime: timeSchema,
    content: z
      .string()
      .trim()
      .min(1, "作業内容を入力してください")
      .max(200, "作業内容は200文字以内で入力してください"),
    hourlyRate: z
      .number({ error: "時間単価を入力してください" })
      .gt(0, "時間単価は0より大きい数値で入力してください"),
    isSudden: z.boolean(),
    memo: z.string().max(2000, "メモは2000文字以内で入力してください").optional(),
  })
  .superRefine((data, ctx) => {
    const rawDuration = calcRawDuration(data.startTime, data.endTime);
    if (rawDuration === null) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message:
          "終了時刻は開始時刻より後にしてください（日をまたぐ入力には対応していません）",
      });
      return;
    }
    if (calcWorkHours(data.startTime, data.endTime, rawDuration) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message:
          "休憩時間を差し引くと作業時間が0以下になります。時刻を確認してください",
      });
    }
  });

export const suddenAllowanceAmountSchema = z
  .number({ error: "金額を入力してください" })
  .int("突発手当は円単位の整数で入力してください")
  .min(0, "突発手当は0以上で入力してください");

export type WorkLogFormValues = z.infer<typeof workLogFormSchema>;
