/** Normalized API base URL or undefined when unset. */
export function apiBaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
}

/** True when dashboard should use fixtures / skip authenticated HTTP (no URL or explicit mock flags). */
export function isMockApiRuntime(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_MOCK_API === "true" ||
    process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
    !apiBaseUrl()
  );
}
