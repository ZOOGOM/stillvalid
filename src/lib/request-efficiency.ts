import type { Notice } from "./schema";

/** Bound work that does not natively support cancellation, including DNS. */
export function abortable<T>(
  pending: Promise<T>,
  signal: AbortSignal,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const cancel = () => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    pending
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", cancel));
  });
}

/** Display language is independent of the untranslated evidence. */
export function evidenceKey(
  notice: Notice,
  country: string | null,
  url: string,
) {
  return JSON.stringify([notice, country, url.trim()]);
}

/** One bounded, tab-memory entry. Never stores source freshness or final verdicts. */
export class ReadingCache<T> {
  private entry?: { key: string; value: T; expires: number };
  get(key: string, now = Date.now()): T | undefined {
    if (!this.entry || this.entry.expires <= now) {
      this.clear();
      return;
    }
    return this.entry.key === key
      ? structuredClone(this.entry.value)
      : undefined;
  }
  set(key: string, value: T, now = Date.now()) {
    this.entry = {
      key,
      value: structuredClone(value),
      expires: now + 10 * 60 * 1000,
    };
  }
  clear() {
    this.entry = undefined;
  }
}
