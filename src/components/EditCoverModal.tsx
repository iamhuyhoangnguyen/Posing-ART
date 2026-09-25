import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Pencil,
  Upload,
  Camera,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { getPhotosForPose } from "../utils/db";
import { PhotoRecord } from "../types";

interface EditCoverModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  currentImage?: string;
  poseKey?: string; // If editing a pose, lets user pick from stored photos
  onSave: (imageUrl: string) => void;
  onClose: () => void;
}

const PRESET_COVERS = [
  {
    label: "Kỷ yếu Nữ - Tươi sáng",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Áo Dài - Nét duyên",
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Kỷ yếu Nam - Năng động",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Cử nhân - Tốt nghiệp",
    url: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Tập thể - Bạn bè",
    url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Nàng thơ - Hoàng hôn",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Retro 90s - Phong cách",
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
  },
  {
    label: "Cảm xúc - Tối giản",
    url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
  },
];

export const EditCoverModal: React.FC<EditCoverModalProps> = ({
  isOpen,
  title,
  subtitle,
  currentImage,
  poseKey,
  onSave,
  onClose,
}) => {
  const [selectedImage, setSelectedImage] = useState<string>(currentImage || "");
  const [inputUrl, setInputUrl] = useState("");
  const [savedPhotos, setSavedPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSelectedImage(currentImage || "");
    setInputUrl("");
  }, [currentImage, isOpen]);

  // Load existing photos from IndexedDB if editing a pose
  useEffect(() => {
    if (poseKey && isOpen) {
      setLoadingPhotos(true);
      getPhotosForPose(poseKey)
        .then((items: PhotoRecord[]) => {
          const urls: string[] = [];
          items.forEach((item) => {
            try {
              const url = URL.createObjectURL(item.blob);
              urls.push(url);
            } catch (e) {
              console.error(e);
            }
          });
          setSavedPhotos(urls);
        })
        .catch(console.error)
        .finally(() => setLoadingPhotos(false));
    }
  }, [poseKey, isOpen]);

  if (!isOpen) return null;

  // Compress image before saving to Base64 (to fit easily into localStorage)
  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setSelectedImage(dataUrl);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (inputUrl.trim()) {
      setSelectedImage(inputUrl.trim());
      setInputUrl("");
    }
  };

  const handleSave = () => {
    onSave(selectedImage);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-slideUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Chỉnh Sửa Ảnh Đại Diện
              </h3>
              {subtitle && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-[240px]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Live Preview Area */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Xem trước ảnh đại diện
            </span>
            <div className="relative w-full h-48 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center group">
              {selectedImage ? (
                <>
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                      Ảnh đại diện hiện tại
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center p-4 space-y-1 text-zinc-400">
                  <ImageIcon className="w-8 h-8 mx-auto stroke-1 text-zinc-400" />
                  <p className="font-medium text-xs">Chưa có ảnh đại diện</p>
                  <p className="text-[10px]">Tải ảnh từ máy hoặc chọn ảnh mẫu bên dưới</p>
                </div>
              )}

              {selectedImage && (
                <button
                  type="button"
                  onClick={() => setSelectedImage("")}
                  title="Xóa ảnh"
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action 1: Upload from device or take photo */}
          <div className="grid grid-cols-2 gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-amber-950/30 flex items-center justify-center gap-2 font-bold text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              <Upload className="w-4 h-4 text-amber-500" />
              <span>Tải từ máy</span>
            </button>

            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="p-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 hover:bg-amber-50 hover:border-amber-400 dark:hover:bg-amber-950/30 flex items-center justify-center gap-2 font-bold text-zinc-800 dark:text-zinc-200 transition-colors"
            >
              <Camera className="w-4 h-4 text-emerald-500" />
              <span>Chụp ảnh mới</span>
            </button>
          </div>

          {/* Action 2: Photos from Pose album if available */}
          {savedPhotos.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-amber-500" />
                Chọn từ album ảnh của dáng này ({savedPhotos.length})
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {savedPhotos.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImage(url)}
                    className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === url
                        ? "border-amber-500 ring-2 ring-amber-500/30"
                        : "border-zinc-200 dark:border-zinc-700 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt="Saved" className="w-full h-full object-cover" />
                    {selectedImage === url && (
                      <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action 3: Enter Image URL */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Hoặc dán liên kết ảnh (URL)
            </span>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyUrl}
                disabled={!inputUrl.trim()}
                className="px-3 py-2 rounded-xl bg-zinc-800 dark:bg-zinc-700 disabled:opacity-40 text-white font-bold text-xs"
              >
                Áp dụng
              </button>
            </div>
          </div>

          {/* Action 4: Preset Curated Lookbook Covers */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Ảnh mẫu nhiếp ảnh tuyển chọn
            </span>
            <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
              {PRESET_COVERS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(preset.url)}
                  className={`group relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                    selectedImage === preset.url
                      ? "border-amber-500 ring-2 ring-amber-500/30 scale-[0.98]"
                      : "border-zinc-200 dark:border-zinc-750 opacity-80 hover:opacity-100"
                  }`}
                  title={preset.label}
                >
                  <img
                    src={preset.url}
                    alt={preset.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {selectedImage === preset.url && (
                    <div className="absolute inset-0 bg-amber-500/40 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white font-bold drop-shadow" />
                    </div>
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] truncate px-1 py-0.5 text-center font-medium">
                    {preset.label.split("-")[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedImage("");
              onSave("");
              onClose();
            }}
            className="text-xs text-zinc-500 hover:text-red-500 flex items-center gap-1 font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Xóa ảnh đại diện
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Lưu Thay Đổi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
