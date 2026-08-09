import { request, type TransportFailure } from "../Api/transport";

export type SessionState =
  | { kind: "anonymous" }
  | { kind: "authenticated"; actor: { id: string }; permissions: readonly string[] }
  | { kind: "denied"; reason: "forbidden" }
  | { kind: "expired"; returnPath: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSessionState(value: unknown): SessionState {
  if (!isRecord(value) || typeof value.kind !== "string") {
    throw new Error("The session endpoint returned an invalid state.");
  }
  if (value.kind === "anonymous") {
    return { kind: "anonymous" };
  }
  if (value.kind === "denied" && value.reason === "forbidden") {
    return { kind: "denied", reason: "forbidden" };
  }
  if (
    value.kind === "authenticated" &&
    isRecord(value.actor) &&
    typeof value.actor.id === "string" &&
    Array.isArray(value.permissions) &&
    value.permissions.every((permission): permission is string => typeof permission === "string")
  ) {
    return {
      kind: "authenticated",
      actor: { id: value.actor.id },
      permissions: value.permissions,
    };
  }
  if (value.kind === "expired" && typeof value.returnPath === "string") {
    return { kind: "expired", returnPath: value.returnPath };
  }
  throw new Error("The session endpoint returned an unsupported state.");
}

function isTransportFailure(value: unknown): value is TransportFailure {
  return (
    isRecord(value) &&
    (value.kind === "session-expired" ||
      value.kind === "access-denied" ||
      value.kind === "problem-details" ||
      value.kind === "network" ||
      value.kind === "cancelled")
  );
}

export async function readSession(): Promise<SessionState> {
  try {
    const response = await request("/auth/session", {
      credentials: "include",
    }, {
      retrySafeRead: true,
    });
    return parseSessionState(await response.json());
  } catch (error) {
    if (!isTransportFailure(error)) {
      throw error;
    }
    if (error.kind === "session-expired") {
      return { kind: "anonymous" };
    }
    if (error.kind === "access-denied") {
      return { kind: "denied", reason: "forbidden" };
    }
    throw error;
  }
}

export function signOut(): Promise<Response> {
  return request("/auth/logout", {
    method: "POST",
    headers: { "X-CSRF": "required" },
  });
}
