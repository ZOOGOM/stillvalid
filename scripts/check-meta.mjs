import { EnvHttpProxyAgent } from "undici";
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const key = process.env.META_API_KEY || process.env.MODEL_API_KEY;
if (!key) {
  console.error(
    "META_API_KEY is not configured. Register a server secret or edit ignored .env.local. No request was made.",
  );
  process.exit(2);
}
// Resolve the same settings as the actual requests, including step overrides.
const { stepModel } = await import("../src/lib/meta.ts");
const models = Object.fromEntries(
  ["extraction", "search", "comparison"].map((step) => [step, stepModel(step)]),
);
const model = models.comparison;
let proxy;
try {
  proxy =
    process.env.HTTPS_PROXY || process.env.HTTP_PROXY
      ? new EnvHttpProxyAgent()
      : undefined;
  const response = await fetch("https://api.meta.ai/v1/models", {
    headers: { Authorization: "Bearer " + key },
    signal: AbortSignal.timeout(15000),
    ...(proxy ? { dispatcher: proxy } : {}),
  });
  if (!response.ok) {
    console.error(
      `Meta catalog returned HTTP ${response.status}. Check account access and the approved outbound policy for api.meta.ai. Credentials and response bodies are not printed.`,
    );
    process.exitCode = 1;
  } else {
    const data = await response.json();
    const availableModelIds = Array.isArray(data.data)
      ? data.data
          .map((m) => m.id)
          .filter(
            (id) =>
              typeof id === "string" && /^[a-z0-9][a-z0-9._-]{0,99}$/.test(id),
          )
      : [];
    const enabled = Object.values(models).every((id) =>
      availableModelIds.includes(id),
    );
    console.log(
      JSON.stringify({
        apiReachable: true,
        selectedModel: model,
        selectedModels: models,
        selectedModelEnabled: enabled,
        availableModelIds,
        inferenceTested: false,
      }),
    );
    if (!enabled) process.exitCode = 1;
  }
} catch {
  console.error(
    "Meta API could not be reached. Check approved access for api.meta.ai. No credentials are printed.",
  );
  process.exitCode = 1;
} finally {
  if (proxy) await proxy.close();
}
