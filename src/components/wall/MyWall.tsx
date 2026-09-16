"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser, DiaryPost } from "@/lib/types";
import { COVER_OPTIONS, COVER_STORAGE_KEY } from "@/lib/constants";
import { feedApi, meApi, uploadsApi } from "@/lib/api";
import CommentSheet from "@/components/feed/CommentSheet";

const MAX_MEDIA = 10;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

type PendingMedia = {
  id: string;
  file: File;
  kind: "image" | "video";
  previewUrl: string;
};

type PostMode = "diary" | "image" | "video";

type DiaryMediaItem = {
  id: string;
  url: string;
  postId: string;
  time: string;
  text?: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function collectDiaryMedia(posts: DiaryPost[], type: "image" | "video"): DiaryMediaItem[] {
  const items: DiaryMediaItem[] = [];
  for (const post of posts) {
    for (const m of post.media || []) {
      if (m.type !== type) continue;
      items.push({
        id: m.id || `${post.id}-${m.url}`,
        url: m.url,
        postId: post.id,
        time: post.time,
        text: post.text,
      });
    }
  }
  return items;
}

function mapDiaryPosts(
  posts: {
    id: string;
    body: string;
    created_at: string;
    like_count: number;
    liked_by_me: boolean;
    comment_count: number;
    media?: { id: string; type: string; url: string }[];
  }[],
): DiaryPost[] {
  return posts.map((p) => ({
    id: p.id,
    text: p.body,
    time: timeAgo(p.created_at),
    likes: p.like_count,
    likedByMe: p.liked_by_me,
    commentCount: p.comment_count,
    media: p.media || [],
    image: p.media?.find((m) => m.type === "image")?.url,
  }));
}

export default function MyWall({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [cover, setCover] = useState(0);
  const [bio, setBio] = useState(user.bio || "Thích khám phá · Tìm bạn mới quanh đây 📍");
  const [editingBio, setEditingBio] = useState(false);
  const [diaryPosts, setDiaryPosts] = useState<DiaryPost[]>([]);
  const [postMode, setPostMode] = useState<PostMode | null>(null);
  const [postText, setPostText] = useState("");
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [activeSection, setActiveSection] = useState<"diary" | "photos" | "videos">("diary");
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const canSubmitPost =
    !posting &&
    (postMode === "image" || postMode === "video"
      ? pending.length > 0
      : !!postText.trim() || pending.length > 0);
  const diaryImages = collectDiaryMedia(diaryPosts, "image");
  const diaryVideos = collectDiaryMedia(diaryPosts, "video");
  const postTitle =
    postMode === "image" ? "Đăng ảnh" : postMode === "video" ? "Đăng video" : "Đăng nhật ký";
  const postPlaceholder =
    postMode === "image" || postMode === "video"
      ? "Bạn đang nghĩ gì?"
      : "Bạn đang nghĩ gì vậy?";
  const allowImages = postMode === "diary" || postMode === "image";
  const allowVideos = postMode === "diary" || postMode === "video";

  useEffect(() => {
    const saved = Number(localStorage.getItem(COVER_STORAGE_KEY) || "0");
    if (!Number.isNaN(saved) && saved >= 0 && saved < COVER_OPTIONS.length) setCover(saved);
  }, []);

  useEffect(() => {
    if (editingBio) bioRef.current?.focus();
  }, [editingBio]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await feedApi.list({ userId: user.id, limit: 50 });
        setDiaryPosts(mapDiaryPosts(data.posts));
      } catch {
        setDiaryPosts([]);
      }
    })();
  }, [user.id]);

  useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearPending = () => {
    setPending((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  };

  const openPostModal = (mode: PostMode) => {
    setPostMode(mode);
    setPostError("");
  };

  const closePostModal = () => {
    if (posting) return;
    setPostMode(null);
    setPostText("");
    setPostError("");
    clearPending();
  };

  const addFiles = (files: FileList | null, kind: "image" | "video") => {
    if (!files?.length) return;
    if (kind === "image" && !allowImages) return;
    if (kind === "video" && !allowVideos) return;
    setPostError("");
    const next: PendingMedia[] = [];
    const label = postMode === "image" ? "ảnh" : postMode === "video" ? "video" : "ảnh/video";
    for (const file of Array.from(files)) {
      if (pending.length + next.length >= MAX_MEDIA) {
        setPostError(`Tối đa ${MAX_MEDIA} ${label} mỗi bài`);
        break;
      }
      if (kind === "image" && !file.type.startsWith("image/")) continue;
      if (kind === "video" && !file.type.startsWith("video/")) continue;
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        kind,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (next.length) setPending((prev) => [...prev, ...next]);
  };

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const saveCover = (i: number) => {
    setCover(i);
    localStorage.setItem(COVER_STORAGE_KEY, String(i));
    setShowCoverPicker(false);
  };

  const saveBio = async () => {
    setEditingBio(false);
    try {
      await meApi.patch({ bio });
    } catch {
      // keep local bio
    }
  };

  const submitPost = async () => {
    if (!canSubmitPost || !postMode) return;
    if (postMode === "image" && pending.some((p) => p.kind !== "image")) {
      setPostError("Chỉ được đăng ảnh");
      return;
    }
    if (postMode === "video" && pending.some((p) => p.kind !== "video")) {
      setPostError("Chỉ được đăng video");
      return;
    }
    setPosting(true);
    setPostError("");
    try {
      const media: { type: "image" | "video"; url: string; sort_order: number }[] = [];
      for (let i = 0; i < pending.length; i++) {
        const item = pending[i];
        const uploaded = await uploadsApi.file(item.file, item.kind);
        media.push({
          type: item.kind,
          url: uploaded.public_url,
          sort_order: i,
        });
      }
      await feedApi.create(postText.trim(), media);
      setPostText("");
      clearPending();
      setPostMode(null);
      const data = await feedApi.list({ userId: user.id, limit: 50 });
      setDiaryPosts(mapDiaryPosts(data.posts));
    } catch (e) {
      setPostError(
        e instanceof Error
          ? e.message
          : postMode === "image"
            ? "Đăng ảnh thất bại"
            : postMode === "video"
              ? "Đăng video thất bại"
              : "Đăng nhật ký thất bại",
      );
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (id: string) => {
    const post = diaryPosts.find((p) => p.id === id);
    if (!post || id.startsWith("local-")) return;
    setDiaryPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likes: p.likedByMe ? Math.max(0, p.likes - 1) : p.likes + 1,
            }
          : p,
      ),
    );
    try {
      await feedApi.like(id);
    } catch {
      setDiaryPosts((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                likedByMe: post.likedByMe,
                likes: post.likes,
              }
            : p,
        ),
      );
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      <div className="relative h-52" style={{ background: COVER_OPTIONS[cover] }}>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", color: "#e8eaf2" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Quay lại
        </button>

        <button
          onClick={() => setShowCoverPicker(!showCoverPicker)}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", color: "#e8eaf2" }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Đổi ảnh bìa
        </button>

        {showCoverPicker && (
          <div
            className="absolute top-14 right-4 z-20 flex gap-2 p-2 rounded-2xl slide-up"
            style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
          >
            {COVER_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => saveCover(i)}
                className="w-8 h-8 rounded-xl"
                style={{ background: opt, border: cover === i ? "2px solid #6c63ff" : "2px solid transparent" }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 max-w-md mx-auto">
        <div className="flex items-end justify-between -mt-12 mb-4">
          <div className="relative group">
            <div
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-2xl font-extrabold text-white"
              style={{ border: "4px solid #0a0c14" }}
            >
              {user.avatar}
            </div>
            <div
              className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => openPostModal("diary")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
            }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Đăng nhật ký
          </button>
        </div>

        <div className="mb-4">
          <h2 className="text-xl font-extrabold mb-1" style={{ color: "#e8eaf2" }}>
            {user.name}
          </h2>
          {editingBio ? (
            <div className="flex gap-2 items-start">
              <textarea
                ref={bioRef}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="flex-1 text-sm rounded-xl px-3 py-2 resize-none outline-none"
                style={{ backgroundColor: "#111320", border: "1px solid #6c63ff", color: "#e8eaf2" }}
              />
              <button
                onClick={() => void saveBio()}
                className="px-3 py-2 rounded-xl text-xs font-bold"
                style={{ backgroundColor: "#6c63ff", color: "#fff" }}
              >
                Lưu
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingBio(true)} className="text-left group flex items-start gap-1.5">
              <p className="text-sm" style={{ color: "#a0a8c8" }}>
                {bio}
              </p>
              <svg
                width="12"
                height="12"
                className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                fill="none"
                viewBox="0 0 24 24"
                stroke="#6b74a0"
                strokeWidth={2}
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}
          <p className="text-xs mt-1" style={{ color: "#3a4060" }}>
            {user.email}
          </p>
        </div>

        <div className="flex gap-1 mb-4" style={{ borderBottom: "1px solid #1e2240" }}>
          {(["diary", "photos", "videos"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className="px-4 py-2.5 text-xs font-semibold transition-all relative"
              style={{ color: activeSection === s ? "#6c63ff" : "#6b74a0" }}
            >
              {s === "diary" ? "📓 Nhật ký" : s === "photos" ? "🖼 Ảnh" : "🎬 Video"}
              {activeSection === s && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: "#6c63ff" }}
                />
              )}
            </button>
          ))}
        </div>

        {activeSection === "diary" && (
          <div className="pb-8">
            <div className="relative pl-6">
              <div
                className="absolute left-[7px] top-2 bottom-2 w-px"
                style={{ backgroundColor: "#1e2240" }}
              />

              {/* Composer = timeline start */}
              <div className="relative pb-6">
                <span
                  className="absolute -left-6 top-3.5 w-3.5 h-3.5 rounded-full z-10"
                  style={{
                    backgroundColor: "#6c63ff",
                    boxShadow: "0 0 0 3px rgba(108,99,255,0.2)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => openPostModal("diary")}
                  className="w-full text-left px-4 py-3.5 rounded-2xl text-sm transition-all"
                  style={{
                    backgroundColor: "#111320",
                    border: "1px solid #1e2240",
                    color: "#6b74a0",
                  }}
                >
                  Bạn đang nghĩ gì?
                </button>
              </div>

              {diaryPosts.length === 0 ? (
                <div className="relative pb-2 pl-0">
                  <span
                    className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full z-10"
                    style={{
                      backgroundColor: "#0a0c14",
                      border: "2px solid #2e3454",
                    }}
                  />
                  <p className="text-xs py-2" style={{ color: "#3a4060" }}>
                    Chưa có bài đăng — hãy chia sẻ khoảnh khắc đầu tiên
                  </p>
                </div>
              ) : (
                <div className="space-y-0">
                  {diaryPosts.map((post, idx) => {
                    const liked = !!post.likedByMe;
                    const isLast = idx === diaryPosts.length - 1;
                    return (
                      <article key={post.id} className={`relative ${isLast ? "pb-2" : "pb-6"}`}>
                        <span
                          className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full z-10"
                          style={{
                            backgroundColor: "#0a0c14",
                            border: "2px solid #6c63ff",
                            boxShadow: "0 0 0 3px rgba(108,99,255,0.15)",
                          }}
                        />
                        <p className="text-[11px] font-semibold mb-2" style={{ color: "#6b74a0" }}>
                          {post.time}
                        </p>
                        <div
                          className="rounded-2xl overflow-hidden"
                          style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
                        >
                          {post.text ? (
                            <p
                              className="px-4 pt-3.5 pb-2 text-sm leading-relaxed"
                              style={{ color: "#c8d0e8" }}
                            >
                              {post.text}
                            </p>
                          ) : null}
                          {post.media && post.media.length > 0 ? (
                            <div
                              className={`px-4 ${post.text ? "pb-2" : "pt-3.5 pb-2"} grid gap-1.5 ${
                                post.media.length === 1 ? "grid-cols-1" : "grid-cols-2"
                              }`}
                            >
                              {post.media.map((m) => (
                                <div
                                  key={m.id}
                                  className="overflow-hidden rounded-xl"
                                  style={{ backgroundColor: "#0a0c14", border: "1px solid #1e2240" }}
                                >
                                  {m.type === "video" ? (
                                    <video
                                      src={m.url}
                                      controls
                                      playsInline
                                      className="w-full max-h-56 object-cover"
                                    />
                                  ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={m.url} alt="" className="w-full max-h-56 object-cover" />
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : post.image ? (
                            <div className={`px-4 ${post.text ? "pb-2" : "pt-3.5 pb-2"}`}>
                              <div className="rounded-xl overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={post.image}
                                  alt=""
                                  className="w-full object-cover"
                                  style={{ maxHeight: 200 }}
                                />
                              </div>
                            </div>
                          ) : null}
                          <div
                            className="flex items-center gap-4 px-4 py-2.5"
                            style={{ borderTop: "1px solid #1e2240" }}
                          >
                            <button
                              onClick={() => void toggleLike(post.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold"
                              style={{ color: liked ? "#f472b6" : "#6b74a0" }}
                            >
                              <svg
                                width="14"
                                height="14"
                                fill={liked ? "currentColor" : "none"}
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                              {post.likes}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (post.id.startsWith("local-")) return;
                                setCommentPostId(post.id);
                              }}
                              className="flex items-center gap-1.5 text-xs font-semibold"
                              style={{ color: "#6b74a0" }}
                            >
                              💬 {post.commentCount || 0}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === "photos" && (
          <div className="pb-8">
            {diaryImages.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: "#3a4060" }}>
                Chưa có ảnh nào trong nhật ký
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                {diaryImages.map((img) => (
                  <div
                    key={img.id}
                    className="aspect-square rounded-xl overflow-hidden"
                    style={{ backgroundColor: "#111320" }}
                    title={img.time}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => openPostModal("image")}
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#111320", border: "1px dashed #2e3454", color: "#6b74a0" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Đăng ảnh
            </button>
          </div>
        )}

        {activeSection === "videos" && (
          <div className="pb-8 space-y-3">
            {diaryVideos.length === 0 ? (
              <p className="text-xs py-6 text-center" style={{ color: "#3a4060" }}>
                Chưa có video nào trong nhật ký
              </p>
            ) : (
              diaryVideos.map((v) => (
                <div
                  key={v.id}
                  className="overflow-hidden rounded-2xl"
                  style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
                >
                  <video
                    src={v.url}
                    controls
                    playsInline
                    className="w-full max-h-64 object-cover bg-black"
                  />
                  <div className="px-3 py-2.5">
                    <p className="text-sm font-semibold truncate" style={{ color: "#e8eaf2" }}>
                      {v.text?.trim() || "Video nhật ký"}
                    </p>
                    <p className="text-xs" style={{ color: "#6b74a0" }}>
                      {v.time}
                    </p>
                  </div>
                </div>
              ))
            )}
            <button
              type="button"
              onClick={() => openPostModal("video")}
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#111320", border: "1px dashed #2e3454", color: "#6b74a0" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Đăng video
            </button>
          </div>
        )}
      </div>

      {postMode && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={closePostModal}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-5 slide-up"
            style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
                {postTitle}
              </h3>
              <button type="button" onClick={closePostModal} disabled={posting} style={{ color: "#6b74a0" }}>
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {user.avatar}
              </div>
              <textarea
                autoFocus
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder={postPlaceholder}
                rows={4}
                disabled={posting}
                className="flex-1 bg-transparent outline-none text-sm resize-none"
                style={{ color: "#e8eaf2" }}
              />
            </div>

            {pending.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-2">
                {pending.map((item) => (
                  <div
                    key={item.id}
                    className="relative overflow-hidden rounded-xl aspect-square"
                    style={{ backgroundColor: "#0a0c14", border: "1px solid #1e2240" }}
                  >
                    {item.kind === "video" ? (
                      <video src={item.previewUrl} className="h-full w-full object-cover" muted playsInline />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    <span
                      className="absolute left-1.5 bottom-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: "rgba(0,0,0,0.55)", color: "#e8eaf2" }}
                    >
                      {item.kind === "video" ? "Video" : "Ảnh"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removePending(item.id)}
                      disabled={posting}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff" }}
                      aria-label="Xóa"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {postError ? (
              <p
                className="text-xs mb-3 rounded-xl px-3 py-2"
                style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171" }}
              >
                {postError}
              </p>
            ) : null}

            {allowImages ? (
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
            ) : null}
            {allowVideos ? (
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
            ) : null}

            <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #1e2240" }}>
              {allowImages ? (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={posting || pending.length >= MAX_MEDIA}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                  style={{ color: "#6b74a0", backgroundColor: "#1a1d2e" }}
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Ảnh
                </button>
              ) : null}
              {allowVideos ? (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={posting || pending.length >= MAX_MEDIA}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs"
                  style={{ color: "#6b74a0", backgroundColor: "#1a1d2e" }}
                >
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" />
                  </svg>
                  Video
                </button>
              ) : null}
              <span className="text-[11px] flex-1" style={{ color: "#3a4060" }}>
                {pending.length > 0
                  ? `${pending.length}/${MAX_MEDIA}`
                  : postMode === "image"
                    ? "Chọn ít nhất 1 ảnh"
                    : postMode === "video"
                      ? "Chọn ít nhất 1 video"
                      : ""}
              </span>
              <button
                type="button"
                onClick={() => void submitPost()}
                disabled={!canSubmitPost}
                className="px-5 py-2 rounded-xl text-xs font-bold transition-all"
                style={
                  canSubmitPost
                    ? {
                        background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                        color: "#fff",
                        boxShadow: "0 4px 16px rgba(108,99,255,0.3)",
                      }
                    : { backgroundColor: "#1a1d2e", color: "#3a4060" }
                }
              >
                {posting ? "Đang đăng…" : "Đăng"}
              </button>
            </div>
          </div>
        </div>
      )}

      {commentPostId && (
        <CommentSheet
          postId={commentPostId}
          open
          onClose={() => setCommentPostId(null)}
          onCommented={() => {
            setDiaryPosts((prev) =>
              prev.map((p) =>
                p.id === commentPostId
                  ? { ...p, commentCount: (p.commentCount || 0) + 1 }
                  : p,
              ),
            );
          }}
        />
      )}
    </div>
  );
}
