export type SessionState =
  | { kind: "anonymous" }
  | { kind: "authenticated"; actor: { id: string }; permissions: readonly string[] }
  | { kind: "denied"; reason: "forbidden" }
  | { kind: "expired"; returnPath: string };

export async function readSession(): Promise<SessionState> {
  const response = await fetch("/auth/session", {
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
    return { kind: "expired", returnPath: window.location.pathname };
  }
  return (await response.json()) as SessionState;
}

export function signOut(): Promise<Response> {
  return fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "X-CSRF": "required" },
  });
}
