import React, { useState } from "react";
import {
  X,
  Sparkles,
  Upload,
  Camera,
  Check,
  RefreshCw,
  AlertCircle,
  BookmarkPlus,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Copy,
  Zap,
  SunMedium,
  Eye,
  Aperture,
  Layers,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import {
  PoseItem,
  PhotographerContext,
  PoseAnalysisData,
} from "../types";
import { addPhoto } from "../utils/db";
import { serverUrl } from "../services/apiUrl";

interface AIPoseAdvisorModalProps {
  pose: PoseItem | null;
  categoryName: string;
  poseKey?: string;
  initialPhotoUrl?: string;
  onClose: () => void;
  onPhotoSavedToPose?: () => void;
}

export const AIPoseAdvisorModal: React.FC<AIPoseAdvisorModalProps> = ({
  pose,
  categoryName,
  poseKey,
  initialPhotoUrl,
  onClose,
  onPhotoSavedToPose,
}) => {
  const [photoDataUrl, setPhotoDataUrl] = useState<string>(initialPhotoUrl || "");
  const [mimeType, setMimeType] = useState<string>("image/jpeg");
  const [contextNotes, setContextNotes] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string>("");
  const [structuredResult, setStructuredResult] = useState<PoseAnalysisData | null>(null);
  const [error, setError] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [activeTab, setActiveTab] = useState<"fixes" | "camera" | "raw">("fixes");
  const [showContextDrawer, setShowContextDrawer] = useState(false);

  // Optional Photographer Context (Zero requirement, 100% optional)
  const [photographerContext, setPhotographerContext] = useState<PhotographerContext>({
    cameraModel: "",
    lens: "",
    focalLength: "",
    environment: "",
    timeOfDay: "",
    concept: "",
    outfit: "",
    peopleCount: "",
    photoGoal: "",
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoDataUrl(reader.result as string);
      setResult("");
      setStructuredResult(null);
      setError("");
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!photoDataUrl) {
      setError("Vui lòng tải lên một bức ảnh chụp thử để AI phân tích.");
      return;
    }

    try {
      setAnalyzing(true);
      setError("");

      const response = await fetch(serverUrl("/api/ai/analyze-pose"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: photoDataUrl,
          mimeType,
          poseTitle: pose?.title || "Tư thế chụp ảnh tự do",
          category: categoryName || "Tổng hợp",
          contextNotes,
          context: photographerContext,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Không thể phân tích ảnh lúc này.");
      }

      setResult(data.analysis || "Đã hoàn thành phân tích.");
      if (data.structured) {
        setStructuredResult(data.structured);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi gọi AI phân tích tư thế.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveToPose = async () => {
    if (!poseKey || !photoDataUrl) return;

    try {
      const res = await fetch(photoDataUrl);
      const blob = await res.blob();
      await addPhoto(poseKey, blob, "Ảnh đã được AI Cố Vấn Thực Chiến");
      setSavedSuccess(true);
      if (onPhotoSavedToPose) onPhotoSavedToPose();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Lỗi khi lưu ảnh vào dáng:", e);
    }
  };

  const handleCopyMarkdown = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const getScoreBadge = (
    label: string,
    value?: string,
    goodValues: string[] = ["TỐT", "TỰ NHIÊN", "THẤP"],
    warningValues: string[] = ["CẦN SỬA", "HƠI GƯỢNG", "TRUNG BÌNH"]
  ) => {
    if (!value) return null;
    let colorClass = "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
    if (goodValues.includes(value)) {
      colorClass = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    } else if (warningValues.includes(value)) {
      colorClass = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    }

    return (
      <div className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center justify-between gap-1.5 ${colorClass}`}>
        <span className="opacity-80 font-medium">{label}:</span>
        <span className="uppercase tracking-wide">{value}</span>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-slideUp">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                AI Cố Vấn Thực Chiến
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Thực địa
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                {pose ? `${categoryName} • ${pose.title}` : "Audit dáng, góc máy & ánh sáng hiện trường"}
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

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {/* Photo upload / preview */}
          {photoDataUrl ? (
            <div className="relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 max-h-56 flex items-center justify-center group shadow-sm">
              <img
                src={photoDataUrl}
                alt="Ảnh vừa chụp"
                className="max-h-56 w-auto object-contain mx-auto"
              />

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="cursor-pointer bg-white text-zinc-900 text-xs font-bold px-3 py-2 rounded-xl shadow-lg hover:bg-zinc-100 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" />
                  Đổi ảnh khác
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {poseKey && (
                  <button
                    onClick={handleSaveToPose}
                    className="bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-lg hover:bg-amber-600 flex items-center gap-1.5"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    {savedSuccess ? "Đã lưu vào dáng!" : "Lưu vào dáng này"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl p-6 text-center bg-zinc-50/70 dark:bg-zinc-900/50 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center shadow-inner">
                <Camera className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Tải lên ảnh vừa chụp thử tại hiện trường
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  AI sẽ audit ngay lập tức: dáng người, ngón tay, hướng mặt, góc máy, ánh sáng và đưa ra đúng 3 thay đổi cho cú bấm tiếp theo!
                </p>
              </div>

              <div className="flex items-center justify-center gap-2.5 pt-2">
                <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all">
                  <Upload className="w-4 h-4" />
                  Chọn từ máy
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                <label className="cursor-pointer bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 active:scale-95 transition-all shadow-sm">
                  <Camera className="w-4 h-4 text-indigo-500" />
                  Chụp ngay
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Quick context note input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Ghi chú nhanh tại hiện trường (Tùy chọn):
              </label>
              <button
                type="button"
                onClick={() => setShowContextDrawer(!showContextDrawer)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                <SlidersHorizontal className="w-3 h-3" />
                {showContextDrawer ? "Thu gọn thông số" : "+ Thêm thông số máy / bối cảnh"}
                {showContextDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <input
              type="text"
              value={contextNotes}
              onChange={(e) => setContextNotes(e.target.value)}
              placeholder="VD: Chụp ngược sáng hoàng hôn, mẫu nữ mới chụp lần đầu, đang bị gượng..."
              className="w-full text-xs p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Collapsible Optional Context Panel */}
          {showContextDrawer && (
            <div className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/80 pb-2">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Aperture className="w-3.5 h-3.5 text-indigo-500" />
                  Thông số thiết bị & môi trường (Không bắt buộc)
                </span>
                <span className="text-[10px] text-zinc-400">Giúp AI đưa lời khuyên chuẩn xác hơn</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-medium text-zinc-500 block mb-1">Thiết bị (Body/Phone):</label>
                  <input
                    type="text"
                    value={photographerContext.cameraModel || ""}
                    onChange={(e) =>
                      setPhotographerContext({ ...photographerContext, cameraModel: e.target.value })
                    }
                    placeholder="VD: Sony A7 IV / iPhone 15"
                    className="w-full text-[11px] p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-zinc-500 block mb-1">Ống kính (Lens):</label>
                  <input
                    type="text"
                    value={photographerContext.lens || ""}
                    onChange={(e) =>
                      setPhotographerContext({ ...photographerContext, lens: e.target.value })
                    }
                    placeholder="VD: 85mm f/1.4 hoặc 24-70mm"
                    className="w-full text-[11px] p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-zinc-500 block mb-1">Tiêu cự hiện tại:</label>
                  <input
                    type="text"
                    value={photographerContext.focalLength || ""}
                    onChange={(e) =>
                      setPhotographerContext({ ...photographerContext, focalLength: e.target.value })
                    }
                    placeholder="VD: 50mm hoặc 35mm"
                    className="w-full text-[11px] p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-zinc-500 block mb-1">Không gian:</label>
                  <select
                    value={photographerContext.environment || ""}
                    onChange={(e) =>
                      setPhotographerContext({
                        ...photographerContext,
                        environment: e.target.value as any,
                      })
                    }
                    className="w-full text-[11px] p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
                  >
                    <option value="">Tự động quan sát</option>
                    <option value="outdoor">Ngoài trời (Outdoor)</option>
                    <option value="indoor">Trong nhà (Indoor)</option>
                    <option value="studio">Studio</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Trigger button */}
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !photoDataUrl}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
              analyzing || !photoDataUrl
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {analyzing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>AI đang phân tích từng chi tiết hiện trường...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current text-amber-300" />
                <span>Audit & Nhận 3 Chỉnh Sửa Cho Cú Bấm Tiếp Theo</span>
              </>
            )}
          </button>

          {/* Error message */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Result Presentation */}
          {(structuredResult || result) && (
            <div className="space-y-3.5 pt-2">
              {/* 3-Second Action Banner: The Photographer's Call */}
              {structuredResult?.threeSecondRule && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-2 border-amber-500/30 text-zinc-900 dark:text-zinc-50 shadow-sm">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      Nếu Chụp Lại Ngay (Quy Tắc 3 Giây):
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-black text-zinc-900 dark:text-zinc-50 leading-snug">
                    "{structuredResult.threeSecondRule}"
                  </p>
                </div>
              )}

              {/* Standardized Score Badges */}
              {structuredResult?.scores && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {getScoreBadge("Tư thế", structuredResult.scores.posing)}
                  {getScoreBadge("Bố cục", structuredResult.scores.composition)}
                  {getScoreBadge("Biểu cảm", structuredResult.scores.expression)}
                  {getScoreBadge("Rủi ro", structuredResult.scores.technicalRisk)}
                </div>
              )}

              {/* Tabs for fast switching */}
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-1">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("fixes")}
                    className={`text-xs font-bold pb-2 px-1 relative transition-colors ${
                      activeTab === "fixes"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    }`}
                  >
                    3 Thay Đổi Cốt Lõi
                    {activeTab === "fixes" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("camera")}
                    className={`text-xs font-bold pb-2 px-1 relative transition-colors ${
                      activeTab === "camera"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    }`}
                  >
                    Góc Máy & Ánh Sáng
                    {activeTab === "camera" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab("raw")}
                    className={`text-xs font-bold pb-2 px-1 relative transition-colors ${
                      activeTab === "raw"
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    }`}
                  >
                    Toàn Văn Báo Cáo
                    {activeTab === "raw" && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pb-2">
                  <button
                    onClick={handleCopyMarkdown}
                    title="Sao chép toàn bộ báo cáo"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-xs flex items-center gap-1"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-[10px] text-emerald-500 font-bold">Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[10px] hidden xs:inline">Chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* TAB 1: 3 SỬA ĐỔI NGAY CỦA CÚ BẤM TIẾP THEO */}
              {activeTab === "fixes" && (
                <div className="space-y-3 animate-fadeIn">
                  {/* Quick Summary */}
                  {structuredResult?.quickSummary && (
                    <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">Nhận định nhanh: </span>
                      {structuredResult.quickSummary}
                    </div>
                  )}

                  {/* 3 Fixes Cards */}
                  {structuredResult?.immediateFixes && structuredResult.immediateFixes.length > 0 ? (
                    <div className="space-y-2.5">
                      {structuredResult.immediateFixes.map((fix, idx) => (
                        <div
                          key={fix.id || idx}
                          className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-900">
                              [AI CHỈNH NGAY #{idx + 1}]
                            </span>
                            {fix.title && (
                              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                {fix.title}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-start gap-2 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20">
                              <span className="text-[10px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                MẪU
                              </span>
                              <span className="text-zinc-800 dark:text-zinc-200 leading-snug font-medium">
                                {fix.modelAction}
                              </span>
                            </div>

                            <div className="flex items-start gap-2 bg-sky-500/10 p-2 rounded-xl border border-sky-500/20">
                              <span className="text-[10px] font-black bg-sky-600 text-white px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                MÁY
                              </span>
                              <span className="text-zinc-800 dark:text-zinc-200 leading-snug font-medium">
                                {fix.cameraAction}
                              </span>
                            </div>

                            <div className="flex items-start gap-2 bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                              <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded uppercase flex-shrink-0">
                                KẾT QUẢ
                              </span>
                              <span className="text-zinc-800 dark:text-zinc-200 leading-snug">
                                {fix.result}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500">
                      {result}
                    </div>
                  )}

                  {/* Issues Checklist */}
                  {structuredResult?.issues && (
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 block">
                        Tổng Hợp Điểm Cần Sửa:
                      </span>
                      <ul className="text-xs space-y-1.5 text-zinc-700 dark:text-zinc-300">
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-amber-600 min-w-14">• Mẫu:</span>
                          <span>{structuredResult.issues.model}</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-sky-600 min-w-14">• Máy:</span>
                          <span>{structuredResult.issues.camera}</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="font-bold text-violet-600 min-w-14">• Ánh sáng:</span>
                          <span>{structuredResult.issues.lighting}</span>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: GÓC MÁY & ÁNH SÁNG THỰC CHIẾN */}
              {activeTab === "camera" && (
                <div className="space-y-3 animate-fadeIn text-xs">
                  {/* Camera Breakdown */}
                  {structuredResult?.camera && (
                    <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                      <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
                        <Camera className="w-4 h-4 text-indigo-500" />
                        <span>Thông Số Góc Máy Đề Xuất</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-400 block text-[10px]">Chiều cao (Height):</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {structuredResult.camera.height}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-400 block text-[10px]">Hướng máy (Direction):</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {structuredResult.camera.direction}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-400 block text-[10px]">Khung hình (Framing):</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {structuredResult.camera.framing}
                          </span>
                        </div>

                        <div className="p-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                          <span className="text-zinc-400 block text-[10px]">Perspective quan sát:</span>
                          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                            {structuredResult.camera.perspective}
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-[11px] space-y-1">
                        <p className="text-indigo-950 dark:text-indigo-200">
                          <span className="font-bold">Ghi chú tiêu cự: </span>
                          {structuredResult.camera.focalLengthNote}
                        </p>
                        <p className="text-indigo-800 dark:text-indigo-300">
                          <span className="font-bold">Khuyến nghị quang học: </span>
                          {structuredResult.camera.recommendation}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Lighting & Composition */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {structuredResult?.lighting && (
                      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold border-b border-zinc-200 dark:border-zinc-800 pb-1">
                          <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                          <span>Ánh Sáng</span>
                        </div>
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">• Hướng sáng: </span>
                          {structuredResult.lighting.direction}
                        </p>
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">• Chất lượng: </span>
                          {structuredResult.lighting.quality}
                        </p>
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">• Cháy sáng / Bóng: </span>
                          {structuredResult.lighting.highlightsShadows}
                        </p>
                      </div>
                    )}

                    {structuredResult?.composition && (
                      <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-100 font-bold border-b border-zinc-200 dark:border-zinc-800 pb-1">
                          <Layers className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Bố Cục & Khung Hình</span>
                        </div>
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">• Vị trí: </span>
                          {structuredResult.composition.subjectPosition}
                        </p>
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">• Headroom / Lead: </span>
                          {structuredResult.composition.headroomLeadroom}
                        </p>
                        <p className="text-[11px] text-zinc-700 dark:text-zinc-300">
                          <span className="font-semibold">• Hậu cảnh: </span>
                          {structuredResult.composition.backgroundDistraction}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TOÀN VĂN BÁO CÁO (MARKDOWN) */}
              {activeTab === "raw" && (
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-line font-normal space-y-2 max-h-80 overflow-y-auto">
                  {result}
                </div>
              )}

              {/* Action buttons at bottom of results */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={handleAnalyze}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Phân tích lại
                </button>

                {poseKey && (
                  <button
                    onClick={handleSaveToPose}
                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 py-2 rounded-xl shadow flex items-center gap-1.5 active:scale-95 transition-all"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    {savedSuccess ? "Đã lưu vào bộ sưu tập!" : "Lưu ảnh vào dáng này"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
