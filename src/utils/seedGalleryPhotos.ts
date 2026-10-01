import type { CategoryGalleryImage, CategoryItem } from "../types";
import { INITIAL_DATA_CANHAN, INITIAL_DATA_KYYEU } from "../data/posesData";

const seedPoseIds = new Set(
  [...INITIAL_DATA_KYYEU, ...INITIAL_DATA_CANHAN].flatMap((category) => category.poses.map((pose) => pose.id)),
);
const seedPhotoIds = new Set([
  "1488426862026", "1494790108377", "1502823403499", "1506744038136", "1508214751196",
  "1509062522246", "1515934751635", "1516035069371", "1516726817505", "1517486808906",
  "1517841905240", "1523050854058", "1523240795612", "1524504388940", "1529156069898",
  "1529626455594", "1531746020798", "1534528741775", "1537151608828", "1627556704290",
]);

export function isSeedPhotoUrl(imageUrl: string | undefined): boolean {
  if (!imageUrl) return false;
  try {
    const photoId = new URL(imageUrl).pathname.match(/photo-(\d{13})/)?.[1];
    return Boolean(photoId && seedPhotoIds.has(photoId));
  } catch {
    return false;
  }
}

function isSeedGalleryPhoto(image: CategoryGalleryImage): boolean {
  if (!image || typeof image !== "object") return false;
  const imageId = typeof image.id === "string" ? image.id : "";
  const sourcePoseId = image.sourcePoseId || (imageId.startsWith("legacy:") ? imageId.slice("legacy:".length) : "");
  return Boolean((sourcePoseId && seedPoseIds.has(sourcePoseId)) || isSeedPhotoUrl(image.imageUrl));
}

export function withoutSeedGalleryPhotos(images: CategoryGalleryImage[] | undefined): CategoryGalleryImage[] {
  return (images || []).filter((image) => !isSeedGalleryPhoto(image));
}

export function withoutSeedCategoryCover<T extends { coverImage?: string }>(category: T): T {
  return isSeedPhotoUrl(category.coverImage) ? { ...category, coverImage: undefined } : category;
}

export function stripSeedGalleryPhotosFromCloudCategories(categories: unknown[]): { categories: unknown[]; removedCount: number } {
  let removedCount = 0;
  const cleaned = categories.map((value) => {
    if (!value || typeof value !== "object") return value;
    const category = value as { kind?: unknown; images?: unknown };
    if (category.kind !== "categoryGallery" || !Array.isArray(category.images)) return value;
    const images = category.images as CategoryGalleryImage[];
    const filtered = withoutSeedGalleryPhotos(images);
    removedCount += images.length - filtered.length;
    return { ...category, images: filtered };
  });
  return { categories: cleaned, removedCount };
}
