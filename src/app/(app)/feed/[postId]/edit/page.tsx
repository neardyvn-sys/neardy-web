"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { feedApi, uploadsApi } from "@/lib/api";

const MAX_MEDIA = 10;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

type MediaItemState =
  | {
      id: string;
      isExisting: true;
      type: "image" | "video";
      url: string;
    }
  | {
      id: string;
      isExisting: false;
      type: "image" | "video";
      file: File;
      previewUrl: string;
    };

export default function EditPostPage({
  params: paramsPromise,
}: {
  params: Promise<{ postId: string }>;
}) {
  const params = use(paramsPromise);
  const postId = params.postId;
  const router = useRouter();

  const [body, setBody] = useState("");
  const [mediaList, setMediaList] = useState<MediaItemState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const post = await feedApi.get(postId);
        if (cancelled) return;
        setBody(post.body || "");
        setMediaList(
          (post.media || []).map((m, idx) => ({
            id: m.id || `${m.url}-${idx}`,
            isExisting: true,
            type: (m.type === "video" ? "video" : "image") as "image" | "video",
            url: m.url,
          })),
        );
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Không thể tải bài viết");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId]);

  useEffect(() => {
    return () => {
      mediaList.forEach((item) => {
        if (!item.isExisting) URL.revokeObjectURL(item.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (files: FileList | null, kind: "image" | "video") => {
    if (!files?.length) return;
    setError("");
    const next: MediaItemState[] = [];
    for (const file of Array.from(files)) {
      if (mediaList.length + next.length >= MAX_MEDIA) {
        setError(`Tối đa ${MAX_MEDIA} ảnh/video mỗi bài`);
        break;
      }
      if (kind === "image" && !file.type.startsWith("image/")) continue;
      if (kind === "video" && !file.type.startsWith("video/")) continue;
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        isExisting: false,
        type: kind,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (next.length) setMediaList((prev) => [...prev, ...next]);
  };

  const removeItem = (id: string) => {
    setMediaList((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target && !target.isExisting) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && mediaList.length === 0) {
      setError("Bài viết phải có nội dung chữ hoặc hình ảnh/video");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const finalMedia: { type: "image" | "video"; url: string; sort_order: number }[] = [];
      for (let i = 0; i < mediaList.length; i++) {
        const item = mediaList[i];
        if (item.isExisting) {
          finalMedia.push({
            type: item.type,
            url: item.url,
            sort_order: i,
          });
        } else {
          const uploaded = await uploadsApi.file(item.file, item.type);
          finalMedia.push({
            type: item.type,
            url: uploaded.public_url,
            sort_order: i,
          });
        }
      }

      await feedApi.update(postId, body.trim(), finalMedia);
      router.replace(`/feed/${postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chỉnh sửa bài viết thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      {/* Top Header */}
      <div
        className="flex items-center justify-between px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #1e2240", backgroundColor: "#0d0f1a" }}
      >
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} style={{ color: "#6b74a0" }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
            Chỉnh sửa bài viết
          </span>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={{
            background: saving ? "#1a1d2e" : "linear-gradient(135deg, #6c63ff, #5b54e8)",
            color: saving ? "#3a4060" : "#fff",
          }}
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </button>
      </div>

      <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-4 overflow-y-auto">
        {loading ? (
          <div className="space-y-3">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-24 rounded-2xl" />
          </div>
        ) : (
          <>
            {error && (
              <p
                className="text-xs rounded-xl px-3.5 py-2.5"
                style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171" }}
              >
                {error}
              </p>
            )}

            <div className="rounded-2xl p-4 space-y-4" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Bạn đang nghĩ gì?"
                rows={5}
                className="w-full bg-transparent outline-none text-sm resize-none"
                style={{ color: "#e8eaf2" }}
              />

              {/* Media Grid */}
              {mediaList.length > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2" style={{ borderTop: "1px solid #1e2240" }}>
                  {mediaList.map((item) => {
                    const src = item.isExisting ? item.url : item.previewUrl;
                    return (
                      <div
                        key={item.id}
                        className="relative overflow-hidden rounded-xl aspect-square"
                        style={{ backgroundColor: "#0a0c14", border: "1px solid #1e2240" }}
                      >
                        {item.type === "video" ? (
                          <video src={src} className="h-full w-full object-cover" muted playsInline />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={src} alt="" className="h-full w-full object-cover" />
                        )}

                        <span
                          className="absolute left-2 bottom-2 text-[10px] font-bold px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#e8eaf2" }}
                        >
                          {item.type === "video" ? "Video" : "Ảnh"}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={saving}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: "rgba(239,68,68,0.85)", color: "#fff" }}
                          aria-label="Xóa"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Media Buttons */}
              <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #1e2240" }}>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept={IMAGE_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files, "image");
                    e.target.value = "";
                  }}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={VIDEO_ACCEPT}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files, "video");
                    e.target.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={saving || mediaList.length >= MAX_MEDIA}
                  className="flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
                  style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Thêm ảnh
                </button>

                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={saving || mediaList.length >= MAX_MEDIA}
                  className="flex-1 py-2 rounded-xl flex items-center justify-center gap-2 text-xs font-bold"
                  style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                  Thêm video
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
