"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { AuthUser, DiaryPost } from "@/lib/types";
import { COVER_OPTIONS, COVER_STORAGE_KEY, MY_PHOTOS, MY_VIDEOS } from "@/lib/constants";
import { feedApi, meApi } from "@/lib/api";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

function unsplash(id: string, w: number, h: number) {
  return `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&auto=format`;
}

export default function MyWall({ user }: { user: AuthUser }) {
  const router = useRouter();
  const [cover, setCover] = useState(0);
  const [bio, setBio] = useState(user.bio || "Thích khám phá · Tìm bạn mới quanh đây 📍");
  const [editingBio, setEditingBio] = useState(false);
  const [diaryPosts, setDiaryPosts] = useState<DiaryPost[]>([]);
  const [showPostModal, setShowPostModal] = useState(false);
  const [postText, setPostText] = useState("");
  const [posting, setPosting] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [activeSection, setActiveSection] = useState<"diary" | "photos" | "videos">("diary");
  const bioRef = useRef<HTMLTextAreaElement>(null);

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
        const data = await feedApi.list();
        setDiaryPosts(
          data.posts
            .filter((p) => p.user_id === user.id)
            .map((p) => ({
              id: p.id,
              text: p.body,
              time: timeAgo(p.created_at),
              likes: p.like_count,
              likedByMe: p.liked_by_me,
            })),
        );
      } catch {
        setDiaryPosts([]);
      }
    })();
  }, [user.id]);

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
    if (!postText.trim() || posting) return;
    setPosting(true);
    try {
      await feedApi.create(postText.trim());
      setDiaryPosts((prev) => [
        { id: `local-${Date.now()}`, text: postText.trim(), time: "vừa xong", likes: 0 },
        ...prev,
      ]);
      setPostText("");
      setShowPostModal(false);
      const data = await feedApi.list();
      setDiaryPosts(
        data.posts
          .filter((p) => p.user_id === user.id)
          .map((p) => ({
            id: p.id,
            text: p.body,
            time: timeAgo(p.created_at),
            likes: p.like_count,
            likedByMe: p.liked_by_me,
          })),
      );
    } catch {
      // keep modal open on failure
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
            onClick={() => setShowPostModal(true)}
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
            {diaryPosts.length === 0 ? (
              <div className="text-center py-14 flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
                  style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
                >
                  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#3a4060" strokeWidth={1.5}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "#6b74a0" }}>
                  Chưa có bài đăng nào
                </p>
                <p className="text-xs mb-5" style={{ color: "#3a4060" }}>
                  Chia sẻ khoảnh khắc đầu tiên của bạn
                </p>
                <button
                  onClick={() => setShowPostModal(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all"
                  style={{
                    background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                    color: "#fff",
                    boxShadow: "0 8px 24px rgba(108,99,255,0.3)",
                  }}
                >
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Đăng lên nhật ký
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {diaryPosts.map((post) => {
                  const liked = !!post.likedByMe;
                  return (
                    <article
                      key={post.id}
                      className="rounded-2xl overflow-hidden"
                      style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
                    >
                      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-xs font-bold text-white">
                          {user.avatar}
                        </div>
                        <div>
                          <p className="text-xs font-bold" style={{ color: "#e8eaf2" }}>
                            {user.name}
                          </p>
                          <p className="text-xs" style={{ color: "#3a4060" }}>
                            {post.time}
                          </p>
                        </div>
                      </div>
                      <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: "#c8d0e8" }}>
                        {post.text}
                      </p>
                      <div className="flex items-center gap-4 px-4 py-3" style={{ borderTop: "1px solid #1e2240" }}>
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
                      </div>
                    </article>
                  );
                })}
                <button
                  onClick={() => setShowPostModal(true)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#111320", border: "1px dashed #2e3454", color: "#6b74a0" }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Thêm bài mới
                </button>
              </div>
            )}
          </div>
        )}

        {activeSection === "photos" && (
          <div className="pb-8">
            <div className="grid grid-cols-3 gap-1.5 mb-4">
              {MY_PHOTOS.map((id, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: "#111320" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={unsplash(id, 200, 200)} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <button
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#111320", border: "1px dashed #2e3454", color: "#6b74a0" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Thêm ảnh
            </button>
          </div>
        )}

        {activeSection === "videos" && (
          <div className="pb-8 space-y-3">
            {MY_VIDEOS.map((v, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
              >
                <div className="relative w-20 h-14 rounded-xl overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={unsplash(v.thumb, 160, 112)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
                    <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  </div>
                  <span
                    className="absolute bottom-1 right-1 text-xs font-mono text-white px-1 rounded"
                    style={{ backgroundColor: "rgba(0,0,0,0.6)", fontSize: "10px" }}
                  >
                    {v.duration}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "#e8eaf2" }}>
                    {v.title}
                  </p>
                  <p className="text-xs" style={{ color: "#6b74a0" }}>
                    Video · {v.duration}
                  </p>
                </div>
              </div>
            ))}
            <button
              className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#111320", border: "1px dashed #2e3454", color: "#6b74a0" }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Tải video lên
            </button>
          </div>
        )}
      </div>

      {showPostModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl p-5 slide-up"
            style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
                Đăng nhật ký
              </h3>
              <button onClick={() => setShowPostModal(false)} style={{ color: "#6b74a0" }}>
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
                placeholder="Bạn đang nghĩ gì vậy?"
                rows={4}
                className="flex-1 bg-transparent outline-none text-sm resize-none"
                style={{ color: "#e8eaf2" }}
              />
            </div>
            <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #1e2240" }}>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs" style={{ color: "#6b74a0", backgroundColor: "#1a1d2e" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Ảnh
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs" style={{ color: "#6b74a0", backgroundColor: "#1a1d2e" }}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                </svg>
                Video
              </button>
              <button
                onClick={() => void submitPost()}
                disabled={!postText.trim() || posting}
                className="ml-auto px-5 py-2 rounded-xl text-xs font-bold transition-all"
                style={
                  postText.trim() && !posting
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
    </div>
  );
}
