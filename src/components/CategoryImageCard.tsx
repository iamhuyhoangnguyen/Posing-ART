import React from "react";
import type { CategoryItem } from "../types";
import { Image as ImageIcon } from "lucide-react";
import { OfflineImage } from "./OfflineImage";
import { AdminItemActionsMenu } from "./AdminItemActionsMenu";

interface CategoryImageCardProps {
  category: CategoryItem;
  galleryImageCount?: number;
  isActive: boolean;
  onSelect: () => void;
  isAdmin?: boolean;
  onDelete?: () => void;
  onRename?: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}

/** Shared image-backed category selector used by both Kỷ Yếu and Concept. */
export const CategoryImageCard: React.FC<CategoryImageCardProps> = ({
  category,
  galleryImageCount = 0,
  isActive,
  onSelect,
  isAdmin = false,
  onDelete,
  onRename,
  onShare,
  onDownload,
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
    {category.coverImage ? (
      <OfflineImage
        src={category.coverImage}
        alt={category.label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        wrapperClassName="absolute inset-0"
      />
    ) : (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-800 dark:to-zinc-950">
        <ImageIcon className="h-9 w-9 text-zinc-400/70" />
      </div>
    )}
    <div
      className={`absolute inset-0 transition-colors ${
        isActive
          ? "bg-gradient-to-t from-black/95 via-black/45 to-amber-950/20"
          : "bg-gradient-to-t from-black/90 via-black/45 to-transparent"
      }`}
    />

    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-bold text-white border border-white/15">
      {(category.images?.filter((image) => !image.photoId).length || 0) + galleryImageCount} ảnh
    </div>
    <div className="absolute bottom-3 left-3 right-3 text-white">
      <div className={`text-sm sm:text-base font-extrabold leading-tight ${isActive ? "text-amber-300" : "text-white"}`}>
        {category.label}
      </div>
      <div className="text-[11px] sm:text-xs text-zinc-200 line-clamp-2 mt-1 opacity-95">
        {category.description || `${category.images?.filter((image) => !image.photoId).length || 0} ảnh để bạn tham khảo`}
      </div>
    </div>
  </button>
  {isAdmin && onDelete && onRename && onShare && onDownload && (
    <AdminItemActionsMenu label={category.label} onDelete={onDelete} onRename={onRename} onShare={onShare} onDownload={onDownload} />
  )}
  </div>
);
