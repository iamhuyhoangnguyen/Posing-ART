export interface GeminiRetryOptions {
  delaysMs?: number[];
  wait?: (delayMs: number) => Promise<void>;
  onRetry?: (retryNumber: number, delayMs: number, error: unknown) => void;
}

function readStatus(value: unknown): number | null {
  const status = Number(value);
  return Number.isFinite(status) && status > 0 ? status : null;
}

/** Gemini can expose UNAVAILABLE as a provider status or wrap it in ApiError.message. */
export function isGeminiUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const value = error as Record<string, any>;
  const nested = value.error && typeof value.error === "object" ? value.error as Record<string, any> : {};
  const numericStatuses = [value.status, value.code, value.response?.status, nested.code]
    .map(readStatus)
    .filter((status): status is number => status !== null);

  // A clear HTTP status other than 503 takes precedence over nested text.
  if (numericStatuses.some((status) => status !== 503)) return false;
  if (numericStatuses.includes(503)) return true;
  if ([value.status, value.code, nested.status].some((status) => String(status).toUpperCase() === "UNAVAILABLE")) {
    return true;
  }

  if (typeof value.message === "string") {
    try {
      const parsed = JSON.parse(value.message) as { error?: { code?: unknown; status?: unknown } };
      const parsedCode = readStatus(parsed.error?.code);
      if (parsedCode !== null) return parsedCode === 503;
      return String(parsed.error?.status || "").toUpperCase() === "UNAVAILABLE";
    } catch {
      return false;
    }
  }
  return false;
}

/** Retries only Gemini 503/UNAVAILABLE responses, with bounded backoff. */
export async function withGeminiUnavailableRetry<T>(
  operation: () => Promise<T>,
  options: GeminiRetryOptions = {},
): Promise<T> {
  const delaysMs = options.delaysMs ?? [500, 1500];
  const wait = options.wait ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const delayMs = delaysMs[attempt];
      if (delayMs === undefined || !isGeminiUnavailableError(error)) throw error;
      options.onRetry?.(attempt + 1, delayMs, error);
      await wait(delayMs);
    }
  }
}
