"use client";

import { setNonce } from "get-nonce";
import { useEffect } from "react";

/**
 * Hands the request's CSP nonce to `get-nonce`, which Radix's scroll lock reads when a dialog or
 * sheet opens and adds its `<style>` tag. Without it the strict `style-src` would block that tag.
 * Dialogs open only on user input, long after this effect has run.
 */
export function StyleNonce({ nonce }: { nonce: string | undefined }) {
  useEffect(() => {
    if (nonce) setNonce(nonce);
  }, [nonce]);
  return null;
}
