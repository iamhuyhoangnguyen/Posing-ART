import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";
import { EJSON } from "bson";

const COLLECTIONS = [
  "cloud_photos",
  "cloud_users",
  "user_records",
  "custom_poses",
  "custom_categories",
  "cloud_metadata",
] as const;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Thiếu MONGODB_URI trong environment.");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputDirectory = path.resolve("backups", timestamp);
  await mkdir(outputDirectory, { recursive: true });

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const database = client.db(process.env.MONGODB_DB_NAME || undefined);

    for (const collectionName of COLLECTIONS) {
      const documents = await database.collection(collectionName).find({}).toArray();
      const outputPath = path.join(outputDirectory, `${collectionName}.json`);
      const contents = EJSON.stringify(documents, { relaxed: false }, 2);
      await writeFile(outputPath, `${contents}\n`, "utf8");
      console.log(`${collectionName}: ${documents.length} documents -> ${outputPath}`);
    }

    console.log(`Backup hoàn tất: ${outputDirectory}`);
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Backup thất bại:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
