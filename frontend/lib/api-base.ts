const FALLBACK_PUBLIC_API_BASE = "/api/v1";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizeInternalOrigin(value: string): string {
  const trimmed = trimTrailingSlash(value);
  return trimmed.replace(/\/api\/v1$/i, "");
}

function toServerApiBase(publicBase: string): string {
  if (publicBase.startsWith("/")) {
    const internalOrigin = normalizeInternalOrigin(process.env.INTERNAL_API_ORIGIN || "http://127.0.0.1:8000");
    return `${internalOrigin}${publicBase}`;
  }
  return publicBase;
}

export function getApiBaseUrl(): string {
  const publicBase = trimTrailingSlash(process.env.NEXT_PUBLIC_API_BASE_URL || FALLBACK_PUBLIC_API_BASE);

  if (typeof window === "undefined") {
    const internalOrigin = normalizeInternalOrigin(process.env.INTERNAL_API_ORIGIN || "");
    if (internalOrigin) {
      return `${internalOrigin}/api/v1`;
    }
    return toServerApiBase(publicBase);
  }

  return publicBase;
}
