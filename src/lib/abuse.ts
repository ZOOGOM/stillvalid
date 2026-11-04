import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import ipaddr from "ipaddr.js";
import { IP_WORK_PER_HOUR } from "./limits";

// Additional network-level protection, never an identity or result owner.
// Disabled without an explicit Vercel runtime and a dedicated secret. Existing
// global/session limits must remain enabled when this optional layer is absent.
export const IP_WORK_LIMIT = IP_WORK_PER_HOUR;
export const IP_WORK_WINDOW_MS = 3600000;
export function abuseKey(
  headers: Pick<Headers, "get">,
  config: { vercel?: string; secret?: string },
): string | undefined {
  if (config.vercel !== "1" || !config.secret || config.secret.length < 32)
    return undefined;
  const raw = headers.get("x-vercel-forwarded-for")?.trim();
  let network = "unknown";
  // No client-controlled header fallback or forwarded-chain interpretation.
  if (raw && isIP(raw) && !raw.includes("%")) {
    const address = ipaddr.process(raw);
    if (address.kind() === "ipv4") network = "v4:" + address.toString();
    else {
      // Group IPv6 privacy addresses by /64; shared networks share the quota.
      network =
        "v6:" + Buffer.from(address.toByteArray().slice(0, 8)).toString("hex");
    }
  }
  // Stable identity: the stores alone define expiry and quota windows.
  // Never persist or log this key outside the short-lived rate-limit counters.
  return createHmac("sha256", config.secret)
    .update(`stillvalid:abuse:v2:${network}`)
    .digest("hex");
}

/**
 * The HMAC key for the network limit. A dedicated IP_RATE_LIMIT_SECRET wins;
 * otherwise a key is derived one-way from the server-only model credential so
 * the limit is on by default for hosted deployments. Neither the credential
 * nor the derived key is logged, stored or sent anywhere. Rotating either
 * value only resets the hourly counters.
 */
export function abuseSecret(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const dedicated = env.IP_RATE_LIMIT_SECRET;
  if (dedicated && dedicated.length >= 32) return dedicated;
  const credential = env.META_API_KEY || env.MODEL_API_KEY;
  if (!credential) return undefined;
  return createHash("sha256")
    .update("stillvalid:ip-limit-key:v1:" + credential)
    .digest("hex");
}
