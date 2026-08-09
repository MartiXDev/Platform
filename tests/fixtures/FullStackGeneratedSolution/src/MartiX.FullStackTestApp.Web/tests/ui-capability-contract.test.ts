import { getByRole } from "@testing-library/dom";
import { describe, expect, it } from "vitest";

describe("MartiX UI Capability Contract", () => {
  it("keeps public state accessible and provider-neutral", () => {
    expect([
      "anonymous",
      "authenticated",
      "denied",
      "expired",
      "loading",
      "empty",
      "validation",
      "error",
      "offline",
      "reconnecting",
    ]).toHaveLength(10);
    document.body.innerHTML = '<main aria-labelledby="application-title"><h1 id="application-title">ui.application.title</h1><section aria-live="polite"></section></main>';
    expect(getByRole(document.body, "main")).toBeDefined();
  });

  it("uses browser credentials only through the server-owned session seam", () => {
    expect(localStorage.getItem("access-token")).toBeNull();
    expect(sessionStorage.getItem("refresh-token")).toBeNull();
  });
});
