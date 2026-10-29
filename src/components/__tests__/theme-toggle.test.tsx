// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "../theme-provider";
import { ThemeToggle } from "../theme-toggle";

beforeEach(() => {
  // next-themes renders its no-flash <script> inside the provider. React only warns about that in
  // a client-only render, which happens in tests, never in the app. Any other error still fails.
  vi.spyOn(console, "error").mockImplementation((message: unknown) => {
    if (!String(message).startsWith("Encountered a script tag")) throw new Error(String(message));
  });
});

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
});

describe("ThemeToggle", () => {
  it("server_render_uses_a_neutral_label_until_the_theme_is_known", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<ThemeToggle />);
    expect(within(container).getByRole("button")).toHaveAttribute("aria-label", "Switch theme");
  });

  it("offers_dark_mode_when_the_system_theme_is_light", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Switch to dark theme");
  });

  it("switches_to_dark_and_remembers_the_choice", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect([
      screen.getByRole("button").getAttribute("aria-label"),
      document.documentElement.classList.contains("dark"),
      window.localStorage.getItem("theme"),
    ]).toEqual(["Switch to light theme", true, "dark"]);
  });

  it("switches_back_to_light", async () => {
    window.localStorage.setItem("theme", "dark");
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );
    await userEvent.setup().click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect([
      document.documentElement.classList.contains("dark"),
      window.localStorage.getItem("theme"),
    ]).toEqual([false, "light"]);
  });
});
