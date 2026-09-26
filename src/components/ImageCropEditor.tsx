import React, { useEffect, useRef } from "react";

export interface ImageCropPosition {
  zoom: number;
  x: number;
  y: number;
}

interface ImageCropEditorProps {
  src: string;
  position: ImageCropPosition;
  onPositionChange: (position: ImageCropPosition) => void;
}

const OUTPUT_WIDTH = 1200;
const OUTPUT_HEIGHT = 675;

function drawCrop(context: CanvasRenderingContext2D, image: HTMLImageElement, position: ImageCropPosition) {
  const scale = Math.max(OUTPUT_WIDTH / image.naturalWidth, OUTPUT_HEIGHT / image.naturalHeight) * position.zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  const left = (OUTPUT_WIDTH - width) / 2 + position.x * Math.max(0, width - OUTPUT_WIDTH) / 2;
  const top = (OUTPUT_HEIGHT - height) / 2 + position.y * Math.max(0, height - OUTPUT_HEIGHT) / 2;
  context.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.drawImage(image, left, top, width, height);
}

export async function createCroppedImageDataUrl(src: string, position: ImageCropPosition): Promise<string> {
  const image = new Image();
  if (!src.startsWith("data:") && !src.startsWith("blob:")) image.crossOrigin = "anonymous";
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Không thể mở công cụ cắt ảnh.");
  try {
    drawCrop(context, image, position);
    return canvas.toDataURL("image/jpeg", 0.88);
  } catch {
    throw new Error("Không thể cắt ảnh này. Hãy tải ảnh về máy rồi chọn lại để tiếp tục.");
  }
}

export const ImageCropEditor: React.FC<ImageCropEditorProps> = ({ src, position, onPositionChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null);

  useEffect(() => {
    let active = true;
    const image = new Image();
    if (!src.startsWith("data:") && !src.startsWith("blob:")) image.crossOrigin = "anonymous";
    image.onload = () => {
      if (!active) return;
      imageRef.current = image;
      const context = canvasRef.current?.getContext("2d");
      if (context) {
        try {
          drawCrop(context, image, position);
        } catch {
          // A cross-origin image without CORS support can still be displayed by the preview above.
        }
      }
    };
    image.src = src;
    return () => {
      active = false;
      imageRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const image = imageRef.current;
    const context = canvasRef.current?.getContext("2d");
    if (image?.complete && context) {
      try {
        drawCrop(context, image, position);
      } catch {
        // Keep the last preview visible when the remote host disallows canvas access.
      }
    }
  }, [position]);

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onPositionChange({
      ...position,
      x: Math.max(-1, Math.min(1, drag.startX + ((event.clientX - drag.x) / rect.width) * 2)),
      y: Math.max(-1, Math.min(1, drag.startY + ((event.clientY - drag.y) / rect.height) * 2)),
    });
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-950 aspect-video">
        <canvas
          ref={canvasRef}
          width={OUTPUT_WIDTH}
          height={OUTPUT_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          className="h-full w-full touch-none cursor-grab active:cursor-grabbing"
          aria-label="Khung cắt ảnh. Kéo ảnh để điều chỉnh vùng hiển thị."
        />
        <div className="pointer-events-none absolute inset-3 border border-white/70 rounded-sm" />
      </div>
      <label className="flex items-center gap-2 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
        <span>Thu nhỏ</span>
        <input
          type="range"
          min="1"
          max="2.5"
          step="0.01"
          value={position.zoom}
          onChange={(event) => onPositionChange({ ...position, zoom: Number(event.target.value) })}
          className="min-w-0 flex-1 accent-amber-500"
          aria-label="Phóng to ảnh trong khung cắt"
        />
        <span>Phóng to</span>
        <button type="button" onClick={() => onPositionChange({ zoom: 1, x: 0, y: 0 })} className="rounded-lg px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          Đặt lại
        </button>
      </label>
      <p className="text-[10px] text-zinc-500 dark:text-zinc-400">Kéo ảnh trong khung để chọn vùng hiển thị · Tỉ lệ 16:9</p>
    </div>
  );
};
