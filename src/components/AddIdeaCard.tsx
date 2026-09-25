import React from "react";
import { Plus, Sparkles } from "lucide-react";

interface AddIdeaCardProps {
  onClick: () => void;
  title?: string;
  subtitle?: string;
  badgeText?: string;
  isHomeSection?: boolean;
}

export const AddIdeaCard: React.FC<AddIdeaCardProps> = ({
  onClick,
  title = "Thêm ý tưởng",
  subtitle = "Bấm để thêm tư thế hoặc concept riêng của bạn",
  badgeText = "Sáng tạo mới",
  isHomeSection = false,
}) => {
  if (isHomeSection) {
    return (
      <div
        onClick={onClick}
        className="group relative rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-amber-300 dark:border-amber-700/60 bg-gradient-to-br from-amber-50/60 via-white to-amber-100/40 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-amber-950/20 hover:border-amber-500 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] select-none p-6 sm:p-8 min-h-[160px]"
      >
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/25 flex items-center justify-center group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
            <Plus className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {title}
              </h3>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">
              {subtitle}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className="group relative rounded-3xl overflow-hidden transition-all duration-300 cursor-pointer flex flex-col border-2 border-dashed border-amber-300/80 dark:border-amber-700/60 bg-gradient-to-b from-amber-50/50 via-white to-amber-100/30 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-amber-950/20 shadow-xs hover:shadow-lg hover:border-amber-500 dark:hover:border-amber-500 active:scale-[0.98] select-none"
    >
      {/* Upper Area: Matches PoseCard aspect-[4/3] with Big Plus icon */}
      <div className="relative w-full aspect-[4/3] bg-amber-50/70 dark:bg-zinc-800/60 flex flex-col items-center justify-center overflow-hidden border-b border-dashed border-amber-200/80 dark:border-zinc-800">
        <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-md shadow-amber-500/25 group-hover:scale-110 group-hover:rotate-90 transition-all duration-300">
          <Plus className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.5]" />
        </div>

        <div className="mt-2.5 flex items-center gap-1 bg-amber-100 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-800/60 px-2 py-0.5 rounded-full">
          <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
          <span className="text-[10px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            {badgeText}
          </span>
        </div>
      </div>

      {/* Bottom info Area: Matches PoseCard p-3.5 */}
      <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 space-y-1.5">
        <div>
          <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
            <span>{title}</span>
          </h4>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-0.5 leading-snug">
            {subtitle}
          </p>
        </div>

        <div className="pt-1 flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400 font-bold border-t border-dashed border-zinc-200 dark:border-zinc-800/80">
          <span>+ Bấm để thêm ngay</span>
          <span className="text-zinc-400">Tùy biến 100%</span>
        </div>
      </div>
    </div>
  );
};
