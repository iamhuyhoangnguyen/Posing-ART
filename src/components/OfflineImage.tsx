import React, { useEffect, useState } from "react";

interface OfflineImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  wrapperClassName?: string;
}

/** Remote photo that keeps a clear placeholder when it has not been cached offline. */
export const OfflineImage: React.FC<OfflineImageProps> = ({
  wrapperClassName = "",
  className = "",
  alt = "",
  src,
  ...imageProps
}) => {
  const [failed, setFailed] = useState(false);
  const [offline, setOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );

  // Keep the caller's layout position intact. Adding `relative` unconditionally
  // conflicts with callers that position this wrapper absolutely; Tailwind can
  // then make the wrapper collapse and hide both the image and its placeholder.
  const isPositionedByCaller = /\b(absolute|fixed|sticky)\b/.test(wrapperClassName);
  const positionClass = isPositionedByCaller ? "" : "relative";

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false);
      setFailed(false);
    };
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => setFailed(false), [src]);

  return (
    <div className={`${positionClass} overflow-hidden ${wrapperClassName}`}>
      {!failed && src && (
        <img
          {...imageProps}
          src={src}
          alt={alt}
          className={className}
          onError={() => {
            setOffline(typeof navigator !== "undefined" && !navigator.onLine);
            setFailed(true);
          }}
        />
      )}
      {(failed || !src) && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 px-3 text-center dark:bg-zinc-800">
          <span className="rounded-xl bg-black/60 px-3 py-2 text-[11px] font-semibold leading-snug text-white">
            {offline ? "Cần kết nối mạng để tải ảnh này" : "Không thể tải ảnh này"}
          </span>
        </div>
      )}
    </div>
  );
};
