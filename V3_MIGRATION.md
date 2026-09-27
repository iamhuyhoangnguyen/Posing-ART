# V3.0.0 Gallery Migration

V3 groups every existing cloud photo under a category gallery key. Legacy `custom_poses` documents stay in MongoDB, and every remapped `cloud_photos` document keeps its old key in `legacyPoseKey` for rollback. No photo is truncated when a category already exceeds the new 100-image limit; additional uploads remain blocked until it is below the limit.

## Required production sequence

1. Before deploying the first V3 server, export the entire production MongoDB Atlas database, including every collection, to storage outside this repository. For example, create a compressed `mongodump` archive using the production URI and database name, and keep that archive until the V3 galleries have been checked.
2. Record the backup export identifier or storage reference. Set Render's `V3_GALLERY_BACKUP_REFERENCE` environment variable to that reference, then deploy V3. The server refuses to start the first production migration if this value is missing.
3. On startup, the migration maps built-in pose IDs and custom pose IDs to their parent category, copies cover image URLs into category gallery documents, and re-keys cloud photo records. It retains all old custom pose documents and does not delete any image data.
4. A photo with no known parent is assigned to the visible `Chưa phân loại` gallery in the best-supported section. Its original key is retained in `legacyPoseKey`, and the server logs the photo ID, original key, and fallback gallery. When no section evidence exists, it uses the Kỷ Yếu fallback. Other migration errors still stop startup.
5. Run `scripts/verify-v3-staging.ts` against the pre-migration backup and staging database. Verify photo counts and IDs, `legacyPoseKey`, gallery references, and fallback galleries; then open representative categories on web and Android. The migration marker makes successful runs one-time and repeatable after a partial write.

For a local database copy, set `V3_GALLERY_BACKUP_REFERENCE` to a non-empty local snapshot label. Production must use the actual completed Atlas export reference.

## Rollback data

Each migrated cloud photo retains `legacyPoseKey`; `custom_poses` remains untouched. Restore the Atlas export for a full rollback, or use each photo's `legacyPoseKey` to restore its original association before returning to V2.9.0. Do not remove `legacyPoseKey` or the old collection as part of the V3 release.
