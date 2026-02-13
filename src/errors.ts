export class CliError extends Error {
  readonly hints: string[];
  readonly details?: string;
  readonly exitCode: number;

  constructor(message: string, hints: string[] = [], details?: string, exitCode = 1) {
    super(message);
    this.name = "CliError";
    this.hints = hints;
    this.details = details;
    this.exitCode = exitCode;
  }
}

export function formatError(error: unknown): string {
  if (error instanceof CliError) {
    const lines = [`[ERROR] ${error.message}`];
    if (error.details) {
      lines.push(`詳細: ${error.details}`);
    }
    if (error.hints.length > 0) {
      lines.push("次アクション:");
      for (const hint of error.hints) {
        lines.push(`- ${hint}`);
      }
    }
    return lines.join("\n");
  }

  if (error instanceof Error) {
    return `[ERROR] ${error.message}`;
  }

  return "[ERROR] 不明なエラーが発生しました";
}
