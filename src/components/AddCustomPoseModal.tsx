import React, { useState } from "react";
import { Plus, Upload, X } from "lucide-react";
import type { CategoryItem, SectionType } from "../types";

interface AddCustomCategoryModalProps {
  currentSection: SectionType;
  onAddCategory: (section: "kyyeu" | "canhan", newCategory: CategoryItem) => void;
  onClose: () => void;
}

export const AddCustomPoseModal: React.FC<AddCustomCategoryModalProps> = ({ currentSection, onAddCategory, onClose }) => {
  const [targetSection, setTargetSection] = useState<"kyyeu" | "canhan">(currentSection === "canhan" ? "canhan" : "kyyeu");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const handleCoverFile = (file?: File) => {
    if (!file?.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, 800 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
        setCoverImage(canvas.toDataURL("image/jpeg", 0.85));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanLabel = label.trim();
    if (!cleanLabel) return;
    onAddCategory(targetSection, {
      id: `cat-${Date.now()}`,
      label: cleanLabel,
      description: description.trim() || undefined,
      coverImage: coverImage || undefined,
      images: [],
      poses: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4 rounded-t-3xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl sm:p-6">
        <div className="flex items-center justify-between">
          <div><h2 className="text-base font-bold">Thêm danh mục ảnh</h2><p className="mt-1 text-xs text-zinc-500">Tạo gallery ảnh mới theo chủ đề.</p></div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold">Thuộc phần</label>
          <div className="grid grid-cols-2 gap-2">
            {(["kyyeu", "canhan"] as const).map((section) => (
              <button key={section} type="button" onClick={() => setTargetSection(section)} className={`rounded-xl border p-2.5 text-xs font-bold ${targetSection === section ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" : "border-zinc-200 dark:border-zinc-800"}`}>
                {section === "kyyeu" ? "KỶ YẾU" : "CONCEPT"}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-xs font-semibold">Tên danh mục
          <input required maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="VD: Prom Dạ Hội, Vintage Hà Nội..." className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs outline-none focus:border-amber-500 dark:border-zinc-800 dark:bg-zinc-950" />
        </label>
        <label className="block text-xs font-semibold">Mô tả ngắn
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả chủ đề" className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs outline-none focus:border-amber-500 dark:border-zinc-800 dark:bg-zinc-950" />
        </label>
        <div className="space-y-2">
          <label className="block text-xs font-semibold">Ảnh đại diện (tùy chọn)</label>
          <div className="flex gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-xs font-semibold dark:bg-zinc-800">
              <Upload className="h-3.5 w-3.5" /> Tải ảnh
              <input type="file" accept="image/*" className="hidden" onChange={(event) => handleCoverFile(event.target.files?.[0])} />
            </label>
            <input value={coverImage.startsWith("data:") ? "" : coverImage} onChange={(event) => setCoverImage(event.target.value)} placeholder="Link ảnh https://..." className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-950" />
          </div>
          {coverImage && <img src={coverImage} alt="Xem trước ảnh đại diện" className="h-20 w-20 rounded-xl object-cover" />}
        </div>
        <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-xs font-extrabold text-zinc-950"><Plus className="h-4 w-4" />Tạo danh mục</button>
      </form>
    </div>
  );
};
