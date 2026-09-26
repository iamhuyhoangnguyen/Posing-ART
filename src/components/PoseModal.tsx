import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  CheckCircle2,
  Plus,
  Trash2,
  Sparkles,
  Maximize2,
  Star,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Clipboard,
  Clock,
  MoreVertical,
  Download,
  Share2,
  CheckSquare,
  Square,
} from "lucide-react";
import { PoseItem, PhotoRecord, UserAccount } from "../types";
import { getPhotosForPose, addPhoto, addPhotos, deletePhoto } from "../utils/db";
import { pickImageFiles, saveImageToDevice, shareImageToDevice } from "../services/platformService";
import {
  getPinterestSearchUrl,
  getRednoteSearchUrl,
  getInspirationSearchQuery,
} from "../utils/inspirationLinks";
import { isAdminAuthenticated } from "../utils/adminAuth";
import { getCurrentUser, isCurrentUserAdmin } from "../utils/userAuth";

interface PoseModalProps {
  pose: PoseItem | null;
  categoryName: string;
  poseKey: string;
  onClose: () => void;
  onOpenAdvisor: (pose: PoseItem, category: string, initialPhoto?: string) => void;
  onPhotosUpdated: () => void;
  onSetAsCover?: (photoUrl: string) => void;
}

export const PoseModal: React.FC<PoseModalProps> = ({
  pose,
  categoryName,
  poseKey,
  onClose,
  onOpenAdvisor,
  onPhotosUpdated,
  onSetAsCover,
}) => {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(getCurrentUser());
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<number>>(() => new Set());
  const [openPhotoMenuId, setOpenPhotoMenuId] = useState<number | null>(null);
  const photosWithUrls = useMemo(
    () => photos.map((photo) => ({ photo, url: URL.createObjectURL(photo.blob) })),
    [photos],
  );

  useEffect(() => () => photosWithUrls.forEach(({ url }) => URL.revokeObjectURL(url)), [photosWithUrls]);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  useEffect(() => {
    if (poseKey) {
      loadPhotos();
    }
  }, [poseKey]);

  // High-Quality Copy-Paste Image Handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            await handleAddSinglePhoto(file);
            setPasteToast("✓ Đã dán ảnh chất lượng cao thành công!");
            setTimeout(() => setPasteToast(null), 3500);
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [poseKey, currentUser]);

  const loadPhotos = async () => {
    try {
      setLoading(true);
      const items = await getPhotosForPose(poseKey);
      setPhotos(items);
    } catch (err) {
      console.error("Error loading photos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSinglePhoto = async (file: File | Blob) => {
    const user = getCurrentUser();
    const isAdmin = isCurrentUserAdmin();
    const uploaderRole = isAdmin ? "admin" : "member";
    const uploadedBy = user ? user.name : "Tài khoản con";
    const status = isAdmin ? "approved" : "pending";

    await addPhoto(poseKey, file, undefined, undefined, {
      uploadedBy,
      uploaderRole,
      status,
    });

    await loadPhotos();
    onPhotosUpdated();

    if (!isAdmin) {
      setPasteToast("✓ Đã thêm ảnh! Đang chờ quản trị viên phê duyệt.");
      setTimeout(() => setPasteToast(null), 4000);
    }
  };

  const handleUploadFiles = async (files: File[]) => {
    if (!files.length) return;
    const user = getCurrentUser();
    const isAdmin = isCurrentUserAdmin();
    try {
      await addPhotos(poseKey, files, undefined, undefined, {
        uploadedBy: user?.name || "Tài khoản con",
        uploaderRole: isAdmin ? "admin" : "member",
        status: isAdmin ? "approved" : "pending",
      });
      await loadPhotos();
      onPhotosUpdated();
      setPasteToast(isAdmin
        ? `✓ Đã thêm ${files.length} ảnh vào chủ đề.`
        : `✓ Đã thêm ${files.length} ảnh; ảnh đang chờ quản trị viên phê duyệt.`);
      setTimeout(() => setPasteToast(null), 4000);
    } catch (error) {
      console.error("Bulk photo upload failed:", error);
      setPasteToast("Không thể lưu ảnh. Hãy thử chọn ít ảnh hơn hoặc kiểm tra dung lượng thiết bị.");
      setTimeout(() => setPasteToast(null), 5000);
    }
  };

  const handleChoosePhotos = async () => {
    try {
      await handleUploadFiles(await pickImageFiles("gallery"));
    } catch (error) {
      console.error("Image picker failed:", error);
      setPasteToast("Không thể mở thư viện ảnh trên thiết bị.");
      setTimeout(() => setPasteToast(null), 4000);
    }
  };

  const photoFileName = (photo: PhotoRecord) => {
    const originalName = photo.blob instanceof File ? photo.blob.name : "";
    const extension = originalName.match(/\.[a-z0-9]{2,5}$/i)?.[0] || ".jpg";
    return `posing-${photo.id}${extension}`;
  };

  const downloadPhoto = async (photo: PhotoRecord) => {
    const saved = await saveImageToDevice(photo.blob, photoFileName(photo));
    setOpenPhotoMenuId(null);
    if (!saved) setPasteToast("Không thể tải ảnh xuống thiết bị.");
  };

  const sharePhoto = async (photo: PhotoRecord) => {
    await shareImageToDevice(photo.blob, photoFileName(photo));
    setOpenPhotoMenuId(null);
  };

  const downloadSelectedPhotos = async () => {
    const selected = photos.filter((photo) => selectedPhotoIds.has(photo.id));
    if (!selected.length) return;
    for (const photo of selected) {
      await saveImageToDevice(photo.blob, photoFileName(photo));
    }
    setPasteToast(`Đã gửi ${selected.length} ảnh tới thư mục tải xuống.`);
    setTimeout(() => setPasteToast(null), 3500);
  };

  const toggleSelectedPhoto = (photoId: number) => {
    setSelectedPhotoIds((current) => {
      const next = new Set(current);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((t) => t.startsWith("image/"));
          if (imageType) {
            const blob = await item.getType(imageType);
            await handleAddSinglePhoto(blob);
            setPasteToast("✓ Đã dán ảnh chất lượng cao từ Clipboard thành công!");
            setTimeout(() => setPasteToast(null), 3500);
            return;
          }
        }
      }
      setPasteToast("💡 Nhấn Ctrl + V trên bàn phím (hoặc giữ chạm Dán) để dán ảnh trực tiếp!");
      setTimeout(() => setPasteToast(null), 4000);
    } catch {
      setPasteToast("💡 Nhấn phím Ctrl + V trên bàn phím để dán ảnh trực tiếp!");
      setTimeout(() => setPasteToast(null), 4000);
    }
  };

  const executeDeletePhoto = async (photo: PhotoRecord) => {
    if (window.confirm("Bạn có chắc muốn xóa ảnh tham khảo này khỏi máy và Cloud Drive?")) {
      await deletePhoto(photo.id, photo.cloudId);
      await loadPhotos();
      onPhotosUpdated();
    }
  };

  const handleDeletePhotoClick = (photo: PhotoRecord, e: React.MouseEvent) => {
    e.stopPropagation();

    // Check RBAC: Sub-accounts CANNOT delete photos!
    const isAdmin = isCurrentUserAdmin() || isAdminAuthenticated();
    if (!isAdmin) {
      setPermissionNotice(
        "Bị từ chối: Tài khoản thành viên không có quyền xóa ảnh trên hệ thống chung."
      );
      setTimeout(() => setPermissionNotice(null), 4500);
      return;
    }

    executeDeletePhoto(photo);
  };

  if (!pose) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-slideUp">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">{categoryName}</p>
            <h2 className="truncate text-base font-extrabold text-zinc-900 dark:text-zinc-100">{pose.title}</h2>
          </div>
          <button onClick={onClose} aria-label="Đóng" className="shrink-0 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Pinterest & Rednote External Exploration Section */}
          <div className="bg-gradient-to-r from-red-50/70 via-rose-50/50 to-amber-50/60 dark:from-zinc-800/80 dark:to-zinc-800/50 border border-red-200/70 dark:border-zinc-700/60 rounded-2xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                Tìm thêm dáng tương tự ngoài ảnh đã tải
              </span>
              <button
                type="button"
                onClick={() => {
                  const q = getInspirationSearchQuery(categoryName, categoryName, pose.title);
                  navigator.clipboard.writeText(`${q.pinterestQuery} | ${q.rednoteQuery}`);
                  setCopiedQuery(true);
                  setTimeout(() => setCopiedQuery(false), 2000);
                }}
                className="text-[10px] font-bold text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/60 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-rose-200"
              >
                {copiedQuery ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedQuery ? "Đã chép từ khóa" : "Chép từ khóa"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={getPinterestSearchUrl(categoryName, categoryName, pose.title)}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all text-center"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.224-.174.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.546.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                </svg>
                <span>Pinterest</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>

              <a
                href={getRednoteSearchUrl(categoryName, categoryName, pose.title)}
                target="_blank"
                rel="noopener noreferrer"
                title={`Tìm kiếm tiếng Trung: ${getInspirationSearchQuery(categoryName, categoryName, pose.title).rednoteQuery}`}
                className="py-2 px-3 rounded-xl bg-[#FF2442] hover:bg-[#d91934] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all text-center"
              >
                <span className="text-[10px] font-black bg-white/20 px-1 rounded-sm">RED</span>
                <span>Rednote (Tiếng Trung)</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>

            <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-800/60 p-2 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between">
              <span className="truncate">
                🇨🇳 Tự động quy đổi tiếng Trung: <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{getInspirationSearchQuery(categoryName, categoryName, pose.title).rednoteQuery}</strong>
              </span>
            </div>
          </div>

          {/* Photo Gallery Section */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            {/* Feedback Toasts */}
            {pasteToast && (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                <span>{pasteToast}</span>
              </div>
            )}
            {permissionNotice && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{permissionNotice}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                Ảnh Tham Khảo ({photos.length})
              </span>

              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = !selectionMode;
                      setSelectionMode(nextMode);
                      setSelectedPhotoIds(new Set());
                    }}
                    className="text-xs font-bold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {selectionMode ? "Bỏ chọn" : "Chọn nhiều"}
                  </button>
                )}
                {/* High-Quality Paste button */}
                <button
                  type="button"
                  onClick={handlePasteButtonClick}
                  title="Dán ảnh từ bộ nhớ tạm (hoặc bấm phím Ctrl + V)"
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50 flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dán ảnh</span> (Ctrl+V)
                </button>

                <button
                  type="button"
                  onClick={handleChoosePhotos}
                  className="cursor-pointer text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Thêm ảnh
                </button>
              </div>
            </div>

            {selectionMode && photos.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/70 p-2">
                <button
                  type="button"
                  onClick={() => setSelectedPhotoIds(
                    selectedPhotoIds.size === photos.length
                      ? new Set()
                      : new Set(photos.map((photo) => photo.id)),
                  )}
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-200 px-2 py-1"
                >
                  {selectedPhotoIds.size === photos.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
                <span className="text-xs text-zinc-500">Đã chọn {selectedPhotoIds.size}</span>
                <button
                  type="button"
                  onClick={downloadSelectedPhotos}
                  disabled={!selectedPhotoIds.size}
                  className="ml-auto text-xs font-bold text-white bg-amber-500 disabled:opacity-40 px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" /> Tải ảnh đã chọn
                </button>
              </div>
            )}

            {/* Grid of photos */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Add card with Paste hint */}
              <button
                type="button"
                onClick={handleChoosePhotos}
                className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-amber-500 cursor-pointer transition-colors active:scale-95 text-center p-1"
              >
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-bold">Thêm ảnh</span>
                <span className="text-[9px] text-zinc-400">Chọn nhiều ảnh</span>
              </button>

              {photosWithUrls.map(({ photo: p, url: imgUrl }) => {
                const isPending = p.status === "pending";
                const isSelected = selectedPhotoIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => selectionMode ? toggleSelectedPhoto(p.id) : setLightboxPhoto(imgUrl)}
                    className={`group relative aspect-square rounded-2xl bg-zinc-100 dark:bg-zinc-800 cursor-pointer shadow-sm border border-zinc-200/50 dark:border-zinc-700/50 ${openPhotoMenuId === p.id ? "z-30" : "z-0"}`}
                  >
                    <img
                      src={imgUrl}
                      alt="Tham khảo dáng"
                      className="h-full w-full rounded-2xl object-cover transition-transform group-hover:scale-105"
                    />

                    {/* Pending approval badge */}
                    {isPending && (
                      <div className="absolute bottom-1.5 left-1.5 bg-amber-500/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Chờ duyệt</span>
                      </div>
                    )}

                    {selectionMode && (
                      <div className="absolute top-1.5 left-1.5 rounded-md bg-black/60 p-1 text-white">
                        {isSelected ? <CheckSquare className="w-4 h-4 text-amber-300" /> : <Square className="w-4 h-4" />}
                      </div>
                    )}

                    {/* Photo actions menu */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {/* Set as cover button */}
                      {onSetAsCover && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetAsCover(imgUrl);
                          }}
                          title="Đặt ảnh này làm ảnh đại diện của dáng"
                          className="p-1 rounded-full bg-black/60 text-white hover:bg-amber-500 transition-colors"
                        >
                          <Star className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setOpenPhotoMenuId(openPhotoMenuId === p.id ? null : p.id)}
                        aria-label="Tùy chọn ảnh"
                        className="p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openPhotoMenuId === p.id && (
                        <div className="absolute right-0 top-8 z-50 min-w-36 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-1.5 shadow-xl">
                          <button type="button" onClick={() => void downloadPhoto(p)} className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                            <Download className="w-3.5 h-3.5" /> Tải ảnh xuống
                          </button>
                          <button type="button" onClick={() => void sharePhoto(p)} className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2">
                            <Share2 className="w-3.5 h-3.5" /> Chia sẻ ảnh
                          </button>
                          <button type="button" onClick={(e) => handleDeletePhotoClick(p, e)} title={isCurrentUserAdmin() ? "Xóa ảnh (Quản trị viên)" : "Tài khoản con không được xóa ảnh"} className="w-full rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5" /> Xóa ảnh
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Quick view icon */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                );
              })}
            </div>

            {photos.length === 0 && !loading && (
              <p className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-3 italic">
                Chưa có ảnh tham khảo. Hãy tải ảnh từ máy, chụp ảnh hoặc dán trực tiếp (Ctrl + V) chất lượng cao!
              </p>
            )}
          </div>

          <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 dark:border-violet-900/60 dark:bg-violet-950/30">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold text-violet-800 dark:text-violet-200">
              <Sparkles className="h-4 w-4" /> Trợ lý AI
            </div>
            <div>
              <button type="button" onClick={() => { onClose(); onOpenAdvisor(pose, categoryName); }} className="rounded-xl bg-white px-2 py-2.5 text-xs font-semibold text-violet-700 shadow-sm dark:bg-zinc-900 dark:text-violet-300">
                Phân tích dáng
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 p-3 rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700"
          >
            <X className="w-6 h-6" />
          </button>

          <img
            src={lightboxPhoto}
            alt="Phóng to"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};
