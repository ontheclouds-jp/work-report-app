import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { calcPeriodAmounts, summarizeByWorkType } from "@/lib/aggregation";
import { getPeriodRange } from "@/lib/period";
import type { PeriodAdjustment, WorkLog, WorkType } from "@/types";

// 日本語を正しく表示するため、BIZ UDゴシック（SIL Open Font License）を埋め込む。
// subset: true で実際に使った文字だけを埋め込むので、PDF自体は小さく保たれる。
// ※ public/fonts のフォントは、配布元のファイルからヒンティング情報を取り除き、複合グリフを
//   単純グリフに展開したもの。元のままだとfontkitのサブセット化で一部の文字が表示されなくなるため。
const FONT_REGULAR_URL = "/fonts/BIZUDGothic-Regular.ttf";
const FONT_BOLD_URL = "/fonts/BIZUDGothic-Bold.ttf";

// A4縦（pt）
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 40;
const MARGIN_TOP = 40;
const MARGIN_BOTTOM = 50;

const TABLE_FONT_SIZE = 9;
const TABLE_LINE_HEIGHT = 12;
const CELL_PADDING_X = 4;
const CELL_PADDING_Y = 5;
const MIN_ROW_HEIGHT = 20;

const COLOR_TEXT = rgb(0.1, 0.1, 0.1);
const COLOR_BORDER = rgb(0.35, 0.35, 0.35);
const COLOR_HEADER_BG = rgb(0.9, 0.9, 0.9);
const COLOR_TOTAL_BG = rgb(0.95, 0.95, 0.95);
const COLOR_SATURDAY = rgb(0.1, 0.3, 0.75);
const COLOR_SUNDAY = rgb(0.8, 0.1, 0.1);
const COLOR_NEGATIVE = rgb(0.8, 0.1, 0.1);

type Align = "left" | "center" | "right";

interface Column {
  label: string;
  width: number;
  align: Align;
  wrap?: boolean;
}

// 合計幅は PAGE_WIDTH - MARGIN_X * 2（= 515.28）に合わせる
const COLUMNS: Column[] = [
  { label: "№", width: 26, align: "center" },
  { label: "日付", width: 38, align: "center" },
  { label: "曜日", width: 28, align: "center" },
  { label: "業務内容", width: 100, align: "left", wrap: true },
  { label: "摘要", width: 191.28, align: "left", wrap: true },
  { label: "単価", width: 60, align: "right" },
  { label: "金額", width: 72, align: "right" },
];

const WEEKDAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

export interface WorkReportPdfInput {
  periodLabel: string; // YYYY-MM
  logs: WorkLog[];
  workTypes: WorkType[];
  adjustments: PeriodAdjustment[]; // 「その他」項目（登録順）
  recipient?: string;
  companyName?: string;
  personName?: string;
  createdDate: Date;
}

interface Cell {
  text: string;
  color?: RGB;
  span?: number; // 何列分をまたぐか（初期値1）
  align?: Align; // 省略時は列の既定（複数列をまたぐ場合は中央）
}

function formatYen(amount: number): string {
  return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
}

/** 8 → "8時間"、7.5 → "7.5時間"（末尾の0は表示しない） */
function formatHoursShort(hours: number): string {
  return `${Number(hours.toFixed(2))}時間`;
}

/** "09:00" → "9:00" */
function formatTimeShort(time: string): string {
  const [h, m] = time.split(":");
  return `${Number(h)}:${m}`;
}

function formatJapaneseDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${y}年${m}月${d}日`;
}

function toISODate(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function getWeekday(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** 列幅に収まるよう1文字ずつ折り返す（日本語は単語区切りがないため文字単位）。 */
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const char of Array.from(text)) {
    const candidate = current + char;
    if (current !== "" && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("PDF用の日本語フォントを読み込めませんでした");
  }
  return response.arrayBuffer();
}

function drawTextAligned(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  x: number,
  width: number,
  y: number,
  align: Align,
  color: RGB = COLOR_TEXT
) {
  const textWidth = font.widthOfTextAtSize(text, size);
  let drawX = x;
  if (align === "center") drawX = x + (width - textWidth) / 2;
  if (align === "right") drawX = x + width - textWidth;
  page.drawText(text, { x: drawX, y, size, font, color });
}

/** 締め期間の日報一覧を業務日報形式のPDF（A4縦）にして返す。 */
export async function generateWorkReportPdf(input: WorkReportPdfInput): Promise<Uint8Array> {
  const [regularBytes, boldBytes] = await Promise.all([
    fetchFont(FONT_REGULAR_URL),
    fetchFont(FONT_BOLD_URL),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(regularBytes, { subset: true });
  const bold = await pdfDoc.embedFont(boldBytes, { subset: true });

  const [periodYear, periodMonth] = input.periodLabel.split("-").map(Number);
  const title = `${periodMonth}月 業務日報`;
  pdfDoc.setTitle(`${periodYear}年${title}`);
  if (input.personName) pdfDoc.setAuthor(input.personName);
  pdfDoc.setCreator("作業日報帳");

  const workTypeNameById = new Map(input.workTypes.map((w) => [w.id, w.name]));
  const sortedLogs = [...input.logs].sort((a, b) =>
    a.workDate === b.workDate
      ? a.startTime.localeCompare(b.startTime)
      : a.workDate.localeCompare(b.workDate)
  );

  const tableLeft = MARGIN_X;
  const tableRight = PAGE_WIDTH - MARGIN_X;
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let cursorY = 0;

  /** 行内の各セルの幅・揃え・折り返し後の行と、行の高さを求める。 */
  function layoutRow(cells: Cell[], rowFont: PDFFont, alignOverride?: Align) {
    let colIndex = 0;
    const layouts = cells.map((cell) => {
      const span = cell.span ?? 1;
      const cols = COLUMNS.slice(colIndex, colIndex + span);
      colIndex += span;
      const width = cols.reduce((sum, c) => sum + c.width, 0);
      const align = cell.align ?? alignOverride ?? (span > 1 ? "center" : cols[0].align);
      const lines = cols.some((c) => c.wrap)
        ? wrapText(cell.text, rowFont, TABLE_FONT_SIZE, width - CELL_PADDING_X * 2)
        : [cell.text];
      return { width, align, lines };
    });
    const maxLines = Math.max(...layouts.map((l) => l.lines.length));
    const rowHeight = Math.max(MIN_ROW_HEIGHT, maxLines * TABLE_LINE_HEIGHT + CELL_PADDING_Y * 2 - 3);
    return { layouts, rowHeight };
  }

  function drawRow(cells: Cell[], rowFont: PDFFont, background?: RGB, alignOverride?: Align) {
    const { layouts, rowHeight } = layoutRow(cells, rowFont, alignOverride);
    let x = tableLeft;
    cells.forEach((cell, i) => {
      const { width, align, lines } = layouts[i];
      page.drawRectangle({
        x,
        y: cursorY - rowHeight,
        width,
        height: rowHeight,
        borderColor: COLOR_BORDER,
        borderWidth: 0.5,
        color: background,
      });
      // 行の高さに対して、セル内の文字ブロックを縦中央に配置する
      const blockHeight = lines.length * TABLE_LINE_HEIGHT;
      const firstBaseline =
        cursorY - (rowHeight - blockHeight) / 2 - TABLE_LINE_HEIGHT + 3;
      lines.forEach((line, lineIndex) => {
        drawTextAligned(
          page,
          line,
          rowFont,
          TABLE_FONT_SIZE,
          x + CELL_PADDING_X,
          width - CELL_PADDING_X * 2,
          firstBaseline - lineIndex * TABLE_LINE_HEIGHT,
          align,
          cell.color
        );
      });
      x += width;
    });
    cursorY -= rowHeight;
  }

  /** 残りの高さが足りなければ改ページし、見出し行を再掲する。 */
  function ensureSpace(height: number) {
    if (cursorY - height < MARGIN_BOTTOM) {
      addPage();
      drawTableHeader();
    }
  }

  /** 改ページが必要か確認してから1行描画する。 */
  function drawRowWithBreak(cells: Cell[], rowFont: PDFFont, background?: RGB, alignOverride?: Align) {
    ensureSpace(layoutRow(cells, rowFont, alignOverride).rowHeight);
    drawRow(cells, rowFont, background, alignOverride);
  }

  function drawTableHeader() {
    drawRow(
      COLUMNS.map((c) => ({ text: c.label })),
      bold,
      COLOR_HEADER_BG,
      "center"
    );
  }

  function addPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    cursorY = PAGE_HEIGHT - MARGIN_TOP;
  }

  // ---- 1ページ目：タイトル・ヘッダー情報 ----
  addPage();

  const titleSize = 20;
  drawTextAligned(page, title, bold, titleSize, tableLeft, tableRight - tableLeft, cursorY - titleSize, "center");
  cursorY -= titleSize + 24;

  const headerTop = cursorY;

  // 左側：宛先（下線付き）
  if (input.recipient) {
    const recipientSize = 14;
    const recipientY = headerTop - recipientSize;
    page.drawText(input.recipient, { x: tableLeft, y: recipientY, size: recipientSize, font: bold, color: COLOR_TEXT });
    const underlineWidth = Math.max(bold.widthOfTextAtSize(input.recipient, recipientSize), 180);
    page.drawLine({
      start: { x: tableLeft, y: recipientY - 4 },
      end: { x: tableLeft + underlineWidth, y: recipientY - 4 },
      thickness: 0.8,
      color: COLOR_TEXT,
    });
  }

  // 右側：作成日・年・会社名・氏名
  const infoSize = 10;
  const infoLineHeight = 16;
  const infoLines = [
    `作成日　${formatJapaneseDate(toISODate(input.createdDate))}`,
    `${periodYear}年`,
    input.companyName ?? "",
    input.personName ?? "",
  ].filter((line) => line !== "");
  infoLines.forEach((line, i) => {
    drawTextAligned(page, line, font, infoSize, tableLeft, tableRight - tableLeft, headerTop - infoSize - i * infoLineHeight, "right");
  });

  const leftBlockHeight = input.recipient ? 22 : 0;
  const rightBlockHeight = infoLines.length * infoLineHeight;
  cursorY = headerTop - Math.max(leftBlockHeight, rightBlockHeight) - 8;

  const { startDate, endDate } = getPeriodRange(input.periodLabel);
  page.drawText(`対象期間：${formatJapaneseDate(startDate)}〜${formatJapaneseDate(endDate)}`, {
    x: tableLeft,
    y: cursorY - infoSize,
    size: infoSize,
    font,
    color: COLOR_TEXT,
  });
  cursorY -= infoSize + 12;

  // ---- 明細テーブル ----
  drawTableHeader();

  let totalHours = 0;

  sortedLogs.forEach((log, index) => {
    const weekday = getWeekday(log.workDate);
    const [, m, d] = log.workDate.split("-").map(Number);
    const content = log.content.replace(/\s+/g, " ").trim();
    const summary = [
      `${formatTimeShort(log.startTime)}～${formatTimeShort(log.endTime)}`,
      content,
      formatHoursShort(log.workHours),
    ]
      .filter((part) => part !== "")
      .join(" ");
    const cells: Cell[] = [
      { text: String(index + 1) },
      { text: `${m}/${d}` },
      {
        text: WEEKDAY_LABELS[weekday],
        color: weekday === 6 ? COLOR_SATURDAY : weekday === 0 ? COLOR_SUNDAY : undefined,
      },
      { text: workTypeNameById.get(log.workTypeId) ?? "（不明な作業名）" },
      { text: summary },
      { text: formatYen(log.hourlyRate) },
      { text: formatYen(log.amount) },
    ];

    drawRowWithBreak(cells, font);

    totalHours += log.workHours;
  });

  const amounts = calcPeriodAmounts(input.logs, input.adjustments);

  // ---- 合計 ----
  drawRowWithBreak(
    [
      { text: "合計", span: 4 },
      { text: formatHoursShort(Math.round(totalHours * 100) / 100) },
      { text: "" },
      { text: formatYen(amounts.subtotal) },
    ],
    bold,
    COLOR_TOTAL_BG
  );

  // ---- 業務内容（作業名）別小計：ホーム画面・締め期間集計画面と同じく金額の大きい順 ----
  for (const item of summarizeByWorkType(input.logs, input.workTypes)) {
    drawRowWithBreak(
      [
        { text: "小計", span: 3 },
        { text: item.workTypeName },
        { text: formatHoursShort(Math.round(item.hours * 100) / 100) },
        { text: "" },
        { text: formatYen(item.amount) },
      ],
      font
    );
  }

  // ---- その他項目（外注費・値引きなど）：業務内容別小計の下 ----
  for (const adjustment of input.adjustments) {
    drawRowWithBreak(
      [
        { text: "その他", span: 3 },
        { text: adjustment.name, span: 2, align: "left" },
        { text: "" },
        {
          text: formatYen(adjustment.amount),
          color: adjustment.amount < 0 ? COLOR_NEGATIVE : undefined,
        },
      ],
      font
    );
  }

  // ---- 消費税・税込合計（2行を同じページにまとめる） ----
  ensureSpace(MIN_ROW_HEIGHT * 2);
  drawRow(
    [{ text: "消費税（10%）", span: 6 }, { text: formatYen(amounts.tax) }],
    font,
    undefined,
    "right"
  );
  drawRow(
    [{ text: "税込合計", span: 6 }, { text: formatYen(amounts.totalWithTax) }],
    bold,
    COLOR_TOTAL_BG,
    "right"
  );

  // ---- ページ番号 ----
  pages.forEach((p, i) => {
    drawTextAligned(p, `${i + 1} / ${pages.length}`, font, 9, 0, PAGE_WIDTH, MARGIN_BOTTOM / 2, "center");
  });

  return pdfDoc.save();
}
