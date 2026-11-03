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
} from "@/lib/store";
import { assembleResult } from "@/lib/compare";
import { errorResponse, readJson } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 180;
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const actor = owner(request);
    if (!configured()) throw new AppError("not_configured", 503);
    const input = checkRequestSchema.safeParse(await readJson(request, 150000));
    if (!input.success) throw new AppError("input");
    const { notice, country, lang, sourceUrl, requestKey } = input.data;
    if (sourceUrl) publicUrl(sourceUrl);
    const job = await createCheck(actor, requestKey);
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
        send("created", { id: job.id });
        try {
          const meta = new MetaClient();
          let candidates: Candidate[] = [];
          const warnings: string[] = [];
          send("phase", { step: "search" });
          if (sourceUrl)
            candidates = [{ url: publicUrl(sourceUrl).href, title: sourceUrl }];
          else {
            try {
              candidates = await meta.discover(notice, country, signal);
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
          send("phase", { step: "sources" });
          for (const candidate of candidates.slice(0, 3)) {
            if (signal.aborted) throw new AppError("cancelled", 499);
            try {
              const source = await fetchSource(
                candidate.url,
                "source-" + sources.length,
                signal,
              );
              sources.push(source);
              if (sources.length >= 2) break;
            } catch (error) {
              warnings.push(
                error instanceof AppError && error.code === "source_network"
                  ? "network"
                  : "fetch",
              );
            }
          }
          send("phase", { step: "compare" });
          for (const source of sources)
            analyses.push(await meta.compare(notice, source, lang, signal));
          if (signal.aborted) throw new AppError("cancelled", 499);
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
