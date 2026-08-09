export type AuthorizationState =
  | "anonymous"
  | "authenticated"
  | "denied"
  | "expired";

export function canAccess(
  permissions: readonly string[],
  requiredPermission: string,
): boolean {
  return permissions.includes(requiredPermission);
}
