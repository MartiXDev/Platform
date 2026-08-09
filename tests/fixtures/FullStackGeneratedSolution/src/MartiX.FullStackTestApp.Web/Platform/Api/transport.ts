import type { ProblemDetails } from "./generated";

export type TransportFailure =
  | { kind: "problem-details"; problem: ProblemDetails }
  | { kind: "network"; messageKey: "ui.error.offline" }
  | { kind: "cancelled" }
  | { kind: "session-expired" }
  | { kind: "access-denied" };

export type RequestPolicy = {
  retrySafeRead: boolean;
  idempotencyKey?: string;
  ifMatch?: string;
};

export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
  policy: RequestPolicy = { retrySafeRead: false },
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("traceparent", crypto.randomUUID());
  if (policy.idempotencyKey !== undefined) {
    headers.set("Idempotency-Key", policy.idempotencyKey);
  }
  if (policy.ifMatch !== undefined) {
    headers.set("If-Match", policy.ifMatch);
  }

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
  if (response.ok) {
    return response;
  }
  if (response.status === 401) {
    throw { kind: "session-expired" } as const;
  }
  if (response.status === 403) {
    throw { kind: "access-denied" } as const;
  }
  if (response.headers.get("content-type")?.includes("problem+json")) {
    throw {
      kind: "problem-details",
      problem: (await response.json()) as ProblemDetails,
    } satisfies TransportFailure;
  }
  if (policy.retrySafeRead && response.status >= 500) {
    return request(input, init, { ...policy, retrySafeRead: false });
  }
  throw { kind: "network", messageKey: "ui.error.offline" } satisfies TransportFailure;
}
