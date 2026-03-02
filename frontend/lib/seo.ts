const DEFAULT_SITE_URL = "http://localhost:3000"

function normalizeSiteUrl(value: string) {
  const withProtocol = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`
  return withProtocol.replace(/\/+$/, "")
}

export function getSiteUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VERCEL_URL || DEFAULT_SITE_URL
  return normalizeSiteUrl(fromEnv)
}

export function absoluteUrl(pathname: string) {
  const base = getSiteUrl()
  if (!pathname.startsWith("/")) {
    return `${base}/${pathname}`
  }
  return `${base}${pathname}`
}

export function humanizeSlug(slug: string) {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
