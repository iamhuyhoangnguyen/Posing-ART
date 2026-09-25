import React, { useState, useRef } from "react";
import { X, Plus, Upload, Camera, Link as LinkIcon, Image as ImageIcon } from "lucide-react";
import { CategoryItem, PoseItem, SectionType } from "../types";

interface AddCustomPoseModalProps {
  kyyeuCategories: CategoryItem[];
  canhanCategories: CategoryItem[];
  currentSection: SectionType;
  initialCategoryId?: string;
  initialMode?: "pose" | "category";
  onAddPose: (section: "kyyeu" | "canhan", categoryId: string, newPose: PoseItem) => void;
  onAddCategory: (section: "kyyeu" | "canhan", newCategory: CategoryItem) => void;
  onClose: () => void;
}

export const AddCustomPoseModal: React.FC<AddCustomPoseModalProps> = ({
  kyyeuCategories,
  canhanCategories,
  currentSection,
  initialCategoryId,
  initialMode = "pose",
  onAddPose,
  onAddCategory,
  onClose,
}) => {
  const [mode, setMode] = useState<"pose" | "category">(initialMode);
  const [targetSection, setTargetSection] = useState<"kyyeu" | "canhan">(
    currentSection === "canhan" ? "canhan" : "kyyeu"
  );

  // Pose fields
  const categories = targetSection === "kyyeu" ? kyyeuCategories : canhanCategories;
  const [categoryId, setCategoryId] = useState<string>(
    initialCategoryId || categories[0]?.id || ""
  );
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [angle, setAngle] = useState("Góc ngang tầm mắt");
  const [tipsText, setTipsText] = useState("");
  const [coverImage, setCoverImage] = useState("");

  // Category fields
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [catCoverImage, setCatCoverImage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFile = (file: File, isForCategory: boolean) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIM = 800;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > MAX_DIM) {
            h *= MAX_DIM / w;
            w = MAX_DIM;
          }
        } else {
          if (h > MAX_DIM) {
            w *= MAX_DIM / h;
            h = MAX_DIM;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          if (isForCategory) {
            setCatCoverImage(dataUrl);
          } else {
            setCoverImage(dataUrl);
          }
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "category") {
      if (!newCatLabel.trim()) return;
      const catId = `cat-${Date.now()}`;
      onAddCategory(targetSection, {
        id: catId,
        label: newCatLabel.trim(),
        coverImage: catCoverImage || undefined,
        description: newCatDesc.trim() || undefined,
        poses: [],
      });
      onClose();
    } else {
      if (!title.trim() || !categoryId) return;
      const tips = tipsText
        .split("\n")
        .map((t) => t.trim())
        .filter(Boolean);

      const newPose: PoseItem = {
        id: `custom-${Date.now()}`,
        title: title.trim(),
        desc: desc.trim(),
        coverImage: coverImage || undefined,
        angle: angle.trim() || undefined,
        tips: tips.length > 0 ? tips : undefined,
        isCustom: true,
      };

      onAddPose(targetSection, categoryId, newPose);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 dark:border-zinc-800 animate-slideUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Plus className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Thêm Dáng & Concept Mới
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tùy biến sổ tay với ảnh chụp thực tế
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            <button
              type="button"
              onClick={() => setMode("pose")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "pose"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Thêm Tư Thế Mới
            </button>
            <button
              type="button"
              onClick={() => setMode("category")}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                mode === "category"
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              Thêm Danh Mục Mới
            </button>
          </div>

          {/* Section choice (Kỷ yếu / Cá nhân) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Thuộc phần:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  targetSection === "kyyeu"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="targetSec"
                  checked={targetSection === "kyyeu"}
                  onChange={() => setTargetSection("kyyeu")}
                  className="hidden"
                />
                KỶ YẾU
              </label>

              <label
                className={`flex items-center justify-center p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                  targetSection === "canhan"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                }`}
              >
                <input
                  type="radio"
                  name="targetSec"
                  checked={targetSection === "canhan"}
                  onChange={() => setTargetSection("canhan")}
                  className="hidden"
                />
                CÁ NHÂN
              </label>
            </div>
          </div>

          {mode === "category" ? (
            /* Add Category */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tên danh mục / Concept mới:
                </label>
                <input
                  type="text"
                  required
                  value={newCatLabel}
                  onChange={(e) => setNewCatLabel(e.target.value)}
                  placeholder="VD: Prom Dạ Hội, Cosplay, Vintage Hà Nội..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mô tả ngắn:
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="VD: Không gian lãng mạn đèn vàng lung linh..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>

              {/* Cover Image for Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ảnh đại diện danh mục (Tùy chọn):
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    id="cat-cover-input"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFile(e.target.files[0], true);
                      }
                    }}
                  />
                  <label
                    htmlFor="cat-cover-input"
                    className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Tải ảnh từ máy
                  </label>
                  <input
                    type="text"
                    value={catCoverImage}
                    onChange={(e) => setCatCoverImage(e.target.value)}
                    placeholder="hoặc link ảnh https://..."
                    className="flex-1 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs outline-none"
                  />
                </div>
                {catCoverImage && (
                  <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 relative">
                    <img src={catCoverImage} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCatCoverImage("")}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Add Pose */
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Chọn Danh mục:
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-medium outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Tên tư thế:
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Ngồi tựa ban công cầm tách cafe..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mô tả tư thế:
                </label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="VD: Một chân duỗi nhẹ, tay nâng tách cafe nhìn qua cửa sổ..."
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>

              {/* Cover Image for Pose */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ảnh đại diện tư thế (Tùy chọn):
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleImageFile(e.target.files[0], false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Tải ảnh từ máy
                  </button>
                  <input
                    type="text"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="hoặc link ảnh https://..."
                    className="flex-1 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs outline-none"
                  />
                </div>
                {coverImage && (
                  <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 relative">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setCoverImage("")}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Gợi ý góc máy:
                </label>
                <input
                  type="text"
                  value={angle}
                  onChange={(e) => setAngle(e.target.value)}
                  placeholder="Góc ngang tầm mắt, góc thấp 30 độ..."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Mẹo chụp (Mỗi mẹo 1 dòng):
                </label>
                <textarea
                  rows={2}
                  value={tipsText}
                  onChange={(e) => setTipsText(e.target.value)}
                  placeholder="Hạ cằm xuống 1cm&#10;Tận dụng ánh nắng ngược rực rỡ"
                  className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md active:scale-95 transition-all"
          >
            {mode === "category" ? "+ Thêm Concept Mới" : "+ Lưu Tư Thế Này Vào Sổ Tay"}
          </button>
        </form>
      </div>
    </div>
  );
};
