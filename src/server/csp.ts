/**
 * The Content-Security-Policy from plan/09 §9.5, built per request around a fresh nonce.
 * `'strict-dynamic'` lets scripts the nonce'd Next.js runtime loads run too; development adds
 * `'unsafe-eval'` (React's debug stacks) and the HMR websocket, never production.
 */
export function buildContentSecurityPolicy(nonce: string, isDevelopment: boolean): string {
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
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
