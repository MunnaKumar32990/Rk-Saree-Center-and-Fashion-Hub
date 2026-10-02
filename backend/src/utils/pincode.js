/**
 * pincode.js — Indian PIN-code serviceability lookup.
 *
 * Why this matters so much: "we don't deliver to your PIN code" discovered at
 * the payment step is one of the highest-drop-off points in Indian checkout, and
 * entering the PIN code FIRST (so it can auto-fill city and state) measurably
 * reduces address-form errors.
 *
 * Resolution order:
 *   1. An explicit blocklist (pincodes we know we can't reach).
 *   2. India Post's public postal API.
 *   3. Assume serviceable — never block a sale on a third-party outage.
 */

const inFlight = new Map();

const BLOCKED_PIN_PREFIXES = [];

const looksValid = (pin) => /^[1-9]\d{5}$/.test(pin);

/**
 * @param {string} rawPin
 * @returns {Promise<{ok: boolean, serviceable: boolean|null, city?: string, district?: string, state?: string, source?: string}>}
 */
export async function lookupPincode(rawPin) {
  const pin = String(rawPin || "").replace(/\D/g, "");
  if (!looksValid(pin)) {
    return { ok: false, serviceable: false, message: "Enter a valid 6-digit PIN code" };
  }

  if (BLOCKED_PIN_PREFIXES.some((p) => pin.startsWith(p))) {
    return {
      ok: true,
      serviceable: false,
      source: "blocklist",
      message: "We're not able to deliver to this PIN code yet.",
    };
  }

  // De-duplicate concurrent lookups for the same PIN.
  if (inFlight.has(pin)) return inFlight.get(pin);

  const promise = (async () => {
    if (process.env.PINCODE_LOOKUP_ENABLED === "false") {
      return { ok: true, serviceable: true, source: "disabled" };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) throw new Error(`upstream ${res.status}`);
      const json = await res.json();
      const record = Array.isArray(json) ? json[0] : null;

      if (!record || record.Status !== "Success") {
        return {
          ok: true,
          serviceable: false,
          source: "india-post",
          message: record?.Status
            ? `That PIN code doesn't look valid (${record.Status}). Please double-check.`
            : "We couldn't find that PIN code. Please check it and try again.",
        };
      }

      const postOffices = Array.isArray(record.PostOffice)
        ? record.PostOffice
        : record.PostOffice
        ? [record.PostOffice]
        : [];
      const primaryPo = postOffices[0] || {};
      const city = primaryPo.District || primaryPo.Block || primaryPo.Name || record.District || "";
      const district = primaryPo.District || record.District || "";
      const state = primaryPo.State || record.State || "";

      return {
        ok: true,
        serviceable: true,
        source: "india-post",
        city,
        district,
        state,
      };
    } catch {
      // Never block a purchase because a public API is unreachable.
      return { ok: true, serviceable: null, source: "unavailable" };
    } finally {
      inFlight.delete(pin);
    }
  })();

  inFlight.set(pin, promise);
  return promise;
}