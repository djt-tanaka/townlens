export function arrify<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
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

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
