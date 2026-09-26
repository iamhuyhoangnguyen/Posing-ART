import React from "react";
import { Trash2 } from "lucide-react";
import type { CategoryItem } from "../types";
import { OfflineImage } from "./OfflineImage";

interface CategoryImageCardProps {
  category: CategoryItem;
  completedCount: number;
  isActive: boolean;
  onSelect: () => void;
  isAdmin?: boolean;
  onDelete?: () => void;
}

const FALLBACK_COVER = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80";

/** Shared image-backed category selector used by both Kỷ Yếu and Concept. */
export const CategoryImageCard: React.FC<CategoryImageCardProps> = ({
  category,
  completedCount,
  isActive,
  onSelect,
  isAdmin = false,
  onDelete,
}) => (
  <div className="relative">
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={isActive}
    className={`group relative w-full h-36 sm:h-40 rounded-2xl overflow-hidden text-left transition-all duration-200 border cursor-pointer active:scale-[0.99] ${
      isActive
        ? "border-2 border-amber-500 ring-2 ring-amber-500/30 shadow-md"
        : "border-zinc-200 dark:border-zinc-800 opacity-95 hover:opacity-100 hover:shadow-md"
    }`}
  >
    <OfflineImage
      src={category.coverImage || FALLBACK_COVER}
      alt={category.label}
      loading="lazy"
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      wrapperClassName="absolute inset-0"
    />
    <div
      className={`absolute inset-0 transition-colors ${
        isActive
          ? "bg-gradient-to-t from-black/95 via-black/45 to-amber-950/20"
          : "bg-gradient-to-t from-black/90 via-black/45 to-transparent"
      }`}
    />

    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/15">
      {completedCount}/{category.poses.length} dáng
    </div>
    <div className="absolute bottom-3 left-3 right-3 text-white">
      <div className={`text-sm sm:text-base font-extrabold leading-tight ${isActive ? "text-amber-300" : "text-white"}`}>
        {category.label}
      </div>
      <div className="text-[11px] sm:text-xs text-zinc-200 line-clamp-2 mt-1 opacity-95">
        {category.description || `${category.poses.length} gợi ý tạo dáng để bạn tham khảo`}
      </div>
    </div>
  </button>
  {isAdmin && onDelete && (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); onDelete(); }}
      aria-label={`Xóa chủ đề ${category.label}`}
      title={`Xóa chủ đề ${category.label}`}
      className="absolute left-2.5 top-2.5 z-10 rounded-full border border-white/30 bg-rose-600/90 p-2 text-white shadow-lg transition hover:bg-rose-700 active:scale-95"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )}
  </div>
);
