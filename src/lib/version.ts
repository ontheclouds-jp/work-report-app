// アプリのバージョン情報。私（Claude Code）が更新作業を行うたびに、
// このバージョン番号と最終更新日を新しい値に更新する。
export const APP_VERSION = "v1.0.10";
export const APP_LAST_UPDATED = "2026-09-23";

// 更新履歴（新しい順）。バージョンを上げるときは先頭に1件追加する。
export const APP_CHANGELOG: { version: string; date: string; description: string }[] = [
  {
    version: "v1.0.10",
    date: "2026-09-23",
    description: "宛先欄をPDF表示時に自動で『御中』を付ける仕様に変更",
  },
  {
    version: "v1.0.9",
    date: "2026-09-23",
    description: "内税選択時、消費税計算を行わないよう修正",
  },
  {
    version: "v1.0.8",
    date: "2026-09-23",
    description: "PDF出力に外税/内税の区分を追加",
  },
  {
    version: "v1.0.7",
    date: "2026-09-23",
    description: "PDFに業務内容別の小計を追加",
  },
  {
    version: "v1.0.6",
    date: "2026-09-23",
    description: "月度ごとに外注費などの『その他』項目を追加できる機能を追加",
  },
  {
    version: "v1.0.5",
    date: "2026-09-23",
    description: "PDF出力で過去の月度を選択できる機能を追加",
  },
  {
    version: "v1.0.4",
    date: "2026-09-23",
    description:
      "締め期間の日報一覧をPDF出力する機能（宛先・会社名・氏名の設定画面付き）を追加",
  },
  {
    version: "v1.0.3",
    date: "2026-09-18",
    description: "日報・作業名の保存時にクラウドへ自動バックアップする機能を追加",
  },
  {
    version: "v1.0.2",
    date: "2026-08-22",
    description: "昼休憩の差し引きを、勤務時間帯が12:00〜13:00と重なる場合のみに変更",
  },
  {
    version: "v1.0.1",
    date: "2026-08-12",
    description: "終了時刻の初期値を18:00にし、基本の終了時刻の設定を追加",
  },
  {
    version: "v1.0.0",
    date: "2026-08-11",
    description: "ヘルプ・バージョン情報画面を追加",
  },
];
