export function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.());
  const isCapacitorProto = window.location.protocol === "capacitor:" || window.location.protocol === "file:";
  const isAndroidCapacitorHttp = 
    (window.location.protocol === "http:" || window.location.protocol === "https:") &&
    window.location.hostname === "localhost" &&
    !window.location.port &&
    typeof (window as any).Capacitor !== "undefined";
  return isCapacitorNative || isCapacitorProto || isAndroidCapacitorHttp;
}

export function getApiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  // 1. Explicit dynamic override via env (useful for multi-hosting layouts)
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl && envApiUrl !== "MY_API_URL" && envApiUrl !== "") {
    const base = envApiUrl.endsWith("/") ? envApiUrl.slice(0, -1) : envApiUrl;
    return `${base}${cleanPath}`;
  }

  // 2. Native App Environment (Capacitor/Cordova running on device)
  if (isNativePlatform()) {
    const productionHost = "https://shusto.com";
    return `${productionHost}${cleanPath}`;
  }

  // 3. Browser Environment: Same-origin relative paths (essential for live domain, preview & local dev)
  return cleanPath;
}

