import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/layout/PageHeader";
import { APP_CHANGELOG, APP_LAST_UPDATED, APP_VERSION } from "@/lib/version";

interface GuideStep {
  title: string;
  body: string;
  detail?: string[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    title: "1. 作業名を登録する",
    body: "まず「作業名」画面から、担当する作業の名前と時給を登録してください。",
  },
  {
    title: "2. 日報を入力する",
    body: "毎日の作業が終わったら、「日報を入力」から記録してください。",
    detail: [
      "日付：作業した日を選びます（通常は今日のままでOK）",
      "作業名：登録した作業名から選びます",
      "開始時刻：作業を始めた時刻を入力します",
      "終了時刻：作業を終えた時刻を入力します",
      "作業内容：どんな作業をしたか簡単に書きます",
      "時間単価：作業名を選ぶと自動で時給が入ります（変更もできます）",
    ],
  },
  {
    title: "3. 金額の自動計算について",
    body: "入力すると、その日の作業時間と金額が自動で計算されます。1日8時間を超えた分や、土曜日・日曜日の作業は、割増の金額が自動で加算されます。",
  },
  {
    title: "4. 締め期間について",
    body: "毎月21日〜翌月20日が1つの区切り（締め期間）です。ホーム画面で、今の締め期間の合計金額を確認できます。",
  },
  {
    title: "5. データを送るとき",
    body: "設定画面の「データ管理」から、CSVまたはJSON形式で書き出して、担当者に送ってください。",
  },
  {
    title: "6. 日報をPDFで提出するとき",
    body: "先に「PDF出力設定」で宛先・会社名・氏名を登録してください。その後、「締め期間集計」画面または「データ管理」画面で月度（例：8/21〜9/20の期間は「9月度」）を選び、「PDF出力」ボタンを押すと、A4サイズの業務日報PDFが保存されます。",
  },
  {
    title: "7. 外注費や値引きを入れるとき",
    body: "「締め期間集計」画面で月度を選び、「その他」欄の「その他項目を追加」から、項目名と金額を登録してください。値引きや相殺は「マイナス」を選んで金額を入力します。合計金額・消費税・税込合計・PDFに自動で反映されます。",
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader title="ヘルプ" backHref="/settings" />

      <div className="flex flex-col gap-6">
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-50">使い方</h2>
          <div className="flex flex-col gap-4">
            {GUIDE_STEPS.map((step) => (
              <div key={step.title}>
                <h3 className="text-base font-semibold text-slate-100">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm text-slate-300">{step.body}</p>
                {step.detail && (
                  <ul className="mt-2 flex flex-col gap-1 pl-4 text-sm text-slate-400">
                    {step.detail.map((line) => (
                      <li key={line} className="list-disc">
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-50">
            バージョン情報
          </h2>
          <dl className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">アプリ名</dt>
              <dd className="text-slate-100">作業日報帳</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">バージョン</dt>
              <dd className="text-slate-100">{APP_VERSION}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">最終更新日</dt>
              <dd className="text-slate-100">{APP_LAST_UPDATED}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-slate-400">開発</dt>
              <dd className="text-slate-100">Claude Codeで作成</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-semibold text-slate-50">更新履歴</h2>
          <ul className="flex flex-col gap-3 text-sm">
            {APP_CHANGELOG.map((entry) => (
              <li key={entry.version}>
                <p className="text-slate-400">
                  <span className="font-semibold text-slate-100">{entry.version}</span>
                  （{entry.date}）
                </p>
                <p className="mt-0.5 text-slate-300">{entry.description}</p>
              </li>
            ))}
          </ul>
        </Card>

        <Link href="/pdf-settings">
          <Button variant="secondary" fullWidth>
            PDF出力設定（宛先・会社名・氏名）
          </Button>
        </Link>
      </div>
    </div>
  );
}
