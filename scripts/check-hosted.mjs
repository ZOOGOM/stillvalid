import { randomUUID } from "node:crypto";

// Runs only when explicitly enabled for a reviewed hosting build. Never loads or
// exports secrets, and uses the application's real transport and request budget.
let phase = "configuration";
let providerStatus = null;
async function verify() {
  // Verify the production key's live catalog before the new deployment can
  // receive traffic. This GET performs no inference or model reservation.
  if (process.env.VERCEL_ENV === "production") {
    phase = "model-catalog";
    await import("./check-meta.mjs");
    if (process.exitCode) throw new Error("model_catalog");
  }
  if (process.env.STILLVALID_VERIFY_DEPLOYMENT !== "1") {
    console.log(JSON.stringify({ hostedVerification: "skipped" }));
    return;
  }
  if (process.env.VERCEL !== "1") throw new Error("hosting_required");
  const { MetaClient, configured, stepModel } =
    await import("../src/lib/meta.ts");
  const { restCommand } = await import("../src/lib/redis-store.ts");
  if (!configured()) throw new Error("not_configured");

  phase = "redis";
  const key = `sv:{stillvalid}:deployment-probe:${randomUUID()}`;
  let created = false;
  try {
    if ((await restCommand("PING")) !== "PONG") throw new Error("storage");
    await restCommand("SET", key, "probe", "EX", 60);
    created = true;
    if ((await restCommand("GET", key)) !== "probe") throw new Error("storage");
  } finally {
    if (created && (await restCommand("DEL", key)) !== 1)
      throw new Error("storage");
  }

  phase = "meta-inference";
  const text =
    "Synthetic deployment diagnostic — this is a fictional notice, not a real event. " +
    "Example Library reading session. Registration deadline: 2030-04-30 at 17:00 UTC. " +
    "Event date: 2030-05-01 at 10:00 UTC. Location: Example Hall.";
  const client = new MetaClient(async (input, init) => {
    const response = await fetch(input, init);
    providerStatus = response.status;
    return response;
  });
  const notice = await client.extract(text, undefined, null);
  if (
    notice.originalText !== text ||
    !notice.fields.some(
      (field) =>
        field.key === "deadline" &&
        field.value.includes("2030-04-30") &&
        field.quote.includes("2030-04-30"),
    )
  )
    throw new Error("model_output");
  console.log(
    JSON.stringify({
      hostedVerification: "passed",
      redisReadWriteDelete: true,
      model: stepModel("extraction"),
      providerStatus,
      textInferenceTested: true,
      input: "synthetic-diagnostic",
      imageSearchAndRealNoticeTested: false,
    }),
  );
}
verify().catch(() => {
  // Only fixed phases and numeric HTTP status are logged. Provider responses,
  // notice text, exception messages and credentials are deliberately omitted.
  console.error(
    JSON.stringify({ hostedVerification: "failed", phase, providerStatus }),
  );
  process.exitCode = 1;
});
