import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { assertNativeApiUrl } from "./native-build-config.mjs";

assertNativeApiUrl();

const windows = process.platform === "win32";
const gradleWrapperName = windows ? "gradlew.bat" : "gradlew";
const gradleWrapper = join("android", gradleWrapperName);

if (!existsSync(gradleWrapper)) {
  console.error("Chưa có dự án Android. Chạy `npm run android:init` một lần trước khi build.");
  process.exit(1);
}

const appVersionSource = await readFile("src/version.ts", "utf8");
const version = appVersionSource.match(/APP_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
const buildNumber = Number(appVersionSource.match(/APP_BUILD_NUMBER\s*=\s*(\d+)/)?.[1]);
if (!version || !Number.isSafeInteger(buildNumber) || buildNumber < 1) {
  throw new Error("Không đọc được APP_VERSION hoặc APP_BUILD_NUMBER từ src/version.ts.");
}

const androidGradlePath = join("android", "app", "build.gradle");
const androidGradle = await readFile(androidGradlePath, "utf8");
if (!/versionCode\s+\d+/.test(androidGradle) || !/versionName\s+["'][^"']+["']/.test(androidGradle)) {
  throw new Error("Không tìm thấy cấu hình versionCode/versionName trong android/app/build.gradle.");
}
const currentBuildNumber = Number(androidGradle.match(/versionCode\s+(\d+)/)?.[1] || 0);
const nextBuildNumber = Math.max(buildNumber, currentBuildNumber);
const synchronizedGradle = androidGradle
  .replace(/versionCode\s+\d+/, `versionCode ${nextBuildNumber}`)
  .replace(/versionName\s+["'][^"']+["']/, `versionName "${version}"`);
if (synchronizedGradle !== androidGradle) {
  await writeFile(androidGradlePath, synchronizedGradle, "utf8");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: windows, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run("npm", ["run", "build"]);
run("npx", ["cap", "sync", "android"]);
run(windows ? gradleWrapperName : `./${gradleWrapperName}`, ["assembleDebug"], { cwd: "android" });
console.log(`APK: ${join("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk")}`);
