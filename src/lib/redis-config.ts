import { AppError } from "./schema";

// Resolve at request time so backend selection and transport use the same rules.
export function redisConfig(): { endpoint: string; token: string } | null {
  const canonicalUrl = process.env.UPSTASH_REDIS_REST_URL;
  const canonicalToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  if (canonicalUrl || canonicalToken) {
    if (!canonicalUrl || !canonicalToken) throw new AppError("storage", 503);
    return { endpoint: canonicalUrl, token: canonicalToken };
  }
  if (kvUrl || kvToken) {
    if (!kvUrl || !kvToken) throw new AppError("storage", 503);
    return { endpoint: kvUrl, token: kvToken };
  }
  return null;
}
