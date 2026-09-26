import React, { useEffect, useState } from "react";
import { Download, Share2, X } from "lucide-react";
import { shareImageToDevice } from "../services/platformService";

export interface ReferenceSheetPose {
  key: string;
  title: string;
  categoryName: string;
  imageUrl?: string;
}

interface ReferenceSheetModalProps {
  poses: ReferenceSheetPose[];
  onClose: () => void;
}

const loadImage = (src?: string): Promise<HTMLImageElement | null> => new Promise((resolve) => {
  if (!src) return resolve(null);
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = src;
});

function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

export const ReferenceSheetModal: React.FC<ReferenceSheetModalProps> = ({ poses, onClose }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => () => {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
  }, [resultUrl]);

  const createSheet = async () => {
    setIsCreating(true);
    setError("");
    try {
      const loadedImages = await Promise.all(poses.map((pose) => loadImage(pose.imageUrl)));
      const columns = 3;
      const cellWidth = 280;
      const imageHeight = 300;
      const textHeight = 76;
      const padding = 24;
      const rows = Math.ceil(poses.length / columns);
      const canvas = document.createElement("canvas");
      canvas.width = padding * 2 + columns * cellWidth + (columns - 1) * 16;
      canvas.height = padding * 2 + 58 + rows * (imageHeight + textHeight + 16);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ tạo ảnh ghép.");

      ctx.fillStyle = "#f4f4f5";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#18181b";
      ctx.font = "700 28px sans-serif";
      ctx.fillText("TỜ THAM KHẢO TẠO DÁNG", padding, padding + 26);
      ctx.fillStyle = "#71717a";
      ctx.font = "14px sans-serif";
      ctx.fillText(`${poses.length} dáng đã chọn`, padding, padding + 48);

      for (let index = 0; index < poses.length; index++) {
        const pose = poses[index];
        const x = padding + (index % columns) * (cellWidth + 16);
        const y = padding + 58 + Math.floor(index / columns) * (imageHeight + textHeight + 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y, cellWidth, imageHeight + textHeight);
        if (loadedImages[index]) {
          drawCover(ctx, loadedImages[index]!, x, y, cellWidth, imageHeight);
        } else {
          ctx.fillStyle = "#e4e4e7";
          ctx.fillRect(x, y, cellWidth, imageHeight);
          ctx.fillStyle = "#71717a";
          ctx.font = "14px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Ảnh chưa tải được", x + cellWidth / 2, y + imageHeight / 2);
          ctx.textAlign = "left";
        }
        ctx.fillStyle = "#18181b";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText(pose.title.slice(0, 30), x + 12, y + imageHeight + 25);
        ctx.fillStyle = "#71717a";
        ctx.font = "12px sans-serif";
        ctx.fillText(pose.categoryName.slice(0, 36), x + 12, y + imageHeight + 49);
      }

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Không thể xuất ảnh ghép.")), "image/png");
      });
      setResultUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể tạo ảnh ghép.");
    } finally {
      setIsCreating(false);
    }
  };

  const downloadSheet = () => {
    if (!resultUrl) return;
    const anchor = document.createElement("a");
    anchor.href = resultUrl;
    anchor.download = "posing-to-tham-khao.png";
    anchor.click();
  };

  const shareSheet = async () => {
    if (!resultUrl) return;
    const response = await fetch(resultUrl);
    await shareImageToDevice(await response.blob(), "posing-to-tham-khao.png");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <section className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-3xl" onClick={(event) => event.stopPropagation()}>
        <header className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold">Tờ tham khảo</h2>
            <p className="text-xs text-zinc-500">{poses.length} dáng từ các chủ đề đã chọn</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </header>

        {resultUrl ? (
          <>
            <img src={resultUrl} alt="Bản xem trước tờ tham khảo" className="max-h-[58vh] w-full rounded-xl border border-zinc-200 object-contain dark:border-zinc-700" />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={downloadSheet} className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-3 py-2.5 text-xs font-bold text-zinc-950"><Download className="h-4 w-4" /> Tải ảnh</button>
              <button type="button" onClick={() => void shareSheet()} className="flex items-center justify-center gap-2 rounded-xl bg-zinc-100 px-3 py-2.5 text-xs font-bold dark:bg-zinc-800"><Share2 className="h-4 w-4" /> Chia sẻ</button>
            </div>
            <button type="button" onClick={() => void createSheet()} disabled={isCreating} className="mt-2 w-full rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold dark:border-zinc-700">Tạo lại ảnh ghép</button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {poses.map((pose) => (
                <div key={pose.key} className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                  {pose.imageUrl ? <img src={pose.imageUrl} alt="" className="aspect-square w-full object-cover" /> : <div className="aspect-square bg-zinc-100 dark:bg-zinc-800" />}
                  <p className="truncate px-2 py-1.5 text-[10px] font-semibold">{pose.title}</p>
                </div>
              ))}
            </div>
            {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
            <button type="button" onClick={() => void createSheet()} disabled={isCreating} className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-950 disabled:opacity-60">
              {isCreating ? "Đang tạo ảnh ghép…" : "Tạo tờ tham khảo"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
