import { getCurrentUser, refreshCurrentUserSession } from "../utils/userAuth";
import { getAdminToken } from "../utils/adminAuth";
import { serverUrl } from "./apiUrl";

export interface CategoryDeletionPreview {
  photoCount: number;
  customPoseCount: number;
  relatedRecordCount: number;
  categoryFound: boolean;
}

interface CategoryDeletionRequest {
  section: "kyyeu" | "canhan";
  categoryId: string;
  poseKeys: string[];
}

async function adminRequest(path: string, method: "POST" | "DELETE", body: unknown) {
  let user = getCurrentUser();
  let token = getAdminToken() || user?.token || "";
  if (!token) throw new Error("Phiên quản trị viên không hợp lệ. Vui lòng đăng nhập lại.");

  const send = (activeToken: string) => fetch(serverUrl(path), {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${activeToken}` },
    body: JSON.stringify(body),
  });

  let response = await send(token);
  if (response.status === 401 && user) {
    user = await refreshCurrentUserSession(user);
    token = user?.token || "";
    if (token) response = await send(token);
  }
  const result = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(result.error || `Máy chủ từ chối thao tác (${response.status}).`);
  return result;
}

export async function previewCategoryDeletion(request: CategoryDeletionRequest): Promise<CategoryDeletionPreview> {
  return await adminRequest("/api/cloud/category/preview-delete", "POST", request) as CategoryDeletionPreview;
}

export async function deleteCategoryFromCloud(request: CategoryDeletionRequest): Promise<void> {
  await adminRequest(`/api/cloud/category/${encodeURIComponent(request.categoryId)}`, "DELETE", request);
}

export async function renameLibraryItem(request: {
  kind: "section" | "category" | "pose";
  section: "kyyeu" | "canhan";
  categoryId?: string;
  poseId?: string;
  label: string;
}): Promise<void> {
  await adminRequest("/api/cloud/library/rename", "POST", request);
}

export async function deletePoseFromCloud(request: { section: "kyyeu" | "canhan"; categoryId: string; poseKey: string }): Promise<void> {
  await adminRequest(`/api/cloud/pose/${encodeURIComponent(request.poseKey)}`, "DELETE", request);
}

export function getDeletedCategoryKeys(): Set<string> {
  try {
    const values = JSON.parse(localStorage.getItem("posing_deleted_categories") || "[]") as Array<{ section?: string; categoryId?: string }>;
    return new Set(values.map((item) => `${item.section}:${item.categoryId}`));
  } catch {
    return new Set();
  }
}
