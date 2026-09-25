import React, { useState } from "react";
import { ExternalLink, Copy, Check, Sparkles, Globe } from "lucide-react";
import {
  getPinterestSearchUrl,
  getRednoteSearchUrl,
  getInspirationSearchQuery,
  CONCEPT_INSPIRATION_MAP,
} from "../utils/inspirationLinks";

interface InspirationBarProps {
  categoryId: string;
  categoryLabel: string;
}

export const InspirationBar: React.FC<InspirationBarProps> = ({
  categoryId,
  categoryLabel,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const pUrl = getPinterestSearchUrl(categoryId, categoryLabel);
  const rUrl = getRednoteSearchUrl(categoryId, categoryLabel);
  const queries = getInspirationSearchQuery(categoryId, categoryLabel);
  const conceptMeta = CONCEPT_INSPIRATION_MAP[categoryId];

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 rounded-3xl p-3.5 sm:p-4 mb-4 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Title & info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <span>Tham khảo thêm trên Pinterest & Rednote</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                Ngoài ảnh đã upload
              </span>
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3 text-rose-500" />
              <span>Rednote tự động quy đổi sang tiếng Trung:</span>
              <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{queries.rednoteQuery}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Pinterest Button */}
          <a
            href={pUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Tìm ảnh "${categoryLabel}" trên Pinterest`}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.224-.174.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.546.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
            <span>Pinterest</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          {/* Rednote (Xiaohongshu) Button */}
          <a
            href={rUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={`Tìm ảnh "${queries.rednoteQuery}" trên Rednote (Tiểu Hồng Thư)`}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF2442] hover:bg-[#d91934] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <span className="font-extrabold text-[10px] tracking-tight bg-white/25 px-1 rounded-sm">RED</span>
            <span>Rednote</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          {/* Quick Copy Keywords */}
          <button
            onClick={() => handleCopy(`${queries.pinterestQuery} | ${queries.rednoteQuery}`, "all")}
            title="Sao chép từ khóa tiếng Việt & tiếng Trung để dán vào App điện thoại"
            className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
          >
            {copiedType === "all" ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Suggested Sub-Tags */}
      {conceptMeta?.recommendedTags && conceptMeta.recommendedTags.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1">
            Gợi ý nhanh:
          </span>
          {conceptMeta.recommendedTags.map((tag, idx) => (
            <a
              key={idx}
              href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(tag + " nữ dáng chụp")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors inline-flex items-center gap-1 active:scale-95"
            >
              <span>{tag}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-50" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
