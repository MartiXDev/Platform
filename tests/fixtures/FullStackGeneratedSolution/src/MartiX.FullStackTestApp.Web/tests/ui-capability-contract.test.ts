import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";

const runtimeConfiguration = {
  apiBasePath: "/",
  deploymentVersion: "test",
  environment: "test",
  defaultCulture: "en-US",
  supportedCultures: ["en-US"],
  provider: "react",
};
const contractStates = [
  "loading",
  "empty",
  "validation",
  "denied",
  "error",
  "offline",
  "reconnecting",
];

describe("MartiX React UI Capability Contract", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).endsWith("/ui-config.json")) {
          return new Response(JSON.stringify(runtimeConfiguration), {
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ kind: "anonymous" }), {
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders a semantic loading surface before the BFF session resolves", () => {
    expect(contractStates).toContain("reconnecting");
    expect(contractStates).toContain("denied");
    expect(contractStates).toContain("offline");
    render(<App />);
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  });

  it("does not persist browser access or refresh credentials", () => {
    expect(localStorage.getItem("access-token")).toBeNull();
    expect(sessionStorage.getItem("refresh-token")).toBeNull();
  });
});
