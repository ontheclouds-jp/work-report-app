import { z } from "zod";
import { calcRawDuration, calcWorkHours } from "./calculations";

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
    if (calcWorkHours(rawDuration) === null) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message:
          "拘束時間が1時間以下のため、休憩を差し引いた作業時間を計算できません",
      });
    }
  });

export type WorkLogFormValues = z.infer<typeof workLogFormSchema>;
