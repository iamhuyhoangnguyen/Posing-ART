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
  const [offline, setOffline] = useState(!navigator.onLine);

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
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {!failed && src && (
        <img
          {...imageProps}
          src={src}
          alt={alt}
          className={className}
          onError={() => setFailed(true)}
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
