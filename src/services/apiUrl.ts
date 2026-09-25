const configuredBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? "https://posing-art.onrender.com" : "")
).trim().replace(/\/+$/, "");

/** Build a server URL while keeping ordinary web builds same-origin by default. */
export function serverUrl(path: string): string {
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return configuredBaseUrl ? `${configuredBaseUrl}${normalizedPath}` : normalizedPath;
}
