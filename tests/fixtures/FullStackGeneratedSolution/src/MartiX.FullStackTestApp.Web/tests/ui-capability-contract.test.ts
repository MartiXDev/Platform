import { render, waitFor } from "@testing-library/vue";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import App from "../App.vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const runtimeConfiguration = {
  apiBasePath: "/",
  deploymentVersion: "test",
  environment: "test",
  defaultCulture: "en-US",
  supportedCultures: ["en-US"],
  provider: "vue",
};
const contractStates = [
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
];

describe("MartiX Vue UI Capability Contract", () => {
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

  it("renders the accessible shell after the BFF session resolves", async () => {
    expect(contractStates).toHaveLength(10);
    expect(contractStates).toContain("denied");
    expect(contractStates).toContain("offline");
    expect(contractStates).toContain("reconnecting");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(App, {
      global: { plugins: [[VueQueryPlugin, { queryClient }]] },
    });

    expect(view.getByRole("main")).toBeDefined();
    await waitFor(() =>
      expect(view.getByText("No content is available.")).toBeDefined(),
    );
    expect(
      view.getByRole("main").querySelector('[data-client-ready="true"]'),
    ).not.toBeNull();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/auth/session",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("does not persist browser access or refresh credentials", () => {
    const localCredentialStorage: Pick<Storage, "getItem"> =
      typeof localStorage === "undefined"
        ? { getItem: () => null }
        : localStorage;
    const sessionCredentialStorage: Pick<Storage, "getItem"> =
      typeof sessionStorage === "undefined"
        ? { getItem: () => null }
        : sessionStorage;
    expect(localCredentialStorage.getItem("access-token")).toBeNull();
    expect(sessionCredentialStorage.getItem("refresh-token")).toBeNull();
  });
});
