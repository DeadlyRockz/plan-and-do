// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { getNonce } from "get-nonce";
import { describe, expect, it } from "vitest";
import { StyleNonce } from "../style-nonce";

describe("StyleNonce", () => {
  it("hands_the_request_nonce_to_radix_style_tags_and_renders_nothing", () => {
    const { container } = render(<StyleNonce nonce="nonce-for-this-request" />);
    expect([getNonce(), container.innerHTML]).toEqual(["nonce-for-this-request", ""]);
  });

  it("leaves_the_nonce_alone_when_the_page_has_none", () => {
    render(<StyleNonce nonce="first" />);
    render(<StyleNonce nonce={undefined} />);
    expect(getNonce()).toBe("first");
  });
});
