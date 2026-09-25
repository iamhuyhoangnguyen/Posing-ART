import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Camera,
  Plus,
  Trash2,
  Sparkles,
  Lightbulb,
  Compass,
  Maximize2,
  Pencil,
  Star,
  ExternalLink,
  Copy,
  Check,
  ShieldAlert,
  Clipboard,
  Clock,
  Shield,
} from "lucide-react";
import { PoseItem, PhotoRecord, UserAccount } from "../types";
import { getPhotosForPose, addPhoto, deletePhoto } from "../utils/db";
import {
  getPinterestSearchUrl,
  getRednoteSearchUrl,
  getInspirationSearchQuery,
} from "../utils/inspirationLinks";
import { isAdminAuthenticated } from "../utils/adminAuth";
import { getCurrentUser, isCurrentUserAdmin } from "../utils/userAuth";
import { AdminLoginModal } from "./AdminLoginModal";

interface PoseModalProps {
  pose: PoseItem | null;
  categoryName: string;
  poseKey: string;
  isDone: boolean;
  onToggleDone: () => void;
  onClose: () => void;
  onOpenAdvisor: (pose: PoseItem, category: string, initialPhoto?: string) => void;
  onOpenGenerator: (
    initialPrompt: string,
    targetPoseKey: string,
    initialReferenceImage?: string,
    categoryName?: string,
    poseTitle?: string
  ) => void;
  onPhotosUpdated: () => void;
  onEditCover?: () => void;
  onSetAsCover?: (photoUrl: string) => void;
}

export const PoseModal: React.FC<PoseModalProps> = ({
  pose,
  categoryName,
  poseKey,
  isDone,
  onToggleDone,
  onClose,
  onOpenAdvisor,
  onOpenGenerator,
  onPhotosUpdated,
  onEditCover,
  onSetAsCover,
}) => {
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(getCurrentUser());
  const [pasteToast, setPasteToast] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);

  // Admin authentication state for photo deletion
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [pendingDeletePhoto, setPendingDeletePhoto] = useState<PhotoRecord | null>(null);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await handleAddSinglePhoto(files[i]);
    }
    e.target.value = "";
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
        {/* Header with Photo Cover & Edit Pencil Button */}
        <div className="relative border-b border-zinc-100 dark:border-zinc-800">
          {/* Cover Image Banner */}
          <div className="relative h-44 sm:h-52 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            {pose.coverImage ? (
              <img
                src={pose.coverImage}
                alt={pose.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80";
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/20 via-zinc-800 to-black text-white p-4">
                <Camera className="w-10 h-10 text-amber-400 mb-2 stroke-1" />
                <span className="text-xs font-semibold text-zinc-300">
                  Chưa có ảnh đại diện tùy chỉnh
                </span>
                <span className="text-[10px] text-zinc-400">
                  Bấm biểu tượng bút chì để đặt ảnh từ máy
                </span>
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* PENCIL EDIT COVER BUTTON */}
            {onEditCover && (
              <button
                onClick={onEditCover}
                title="Đổi ảnh đại diện cho dáng này"
                className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Đổi ảnh đại diện</span>
              </button>
            )}

            {/* Title on Banner */}
            <div className="absolute bottom-3 left-4 right-4 text-white">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {categoryName}
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-white leading-tight mt-0.5">
                {pose.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Description & Angle */}
          <div className="space-y-2">
            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed font-medium">
              {pose.desc}
            </p>

            {pose.angle && (
              <div className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-1.5 rounded-xl font-medium">
                <Compass className="w-4 h-4 text-amber-500" />
                <span>Gợi ý góc máy: <strong>{pose.angle}</strong></span>
              </div>
            )}
          </div>

          {/* Shooting Tips */}
          {pose.tips && pose.tips.length > 0 && (
            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 mb-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                Mẹo Tạo Dáng Tại Hiện Trường:
              </div>
              <ul className="text-xs text-amber-900/90 dark:text-amber-200/90 space-y-1.5 list-disc pl-4 leading-relaxed">
                {pose.tips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action: Toggle Done */}
          <button
            onClick={onToggleDone}
            className={`w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm ${
              isDone
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800"
            }`}
          >
            <CheckCircle2 className={`w-5 h-5 ${isDone ? "text-emerald-600" : ""}`} />
            {isDone ? "✓ Đã chụp xong (Bấm để hủy)" : "Đánh dấu đã chụp xong"}
          </button>

          {/* AI Assistance Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => {
                onClose();
                onOpenAdvisor(pose, categoryName);
              }}
              className="p-3 rounded-2xl border border-violet-200 dark:border-violet-900/60 bg-violet-50/70 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-violet-100 active:scale-95 transition-all text-center"
            >
              <Sparkles className="w-4 h-4 text-violet-500" />
              <span>AI Phân tích dáng</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenGenerator(
                  `${categoryName}: ${pose.title}. ${pose.desc}`,
                  poseKey,
                  pose.coverImage,
                  categoryName,
                  pose.title
                );
              }}
              className="p-3 rounded-2xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-amber-100 active:scale-95 transition-all text-center"
            >
              <Camera className="w-4 h-4 text-amber-500" />
              <span>AI Biến tấu dáng</span>
            </button>
          </div>

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

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                Ảnh Tham Khảo ({photos.length})
                <span className="text-[10px] font-normal text-zinc-400">(Offline IndexedDB)</span>
              </span>

              <div className="flex items-center gap-1.5">
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

                <label className="cursor-pointer text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center gap-1 active:scale-95 transition-all shadow-2xs">
                  <Plus className="w-3.5 h-3.5" />
                  Thêm ảnh
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>

            {/* Grid of photos */}
            <div className="grid grid-cols-3 gap-2.5">
              {/* Add card with Paste hint */}
              <label className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-amber-400 dark:hover:border-amber-600 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col items-center justify-center gap-1 text-zinc-400 hover:text-amber-500 cursor-pointer transition-colors active:scale-95 text-center p-1">
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-bold">Thêm ảnh</span>
                <span className="text-[9px] text-zinc-400">hoặc Ctrl+V</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </label>

              {photos.map((p) => {
                const imgUrl = URL.createObjectURL(p.blob);
                const isPending = p.status === "pending";
                return (
                  <div
                    key={p.id}
                    onClick={() => setLightboxPhoto(imgUrl)}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 cursor-pointer shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
                  >
                    <img
                      src={imgUrl}
                      alt="Tham khảo dáng"
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />

                    {/* Pending approval badge */}
                    {isPending && (
                      <div className="absolute bottom-1.5 left-1.5 bg-amber-500/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Chờ duyệt</span>
                      </div>
                    )}

                    {/* Action buttons on photo */}
                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
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

                      {/* Delete button (Requires Admin) */}
                      <button
                        onClick={(e) => handleDeletePhotoClick(p, e)}
                        title={
                          isCurrentUserAdmin()
                            ? "Xóa ảnh (Quyền Quản trị viên)"
                            : "Tài khoản con không được xóa ảnh"
                        }
                        className="p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
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
        </div>
      </div>

      {/* Admin Verification Modal for Photo Deletion */}
      <AdminLoginModal
        isOpen={showAdminModal}
        onClose={() => {
          setShowAdminModal(false);
          setPendingDeletePhoto(null);
        }}
        onSuccess={() => {
          if (pendingDeletePhoto) {
            executeDeletePhoto(pendingDeletePhoto);
            setPendingDeletePhoto(null);
          }
        }}
        actionDescription="xóa ảnh tham khảo này khỏi Cloud Drive"
      />

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
