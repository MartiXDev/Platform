export type SessionState =
  | { kind: "anonymous" }
  | { kind: "authenticated"; actor: { id: string }; permissions: readonly string[] }
  | { kind: "denied"; reason: "forbidden" }
  | { kind: "expired"; returnPath: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSessionState(value: unknown): value is SessionState {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return false;
  }
  if (value.kind === "anonymous") {
    return true;
  }
  if (value.kind === "denied") {
    return value.reason === "forbidden";
  }
  if (value.kind === "expired") {
    return typeof value.returnPath === "string";
  }
  return (
    value.kind === "authenticated" &&
    isRecord(value.actor) &&
    typeof value.actor.id === "string" &&
    Array.isArray(value.permissions) &&
    value.permissions.every((permission) => typeof permission === "string")
  );
}

export async function readSession(
  fetcher: typeof fetch = fetch,
): Promise<SessionState> {
  const response = await fetcher("/auth/session", {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (response.status === 401) {
    return { kind: "anonymous" };
  }
  if (response.status === 403) {
    return { kind: "denied", reason: "forbidden" };
  }
  if (!response.ok) {
    return {
      kind: "expired",
      returnPath: typeof window === "undefined" ? "/" : window.location.pathname,
    };
  }
  const session = await response.json();
  if (!isSessionState(session)) {
    throw new Error("The server returned an invalid session state.");
  }
  return session;
}

export function signOut(fetcher: typeof fetch = fetch): Promise<Response> {
  return fetcher("/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF": "required" },
  });
}
