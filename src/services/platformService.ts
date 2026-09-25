import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";

/**
 * Platform Detection and Native Bridge Abstraction
 * Handles platform differences transparently for Web, Windows (.exe / Tauri), and Android (.apk / Capacitor)
 */

export type AppPlatform = "web" | "windows" | "android";

export interface PlatformCapabilities {
  platform: AppPlatform;
  isTauri: boolean;
  isCapacitor: boolean;
  isPWA: boolean;
  isMobileDevice: boolean;
  hasNativeCamera: boolean;
  canInstallPwa: boolean;
}

/**
 * Detect current execution platform
 */
export function getAppPlatform(): AppPlatform {
  if (typeof window === "undefined") return "web";

  // Check Tauri Windows Desktop
  if (
    "__TAURI__" in window ||
    "__TAURI_METADATA__" in window ||
    (window as any).__TAURI_INTERNALS__
  ) {
    return "windows";
  }

  // Check Capacitor Android
  if (Capacitor.getPlatform() === "android") return "android";

  // Installed PWAs remain web apps; only native Capacitor/Tauri shells receive
  // platform-specific installer/update behavior.
  return "web";
}

export function isWindowsApp(): boolean {
  return getAppPlatform() === "windows";
}

export function isAndroidApp(): boolean {
  return getAppPlatform() === "android";
}

export function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    navigator.userAgent || ""
  );
}

export function getPlatformInfo(): PlatformCapabilities {
  const platform = getAppPlatform();
  return {
    platform,
    isTauri: platform === "windows",
    isCapacitor: platform === "android",
    isPWA: isPWA(),
    isMobileDevice: isMobileDevice(),
    hasNativeCamera: Capacitor.isNativePlatform() || ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices),
    canInstallPwa: !isPWA() && platform === "web",
  };
}

/**
 * Pick image file from camera or photo gallery
 * Works uniformly across Web, Tauri, and Android Capacitor
 */
export async function pickImageFile(source: "camera" | "gallery" = "gallery"): Promise<File | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const result = source === "camera"
        ? await Camera.takePhoto({ quality: 90 })
        : (await Camera.chooseFromGallery({ quality: 90 })).results[0];
      if (!result?.webPath) return null;

      const response = await fetch(result.webPath);
      if (!response.ok) throw new Error("Không thể đọc ảnh đã chọn.");
      const blob = await response.blob();
      const mimeType = blob.type || "image/jpeg";
      const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
      return new File([blob], `posing-${Date.now()}.${extension}`, { type: mimeType });
    } catch (error) {
      console.warn("Native image selection was cancelled or unavailable:", error);
      return null;
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    if (source === "camera" && isMobileDevice()) {
      input.capture = "environment";
    }

    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        resolve(file);
      } else {
        resolve(null);
      }
    };
    input.oncancel = () => resolve(null);

    input.click();
  });
}

/**
 * Save image file to local device (Download on Web/Tauri, or share/save on Mobile)
 */
export async function saveImageToDevice(dataUrlOrBlob: string | Blob, fileName: string): Promise<boolean> {
  try {
    let url: string;
    let revokeNeeded = false;

    if (typeof dataUrlOrBlob === "string") {
      url = dataUrlOrBlob;
    } else {
      url = URL.createObjectURL(dataUrlOrBlob);
      revokeNeeded = true;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (revokeNeeded) {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    return true;
  } catch (err) {
    console.error("Failed to save image to device:", err);
    return false;
  }
}
