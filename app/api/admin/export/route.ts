import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import path from "node:path";
import { serverClient, type Audition, type FanMessage } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getAllListings } from "@/lib/auditionListings";

export const runtime = "nodejs";

/**
 * Tabular export — auditions / fan messages, CSV or XLSX.
 *
 *   GET /api/admin/export?type=auditions&format=csv   (default)
 *   GET /api/admin/export?type=auditions&format=xlsx
 *   GET /api/admin/export?type=fan&format=xlsx
 *
 * Korean column headers in both formats. CSV is BOM-prefixed UTF-8 so
 * Excel opens it correctly. XLSX is real Open XML via exceljs.
 */

type ColSpec<T> = {
  key: string;
  header: string;
  width: number;
  /** Optional transformer for prettifying the raw row value. May rely on a
   *  pre-loaded `context` object the caller threads in (e.g. listing
   *  summaries) so the format function itself stays synchronous. */
  format?: (row: T, ctx: ExportContext) => string | number | null;
  /** When true, the column carries a photo. CSV stores the URL string,
   *  XLSX embeds the actual image in the cell (and we tall up the row). */
  image?: boolean;
};

type ExportContext = {
  listingSummaries: Map<number, string>;
};

const AUDITION_COLS: ColSpec<Audition>[] = [
  { key: "id", header: "ID", width: 6 },
  {
    key: "photo_url",
    header: "프로필 사진",
    width: 14,
    image: true,
    format: (r) => r.photo_url ?? "",
  },
  { key: "name", header: "이름", width: 14 },
  { key: "birthdate", header: "생년월일", width: 12 },
  { key: "age", header: "나이", width: 6 },
  {
    key: "gender",
    header: "성별",
    width: 8,
    format: (r) =>
      r.gender === "female" ? "여성" :
      r.gender === "male" ? "남성" :
      r.gender === "other" ? "기타" : "",
  },
  { key: "phone", header: "연락처", width: 16 },
  { key: "email", header: "이메일", width: 28 },
  {
    key: "role_preference",
    header: "희망 포지션",
    width: 12,
    format: (r) =>
      r.role_preference === "lead" ? "주연" :
      r.role_preference === "support" ? "조연" :
      r.role_preference === "extra" ? "단역" :
      r.role_preference === "staff" ? "스태프" :
      r.role_preference ?? "",
  },
  {
    key: "listing",
    header: "지원 공고",
    width: 30,
    format: (r, ctx) =>
      r.listing_id != null ? ctx.listingSummaries.get(r.listing_id) ?? "" : "",
  },
  { key: "experience", header: "경력", width: 40 },
  { key: "intro", header: "자기소개", width: 60 },
  { key: "portfolio_url", header: "포트폴리오", width: 30 },
  {
    key: "status",
    header: "상태",
    width: 10,
    format: (r) =>
      r.status === "pending" ? "대기" :
      r.status === "reviewing" ? "검토중" :
      r.status === "accepted" ? "합격" :
      r.status === "rejected" ? "불합격" : r.status,
  },
  { key: "created_at", header: "제출일시", width: 20 },
];

const FAN_COLS: ColSpec<FanMessage>[] = [
  { key: "id", header: "ID", width: 6 },
  { key: "nickname", header: "닉네임", width: 14 },
  { key: "email", header: "이메일", width: 28 },
  { key: "favorite_work", header: "좋아하는 작품", width: 24 },
  { key: "message", header: "메시지", width: 60 },
  {
    key: "is_read",
    header: "확인 여부",
    width: 10,
    format: (r) => (r.is_read ? "확인" : "미확인"),
  },
  { key: "created_at", header: "받은일시", width: 20 },
];

/**
 * Spreadsheet apps (Excel, Sheets, Numbers) execute any string cell
 * starting with `=`, `+`, `@`, `-`, `\t`, or `\r` as a formula. Prefix
 * matching values with a literal apostrophe so they stay inert when
 * opened. `csvEscape` does the same for CSV; XLSX cell values pass
 * through `toRowValues` and need this defence too.
 */
function neutralizeFormula<V>(v: V): V {
  if (typeof v !== "string") return v;
  if (/^[=+@\-\t\r]/.test(v)) return ("'" + v) as unknown as V;
  return v;
}

function toRowValues<T extends Record<string, unknown>>(
  row: T,
  cols: ColSpec<T>[],
  ctx: ExportContext,
): (string | number | null)[] {
  return cols.map((c) => {
    const raw = c.format ? c.format(row, ctx) : (row[c.key as keyof T] ?? "");
    if (raw === null || raw === undefined) return "";
    return neutralizeFormula(raw) as string | number;
  });
}

// ── CSV ─────────────────────────────────────────────────────

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  // Formula-injection guard. Excel / Sheets / Numbers all auto-execute
  // a cell that starts with `=`, `+`, `@`, `-`, `\t`, or `\r` — so a
  // user submitting an "intro" of `=cmd|'/c calc'!A1` could land RCE
  // on whoever opens the CSV export. Prefix any such value with a
  // literal apostrophe; spreadsheet apps strip it on edit but the
  // formula stays dormant. Apply before quote-escaping so the prefix
  // ends up inside the quotes on values that also contain newlines.
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv<T extends Record<string, unknown>>(
  rows: T[],
  cols: ColSpec<T>[],
  ctx: ExportContext,
): string {
  const lines = [cols.map((c) => csvEscape(c.header)).join(",")];
  for (const r of rows) {
    lines.push(toRowValues(r, cols, ctx).map(csvEscape).join(","));
  }
  return "﻿" + lines.join("\r\n");
}

// ── XLSX ────────────────────────────────────────────────────

/**
 * exceljs supports `jpeg`, `png`, `gif`. WebP / HEIC photos can't be
 * embedded directly — we leave the cell as the URL text in that case so
 * the admin can click through.
 */
function extForExceljs(file: string): "jpeg" | "png" | "gif" | null {
  const e = path.extname(file).slice(1).toLowerCase();
  if (e === "jpg" || e === "jpeg") return "jpeg";
  if (e === "png") return "png";
  if (e === "gif") return "gif";
  return null;
}

async function buildXlsx<T extends Record<string, unknown>>(
  rows: T[],
  cols: ColSpec<T>[],
  sheetName: string,
  ctx: ExportContext,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "치즈필름 관리자";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.columns = cols.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
  }));
  // Header style — purple band matching the admin theme.
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7C3AED" }, // purple-600
    };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF5B21B6" } },
    };
  });

  const imageColIndexes = cols
    .map((c, i) => (c.image ? i : -1))
    .filter((i) => i >= 0);
  const hasImages = imageColIndexes.length > 0;
  const pendingImages: Array<{
    ri: number;
    ci: number;
    key: string;
    ext: "jpeg" | "png" | "gif";
  }> = [];

  // Body
  rows.forEach((r, ri) => {
    const values = toRowValues(r, cols, ctx);
    // Image cells start empty — the actual photo is overlaid via addImage.
    if (hasImages) {
      for (const ci of imageColIndexes) {
        values[ci] = "";
      }
    }
    const row = ws.addRow(values);
    row.alignment = { vertical: "top", wrapText: true };
    row.font = { size: 10 };
    if (hasImages) {
      // Tall enough to fit a 100px-ish portrait. exceljs heights are in
      // "rough points" (~ 1.33 px per point).
      row.height = 78;
    }
    // Embed photos — fetch the bytes from Supabase Storage. We fire the
    // download but await it sequentially below to keep this loop simple;
    // an export usually has <200 rows so the latency is fine.
    for (const ci of imageColIndexes) {
      const col = cols[ci];
      const key =
        col.format
          ? col.format(r, ctx)
          : (r[col.key as keyof T] as unknown);
      if (typeof key !== "string" || !key) continue;
      const ext = extForExceljs(key);
      if (!ext) continue;
      pendingImages.push({ ri, ci, key, ext });
    }
  });
  // Resolve all image downloads in parallel, then attach to the sheet.
  if (pendingImages.length > 0) {
    const sb = serverClient();
    await Promise.all(
      pendingImages.map(async (p) => {
        try {
          const { data } = await sb.storage.from("auditions").download(p.key);
          if (!data) return;
          const buf = Buffer.from(await data.arrayBuffer());
          const imgId = wb.addImage({
            buffer: buf as unknown as Parameters<typeof wb.addImage>[0]["buffer"],
            extension: p.ext,
          });
          ws.addImage(imgId, {
            tl: { col: p.ci + 0.05, row: p.ri + 1 + 0.05 },
            ext: { width: 80, height: 100 },
            editAs: "oneCell",
          });
        } catch {
          // skip — leave the cell empty
        }
      }),
    );
  }
  // Zebra stripe even rows
  for (let i = 2; i <= rows.length + 1; i++) {
    if (i % 2 === 0) continue;
    ws.getRow(i).eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF4F4F5" }, // zinc-100
      };
    });
  }
  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab as ArrayBuffer);
}

// ── Route ───────────────────────────────────────────────────

export async function GET(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const format = searchParams.get("format") ?? "csv";
  const today = new Date().toISOString().slice(0, 10);

  const sb = serverClient();
  if (type === "auditions") {
    const { data } = await sb
      .from("auditions")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Audition[];
    // Pre-resolve listing summaries so the format closures stay sync.
    const allListings = await getAllListings();
    const listingSummaries = new Map<number, string>(
      allListings.map((l) => [l.id, `#${l.id} · ${l.title}`]),
    );
    return respond(
      rows,
      AUDITION_COLS,
      "오디션 지원자",
      `auditions-${today}`,
      format,
      { listingSummaries },
    );
  }
  if (type === "fan") {
    const { data } = await sb
      .from("fan_messages")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as FanMessage[];
    return respond(rows, FAN_COLS, "응원 메시지", `fan-messages-${today}`, format, {
      listingSummaries: new Map(),
    });
  }
  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

async function respond<T extends Record<string, unknown>>(
  rows: T[],
  cols: ColSpec<T>[],
  sheetName: string,
  filenameBase: string,
  format: string,
  ctx: ExportContext,
) {
  if (format === "xlsx") {
    const buf = await buildXlsx(rows, cols, sheetName, ctx);
    // Cast to Uint8Array — Buffer is a subclass and Response accepts it.
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }
  // Default — CSV
  const csv = buildCsv(rows, cols, ctx);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
    },
  });
}
