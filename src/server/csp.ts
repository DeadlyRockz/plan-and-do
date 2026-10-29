/**
 * SHA-256 of the one stylesheet sonner injects at runtime. It has no nonce option, so the policy
 * allows exactly this text; `csp.test.ts` recomputes the hash from the installed package, so an
 * upgrade that changes the CSS fails CI instead of silently unstyling the toasts.
 */
export const SONNER_STYLE_HASH = "sha256-StEaX+se6YS7pqjzrzMIA0KaX9zF/8zAhvQXZAe5epY=";

/**
 * SHA-256 of the empty string. sonner adds its `<style>` tag before filling it, and the browser
 * checks the empty tag too. An empty stylesheet styles nothing, so allowing it is harmless.
 */
export const EMPTY_STYLE_HASH = "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=";

/**
 * The Content-Security-Policy from plan/09 §9.5, built per request around a fresh nonce.
 * `'strict-dynamic'` lets scripts the nonce'd Next.js runtime loads run too. In production a
 * `<style>` element needs the nonce or sonner's known hash; style attributes stay allowed (the
 * budget bars set their width that way, and an attribute cannot load anything or run script).
 * Development adds `'unsafe-eval'` (React's debug stacks), inline styles for hot reloading and
 * the HMR websocket, never production.
 */
export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  const styleElements = isDevelopment
    ? "'unsafe-inline'"
    : `'nonce-${nonce}' '${SONNER_STYLE_HASH}' '${EMPTY_STYLE_HASH}'`;
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${styleElements}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${isDevelopment ? " ws:" : ""}`,
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  return directives.join("; ");
}
