import React from "react";
import { Camera, ScanSearch } from "lucide-react";
import { OfflineImage } from "./OfflineImage";
import { googleLensSearchUrl } from "../utils/googleLens";

interface GalleryImageCardProps {
  imageUrl?: string;
  label: string;
  onOpen: () => void;
  similarImageUrl?: string;
}

export const GalleryImageCard: React.FC<GalleryImageCardProps> = ({ imageUrl, label, onOpen, similarImageUrl }) => (
  <div className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <button type="button" onClick={onOpen} className="absolute inset-0 h-full w-full" aria-label={`Mở ảnh trong bộ sưu tập ${label}`}>
      {imageUrl ? <OfflineImage src={imageUrl} alt="" wrapperClassName="h-full w-full" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" /> : <div className="flex h-full items-center justify-center"><Camera className="h-7 w-7 text-zinc-400" /></div>}
    </button>
    {similarImageUrl && (
      <a
        href={googleLensSearchUrl(similarImageUrl)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        title="Tìm ảnh tương tự trên toàn web bằng Google Lens (không tìm riêng trên Pinterest/RedNote)"
        aria-label="Tìm ảnh tương tự trên toàn web bằng Google Lens"
        className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full border border-white/50 bg-black/65 px-2 py-1.5 text-[10px] font-bold text-white shadow backdrop-blur"
      >
        <ScanSearch className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tìm ảnh tương tự</span>
      </a>
    )}
  </div>
);
