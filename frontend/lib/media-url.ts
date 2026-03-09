const LOCAL_MEDIA_HOSTS = new Set(["localhost", "127.0.0.1"]);

function isCodespacesBackendHost(hostname: string): boolean {
  return hostname.endsWith(".app.github.dev") && hostname.includes("-8000.");
}

export function normalizeMediaUrl(rawUrl: string): string {
  const value = (rawUrl || "").trim();
  if (!value) {
    return "";
  }
  if (value.startsWith("/media/")) {
    return value;
  }

  try {
    const parsed = new URL(value);
    if (!parsed.pathname.startsWith("/media/")) {
      return value;
    }
    if (LOCAL_MEDIA_HOSTS.has(parsed.hostname) || isCodespacesBackendHost(parsed.hostname)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return value;
  } catch {
    return value;
  }
}
