import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Copy, Check, Sparkles, Globe, RefreshCw, LoaderCircle } from "lucide-react";
import { InspirationSearchLink } from "./InspirationSearchLink";
import { serverUrl } from "../services/apiUrl";
import {
  INSPIRATION_SUGGESTION_TTL_MS,
  readInspirationSuggestionCache,
  writeInspirationSuggestionCache,
} from "../utils/inspirationSuggestionCache";
import {
  getPinterestSearchUrl,
  getRednoteSearchUrl,
  getInspirationSearchQuery,
  CONCEPT_INSPIRATION_MAP,
} from "../utils/inspirationLinks";

interface InspirationBarProps {
  categoryId: string;
  categoryLabel: string;
  categoryDescription?: string;
  poseTitles: string[];
}

const suggestionCache = new Map<string, { suggestions: string[]; savedAt?: number }>();
const suggestionHistory = new Map<string, string[][]>();
const suggestionRequests = new Map<string, Promise<string[]>>();

function getFallbackSuggestions(categoryId: string, categoryLabel: string): string[] {
  const oldSuggestions = CONCEPT_INSPIRATION_MAP[categoryId]?.recommendedTags;
  return oldSuggestions?.length
    ? oldSuggestions
    : [`${categoryLabel} chân dung`, "Góc nghiêng ánh nắng", "Tương tác đạo cụ", "Bước đi tự nhiên", "Cận cảnh biểu cảm", "Tạo dáng ngồi đẹp"];
}

function parseSuggestionReply(reply: unknown, oldSuggestions: string[]): string[] {
  if (typeof reply !== "string") return [];
  const oldSet = new Set(oldSuggestions.map((tag) => tag.toLocaleLowerCase("vi-VN").trim()));
  const lines = reply
    .replace(/```(?:json)?/gi, "")
    .split(/[\n,;]+/)
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)、])\s*/, "").replace(/^\s*\[|\]\s*$/g, "").replace(/^['"“”]|['"“”]$/g, "").replace(/[*`]/g, "").trim())
    .filter((line) => {
      const wordCount = line.split(/\s+/).filter(Boolean).length;
      return wordCount >= 2 && wordCount <= 5 && !oldSet.has(line.toLocaleLowerCase("vi-VN"));
    });
  return [...new Set(lines)].slice(0, 8);
}

export const InspirationBar: React.FC<InspirationBarProps> = ({
  categoryId,
  categoryLabel,
  categoryDescription = "",
  poseTitles,
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const fallbackSuggestions = useMemo(() => getFallbackSuggestions(categoryId, categoryLabel), [categoryId, categoryLabel]);
  const poseContext = poseTitles.slice(0, 60).join("; ");
  const [suggestions, setSuggestions] = useState<string[]>(() =>
    suggestionCache.get(categoryId)?.suggestions
      || readInspirationSuggestionCache(categoryId)?.suggestions
      || fallbackSuggestions,
  );
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const pUrl = getPinterestSearchUrl(categoryId, categoryLabel);
  const rUrl = getRednoteSearchUrl(categoryId, categoryLabel);
  const queries = getInspirationSearchQuery(categoryId, categoryLabel);
  const generateSuggestions = useCallback(async (forceRefresh: boolean, isCurrent: () => boolean = () => true) => {
    if (!forceRefresh) {
      const cached = suggestionCache.get(categoryId);
      if (cached) {
        if (cached.savedAt === undefined || Date.now() - cached.savedAt < INSPIRATION_SUGGESTION_TTL_MS) {
          if (isCurrent()) setSuggestions(cached.suggestions);
          return;
        }
        suggestionCache.delete(categoryId);
      }
      const persisted = readInspirationSuggestionCache(categoryId);
      if (persisted) {
        suggestionCache.set(categoryId, { suggestions: persisted.suggestions, savedAt: persisted.savedAt });
        suggestionHistory.set(categoryId, persisted.history);
        if (isCurrent()) setSuggestions(persisted.suggestions);
        return;
      }
    }

    if (isCurrent()) setIsLoadingSuggestions(true);
    const previous = suggestionHistory.get(categoryId)
      || readInspirationSuggestionCache(categoryId)?.history
      || [];
    const prompt = [
      "Tạo đúng 8 cụm từ tìm kiếm ngắn bằng tiếng Việt cho ảnh tạo dáng/chụp chân dung.",
      "Mỗi dòng chỉ có một cụm 2-5 từ, không đánh số, không giải thích, không Markdown.",
      "Gợi ý phải bám sát concept, đa dạng góc máy, tư thế, cảm xúc, đạo cụ hoặc bối cảnh; tránh sáo rỗng và chung chung.",
      "Không lặp lại những tag cố định cũ dưới đây và không lặp các gợi ý gần nhất.",
      `Tên concept: ${categoryLabel}`,
      categoryDescription ? `Mô tả/bối cảnh: ${categoryDescription}` : "",
      poseContext ? `Tên dáng đã có trong concept: ${poseContext}` : "",
      `Tag tĩnh cần tránh: ${fallbackSuggestions.join("; ")}`,
      previous.length ? `Các bộ gợi ý gần nhất cần tránh: ${previous.map((set) => set.join("; ")).join(" | ")}` : "",
      forceRefresh ? "Lần làm mới này cần tạo một bộ khác rõ rệt so với bộ đang hiển thị." : "",
    ].filter(Boolean).join("\n");

    let request = !forceRefresh ? suggestionRequests.get(categoryId) : undefined;
    if (!request) {
      request = (async () => {
        const response = await fetch(serverUrl("/api/ai/creative-chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(45_000),
          body: JSON.stringify({ model: "gemini", task: "quick-inspiration-tags", message: prompt }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Không thể tạo gợi ý lúc này.");
        const generated = parseSuggestionReply(data.reply, fallbackSuggestions);
        if (generated.length < 6) throw new Error("AI chưa trả về đủ cụm gợi ý.");
        const nextHistory = [[...generated], ...previous.filter((set) => set.join("|") !== generated.join("|"))].slice(0, 3);
        suggestionHistory.set(categoryId, nextHistory);
        const savedAt = Date.now();
        suggestionCache.set(categoryId, { suggestions: generated, savedAt });
        writeInspirationSuggestionCache(categoryId, { suggestions: generated, history: nextHistory, savedAt });
        return generated;
      })();
      suggestionRequests.set(categoryId, request);
    }

    try {
      const generated = await request;
      if (isCurrent()) setSuggestions(generated);
    } catch (error) {
      console.warn(`Could not generate inspiration tags for ${categoryLabel}:`, error);
      const fallback = getFallbackSuggestions(categoryId, categoryLabel);
      suggestionCache.set(categoryId, { suggestions: fallback });
      if (isCurrent()) setSuggestions(fallback);
    } finally {
      if (suggestionRequests.get(categoryId) === request) suggestionRequests.delete(categoryId);
      if (isCurrent()) setIsLoadingSuggestions(false);
    }
  }, [categoryId, categoryLabel, categoryDescription, poseContext, fallbackSuggestions]);

  useEffect(() => {
    let active = true;
    void generateSuggestions(false, () => active);
    return () => { active = false; };
  }, [generateSuggestions]);

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
          <InspirationSearchLink
            provider="pinterest"
            href={pUrl}
            title={`Tìm ảnh "${categoryLabel}" trên Pinterest`}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.334 1.357-.053.224-.174.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.546.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
            </svg>
            <span>Pinterest</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </InspirationSearchLink>

          {/* Rednote (Xiaohongshu) Button */}
          <InspirationSearchLink
            provider="rednote"
            href={rUrl}
            title={`Tìm ảnh "${queries.rednoteQuery}" trên Rednote (Tiểu Hồng Thư)`}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FF2442] hover:bg-[#d91934] text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
          >
            <span className="font-extrabold text-[10px] tracking-tight bg-white/25 px-1 rounded-sm">RED</span>
            <span>Rednote</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </InspirationSearchLink>

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
      {suggestions.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mr-1">
            Gợi ý nhanh{isLoadingSuggestions ? " · Đang tạo" : ":"}
          </span>
          {isLoadingSuggestions && <LoaderCircle className="w-3.5 h-3.5 text-amber-500 animate-spin" aria-label="Đang tạo gợi ý" />}
          {suggestions.map((tag, idx) => (
            <InspirationSearchLink
              provider="pinterest"
              key={idx}
              href={`https://www.pinterest.com/search/pins/?q=${encodeURIComponent(tag + " nữ dáng chụp")}`}
              className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg border border-zinc-200/60 dark:border-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors inline-flex items-center gap-1 active:scale-95"
            >
              <span>{tag}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-50" />
            </InspirationSearchLink>
          ))}
          <button
            type="button"
            onClick={() => void generateSuggestions(true)}
            disabled={isLoadingSuggestions}
            title="Tạo bộ gợi ý khác cho concept này"
            className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200/70 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900 disabled:opacity-50 inline-flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingSuggestions ? "animate-spin" : ""}`} />
            Làm mới gợi ý
          </button>
        </div>
      )}
    </div>
  );
};
