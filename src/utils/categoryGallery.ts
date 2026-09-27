import type { CategoryItem } from "../types";

export const CATEGORY_GALLERY_KEY_PREFIX = "category-gallery:v3:";
export const MAX_IMAGES_PER_CATEGORY = 100;
export const UNCATEGORIZED_CATEGORY_ID = "v3-uncategorized";
export const UNCATEGORIZED_CATEGORY_LABEL = "Chưa phân loại";

export function categoryGalleryKey(section: string, categoryId: string): string {
  return `${CATEGORY_GALLERY_KEY_PREFIX}${section}:${categoryId}`;
}

/** Maps legacy per-pose photo keys to the category's flat gallery key. */
export function createLegacyPoseKeyMap(
  sections: Array<{ section: string; categories: CategoryItem[] }>,
  customPoses: Array<{ section: string; categoryId: string; pose: { id?: string } }>,
): Map<string, string> {
  const result = new Map<string, string>();
  for (const { section, categories } of sections) {
    categories.forEach((category, categoryIndex) => {
      const galleryKey = categoryGalleryKey(section, category.id);
      category.poses.forEach((pose, poseIndex) => {
        result.set(pose.id || `${section}-${categoryIndex}-${poseIndex}`, galleryKey);
      });
    });
  }
  for (const item of customPoses) {
    if (item?.section && item?.categoryId && item?.pose?.id) {
      result.set(item.pose.id, categoryGalleryKey(item.section, item.categoryId));
    }
  }
  return result;
}

export function remapLegacyGalleryPhotos<T extends { poseKey: string; legacyPoseKey?: string }>(
  photos: T[],
  keyMap: Map<string, string>,
  fallbackGalleryKey?: (photo: T) => string,
  validGalleryKeys?: Set<string>,
): {
  photos: Array<T & { legacyPoseKey?: string }>;
  remappedCount: number;
  unmappedCount: number;
  fallbackCount: number;
  fallbackPhotos: Array<{ id: string; legacyPoseKey: string; fallbackGalleryKey: string }>;
} {
  let remappedCount = 0;
  let unmappedCount = 0;
  const fallbackPhotos: Array<{ id: string; legacyPoseKey: string; fallbackGalleryKey: string }> = [];
  const result: Array<T & { legacyPoseKey?: string }> = photos.map((photo) => {
    if (photo.poseKey.startsWith(CATEGORY_GALLERY_KEY_PREFIX) && (!validGalleryKeys || validGalleryKeys.has(photo.poseKey))) return photo;
    const galleryKey = keyMap.get(photo.poseKey);
    if (!galleryKey) {
      unmappedCount++;
      if (fallbackGalleryKey) {
        const targetGalleryKey = fallbackGalleryKey(photo);
        fallbackPhotos.push({
          id: String((photo as T & { id?: string }).id || "unknown-id"),
          legacyPoseKey: photo.poseKey,
          fallbackGalleryKey: targetGalleryKey,
        });
        return { ...photo, legacyPoseKey: photo.legacyPoseKey || photo.poseKey, poseKey: targetGalleryKey };
      }
      return photo;
    }
    if (galleryKey === photo.poseKey) return photo;
    remappedCount++;
    return { ...photo, legacyPoseKey: photo.legacyPoseKey || photo.poseKey, poseKey: galleryKey };
  });
  return { photos: result, remappedCount, unmappedCount, fallbackCount: fallbackPhotos.length, fallbackPhotos };
}

export function appendGalleryPhotoReferences<TImage extends { id: string; photoId?: string }>(
  images: TImage[],
  photos: Array<{ id: string; poseKey: string }>,
  galleryKey: string,
): Array<TImage | { id: string; photoId: string }> {
  const result: Array<TImage | { id: string; photoId: string }> = [...images];
  for (const photo of photos) {
    if (photo.poseKey !== galleryKey || result.some((image) => image.photoId === photo.id)) continue;
    result.push({ id: `upload:${photo.id}`, photoId: photo.id });
  }
  return result;
}
