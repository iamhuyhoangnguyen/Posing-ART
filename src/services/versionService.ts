import { APP_VERSION, APP_NAME, VersionInfoResponse } from "../version";
import { getAppPlatform } from "./platformService";
import { serverUrl } from "./apiUrl";

/**
 * Version check and update service for POSING ART
 */
export async function fetchServerVersion(): Promise<VersionInfoResponse | null> {
  try {
    const platform = getAppPlatform();
    const res = await fetch(serverUrl(`/api/version?clientVersion=${APP_VERSION}&platform=${platform}`), {
      cache: "no-store",
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Could not check version from server (offline):", err);
  }
  return null;
}

export function compareSemver(v1: string, v2: string): number {
  const parts1 = v1.replace(/^v/, "").split(".").map(Number);
  const parts2 = v2.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export async function checkAppUpdate(): Promise<{
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadUrl?: string;
  androidDownloadUrl?: string;
  releaseNotes?: string[];
  platform: string;
  fileSize?: string;
}> {
  const platform = getAppPlatform();
  const serverVer = await fetchServerVersion();

  if (!serverVer) {
    return {
      updateAvailable: false,
      currentVersion: APP_VERSION,
      latestVersion: APP_VERSION,
      platform,
    };
  }

  const isNewer = compareSemver(serverVer.currentVersion, APP_VERSION) > 0;
  let downloadUrl = "";
  let fileSize = "";

  if (platform === "android") {
    downloadUrl = serverVer.android.downloadUrl ? serverUrl(serverVer.android.downloadUrl) : "";
    fileSize = serverVer.android.fileSize || "";
  }

  return {
    updateAvailable: isNewer && Boolean(downloadUrl),
    currentVersion: APP_VERSION,
    latestVersion: serverVer.currentVersion,
    downloadUrl,
    androidDownloadUrl: serverVer.android.downloadUrl ? serverUrl(serverVer.android.downloadUrl) : "",
    releaseNotes: serverVer.releaseNotes,
    platform,
    fileSize,
  };
}
