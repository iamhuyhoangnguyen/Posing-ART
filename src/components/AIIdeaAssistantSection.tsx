import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  X,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
  Camera,
  Layers,
  ArrowRight,
  Key,
  User,
} from "lucide-react";
import { getRednoteChineseSearchUrl } from "../utils/rednoteTranslator";
import { serverUrl } from "../services/apiUrl";

export type AIModelType = "chatgpt" | "gemini" | "claude";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  image?: string;
  model?: AIModelType;
  timestamp: number;
}

interface AIIdeaAssistantSectionProps {
  onBackToHome: () => void;
  onOpenAIAccountLogin?: () => void;
}

export const AIIdeaAssistantSection: React.FC<AIIdeaAssistantSectionProps> = ({
  onBackToHome,
  onOpenAIAccountLogin,
}) => {
  const [selectedModel, setSelectedModel] = useState<AIModelType>("chatgpt");
  const [inputText, setInputText] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "ai",
      model: "chatgpt",
      text: `Chào bạn! Bạn đang bí ý tưởng hay cần tìm concept chụp ảnh mới lạ?

Tôi được kết nối với **ChatGPT**, **Gemini** và **Claude** để hỗ trợ bạn:
• **Nhập yêu cầu ý tưởng** hoặc **nói trực tiếp bằng giọng nói**
• **Gửi ảnh mẫu** để AI phân tích dáng chụp, góc máy và trang phục
• **Tự động quy đổi từ khóa sang tiếng Trung** để tìm kiếm trên Rednote (Tiểu Hồng Thư)

Hãy thử chọn một gợi ý bên dưới hoặc bấm micro để nói nhé!`,
      timestamp: Date.now(),
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initialize Web Speech API for Vietnamese
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "vi-VN";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!recognitionRef.current) {
      alert("Trình duyệt của bạn chưa hỗ trợ nhận diện giọng nói. Bạn hãy dùng Chrome hoặc Edge nhé!");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        setIsRecording(false);
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("Vui lòng chọn ảnh nhỏ hơn 15MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!queryText && !attachedImage) return;

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      text: queryText,
      image: attachedImage || undefined,
      model: selectedModel,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    const sentImage = attachedImage;
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const res = await fetch(serverUrl("/api/ai/creative-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          model: selectedModel,
          message: queryText,
          image: sentImage,
          mimeType: "image/jpeg",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Không thể kết nối với mô hình AI");
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: data.reply,
        model: selectedModel,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error: any) {
      // Offline fallback smart responder
      const fallbackMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        model: selectedModel,
        text: `⚠️ Chưa nhận được phản hồi từ máy chủ AI${error instanceof Error ? ` (${error.message})` : ""}. Đây là gợi ý dự phòng ngoại tuyến.\n\n` +
          `### 💡 Gợi Ý Ý Tưởng Concept Cho: "${queryText || "Ảnh mẫu"}"\n\n` +
          `**1. Dáng 1 - Góc Nghiêng Tự Nhiên**: Đứng xoay vai 45 độ so với ống kính, tay lướt nhẹ qua tóc mai, cằm hơi hạ 1-2cm tạo nét thon gọn.\n` +
          `**2. Dáng 2 - Bắt Nhịp Tương Tác**: Tay cầm hoa hoặc đạo cụ che 1/3 khuôn mặt, ánh mắt nhìn thẳng ống kính đầy cảm xúc.\n` +
          `**3. Dáng 3 - Khoảnh Khắc Bước Đi**: Bước chậm rãi, váy bay bồng bềnh, chụp liên tục bắt biểu cảm cười tự nhiên.\n\n` +
          `📐 **Góc Máy:** Chụp ngang tầm mắt hoặc góc thấp 20 độ để tôn chiều dài đôi chân.\n` +
          `💡 **Ánh Sáng:** Giờ vàng 16h30 - 17h30 bắt ngược sáng mềm mại.\n` +
          `🇨🇳 **Từ khóa Rednote tiếng Trung:** \`女生写真 拍照姿势 氛围感 青春\``,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Pre-formatted external links for 3 models
  const getExternalModelUrl = () => {
    const prompt = inputText || "Gợi ý cho tôi 5 dáng chụp ảnh kỷ yếu và concept cá nhân độc đáo, góc máy và mẹo diễn xuất";
    if (selectedModel === "chatgpt") {
      return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
    }
    if (selectedModel === "gemini") {
      return `https://gemini.google.com/app`;
    }
    return `https://claude.ai/new`;
  };

  const quickPromptChips = [
    "Ý tưởng chụp nàng thơ hoa cúc ngoài trời",
    "Dáng kỷ yếu đôi bạn thân nữ không bị gượng",
    "Tư thế chụp che khuyết điểm mặt tròn",
    "Concept áo dài trắng nón lá thanh xuân",
    "Chụp flash đêm đường phố cá tính cool ngầu",
  ];

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Top Banner & Return button */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3">
          <button
            onClick={onBackToHome}
            className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all flex items-center gap-1.5"
          >
            ← Về menu
          </button>

          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
            Phần 3 • Trợ Lý Sáng Tạo 3 Siêu AI
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
              <span>Bạn Đang Bí Ý Tưởng?</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                AI Studio
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              Hỏi đáp ý tưởng dáng chụp, kịch bản concept và phân tích ảnh cùng 3 mô hình hàng đầu thế giới
            </p>
          </div>

          <a
            href={getExternalModelUrl()}
            target="_blank"
            rel="noopener noreferrer"
            title="Mở câu hỏi trực tiếp trên trang chủ của mô hình này"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-bold shadow-xs active:scale-95 transition-all self-start sm:self-auto"
          >
            <span>Mở web {selectedModel.toUpperCase()}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>

        {/* PERSONAL AI ACCOUNT LOGIN CARD / BUTTON */}
        {onOpenAIAccountLogin && (
          <div className="mt-3.5 p-3 sm:p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <span>Tài Khoản AI Cá Nhân</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Cá nhân hoá
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  Bấm vào đây để chuyển sang đăng nhập tài khoản cá nhân & liên kết ChatGPT, Gemini, Claude của bạn
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAIAccountLogin}
              className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <span>Đăng nhập tài khoản AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3 AI Model Switcher Tabs with Specific Authentic Logos */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {/* Model 1: ChatGPT (OpenAI) */}
          <button
            onClick={() => setSelectedModel("chatgpt")}
            className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              selectedModel === "chatgpt"
                ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 text-zinc-900 dark:text-zinc-50 shadow-xs ring-1 ring-emerald-500/30"
                : "bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#10A37F] text-white flex items-center justify-center shadow-xs">
                {/* Official OpenAI Vortex / Swirl SVG Icon */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1683a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4947zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1683a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.5973 8.3829l2.02-1.1636a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.402-.6862zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L8.907 9.2298V6.8974a.0662.0662 0 0 1 .0331-.0615L13.9161 4.05a4.4992 4.4992 0 0 1 6.5347 4.6773zM10.8703 14.814l-2.9142-1.6843 2.9142-1.6843 2.9142 1.6843z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                GPT-4o
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs">ChatGPT</div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                Kịch bản & Concept
              </p>
            </div>
          </button>

          {/* Model 2: Gemini (Google) */}
          <button
            onClick={() => setSelectedModel("gemini")}
            className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              selectedModel === "gemini"
                ? "bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 text-zinc-900 dark:text-zinc-50 shadow-xs ring-1 ring-blue-500/30"
                : "bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1B72E8] via-[#8E75FF] to-[#D96570] text-white flex items-center justify-center shadow-xs">
                {/* Official Google Gemini Sparkle SVG Icon */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                Gemini 2.5
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs">Gemini</div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                Thị giác & Góc máy
              </p>
            </div>
          </button>

          {/* Model 3: Claude (Anthropic) */}
          <button
            onClick={() => setSelectedModel("claude")}
            className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
              selectedModel === "claude"
                ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-500 text-zinc-900 dark:text-zinc-50 shadow-xs ring-1 ring-amber-500/30"
                : "bg-zinc-50/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-[#D97706] text-white flex items-center justify-center shadow-xs">
                {/* Official Anthropic Claude Sunburst Star Icon */}
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l1.6 5.8 5.8-1.6-3 5.2 4.9 3.5-5.9 1.1.8 6-5.2-3-3.5 4.9-1.1-5.9-6 .8 3-5.2-4.9-3.5 5.9-1.1-.8-6 5.2 3z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                Claude 3.7
              </span>
            </div>
            <div>
              <div className="font-extrabold text-xs">Claude</div>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                Mỹ học & Ánh sáng
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-4 sm:p-5 min-h-[360px] max-h-[560px] overflow-y-auto space-y-4 shadow-xs">
        {messages.map((msg) => {
          const isUser = msg.sender === "user";

          // Extract potential Chinese tags for direct Rednote search button
          const chineseMatches = msg.text.match(/[\u4e00-\u9fa5]+/g);
          const chineseKeyword = chineseMatches && chineseMatches.length > 0 ? chineseMatches.join(" ") : null;

          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs">
                  {msg.model === "claude" ? "C" : msg.model === "gemini" ? "G" : "AI"}
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm ${
                  isUser
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 ml-auto shadow-xs"
                    : "bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/70 dark:border-zinc-700/60 text-zinc-800 dark:text-zinc-200"
                }`}
              >
                {/* User sent image preview */}
                {msg.image && (
                  <div className="mb-3 rounded-xl overflow-hidden max-h-56 max-w-xs border border-white/20">
                    <img
                      src={msg.image}
                      alt="Ảnh tải lên"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Message Body with clean formatting */}
                <div className="whitespace-pre-wrap leading-relaxed font-normal">
                  {msg.text}
                </div>

                {/* AI Action helpers: Copy & Direct Rednote search with auto-converted Chinese */}
                {!isUser && (
                  <div className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(msg.text, msg.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedId === msg.id ? "Đã chép" : "Sao chép"}</span>
                      </button>
                    </div>

                    {chineseKeyword && (
                      <a
                        href={getRednoteChineseSearchUrl(chineseKeyword)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Tìm kiếm từ khóa "${chineseKeyword}" trên Rednote`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#FF2442] hover:bg-[#d91934] px-2.5 py-1 rounded-lg shadow-2xs transition-colors"
                      >
                        <span className="bg-white/20 text-[9px] px-1 rounded-sm">RED</span>
                        <span>Tìm ảnh mẫu trên Rednote (Tiếng Trung)</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-80" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center flex-shrink-0 text-xs font-bold animate-pulse">
              AI
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-4 max-w-[75%] text-xs text-zinc-500 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-zinc-600 dark:text-zinc-400" />
              <span>{selectedModel.toUpperCase()} đang phân tích và sáng tạo dáng chụp...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Offline Notice Banner if disconnected */}
      {!isOnline && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0" />
          <span>
            <strong>Chế độ Ngoại Tuyến:</strong> Tính năng trò chuyện cùng 3 Siêu AI (ChatGPT, Gemini, Claude) tạm dừng do không có mạng Internet. Hãy kết nối WiFi/4G để tiếp tục. Toàn bộ dáng và ảnh đã tải trước vẫn xem bình thường!
          </span>
        </div>
      )}

      {/* Quick Prompt Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider flex-shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3 h-3" />
          Gợi ý nhanh:
        </span>
        {quickPromptChips.map((chip, idx) => (
          <button
            key={idx}
            disabled={!isOnline}
            onClick={() => handleSendMessage(chip)}
            className="flex-shrink-0 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-200/80 dark:border-zinc-800 transition-colors active:scale-95 whitespace-nowrap shadow-2xs disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Interactive Input Bar (Chat, Voice, Send Photo) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl p-3 shadow-sm space-y-2">
        {/* Attached photo preview */}
        {attachedImage && (
          <div className="relative inline-block rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
            <img
              src={attachedImage}
              alt="Ảnh đính kèm"
              className="w-16 h-16 object-cover"
            />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Live Voice Recording Status */}
        {isRecording && (
          <div className="flex items-center justify-between bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl px-3 py-2 text-xs text-rose-700 dark:text-rose-400 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <span className="font-semibold">Đang lắng nghe giọng nói của bạn (tiếng Việt)...</span>
            </div>
            <button
              onClick={toggleVoiceRecording}
              className="text-[11px] font-bold underline cursor-pointer"
            >
              Dừng lại
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Send Photo Attachment Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isOnline}
            title={isOnline ? "Đính kèm ảnh mẫu để AI phân tích dáng" : "AI tạm dừng khi ngoại tuyến"}
            className="p-2.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all flex-shrink-0 disabled:opacity-40"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Voice Input Button */}
          <button
            onClick={toggleVoiceRecording}
            disabled={!isOnline}
            title={
              !isOnline
                ? "AI tạm dừng khi ngoại tuyến"
                : isRecording
                ? "Dừng ghi âm"
                : "Nói bằng giọng nói tiếng Việt"
            }
            className={`p-2.5 rounded-2xl transition-all flex-shrink-0 ${
              isRecording
                ? "bg-rose-500 text-white animate-bounce shadow-md"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 disabled:opacity-40"
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              rows={1}
              disabled={!isOnline}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={
                !isOnline
                  ? "AI tạm dừng khi không có kết nối internet..."
                  : `Hỏi ý tưởng ${selectedModel.toUpperCase()} (nhập chữ hoặc bấm mic nói)...`
              }
              className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700 rounded-2xl py-2.5 px-3.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:border-zinc-500 transition-colors resize-none disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed"
            />
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={!isOnline || (!inputText.trim() && !attachedImage) || isLoading}
            className={`p-2.5 rounded-2xl transition-all flex-shrink-0 ${
              !isOnline || (!inputText.trim() && !attachedImage) || isLoading
                ? "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 active:scale-95 shadow-xs"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
