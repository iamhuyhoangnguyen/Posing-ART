import { useEffect, useState } from "react";
import { serverUrl } from "../services/apiUrl";
import { APP_VERSION } from "../version";

type ShareResponse = { success: true; categoryName: string; images: string[] };

export function PublicSharePage({ shareToken }: { shareToken: string }) {
  const [data, setData] = useState<ShareResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(serverUrl(`/api/share/${encodeURIComponent(shareToken)}`), { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({})) as ShareResponse & { error?: string };
        if (!response.ok || !result.success || !Array.isArray(result.images)) {
          throw new Error(result.error || "Không tìm thấy danh mục được chia sẻ.");
        }
        setData({ ...result, images: result.images.map((image) => serverUrl(image)) });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "Không thể tải danh mục lúc này.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [shareToken]);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 sm:px-8">
      <header className="mx-auto mb-6 max-w-6xl text-center">
        <p className="text-xs font-black tracking-[0.2em] text-amber-600">POSING ART</p>
        <p className="mt-1 text-[10px] font-semibold text-zinc-500">v{APP_VERSION}</p>
        <h1 className="mt-4 text-2xl font-black sm:text-3xl">{data?.categoryName || "Danh mục được chia sẻ"}</h1>
        <p className="mt-2 text-sm text-zinc-500">Thư viện ảnh công khai · Chỉ xem</p>
      </header>
      {loading ? (
        <p className="py-16 text-center text-sm text-zinc-500">Đang tải ảnh…</p>
      ) : error ? (
        <p role="alert" className="mx-auto max-w-lg rounded-2xl bg-white p-6 text-center text-sm font-semibold text-zinc-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">{error}</p>
      ) : data?.images.length ? (
        <section aria-label={`Ảnh trong danh mục ${data.categoryName}`} className="mx-auto grid max-w-6xl grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {data.images.map((src, index) => (
            <div key={`${index}-${src.slice(0, 48)}`} className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-zinc-900">
              <img
                src={src}
                alt={`Ảnh ${index + 1}`}
                loading="lazy"
                draggable={false}
                onContextMenu={(event) => event.preventDefault()}
                className="public-share-image aspect-[3/4] w-full select-none object-cover"
              />
            </div>
          ))}
        </section>
      ) : (
        <p className="py-16 text-center text-sm text-zinc-500">Danh mục này hiện chưa có ảnh.</p>
      )}
      <footer className="mx-auto mt-10 max-w-6xl text-center text-xs text-zinc-400">Được chia sẻ từ POSING ART</footer>
    </main>
  );
}
