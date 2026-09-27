import assert from "node:assert/strict";
import test from "node:test";
import type { CategoryItem } from "../src/types";
import { appendGalleryPhotoReferences, categoryGalleryKey, createLegacyPoseKeyMap, remapLegacyGalleryPhotos } from "../src/utils/categoryGallery.ts";

test("V3 migration keeps every cloud photo and records its previous pose key", () => {
  const categories: CategoryItem[] = [{
    id: "topic-a",
    label: "Topic A",
    poses: [{ id: "pose-a", title: "Legacy A", desc: "" }],
  }];
  const mapping = createLegacyPoseKeyMap([{ section: "kyyeu", categories }], [
    { section: "canhan", categoryId: "topic-b", pose: { id: "custom-b" } },
  ]);
  const before = [
    { id: "photo-1", poseKey: "pose-a", dataUrl: "data:image/png;base64,one" },
    { id: "photo-2", poseKey: "custom-b", dataUrl: "data:image/png;base64,two" },
    { id: "photo-3", poseKey: "unknown-old-key", dataUrl: "data:image/png;base64,three" },
  ];

  const migrated = remapLegacyGalleryPhotos(before, mapping);

  assert.equal(migrated.photos.length, before.length);
  assert.equal(migrated.remappedCount, 2);
  assert.equal(migrated.unmappedCount, 1);
  assert.equal(migrated.photos[0].poseKey, categoryGalleryKey("kyyeu", "topic-a"));
  assert.equal(migrated.photos[0].legacyPoseKey, "pose-a");
  assert.equal(migrated.photos[1].poseKey, categoryGalleryKey("canhan", "topic-b"));
  assert.equal(migrated.photos[2].poseKey, "unknown-old-key");
  assert.deepEqual(migrated.photos.map((photo) => photo.dataUrl), before.map((photo) => photo.dataUrl));

  const replay = remapLegacyGalleryPhotos(migrated.photos, mapping);
  assert.equal(replay.photos.length, before.length);
  assert.equal(replay.remappedCount, 0);
});

test("gallery migration preserves image counts above the new upload limit", () => {
  const photos = Array.from({ length: 125 }, (_, index) => ({ id: `photo-${index}`, poseKey: "pose-a" }));
  const mapping = new Map([["pose-a", categoryGalleryKey("kyyeu", "topic-a")]]);
  const migrated = remapLegacyGalleryPhotos(photos, mapping);
  assert.equal(migrated.photos.length, 125);
  assert.equal(migrated.remappedCount, 125);
});

test("migration can resume after photos were re-keyed but before its marker was written", () => {
  const mapping = new Map([["pose-a", categoryGalleryKey("kyyeu", "topic-a")]]);
  const partiallyMigrated = [
    { id: "photo-1", poseKey: categoryGalleryKey("kyyeu", "topic-a"), legacyPoseKey: "pose-a" },
    { id: "photo-2", poseKey: "pose-a" },
  ];
  const resumed = remapLegacyGalleryPhotos(partiallyMigrated, mapping);
  assert.equal(resumed.photos.length, 2);
  assert.equal(resumed.remappedCount, 1);
  assert.equal(resumed.unmappedCount, 0);
  assert.deepEqual(resumed.photos.map((photo) => photo.poseKey), [categoryGalleryKey("kyyeu", "topic-a"), categoryGalleryKey("kyyeu", "topic-a")]);
});

test("category gallery image arrays retain static images and reference every cloud upload once", () => {
  const galleryKey = categoryGalleryKey("kyyeu", "topic-a");
  const staticImages = [{ id: "legacy:pose-a", imageUrl: "https://images.example/pose-a.jpg" }];
  const cloudPhotos = [
    { id: "cloud-1", poseKey: galleryKey },
    { id: "cloud-2", poseKey: galleryKey },
    { id: "other-topic", poseKey: categoryGalleryKey("kyyeu", "topic-b") },
  ];
  const indexed = appendGalleryPhotoReferences(staticImages, cloudPhotos, galleryKey);
  const replay = appendGalleryPhotoReferences(indexed, cloudPhotos, galleryKey);
  assert.equal(indexed.length, 3);
  assert.equal(replay.length, 3);
  assert.deepEqual(replay.filter((image) => "photoId" in image).map((image) => image.photoId), ["cloud-1", "cloud-2"]);
});
