import { readFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient, type Document } from "mongodb";
import { EJSON } from "bson";
import { INITIAL_DATA_CANHAN, INITIAL_DATA_KYYEU } from "../src/data/posesData";
import { CATEGORY_GALLERY_KEY_PREFIX, categoryGalleryKey, createLegacyPoseKeyMap, UNCATEGORIZED_CATEGORY_ID } from "../src/utils/categoryGallery";

const COLLECTIONS = ["cloud_photos", "cloud_users", "user_records", "custom_poses", "custom_categories", "cloud_metadata"] as const;

function argumentsFromCli() {
  const options = new Map<string, string>();
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--")) throw new Error(`Tham số không hợp lệ hoặc thiếu giá trị: ${key}`);
    options.set(key, value);
  }
  return {
    backupDir: options.get("--backup-dir") || process.env.BACKUP_DIR,
    uri: options.get("--uri") || process.env.MONGODB_STAGING_URI || process.env.MONGODB_URI,
    databaseName: options.get("--database") || process.env.MONGODB_STAGING_DB_NAME || "posing_art_staging",
  };
}

async function readBackup(directory: string, name: string): Promise<Document[]> {
  const file = path.join(directory, `${name}.json`);
  const parsed: unknown = EJSON.parse(await readFile(file, "utf8"), { relaxed: false });
  if (!Array.isArray(parsed)) throw new Error(`${file} không chứa JSON array.`);
  return parsed as Document[];
}

const idOf = (document: Document) => String(document.id ?? document._id);

async function main() {
  const { backupDir, uri, databaseName } = argumentsFromCli();
  if (!backupDir) throw new Error("Cần --backup-dir <backup-trước-migration> hoặc BACKUP_DIR.");
  if (!uri) throw new Error("Cần --uri <staging-uri>, MONGODB_STAGING_URI hoặc MONGODB_URI trỏ tới staging.");
  const backup = new Map<string, Document[]>();
  for (const collection of COLLECTIONS) backup.set(collection, await readBackup(path.resolve(backupDir), collection));

  const client = new MongoClient(uri, { appName: "Posing-ART-V3-Staging-Verification" });
  let failures = 0;
  const check = (label: string, pass: boolean, detail: string) => {
    console.log(`${pass ? "PASS" : "FAIL"} ${label}: ${detail}`);
    if (!pass) failures += 1;
  };
  try {
    await client.connect();
    const db = client.db(databaseName);
    const staging = new Map<string, Document[]>();
    for (const collection of COLLECTIONS) staging.set(collection, await db.collection(collection).find({}).toArray());
    console.log(`Đang kiểm tra database ${db.databaseName} (chỉ đọc).`);
    for (const name of COLLECTIONS) {
      if (name === "custom_categories") continue;
      check(`Số document ${name}`, backup.get(name)!.length === staging.get(name)!.length,
        `backup=${backup.get(name)!.length}, staging=${staging.get(name)!.length}`);
    }
    const oldCategoryIds = new Set(backup.get("custom_categories")!.map(idOf));
    const stageCategoryIds = new Set(staging.get("custom_categories")!.map(idOf));
    check("custom_categories cũ được giữ", [...oldCategoryIds].every((id) => stageCategoryIds.has(id)),
      `backup=${oldCategoryIds.size}, staging=${stageCategoryIds.size}, gallery mới=${stageCategoryIds.size - oldCategoryIds.size}, thiếu=${[...oldCategoryIds].filter((id) => !stageCategoryIds.has(id)).length}`);

    const sourcePhotos = backup.get("cloud_photos")!;
    const stagedPhotos = staging.get("cloud_photos")!;
    const stagedById = new Map(stagedPhotos.map((photo) => [idOf(photo), photo]));
    const sourceIds = new Set(sourcePhotos.map(idOf));
    const stageIds = new Set(stagedById.keys());
    check("Bảo toàn ID ảnh", [...sourceIds].every((id) => stageIds.has(id)) && [...stageIds].every((id) => sourceIds.has(id)),
      `backup=${sourceIds.size}, staging=${stageIds.size}, thiếu=${[...sourceIds].filter((id) => !stageIds.has(id)).length}, dư=${[...stageIds].filter((id) => !sourceIds.has(id)).length}`);

    const sourcePoses = backup.get("custom_poses")!;
    const sourcePoseIds = new Set(sourcePoses.map(idOf));
    const stagedPoseIds = new Set(staging.get("custom_poses")!.map(idOf));
    check("Dữ liệu custom_poses giữ nguyên", sourcePoseIds.size === stagedPoseIds.size && [...sourcePoseIds].every((id) => stagedPoseIds.has(id)),
      `backup=${sourcePoseIds.size}, staging=${stagedPoseIds.size}, thiếu=${[...sourcePoseIds].filter((id) => !stagedPoseIds.has(id)).length}`);
    const keyMap = createLegacyPoseKeyMap([
      { section: "kyyeu", categories: INITIAL_DATA_KYYEU },
      { section: "canhan", categories: INITIAL_DATA_CANHAN },
    ], sourcePoses as Array<{ section: string; categoryId: string; pose: { id?: string } }>);
    const knownCategories = new Map([
      ["kyyeu", new Set(INITIAL_DATA_KYYEU.map((category) => category.id))],
      ["canhan", new Set(INITIAL_DATA_CANHAN.map((category) => category.id))],
    ]);
    const orphanPoses = sourcePoses.filter((entry) => !knownCategories.get(String(entry.section))?.has(String(entry.categoryId)));
    console.log(`INFO Dáng cũ thiếu danh mục nguồn (được giữ nguyên): ${orphanPoses.length ? orphanPoses.map((entry) => `${entry.section}/${entry.categoryId}/${(entry.pose as Document)?.id || "?"}`).join(", ") : "0"}`);

    const keyErrors: string[] = [];
    const fallbackErrors: string[] = [];
    const fallbackPhotoIds: string[] = [];
    const metadata = backup.get("cloud_metadata")!.find((document) => document._id === "primary");
    const deletedCategories = Array.isArray(metadata?.deletedCategories) ? metadata.deletedCategories as Array<{ section?: string; poseKeys?: string[] }> : [];
    const fallbackSectionFor = (photo: Document) => {
      const matchingPoseCover = backup.get("user_records")!.find((record) =>
        record.type === "setting" && record.data?.kind === "pose" && record.data.targetId === photo.poseKey
      );
      const deletedParent = deletedCategories.find((category) => category.poseKeys?.includes(String(photo.poseKey)));
      const oldKey = String(photo.poseKey || "");
      const keySection = oldKey.startsWith("canhan-") ? "canhan" : oldKey.startsWith("kyyeu-") ? "kyyeu" : undefined;
      return matchingPoseCover?.data?.sectionKey === "canhan" || matchingPoseCover?.data?.sectionKey === "kyyeu"
        ? matchingPoseCover.data.sectionKey
        : deletedParent?.section || keySection || "kyyeu";
    };
    const expectedGalleryByPhotoId = new Map<string, string>();
    for (const original of sourcePhotos) {
      const photo = stagedById.get(idOf(original));
      if (!photo) continue;
      const oldKey = String(original.poseKey || "");
      const mappedKey = keyMap.get(oldKey);
      const isUnknownLegacyKey = !mappedKey && !oldKey.startsWith(CATEGORY_GALLERY_KEY_PREFIX);
      const expectedKey = isUnknownLegacyKey
        ? categoryGalleryKey(fallbackSectionFor(original), UNCATEGORIZED_CATEGORY_ID)
        : mappedKey || oldKey;
      const expectedLegacyKey = isUnknownLegacyKey || (mappedKey && mappedKey !== oldKey)
        ? oldKey
        : original.legacyPoseKey;
      if (isUnknownLegacyKey) fallbackPhotoIds.push(idOf(original));
      expectedGalleryByPhotoId.set(idOf(original), expectedKey);
      if (photo.poseKey !== expectedKey || photo.legacyPoseKey !== expectedLegacyKey) {
        const detail = `${idOf(original)} expected=${expectedKey}/${expectedLegacyKey || "-"} actual=${photo.poseKey}/${photo.legacyPoseKey || "-"}`;
        keyErrors.push(detail);
        if (isUnknownLegacyKey) fallbackErrors.push(detail);
      }
    }
    check("Ảnh không xác định được cha được đưa vào fallback", fallbackErrors.length === 0,
      `fallback=${fallbackPhotoIds.length}${fallbackPhotoIds.length ? ` (${fallbackPhotoIds.join(", ")})` : ""}${fallbackErrors.length ? `; lỗi=${fallbackErrors.join("; ")}` : ""}`);
    check("poseKey và legacyPoseKey", keyErrors.length === 0, keyErrors.length ? keyErrors.join("; ") : "tất cả ảnh khớp mapping");

    const expectedCoverIds = new Map<string, Set<string>>();
    const addCovers = (section: string, categoryId: string, poses: Array<{ id?: string; coverImage?: string }>) => {
      const key = categoryGalleryKey(section, categoryId);
      const ids = expectedCoverIds.get(key) || new Set<string>();
      for (const pose of poses) if (pose.coverImage) ids.add(`legacy:${pose.id || ids.size}`);
      expectedCoverIds.set(key, ids);
    };
    for (const [section, categories] of [["kyyeu", INITIAL_DATA_KYYEU], ["canhan", INITIAL_DATA_CANHAN]] as const) {
      for (const category of categories) addCovers(section, category.id, category.poses);
    }
    for (const entry of sourcePoses) addCovers(String(entry.section), String(entry.categoryId), [entry.pose as { id?: string; coverImage?: string }]);

    const galleries = staging.get("custom_categories")!
      .map((document) => (document.data && typeof document.data === "object" ? document.data : document))
      .filter((data) => data.kind === "categoryGallery");
    const galleryMap = new Map(galleries.map((gallery) => [String(gallery.galleryKey), gallery]));
    const fallbackGalleryKeys = ["kyyeu", "canhan"].map((section) => categoryGalleryKey(section, UNCATEGORIZED_CATEGORY_ID));
    check("Danh mục Chưa phân loại hiển thị ở cả hai khu vực", fallbackGalleryKeys.every((key) => galleryMap.has(key)),
      fallbackGalleryKeys.map((key) => `${key}=${galleryMap.has(key) ? "có" : "thiếu"}`).join(", "));
    const missingCovers: string[] = [];
    let expectedCoverCount = 0;
    let actualCoverCount = 0;
    for (const [key, ids] of expectedCoverIds) {
      expectedCoverCount += ids.size;
      const gallery = galleryMap.get(key);
      const images = Array.isArray(gallery?.images) ? gallery.images as Document[] : [];
      actualCoverCount += images.filter((image) => !image.photoId).length;
      const imageIds = new Set(images.filter((image) => !image.photoId).map((image) => String(image.id)));
      for (const id of ids) if (!imageIds.has(id)) missingCovers.push(`${key}/${id}`);
    }
    check("Số ảnh cover trong gallery", missingCovers.length === 0 && expectedCoverCount === actualCoverCount,
      `trước=${expectedCoverCount}, sau=${actualCoverCount}${missingCovers.length ? `; thiếu: ${missingCovers.join(", ")}` : ""}`);

    const photoReferences = galleries.flatMap((gallery) => Array.isArray(gallery.images)
      ? (gallery.images as Document[]).filter((image) => image.photoId).map((image) => ({ id: String(image.photoId), galleryKey: String(gallery.galleryKey) })) : []);
    const expectedPhotoIds = new Set(stagedPhotos.map(idOf));
    const referencedPhotoIds = new Set(photoReferences.map((reference) => reference.id));
    const duplicateReferences = photoReferences.filter((reference, index) => photoReferences.findIndex((item) => item.id === reference.id) !== index);
    const wrongGalleryReferences = photoReferences.filter((reference) => expectedGalleryByPhotoId.get(reference.id) !== reference.galleryKey);
    check("Ảnh cloud được tham chiếu đúng gallery", [...expectedPhotoIds].every((id) => referencedPhotoIds.has(id)) && duplicateReferences.length === 0 && wrongGalleryReferences.length === 0,
      `ảnh=${expectedPhotoIds.size}, thiếu=${[...expectedPhotoIds].filter((id) => !referencedPhotoIds.has(id)).length}, tham chiếu trùng=${duplicateReferences.length}, sai gallery=${wrongGalleryReferences.length}`);

    const primary = staging.get("cloud_metadata")!.find((document) => document._id === "primary");
    check("Migration marker", primary?.galleryV300MigrationComplete === true,
      `galleryV300MigrationComplete=${String(primary?.galleryV300MigrationComplete)}`);
    console.log(failures === 0 ? "KẾT QUẢ: staging vượt qua toàn bộ kiểm tra." : `KẾT QUẢ: ${failures} kiểm tra thất bại; chưa nên deploy production.`);
    if (failures) process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Kiểm tra staging thất bại:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
