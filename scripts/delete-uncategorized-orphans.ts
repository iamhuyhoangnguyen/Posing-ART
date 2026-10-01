import { MongoClient, type Document } from "mongodb";
import { EJSON } from "bson";

const PHOTO_IDS = [
  "cloud_photo_1790393489727_dwyr4l",
  "cloud_photo_1790541637532_q8209k",
  "cloud_photo_1790541687334_2vd6rp",
  "cloud_photo_1790541706654_u0fdsc",
] as const;

interface CloudPhotoDocument extends Document {
  _id: string;
  id: string;
}

function parseArguments() {
  const args = process.argv.slice(2);
  let confirm = false;
  let uri = process.env.MONGODB_URI;
  let databaseName = process.env.MONGODB_DB_NAME;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--confirm") {
      confirm = true;
      continue;
    }
    if (argument === "--uri" || argument === "--database") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Thiếu giá trị cho ${argument}.`);
      if (argument === "--uri") uri = value;
      else databaseName = value;
      index += 1;
      continue;
    }
    throw new Error(`Tham số không được hỗ trợ: ${argument}`);
  }

  if (!uri) throw new Error("Thiếu MONGODB_URI hoặc tham số --uri <connection-string>.");
  return { confirm, uri, databaseName };
}

async function main() {
  const { confirm, uri, databaseName } = parseArguments();
  const client = new MongoClient(uri, { appName: "Posing-ART-Delete-Uncategorized-Orphans" });

  try {
    await client.connect();
    const db = client.db(databaseName || undefined);
    const photos = db.collection<CloudPhotoDocument>("cloud_photos");
    const documents = await photos.find({ _id: { $in: [...PHOTO_IDS] }, id: { $in: [...PHOTO_IDS] } }).toArray();
    const foundIds = new Set(documents.map((document) => String(document.id)));
    const missingIds = PHOTO_IDS.filter((id) => !foundIds.has(id));

    console.log(`Database mục tiêu: ${db.databaseName}`);
    console.log(`Chế độ: ${confirm ? "XÓA CÓ XÁC NHẬN" : "DRY RUN — chỉ đọc, chưa xóa"}`);
    console.log(`Số document tìm thấy: ${documents.length}/${PHOTO_IDS.length}`);
    for (const document of documents) {
      console.log(`\n--- cloud_photos document ${document.id} ---`);
      console.log(EJSON.stringify(document, { relaxed: false }, 2));
    }
    if (missingIds.length > 0) {
      console.error(`Không tìm thấy đủ 4 document; dừng để tránh xóa một phần. ID thiếu: ${missingIds.join(", ")}`);
      throw new Error("Kiểm tra ID không đầy đủ; không có document nào bị xóa.");
    }

    if (!confirm) {
      console.log("Đã xóa: 0 document. Xem lại nội dung ở trên; chỉ thêm --confirm khi đã xác nhận đúng database và đúng 4 ảnh.");
      return;
    }

    const result = await photos.deleteMany({ _id: { $in: [...PHOTO_IDS] }, id: { $in: [...PHOTO_IDS] } });
    console.log(`Số document thực sự đã xóa: ${result.deletedCount}`);
    const remaining = await photos.countDocuments({ _id: { $in: [...PHOTO_IDS] }, id: { $in: [...PHOTO_IDS] } });
    console.log(`Số document trong 4 ID còn lại: ${remaining}`);
    if (result.deletedCount !== PHOTO_IDS.length || remaining !== 0) {
      throw new Error(`Kết quả không như mong đợi (đã xóa ${result.deletedCount}/4, còn lại ${remaining}).`);
    }
    console.log("Xóa đúng 4 document cloud_photos hoàn tất. Collection custom_poses không bị thay đổi.");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Xóa ảnh mồ côi thất bại:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
