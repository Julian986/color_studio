/**
 * Origen público (https + host) para enlaces absolutos (Open Graph, etc.).
 * Prioriza el host de la petición para que coincida con el enlace compartido (www vs apex, preview, etc.).
 */
export function resolvePublicSiteOrigin(headers: Pick<Headers, "get">): string {
  const xfHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const rawHost = xfHost || headers.get("host")?.split(",")[0]?.trim();

  if (rawHost && !rawHost.startsWith("localhost") && !rawHost.startsWith("127.0.0.1")) {
    const proto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${proto}://${rawHost}`;
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv) return fromEnv;

  return "http://localhost:3000";
}
