import { readFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient, type Document } from "mongodb";
import { EJSON } from "bson";

const COLLECTIONS = [
  "cloud_photos",
  "cloud_users",
  "user_records",
  "custom_poses",
  "custom_categories",
  "cloud_metadata",
] as const;

function readArguments() {
  const args = process.argv.slice(2);
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!key.startsWith("--")) {
      throw new Error(`Tham số không hợp lệ: ${key}`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Thiếu giá trị cho ${key}`);
    }
    options.set(key, value);
    index += 1;
  }

  return {
    backupDirectory: options.get("--backup-dir") || process.env.BACKUP_DIR,
    uri: options.get("--uri") || process.env.MONGODB_STAGING_URI,
    databaseName: options.get("--database") || process.env.MONGODB_STAGING_DB_NAME,
  };
}

async function main() {
  const { backupDirectory, uri, databaseName } = readArguments();
  if (!backupDirectory) {
    throw new Error("Cần --backup-dir <đường-dẫn> hoặc biến BACKUP_DIR.");
  }
  if (!uri) {
    throw new Error("Cần --uri <staging-uri> hoặc biến MONGODB_STAGING_URI.");
  }

  const resolvedBackupDirectory = path.resolve(backupDirectory);
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const database = client.db(databaseName || undefined);

    for (const collectionName of COLLECTIONS) {
      const inputPath = path.join(resolvedBackupDirectory, `${collectionName}.json`);
      const contents = await readFile(inputPath, "utf8");
      const documents = EJSON.parse(contents, { relaxed: false }) as Document[];
      if (!Array.isArray(documents)) {
        throw new Error(`${inputPath} không chứa một JSON array.`);
      }
      if (documents.length === 0) {
        console.log(`${collectionName}: 0 documents (bỏ qua)`);
        continue;
      }

      const collection = database.collection(collectionName);
      const existingCount = await collection.countDocuments();
      if (existingCount > 0) {
        throw new Error(
          `Collection ${collectionName} tại database đích đã có ${existingCount} documents; restore dừng để tránh ghi chồng dữ liệu.`,
        );
      }

      const result = await collection.insertMany(documents, { ordered: true });
      console.log(`${collectionName}: ${result.insertedCount} documents đã restore`);
    }

    console.log(`Restore hoàn tất vào database ${database.databaseName}.`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Restore thất bại:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
