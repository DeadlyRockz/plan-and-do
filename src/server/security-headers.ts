export type HeaderEntry = { key: string; value: string };

/** Browser features the app never uses, switched off for every page and any frame inside it. */
const DISABLED_FEATURES = [
  "camera",
  "microphone",
  "geolocation",
  "payment",
  "usb",
  "browsing-topics",
] as const;

/**
 * The static security headers from plan/09 §9.5, sent on every response by next.config.ts. The
 * Content-Security-Policy is not here: it carries a per-request nonce, so src/proxy.ts sets it.
 * HSTS is production-only, because it would pin `localhost` to HTTPS during development.
 */
export function securityHeaders(isProduction: boolean): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: DISABLED_FEATURES.map((feature) => `${feature}=()`).join(", "),
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ];
  if (isProduction) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }
  return headers;
}
