import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { MetaClient, configured } from "@/lib/meta";
import {
  AppError,
  checkRequestSchema,
  type Candidate,
  type ModelComparison,
  type Source,
} from "@/lib/schema";
import { authorityFor, fetchSource, publicUrl } from "@/lib/source";
import {
  createCheck,
  failCheck,
  finishCheck,
  getCheck,
  owner,
  sameOrigin,
  releaseWork,
  reserveModelCall,
} from "@/lib/store";
import { assembleResult } from "@/lib/compare";
import { errorResponse, readJson } from "@/lib/http";
import { abuseKey, abuseSecret } from "@/lib/abuse";
import { sourceRelevant } from "@/lib/relevance";
import { firstInOrder, settle } from "@/lib/priority";
export const runtime = "nodejs";
export const maxDuration = 180;
const sourceWarningCodes = new Set([
  "source_format",
  "source_encoding",
  "source_too_large",
  "source_timeout",
  "source_blocked",
  "source_not_found",
  "source_not_notice",
  "source_script_only",
]);
function fetchWarning(error: unknown): string {
  if (!(error instanceof AppError)) return "fetch";
  if (error.code === "source_network") return "network";
  return sourceWarningCodes.has(error.code) ? error.code : "fetch";
}
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const actor = owner(request);
    if (!configured()) throw new AppError("not_configured", 503);
    const input = checkRequestSchema.safeParse(await readJson(request, 150000));
    if (!input.success) throw new AppError("input");
    const { notice, country, lang, sourceUrl, requestKey } = input.data;
    if (sourceUrl) publicUrl(sourceUrl);
    const job = await createCheck(
      actor,
      requestKey,
      abuseKey(request.headers, {
        vercel: process.env.VERCEL,
        secret: abuseSecret(),
      }),
    );
    if (job.existing)
      return NextResponse.json(
        { id: job.id, ...(await getCheck(job.id, actor)) },
        { headers: { "Cache-Control": "no-store" } },
      );
    const abort = new AbortController();
    const signal = AbortSignal.any([
      abort.signal,
      request.signal,
      AbortSignal.timeout(170000),
    ]);
    const started = Date.now();
    const timing = { discoverMs: 0, fetchMs: 0, compareMs: 0, modelCalls: 0 };
    const measure = async <T>(
      key: "discoverMs" | "fetchMs" | "compareMs",
      operation: () => Promise<T>,
    ): Promise<T> => {
      const start = Date.now();
      try {
        return await operation();
      } finally {
        timing[key] += Date.now() - start;
      }
    };
    const stream = new ReadableStream({
      async start(controller) {
        const send = (type: string, data: unknown) => {
          try {
            controller.enqueue(
              new TextEncoder().encode(JSON.stringify({ type, data }) + "\n"),
            );
          } catch {
            abort.abort();
          }
        };
        const ensureActive = async () => {
          if (signal.aborted) throw new AppError("cancelled", 499);
          try {
            if ((await getCheck(job.id, actor)).state !== "processing")
              throw new AppError("cancelled", 499);
          } catch (error) {
            if (error instanceof AppError && error.code === "not_found")
              throw new AppError("cancelled", 499);
            throw error;
          }
          if (signal.aborted) throw new AppError("cancelled", 499);
        };
        send("created", { id: job.id });
        try {
          await ensureActive();
          const meta = new MetaClient(undefined, async () => {
            await reserveModelCall();
            timing.modelCalls++;
          });
          let candidates: Candidate[] = [];
          const warnings: string[] = [];
          send("phase", { step: "search", elapsedMs: Date.now() - started });
          if (sourceUrl)
            candidates = [{ url: publicUrl(sourceUrl).href, title: sourceUrl }];
          else {
            try {
              candidates = await measure("discoverMs", () =>
                meta.discover(notice, country, signal),
              );
            } catch (error) {
              if (signal.aborted) throw error;
              warnings.push(
                error instanceof AppError && error.code === "rate_limit"
                  ? "budget"
                  : "search",
              );
            }
            for (const match of notice.originalText.match(
              /https:\/\/[^\s<>"']+/g,
            ) || []) {
              try {
                const url = publicUrl(match).href;
                if (!candidates.some((c) => c.url === url))
                  candidates.unshift({ url, title: url });
              } catch {
                /* invalid embedded URL */
              }
            }
          }
          candidates.sort(
            (a, b) =>
              Number(
                authorityFor(new URL(b.url).hostname).authority ===
                  "registered",
              ) -
              Number(
                authorityFor(new URL(a.url).hostname).authority ===
                  "registered",
              ),
          );
          const sources: Source[] = [];
          const analyses: ModelComparison[] = [];
          send("phase", { step: "sources", elapsedMs: Date.now() - started });
          await ensureActive();
          // Fetch candidates concurrently but decide in priority order, exactly
          // as a sequential loop would: stop at two sources and record only the
          // failures that came before them. Unneeded requests are aborted.
          const fetchAbort = new AbortController();
          const fetchSignal = AbortSignal.any([signal, fetchAbort.signal]);
          const fetchStarted = Date.now();
          const attempts = candidates
            .slice(0, 3)
            .map((candidate) =>
              settle(fetchSource(candidate.url, "pending", fetchSignal)),
            );
          try {
            const fetched = await firstInOrder(attempts, 2);
            for (const source of fetched.values)
              sources.push({ ...source, id: "source-" + sources.length });
            for (const error of fetched.errors)
              warnings.push(fetchWarning(error));
          } finally {
            fetchAbort.abort();
            timing.fetchMs += Date.now() - fetchStarted;
          }
          send("phase", { step: "compare", elapsedMs: Date.now() - started });
          // A page sharing nothing with the notice cannot yield verified
          // evidence; skip its model call and say so instead.
          const related = sources.filter((source) =>
            sourceRelevant(notice, source),
          );
          const unrelated = sources.filter(
            (source) => !related.includes(source),
          );
          if (unrelated.length) warnings.push("source_unrelated");
          await ensureActive();
          const settled = await measure("compareMs", () =>
            Promise.all(
              related.map((source) =>
                settle(meta.compare(notice, source, lang, signal)),
              ),
            ),
          );
          const compared = related.filter((_source, i) => settled[i].ok);
          const failed = related.filter((_source, i) => !settled[i].ok);
          // One failed analysis must not discard the others. Only when every
          // related source failed is the check itself an error.
          const firstFailure = settled.find((outcome) => !outcome.ok);
          if (firstFailure && !firstFailure.ok && !compared.length)
            throw firstFailure.error;
          if (failed.length) warnings.push("source_compare_failed");
          for (const outcome of settled)
            if (outcome.ok) analyses.push(outcome.value);
          // assembleResult pairs analyses with sources by position.
          sources.splice(
            0,
            sources.length,
            ...compared,
            ...failed,
            ...unrelated,
          );
          await ensureActive();
          const result = assembleResult({
            id: job.id,
            notice,
            sources,
            analyses,
            lang,
            warnings,
            elapsedMs: Date.now() - started,
          });
          result.candidates = candidates.slice(0, 3);
          await finishCheck(job.id, actor, result);
          send("result", result);
        } catch (error) {
          await failCheck(job.id, actor);
          const code =
            error instanceof AppError
              ? error.code
              : signal.aborted
                ? "cancelled"
                : "internal";
          console.error(
            JSON.stringify({
              event: "check_failed",
              id: job.id,
              code,
              elapsedMs: Date.now() - started,
            }),
          );
          send("error", { code });
        } finally {
          // Aggregate durations and reserved calls only: no notices, sources or IPs.
          console.info(
            JSON.stringify({
              event: "check_timing",
              ...timing,
              elapsedMs: Date.now() - started,
            }),
          );
          try {
            await releaseWork(job.id, actor);
          } catch {
            // Storage outages retain the lease until its bounded expiry.
          }
          try {
            controller.close();
          } catch {
            /* disconnected */
          }
        }
      },
      async cancel() {
        abort.abort();
        await failCheck(job.id, actor);
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
