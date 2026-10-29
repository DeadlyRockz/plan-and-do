// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { downloadTextFile } from "../download";

const OBJECT_URL = "blob:http://localhost/plan-and-do";

function stubDownload() {
  return {
    create: vi.spyOn(URL, "createObjectURL").mockReturnValue(OBJECT_URL),
    revoke: vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {}),
    // jsdom cannot navigate, so the click itself is a no-op.
    click: vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {}),
  };
}

describe("downloadTextFile", () => {
  it("wraps_the_content_in_a_blob_of_the_given_type", async () => {
    const { create } = stubDownload();
    downloadTextFile("plan.ics", "BEGIN:VCALENDAR", "text/calendar");
    const blob = create.mock.calls[0]?.[0] as Blob;
    expect([await blob.text(), blob.type]).toEqual(["BEGIN:VCALENDAR", "text/calendar"]);
  });

  it("clicks_a_link_named_after_the_file", () => {
    const { click } = stubDownload();
    downloadTextFile("asha-wedding.ics", "BEGIN:VCALENDAR", "text/calendar");
    const link = click.mock.contexts[0] as HTMLAnchorElement;
    expect([link.href, link.download, click.mock.calls.length]).toEqual([
      OBJECT_URL,
      "asha-wedding.ics",
      1,
    ]);
  });

  it("revokes_the_object_url_after_the_click", () => {
    const { click, revoke } = stubDownload();
    downloadTextFile("plan.txt", "Book the venue.", "text/plain");
    expect([
      revoke.mock.calls,
      revoke.mock.invocationCallOrder[0]! > click.mock.invocationCallOrder[0]!,
    ]).toEqual([[[OBJECT_URL]], true]);
  });
});
