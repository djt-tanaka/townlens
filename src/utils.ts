import fs from "node:fs/promises";
import path from "node:path";

export function arrify<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export function textFrom(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object" && "$" in (value as Record<string, unknown>)) {
    return textFrom((value as Record<string, unknown>).$);
  }
  return "";
}

const FULL_WIDTH_MAP: Record<string, string> = {
  "０": "0",
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9",
  "－": "-",
  "〜": "~",
  "～": "~",
  "　": " "
};

export function normalizeLabel(input: string): string {
  const half = input
    .split("")
    .map((char) => FULL_WIDTH_MAP[char] ?? char)
    .join("")
    .toLowerCase();

  return half.replace(/\s+/g, "").trim();
}

export function parseNumber(value: unknown): number | null {
  const raw = textFrom(value).trim();
  if (!raw || raw === "-" || raw === "..." || raw === "x") {
    return null;
  }
  const normalized = raw.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toCdParamName(classId: string): string {
  if (!classId) {
    return "";
  }
  return `cd${classId[0].toUpperCase()}${classId.slice(1)}`;
}

export function resolveOutPath(out?: string): string {
  if (out) {
    return path.resolve(out);
  }
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "_",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  return path.resolve("out", `estat_report_${stamp}.pdf`);
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
