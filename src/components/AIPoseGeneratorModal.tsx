import React, { useState } from "react";
import {
  X,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Download,
  BookmarkPlus,
  RefreshCw,
  AlertCircle,
  Wand2,
  Layers,
  ArrowRight,
  Eye,
  Activity,
  CheckCircle2,
  Sliders,
  ChevronRight,
  RotateCcw,
  User,
  Users,
  Footprints,
  Compass,
  CornerDownRight,
  Share2,
} from "lucide-react";
import { addPhoto } from "../utils/db";
import { serverUrl } from "../services/apiUrl";
import type { VariationLevel, PoseReferenceData, PoseTypeCategory } from "../types/index";

interface AIPoseGeneratorModalProps {
  initialPrompt?: string;
  targetPoseKey?: string;
  initialReferenceImage?: string;
  initialPoseTitle?: string;
  initialCategoryName?: string;
  onClose: () => void;
  onPhotoSavedToPose?: () => void;
  onOpenAdvisor?: (pose: any, categoryName: string, initialPhotoUrl?: string) => void;
}

export const AIPoseGeneratorModal: React.FC<AIPoseGeneratorModalProps> = ({
  initialPrompt = "",
  targetPoseKey,
  initialReferenceImage = "",
  initialPoseTitle = "Dáng Mẫu Hiện Tại",
  initialCategoryName = "Tham Khảo",
  onClose,
  onPhotoSavedToPose,
  onOpenAdvisor,
}) => {
  // Config & Inputs
  const [referenceImage, setReferenceImage] = useState<string>(initialReferenceImage);
  const [poseTitle, setPoseTitle] = useState<string>(initialPoseTitle);
  const [categoryName] = useState<string>(initialCategoryName);
  const [variationLevel, setVariationLevel] = useState<VariationLevel>(1);
  const [selectedPoseType, setSelectedPoseType] = useState<PoseTypeCategory>("stand");
  const [gender, setGender] = useState<"nu" | "nam" | "couple" | "nhom">("nu");
  const [concept, setConcept] = useState<string>(initialCategoryName || "Kỷ Yếu & Ngoại Cảnh");
  const [customNotes, setCustomNotes] = useState<string>(initialPrompt);
  const [aspectRatio, setAspectRatio] = useState<string>("3:4");

  // Output State
  const [generating, setGenerating] = useState(false);
  const [poseResult, setPoseResult] = useState<PoseReferenceData | null>(null);
  const [error, setError] = useState<string>("");
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resultTab, setResultTab] = useState<"visual" | "anatomy" | "field">("visual");

  const poseTypesList: {
    id: PoseTypeCategory;
    name: string;
    icon: string;
    desc: string;
  }[] = [
    {
      id: "stand",
      name: "Đứng Tự Nhiên",
      icon: "🧍‍♀️",
      desc: "Xoay góc 45°, nghiêng vai, chân trước nhẹ",
    },
    {
      id: "sit",
      name: "Ngồi Bậc Thềm / Ghế",
      icon: "🪑",
      desc: "Ngồi 1/3 mép bậc, duỗi chân chéo thanh thoát",
    },
    {
      id: "walk",
      name: "Đi Lại Chuyển Động",
      icon: "🚶‍♀️",
      desc: "Bước đi tự nhiên, váy áo bay nhẹ, candid",
    },
    {
      id: "lean",
      name: "Tựa Tường / Lan Can",
      icon: "🧱",
      desc: "Tựa lưng hoặc vai, tạo đường chéo khoẻ khoắn",
    },
    {
      id: "props",
      name: "Tương Tác Đạo Cụ",
      icon: "💐",
      desc: "Cầm hoa, nón cói, sách, ly cafe, máy ảnh",
    },
    {
      id: "portrait",
      name: "Cận Cảnh / Bán Thân",
      icon: "🔍",
      desc: "Nhấn vào đôi mắt, nụ cười và bàn tay chạm tóc",
    },
    {
      id: "lie",
      name: "Nằm Thư Giãn",
      icon: "🌿",
      desc: "Nằm trên cỏ, góc chụp từ trên thẳng xuống",
    },
  ];

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setReferenceImage(reader.result as string);
      setPoseTitle(file.name.replace(/\.[^/.]+$/, "") || "Ảnh Tải Lên");
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (overrideLevel?: VariationLevel) => {
    const levelToUse = overrideLevel || variationLevel;
    try {
      setGenerating(true);
      setError("");

      const shotTypeMap: Record<PoseTypeCategory, "full" | "medium" | "sitting" | "close"> = {
        stand: "full",
        sit: "sitting",
        walk: "full",
        lean: "medium",
        props: "medium",
        portrait: "close",
        lie: "full",
      };

      const response = await fetch(serverUrl("/api/ai/generate-pose"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: customNotes,
          referenceImage: referenceImage || undefined,
          referencePoseTitle: poseTitle,
          referenceCategory: categoryName,
          variationLevel: levelToUse,
          gender,
          shotType: shotTypeMap[selectedPoseType] || "full",
          concept: `${concept} (Kiểu dáng: ${selectedPoseType})`,
          aspectRatio,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Không thể tạo biến thể dáng lúc này.");
      }

      if (data.poseData) {
        setPoseResult(data.poseData);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Đã xảy ra lỗi khi tạo biến thể dáng tham khảo.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToPose = async () => {
    const imageToSave = poseResult?.imageUrl || referenceImage;
    if (!imageToSave) return;

    try {
      const key = targetPoseKey || `custom-pose-${Date.now()}`;
      const res = await fetch(imageToSave);
      const blob = await res.blob();
      await addPhoto(
        key,
        blob,
        `AI Biến Thể Lv${poseResult?.variationLevel || 1}: ${poseResult?.title || poseTitle}`
      );
      setSavedSuccess(true);
      if (onPhotoSavedToPose) onPhotoSavedToPose();
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.error("Lỗi lưu ảnh AI vào IndexedDB:", e);
    }
  };

  const handleDownload = () => {
    const img = poseResult?.imageUrl || referenceImage;
    if (!img) return;
    const a = document.createElement("a");
    a.href = img;
    a.download = `Posing_Ref_Lv${poseResult?.variationLevel || 1}_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleFeedAsNextReference = () => {
    if (!poseResult) return;
    if (poseResult.imageUrl) {
      setReferenceImage(poseResult.imageUrl);
    }
    setPoseTitle(poseResult.title);
    setPoseResult(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-slideUp">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <Camera className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-50">
                  AI Pose Reference Generator
                </h2>
                <span className="text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full shadow-xs">
                  Sổ Tay Hình Thể
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Phân tích giải phẫu học • Biến tấu tay, chân, thân, đầu • Tạo dáng thực chiến
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

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* STEP 1: REFERENCE / UPLOAD (LARGE VISUAL CARD) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-bold">
                  1
                </span>
                <span>ẢNH REFERENCE / DÁNG THAM KHẢO</span>
              </label>
              {referenceImage && (
                <button
                  onClick={() => setReferenceImage("")}
                  className="text-xs text-zinc-400 hover:text-rose-500 flex items-center gap-1 font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Đổi sang tạo mới từ đầu
                </button>
              )}
            </div>

            {referenceImage ? (
              <div className="bg-amber-500/5 dark:bg-amber-950/20 p-3.5 rounded-3xl border border-amber-500/20 flex items-center gap-3.5">
                <div className="relative w-20 h-24 rounded-2xl overflow-hidden border border-amber-500/30 flex-shrink-0 shadow-sm">
                  <img
                    src={referenceImage}
                    alt="Reference"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/60 text-[9px] font-bold text-white">
                    Gốc
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                    {poseTitle}
                  </div>
                  <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mt-0.5">
                    Chủ đề: {categoryName}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                    AI sẽ bóc tách giải phẫu (Đầu • Vai/Thân • Tay • Hông/Chân • Silhouette) để biến tấu dáng mới có liên hệ chặt chẽ.
                  </p>
                </div>

                <label className="px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-colors shadow-xs">
                  Đổi ảnh
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleRefUpload}
                  />
                </label>
              </div>
            ) : (
              /* Two Large Option Cards */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option A: Upload */}
                <label className="group p-4 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-amber-500 dark:hover:border-amber-400 bg-white dark:bg-zinc-900 cursor-pointer transition-all flex flex-col items-center justify-center text-center gap-2 hover:shadow-md">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                      Tải Ảnh Dáng Mẫu Có Sẵn
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Từ album máy, ảnh chụp, Pinterest hoặc Rednote
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleRefUpload}
                  />
                </label>

                {/* Option B: Generate from Scratch */}
                <div className="p-4 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-zinc-800 dark:text-zinc-200">
                      Tạo Mới Từ Đầu (Không Cần Ảnh)
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Chọn mức độ & kiểu dáng bên dưới, AI sẽ dựng dáng chuẩn hình thể
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: 3 VARIATION LEVELS (HORIZONTAL CARDS WITH CLEAR VISUAL CUES) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                <span>MỨC ĐỘ BIẾN TẤU HÌNH THỂ</span>
              </label>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                Cấp độ {variationLevel}/3
              </span>
            </div>

            {/* Horizontal Scrolling Level Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* LEVEL 1 */}
              <button
                type="button"
                onClick={() => setVariationLevel(1)}
                className={`p-4 rounded-3xl text-left transition-all border ${
                  variationLevel === 1
                    ? "bg-amber-500/10 border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 shadow-md scale-[1.01]"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 opacity-90"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Level 1 • Biến Tấu Nhẹ
                  </span>
                  {variationLevel === 1 && (
                    <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Giữ 90% Cấu Trúc Gốc
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Chỉ thay đổi vị trí tay, hướng đầu, ánh mắt, chân trước, biểu cảm.
                </p>
              </button>

              {/* LEVEL 2 */}
              <button
                type="button"
                onClick={() => setVariationLevel(2)}
                className={`p-4 rounded-3xl text-left transition-all border ${
                  variationLevel === 2
                    ? "bg-amber-500/10 border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 shadow-md scale-[1.01]"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 opacity-90"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Level 2 • Biến Tấu Vừa
                  </span>
                  {variationLevel === 2 && (
                    <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Đổi Trục Thân & Trọng Tâm
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Đổi hướng xoay thân, chuyển chân trụ, độ cong hông, tương tác đạo cụ.
                </p>
              </button>

              {/* LEVEL 3 */}
              <button
                type="button"
                onClick={() => setVariationLevel(3)}
                className={`p-4 rounded-3xl text-left transition-all border ${
                  variationLevel === 3
                    ? "bg-amber-500/10 border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 shadow-md scale-[1.01]"
                    : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 opacity-90"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Level 3 • Sáng Tạo
                  </span>
                  {variationLevel === 3 && (
                    <CheckCircle2 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Giữ Silhouette Chính
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Tái tạo thế chuyển động mới tự do, không gian âm mở, giàu cảm xúc.
                </p>
              </button>
            </div>
          </div>

          {/* STEP 3: POSE TYPE / KIỂU DÁNG MONG MUỐN (HORIZONTAL SCROLLING BUTTON CARDS) */}
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-bold">
                3
              </span>
              <span>KIỂU DÁNG CƠ THỂ MONG MUỐN</span>
            </label>

            {/* Horizontal Track of Pose Types */}
            <div className="flex gap-2.5 overflow-x-auto pb-1.5 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
              {poseTypesList.map((pt) => {
                const isSelected = selectedPoseType === pt.id;
                return (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setSelectedPoseType(pt.id)}
                    className={`flex-shrink-0 w-36 sm:w-44 p-3 rounded-2xl text-left border transition-all ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 dark:border-amber-400 ring-2 ring-amber-500/20 shadow-sm"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                    }`}
                  >
                    <div className="text-2xl mb-1.5">{pt.icon}</div>
                    <div className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 truncate">
                      {pt.name}
                    </div>
                    <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                      {pt.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 4: QUICK TARGET & RATIO SELECTION */}
          <div className="space-y-2">
            <label className="text-xs font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[11px] font-bold">
                4
              </span>
              <span>ĐỐI TƯỢNG, BỐI CẢNH & TỈ LỆ KHUNG HÌNH</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Target / Gender */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Người chụp:
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold outline-none"
                >
                  <option value="nu">Nữ (1 người)</option>
                  <option value="nam">Nam (1 người)</option>
                  <option value="couple">Cặp đôi (Couple)</option>
                  <option value="nhom">Nhóm bạn (Besties)</option>
                </select>
              </div>

              {/* Aspect Ratio */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Tỉ lệ ảnh:
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-semibold outline-none"
                >
                  <option value="3:4">3:4 (Chân dung dọc chuẩn)</option>
                  <option value="1:1">1:1 (Vuông)</option>
                  <option value="16:9">16:9 (Điện ảnh ngang)</option>
                  <option value="9:16">9:16 (Story / TikTok)</option>
                </select>
              </div>

              {/* Concept input */}
              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
                  Concept / Bối cảnh:
                </label>
                <input
                  type="text"
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="VD: Áo dài phố cổ, cafe vintage..."
                  className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-medium outline-none"
                />
              </div>
            </div>

            {/* Extra notes */}
            <div>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Ghi chú thêm: VD: Tay cầm bó hoa sen, mắt nhìn hướng 2 giờ..."
                className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 outline-none"
              />
            </div>
          </div>

          {/* STEP 5: LARGE GENERATE BUTTON */}
          <div>
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={generating}
              className={`w-full py-4 px-6 rounded-3xl font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg active:scale-[0.98] ${
                generating
                  ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/25 cursor-pointer"
              }`}
            >
              {generating ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Đang Phân Tích & Tạo Biến Thể Dáng Hình Học...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>
                    {referenceImage
                      ? `TẠO BIẾN THỂ TỪ REFERENCE (LEVEL ${variationLevel})`
                      : `TẠO DÁNG MỚI THEO CONCEPT (${selectedPoseType.toUpperCase()})`}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>

          {/* ERROR ALERT */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* RESULT CARD (ANATOMY-FIRST REFERENCE NOTEBOOK) */}
          {/* ======================================================== */}
          {poseResult && (
            <div className="bg-zinc-50 dark:bg-zinc-950/80 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 space-y-4 shadow-sm animate-fadeIn">
              {/* Result Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500 text-white">
                      Level {poseResult.variationLevel} • {poseResult.variationType}
                    </span>
                    <span className="text-xs text-zinc-400">Kết quả tham khảo dáng</span>
                  </div>
                  <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-50 mt-1">
                    {poseResult.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {poseResult.summary}
                  </p>
                </div>

                {/* Branch Out Button */}
                <button
                  onClick={handleFeedAsNextReference}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
                  title="Dùng kết quả này làm gốc để biến tấu tiếp"
                >
                  <CornerDownRight className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dùng làm gốc tạo tiếp</span>
                </button>
              </div>

              {/* Main Visual Display & 5-Point Anatomy Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Visual Image */}
                <div className="md:col-span-5 relative rounded-2xl overflow-hidden bg-black/5 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 min-h-[260px] flex items-center justify-center">
                  {poseResult.imageUrl ? (
                    <img
                      src={poseResult.imageUrl}
                      alt={poseResult.title}
                      className="w-full h-full object-cover max-h-[380px]"
                    />
                  ) : (
                    <div className="p-6 text-center text-xs text-zinc-400">
                      <Sparkles className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                      <div>Sơ đồ giải phẫu học hoàn tất</div>
                    </div>
                  )}

                  {/* Wireframe Tag */}
                  {poseResult.visualPoseWireframe && (
                    <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-black/70 backdrop-blur-md text-[10px] text-white space-y-0.5">
                      <div className="font-bold text-amber-400">
                        Hình khối: {poseResult.visualPoseWireframe.silhouetteShape} • Chân trụ:{" "}
                        {poseResult.visualPoseWireframe.weightFoot}
                      </div>
                      <div className="text-zinc-300 truncate">
                        {poseResult.visualPoseWireframe.armPositionSummary}
                      </div>
                    </div>
                  )}
                </div>

                {/* 5 Anatomy Points (Head, Torso, Arms, Legs, Silhouette) */}
                <div className="md:col-span-7 space-y-2.5">
                  <div className="text-xs font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                    <span>5 ĐIỂM GIẢI PHẪU ANATOMY CỐT LÕI:</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* Head */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        👤 Đầu & Ánh Mắt:
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {poseResult.anatomy.head}
                      </span>
                    </div>

                    {/* Torso */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        🥋 Vai & Thân:
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {poseResult.anatomy.torso}
                      </span>
                    </div>

                    {/* Arms & Hands */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        🤲 Tay & Bàn Tay:
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {poseResult.anatomy.armsHands}
                      </span>
                    </div>

                    {/* Hips & Legs */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        🦵 Hông & Chân Trụ:
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {poseResult.anatomy.hipsLegs}
                      </span>
                    </div>

                    {/* Silhouette */}
                    <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">
                        📐 Silhouette & Khoảng Trống Âm:
                      </span>{" "}
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {poseResult.anatomy.silhouette}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Execution Notes (Real photographer cues) */}
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/60 text-xs space-y-1.5">
                <div className="font-extrabold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  MẸO NHẮC MẪU THỰC CHIẾN (KHÔNG KỊCH BẢN PHỨC TẠP):
                </div>
                <div className="text-zinc-700 dark:text-zinc-300">
                  <strong>Khẩu lệnh cho mẫu:</strong> "{poseResult.fieldExecution.modelAction}"
                </div>
                <div className="text-zinc-700 dark:text-zinc-300">
                  <strong>Thợ ảnh chú ý:</strong> {poseResult.fieldExecution.photographerCue}
                </div>
                <div className="text-rose-600 dark:text-rose-400">
                  <strong>Tránh lỗi:</strong> {poseResult.fieldExecution.commonMistake}
                </div>
              </div>

              {/* Quick One-Click Switch Variation Level Buttons */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-zinc-500">Thử mức khác:</span>
                  {[1, 2, 3].map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => handleGenerate(lvl as VariationLevel)}
                      disabled={generating}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        poseResult.variationLevel === lvl
                          ? "bg-amber-500 text-white"
                          : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300"
                      }`}
                    >
                      Level {lvl}
                    </button>
                  ))}
                </div>

                {/* Save & Download buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownload}
                    className="p-2.5 rounded-xl bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 transition-colors"
                    title="Tải ảnh về máy"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleSaveToPose}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <BookmarkPlus className="w-4 h-4" />
                    <span>{savedSuccess ? "Đã lưu thành công!" : "Lưu vào album"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
