import React from "react";
import {
  CheckCircle2,
  Image as ImageIcon,
  Lightbulb,
  Compass,
  Pencil,
  Camera,
} from "lucide-react";
import { PoseItem } from "../types";

interface PoseCardProps {
  pose: PoseItem;
  poseKey: string;
  isDone: boolean;
  photoCount: number;
  onClick: () => void;
  onToggleDoneQuick?: (e: React.MouseEvent) => void;
  onEditCover?: (e: React.MouseEvent) => void;
}

export const PoseCard: React.FC<PoseCardProps> = ({
  pose,
  poseKey,
  isDone,
  photoCount,
  onClick,
  onToggleDoneQuick,
  onEditCover,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group relative rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col border select-none ${
        isDone
          ? "bg-zinc-50/70 dark:bg-zinc-900/30 border-emerald-300/80 dark:border-emerald-900/60 opacity-70 hover:opacity-95"
          : "bg-white dark:bg-zinc-900 border-zinc-200/90 dark:border-zinc-800 shadow-xs hover:shadow-xl hover:-translate-y-1 hover:border-amber-400 dark:hover:border-amber-600/70"
      } active:scale-[0.98] animate-fadeInUp`}
    >
      {/* Photo Cover Preview Area (REPLACES STICK-FIGURE COMPLETELY) */}
      <div className="relative w-full aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {pose.coverImage ? (
          <img
            src={pose.coverImage}
            alt={pose.title}
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80";
            }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/10 via-zinc-100 to-amber-500/5 dark:from-zinc-800 dark:to-zinc-900 text-zinc-400">
            <Camera className="w-8 h-8 text-amber-500/60 mb-1" />
            <span className="text-[10px] font-semibold text-zinc-500">Mẫu Dáng Chuẩn</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

        {/* Done status toggle button (Top Left) */}
        <button
          onClick={onToggleDoneQuick}
          title={isDone ? "Đã chụp xong (Bấm để hủy)" : "Bấm để đánh dấu đã chụp"}
          className={`absolute top-2 left-2 p-1.5 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
            isDone
              ? "bg-emerald-500 text-white shadow-md"
              : "bg-black/35 text-white/80 hover:text-white hover:bg-black/55"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 fill-current" />
        </button>

        {/* Top-Right Badges: Photos count & Pencil edit cover button */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          {photoCount > 0 && (
            <span className="bg-black/50 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/10">
              <ImageIcon className="w-2.5 h-2.5" />
              {photoCount}
            </span>
          )}

          {/* EDIT COVER PENCIL BUTTON */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditCover?.(e);
            }}
            title="Chỉnh sửa ảnh đại diện cho dáng này"
            className="p-1.5 rounded-full bg-black/50 hover:bg-amber-500 text-white backdrop-blur-md transition-colors shadow-md active:scale-90"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Bottom indicator inside image */}
        {pose.angle && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            <span className="bg-black/60 backdrop-blur-md text-white/90 text-[9px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Compass className="w-2.5 h-2.5 text-amber-400" />
              <span className="truncate max-w-[120px]">{pose.angle}</span>
            </span>

            {isDone && (
              <span className="bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-sm">
                ✓ Xong
              </span>
            )}
          </div>
        )}
      </div>

      {/* Text details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between text-left space-y-2">
        <div>
          <h3
            className={`font-bold text-xs sm:text-sm tracking-tight line-clamp-1 ${
              isDone
                ? "text-zinc-500 dark:text-zinc-400 line-through decoration-zinc-400"
                : "text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors"
            }`}
          >
            {pose.title}
          </h3>

          {pose.desc && (
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
              {pose.desc}
            </p>
          )}
        </div>

        {/* Tips footer */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px]">
          {pose.tips && pose.tips.length > 0 ? (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <Lightbulb className="w-3 h-3 text-amber-500" />
              <span>{pose.tips.length} mẹo vàng</span>
            </span>
          ) : (
            <span className="text-zinc-400">Chuẩn góc máy</span>
          )}

          <span className="text-zinc-400 group-hover:text-amber-500 transition-colors font-medium">
            Chi tiết →
          </span>
        </div>
      </div>
    </div>
  );
};
