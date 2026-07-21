import { execFile } from "node:child_process";

export interface LocalTurnSyncResult {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run the local-turn-sync CLI with an explicit argv (no shell involved, so
 * argument values cannot be interpreted as shell syntax).
 *
 * Never rejects: failures (missing binary, nonzero exit, timeout) resolve
 * with a nonzero `code` and the failure text in `stderr` so callers can
 * return a structured fail-open tool result.
 */
export function runLocalTurnSync(
  cliPath: string,
  args: string[],
  timeoutMs: number,
): Promise<LocalTurnSyncResult> {
  return new Promise((resolve) => {
    execFile(
      cliPath,
      args,
      { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const out = typeof stdout === "string" ? stdout : String(stdout ?? "");
        const err = typeof stderr === "string" ? stderr : String(stderr ?? "");
        if (!error) {
          resolve({ code: 0, stdout: out, stderr: err });
          return;
        }
        const rawCode = (error as NodeJS.ErrnoException & { code?: unknown }).code;
        const code = typeof rawCode === "number" && rawCode !== 0 ? rawCode : 1;
        const message = err.trim().length > 0 ? err : error.message;
        resolve({ code, stdout: out, stderr: message });
      },
    );
  });
}
