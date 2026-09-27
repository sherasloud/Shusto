export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 1. Explicit dynamic override via env (useful for multi-hosting layouts)
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl && envApiUrl !== "MY_API_URL" && envApiUrl !== "") {
    const base = envApiUrl.endsWith("/") ? envApiUrl.slice(0, -1) : envApiUrl;
    return `${base}${cleanPath}`;
  }

  // 2. Browser Environment: Same-origin relative paths (essential for live domain, preview & local dev)
  if (typeof window !== "undefined" && window.location && window.location.protocol.startsWith("http")) {
    // In any web browser, we use same-origin relative routing.
    // This guarantees that:
    // - Localhost uses local API endpoints (e.g. localhost:3000/api/...)
    // - Live domain (shusto.com) uses shusto.com API endpoints
    // - Preview domains (ais-pre-...run.app) use their respective preview API endpoints
    return cleanPath;
  }

  // 3. Native App Environment (Capacitor/Cordova running on capacitor:// or file://)
  // Point native apps dynamically to the live production server (shusto.com) or fallback preview
  const productionHost = "https://shusto.com";
  return `${productionHost}${cleanPath}`;
}
