import React, { useRef } from "react";
import { Download, X } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

interface CategoryShareQrModalProps {
  categoryLabel: string;
  shareUrl: string;
  onClose: () => void;
}

export const CategoryShareQrModal: React.FC<CategoryShareQrModalProps> = ({ categoryLabel, shareUrl, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const downloadQr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `posing-art-${categoryLabel.trim().replace(/[^\p{L}\p{N}-]+/gu, "-").replace(/^-|-$/g, "") || "danh-muc"}-qr.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4" role="presentation" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-qr-title"
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl dark:bg-zinc-900"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" aria-label="Đóng mã QR" onClick={onClose} className="absolute right-3 top-3 rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <X className="h-5 w-5" />
        </button>
        <h2 id="category-qr-title" className="pr-7 text-lg font-black text-zinc-900 dark:text-white">Chia sẻ danh mục</h2>
        <p className="mt-1 text-sm font-semibold text-zinc-600 dark:text-zinc-300">{categoryLabel}</p>
        <div className="mx-auto mt-5 inline-flex rounded-2xl bg-white p-3 shadow-inner ring-1 ring-zinc-200">
          <QRCodeCanvas ref={canvasRef} value={shareUrl} size={240} level="M" includeMargin title={`Mã QR danh mục ${categoryLabel}`} />
        </div>
        <p className="mt-4 break-all rounded-xl bg-zinc-100 p-3 text-left text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{shareUrl}</p>
        <p className="mt-2 text-xs text-zinc-500">Quét mã để mở danh mục công khai trên web.</p>
        <button type="button" onClick={downloadQr} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-amber-400">
          <Download className="h-4 w-4" />Tải ảnh QR
        </button>
      </section>
    </div>
  );
};
