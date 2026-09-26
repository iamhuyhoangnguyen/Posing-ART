import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType } from "@capacitor/camera";

export type AppPlatform = "web" | "android";

export interface PlatformCapabilities {
  platform: AppPlatform;
  isCapacitor: boolean;
  isPWA: boolean;
  isMobileDevice: boolean;
  hasNativeCamera: boolean;
  canInstallPwa: boolean;
}

export function getAppPlatform(): AppPlatform {
  return Capacitor.getPlatform() === "android" ? "android" : "web";
}

export function isAndroidApp(): boolean {
  return Capacitor.getPlatform() === "android";
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
    navigator.userAgent || "",
  );
}

export function getPlatformInfo(): PlatformCapabilities {
  const platform = getAppPlatform();
  return {
    platform,
    isCapacitor: Capacitor.isNativePlatform(),
    isPWA: isPWA(),
    isMobileDevice: isMobileDevice(),
    hasNativeCamera:
      Capacitor.isNativePlatform() ||
      ("mediaDevices" in navigator && "getUserMedia" in navigator.mediaDevices),
    canInstallPwa: !isPWA() && platform === "web",
  };
}

/** Pick one camera image or multiple gallery images through the platform picker. */
export async function pickImageFiles(
  source: "camera" | "gallery" = "gallery",
): Promise<File[]> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photos = source === "camera"
        ? [await Camera.getPhoto({ quality: 90, resultType: CameraResultType.Uri })]
        : (await Camera.pickImages({ quality: 90, limit: 0 })).photos;

      return await Promise.all(
        photos.map(async (photo, index) => {
          if (!photo.webPath) throw new Error("Không thể đọc ảnh đã chọn.");
          const response = await fetch(photo.webPath);
          if (!response.ok) throw new Error("Không thể đọc ảnh đã chọn.");
          const blob = await response.blob();
          const mimeType = blob.type || "image/jpeg";
          const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
          return new File([blob], `posing-${Date.now()}-${index + 1}.${extension}`, {
            type: mimeType,
          });
        }),
      );
    } catch (error) {
      console.warn("Native image selection was cancelled or unavailable:", error);
      return [];
    }
  }

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = source !== "camera";
    if (source === "camera" && isMobileDevice()) input.capture = "environment";

    const cleanup = () => input.remove();
    input.onchange = () => {
      resolve(Array.from(input.files || []));
      cleanup();
    };
    input.oncancel = () => {
      resolve([]);
      cleanup();
    };
    input.click();
  });
}

/** Save an image to the browser/device download location. */
export async function saveImageToDevice(
  dataUrlOrBlob: string | Blob,
  fileName: string,
): Promise<boolean> {
  try {
    const objectUrl = typeof dataUrlOrBlob === "string"
      ? dataUrlOrBlob
      : URL.createObjectURL(dataUrlOrBlob);
    const shouldRevoke = typeof dataUrlOrBlob !== "string";
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    if (shouldRevoke) setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    return true;
  } catch (error) {
    console.error("Failed to save image to device:", error);
    return false;
  }
}

export async function shareImageToDevice(blob: Blob, fileName: string): Promise<boolean> {
  try {
    const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
    if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
      await navigator.share({ files: [file], title: fileName });
      return true;
    }
    return saveImageToDevice(blob, fileName);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return false;
    console.error("Failed to share image:", error);
    return false;
  }
}
