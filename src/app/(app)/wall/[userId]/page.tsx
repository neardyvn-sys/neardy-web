"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import { useCall } from "@/components/call/CallProvider";
import { feedApi, likesApi, usersApi, visitsApi } from "@/lib/api";
import type { DiaryPost } from "@/lib/types";
import { initialsFromName } from "@/lib/types";
import Avatar from "@/components/ui/Avatar";
import CommentSheet from "@/components/feed/CommentSheet";
import DropdownMenu from "@/components/ui/DropdownMenu";
import ReportModal from "@/components/feed/ReportModal";
import ImageViewer, { type MediaItem } from "@/components/ui/ImageViewer";
import PostVideoPlayer from "@/components/ui/PostVideoPlayer";

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

export default function UserWallPage() {
  const params = useParams();
  const userId = String(params?.userId || "");
  const router = useRouter();
  const { friends, toggleFriend, matches, users, user: currentUser } = useApp();
  const { startCall, phase: callPhase } = useCall();
  const inCall = callPhase !== "idle";

  const match = matches.find((m) => m.userId === userId);
  const nearby = users.find((u) => u.id === userId);

  // Initialize with match/nearby info if available to avoid flashing empty state
  const [name, setName] = useState(match?.displayName || nearby?.name || "");
  const [bio, setBio] = useState(nearby?.bio || "");
  const [age, setAge] = useState<number | undefined>(nearby?.age);
  const [gender, setGender] = useState<string | undefined>(nearby?.gender || undefined);
  const [distanceKm, setDistanceKm] = useState<number | null>(nearby?.distanceKm ?? null);
  const [photo, setPhoto] = useState<string | null>(match?.primaryPhoto || nearby?.photoUrl || null);
  const [photos, setPhotos] = useState<{ id: string; url: string; is_primary: boolean }[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(match?.online ?? nearby?.online ?? false);
  const [loading, setLoading] = useState(true);

  // Diary & Feed state
  const [diaryPosts, setDiaryPosts] = useState<DiaryPost[]>([]);
  const [wallPrivate, setWallPrivate] = useState(false);
  const [activeSection, setActiveSection] = useState<"diary" | "photos" | "videos">("diary");
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [viewerMedia, setViewerMedia] = useState<{
    media: MediaItem[];
    index: number;
  } | null>(null);

  const diaryImages = collectDiaryMedia(diaryPosts, "image");
  const diaryVideos = collectDiaryMedia(diaryPosts, "video");
  const isFriend = friends.has(userId);

  // Record profile visit
  useEffect(() => {
    if (!userId) return;
    visitsApi.record(userId).catch(() => {});
  }, [userId]);

  // Fetch full user profile
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);

    usersApi
      .get(userId)
      .then((p) => {
        if (cancelled) return;
        setName(p.display_name || match?.displayName || nearby?.name || "Người dùng");
        setBio(p.bio || "");
        setAge(p.age);
        setGender(p.gender || undefined);
        setCoverUrl(p.cover_url || null);
        setPhotos(p.photos || []);
        const primary = p.photos.find((x) => x.is_primary)?.url || p.photos[0]?.url || match?.primaryPhoto || nearby?.photoUrl || null;
        setPhoto(primary);
        if (typeof p.online === "boolean") {
          setIsOnline(p.online);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("Failed to load user profile:", err);
        // Fallback to match/nearby data if API error
        if (!name && (match?.displayName || nearby?.name)) {
          setName(match?.displayName || nearby?.name || "Người dùng");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, match?.displayName, match?.primaryPhoto, nearby?.name, nearby?.photoUrl, name]);

  // Fetch user's diary posts
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    feedApi
      .list({ userId, limit: 50 })
      .then((data) => {
        if (cancelled) return;
        setDiaryPosts(mapDiaryPosts(data.posts));
        setWallPrivate(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Check if wall is private
        const msg = err instanceof Error ? err.message : String(err);
        const status = typeof err === "object" && err !== null && "status" in err ? (err as { status: number }).status : 0;
        if (msg.includes("wall is private") || status === 403) {
          setWallPrivate(true);
        }
        setDiaryPosts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Sync realtime presence
  useEffect(() => {
    if (match && typeof match.online === "boolean") {
      setIsOnline(match.online);
    } else if (nearby && typeof nearby.online === "boolean") {
      setIsOnline(nearby.online);
    }
  }, [match?.online, nearby?.online]);

  const toggleLike = async (postId: string) => {
    const p = diaryPosts.find((x) => x.id === postId);
    if (!p) return;
    const nextLiked = !p.likedByMe;
    const nextCount = nextLiked ? p.likes + 1 : Math.max(0, p.likes - 1);

    setDiaryPosts((prev) =>
      prev.map((item) =>
        item.id === postId ? { ...item, likedByMe: nextLiked, likes: nextCount } : item,
      ),
    );

    try {
      await feedApi.like(postId);
    } catch {
      setDiaryPosts((prev) =>
        prev.map((item) =>
          item.id === postId ? { ...item, likedByMe: p.likedByMe, likes: p.likes } : item,
        ),
      );
    }
  };

  const coverBgStyle = coverUrl
    ? coverUrl.startsWith("http") || coverUrl.startsWith("/media") || coverUrl.startsWith("data:")
      ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: coverUrl }
    : { background: "linear-gradient(135deg, #2d1b69, #0f1a3d)" };

  const genderLabel = gender === "man" ? "Nam" : gender === "woman" ? "Nữ" : gender;

  return (
    <div className="min-h-screen pb-16" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      {/* Cover Banner */}
      <div className="relative h-48 w-full transition-all" style={coverBgStyle}>
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(10,12,20,0.3) 0%, rgba(10,12,20,0.85) 100%)" }}
        />
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 px-3.5 py-1.5 rounded-2xl text-xs font-bold backdrop-blur-md transition-all hover:bg-black/60 flex items-center gap-1.5"
          style={{ backgroundColor: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)", color: "#e8eaf2" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Quay lại
        </button>
      </div>

      {/* Main Profile Info Header */}
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-end justify-between -mt-12 mb-3">
          <div
            className="cursor-pointer"
            onClick={() => {
              if (photo) {
                setViewerMedia({
                  media: [{ type: "image", url: photo }],
                  index: 0,
                });
              }
            }}
          >
            <Avatar
              initials={initialsFromName(name || "?")}
              userId={userId}
              size="xl"
              photoUrl={photo}
              online={isOnline}
              className="ring-4 ring-[#0a0c14] shadow-2xl hover:opacity-90 transition-opacity"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pb-1">
            {match && (
              <button
                type="button"
                onClick={() => router.push(`/messages/${userId}`)}
                className="px-3.5 py-2 rounded-2xl text-xs font-bold transition-all hover:opacity-90 flex items-center gap-1.5"
                style={{
                  backgroundColor: "rgba(108,99,255,0.15)",
                  color: "#a5b4fc",
                  border: "1px solid rgba(108,99,255,0.3)",
                }}
              >
                💬 Nhắn tin
              </button>
            )}

            {match && (
              <button
                type="button"
                disabled={inCall}
                onClick={() => {
                  if (match?.conversationId) {
                    void startCall({
                      conversationId: match.conversationId,
                      targetUserId: userId,
                      callType: "audio",
                      peer: {
                        id: userId,
                        name: name || match.displayName,
                        avatar: initialsFromName(name || match.displayName),
                        photoUrl: photo,
                      },
                    });
                  } else {
                    router.push(`/messages/${userId}`);
                  }
                }}
                className="w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all hover:opacity-90"
                style={{
                  backgroundColor: "rgba(34,197,94,0.15)",
                  color: "#4ade80",
                  border: "1px solid rgba(34,197,94,0.3)",
                }}
                title="Gọi điện"
              >
                📞
              </button>
            )}

            <button
              type="button"
              onClick={() => void toggleFriend(userId)}
              className="px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95"
              style={
                isFriend
                  ? {
                      backgroundColor: "rgba(34,197,94,0.15)",
                      color: "#4ade80",
                      border: "1px solid rgba(34,197,94,0.3)",
                    }
                  : {
                      background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                      color: "#fff",
                      boxShadow: "0 4px 15px rgba(108,99,255,0.35)",
                    }
              }
            >
              {isFriend ? "✓ Bạn bè" : "+ Kết bạn"}
            </button>
          </div>
        </div>

        {/* Name & Basic Info */}
        <div className="space-y-1.5 mb-5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold" style={{ color: "#ffffff" }}>
              {name || (loading ? "Đang tải…" : "Người dùng")}
            </h1>
            {age ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#1e2240] text-[#a5b4fc]">
                {genderLabel ? `${genderLabel} · ` : ""}{age} tuổi
              </span>
            ) : genderLabel ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-[#1e2240] text-[#a5b4fc]">
                {genderLabel}
              </span>
            ) : null}
          </div>

          <p className="text-xs leading-relaxed" style={{ color: "#8a94b8" }}>
            {bio || "Chưa có lời giới thiệu"}
          </p>

          <div className="flex items-center gap-3 pt-1 text-[11px]" style={{ color: "#6b74a0" }}>
            {distanceKm != null && (
              <span className="flex items-center gap-1">
                📍 Cách {distanceKm.toFixed(1)} km
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isOnline ? "#4ade80" : "#64748b" }}
              />
              {isOnline ? "Đang hoạt động" : "Offline"}
            </span>
          </div>
        </div>

        {/* Section Tabs */}
        <div
          className="flex border-b mb-4 text-xs font-bold"
          style={{ borderColor: "#1e2240" }}
        >
          <button
            type="button"
            onClick={() => setActiveSection("diary")}
            className="flex-1 py-3 text-center transition-colors relative"
            style={{ color: activeSection === "diary" ? "#ffffff" : "#6b74a0" }}
          >
            Nhật ký {diaryPosts.length > 0 ? `(${diaryPosts.length})` : ""}
            {activeSection === "diary" && (
              <span
                className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ backgroundColor: "#6c63ff" }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("photos")}
            className="flex-1 py-3 text-center transition-colors relative"
            style={{ color: activeSection === "photos" ? "#ffffff" : "#6b74a0" }}
          >
            Ảnh {diaryImages.length > 0 ? `(${diaryImages.length})` : ""}
            {activeSection === "photos" && (
              <span
                className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ backgroundColor: "#6c63ff" }}
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection("videos")}
            className="flex-1 py-3 text-center transition-colors relative"
            style={{ color: activeSection === "videos" ? "#ffffff" : "#6b74a0" }}
          >
            Video {diaryVideos.length > 0 ? `(${diaryVideos.length})` : ""}
            {activeSection === "videos" && (
              <span
                className="absolute bottom-0 left-1/4 right-1/4 h-0.5 rounded-full"
                style={{ backgroundColor: "#6c63ff" }}
              />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {wallPrivate ? (
          /* Privacy notice */
          <div
            className="p-8 rounded-3xl text-center space-y-3 my-4"
            style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#1a1d30] flex items-center justify-center text-2xl mx-auto">
              🔒
            </div>
            <h3 className="text-sm font-bold text-white">Nhật ký ở chế độ riêng tư</h3>
            <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: "#6b74a0" }}>
              {name} đã cài đặt quyền riêng tư cho nhật ký. Hãy kết bạn để cùng chia sẻ khoảnh khắc nhé!
            </p>
            {!isFriend && (
              <button
                type="button"
                onClick={() => void toggleFriend(userId)}
                className="mt-2 px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-lg bg-[#6c63ff] hover:opacity-90"
              >
                + Gửi lời mời kết bạn
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Tab: Diary Posts */}
            {activeSection === "diary" && (
              <div className="relative pl-6">
                {/* Timeline vertical bar */}
                <span
                  className="absolute left-1.5 top-2 bottom-4 w-0.5"
                  style={{ backgroundColor: "#1e2240" }}
                />

                {diaryPosts.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-2xl mb-2">📝</p>
                    <p className="text-xs" style={{ color: "#6b74a0" }}>
                      Chưa có bài đăng nào trên nhật ký
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0">
                    {diaryPosts.map((post, idx) => {
                      const liked = !!post.likedByMe;
                      const isLast = idx === diaryPosts.length - 1;
                      return (
                        <article key={post.id} className={`relative ${isLast ? "pb-2" : "pb-6"}`}>
                          {/* Timeline dot */}
                          <span
                            className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full z-10"
                            style={{
                              backgroundColor: "#0a0c14",
                              border: "2px solid #6c63ff",
                              boxShadow: "0 0 0 3px rgba(108,99,255,0.15)",
                            }}
                          />

                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[11px] font-semibold" style={{ color: "#6b74a0" }}>
                              {post.time}
                            </p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId((cur) => (cur === post.id ? null : post.id));
                                }}
                                className="p-1 rounded-lg hover:bg-[#1a1d2e] text-xs font-bold transition-all text-slate-400"
                                title="Tùy chọn"
                              >
                                •••
                              </button>
                              <DropdownMenu
                                open={activeMenuId === post.id}
                                onClose={() => setActiveMenuId(null)}
                                align="right"
                                minWidth={180}
                                items={[
                                  {
                                    key: "report",
                                    icon: "⚠️",
                                    label: "Báo xấu bài viết",
                                    danger: true,
                                    onClick: () => setReportPostId(post.id),
                                  },
                                ]}
                              />
                            </div>
                          </div>

                          <div
                            className="rounded-2xl overflow-hidden shadow-lg"
                            style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
                          >
                            {post.text ? (
                              <p
                                className="px-4 pt-3.5 pb-2 text-sm leading-relaxed"
                                style={{ color: "#e8eaf2" }}
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
                                {post.media.map((m, mIdx) => (
                                  <div
                                    key={m.id || `${m.url}-${mIdx}`}
                                    className="overflow-hidden rounded-xl"
                                    style={{ backgroundColor: "#0a0c14", border: "1px solid #1e2240" }}
                                    onClick={(e) => {
                                      if (m.type !== "video") {
                                        e.stopPropagation();
                                        setViewerMedia({
                                          media: post.media!.map((item) => ({
                                            id: item.id,
                                            type: item.type,
                                            url: item.url,
                                          })),
                                          index: mIdx,
                                        });
                                      }
                                    }}
                                  >
                                    {m.type === "video" ? (
                                      <PostVideoPlayer
                                        src={m.url}
                                        className="w-full max-h-72 object-cover"
                                        onMediaClick={() => {
                                          setViewerMedia({
                                            media: post.media!.map((item) => ({
                                              id: item.id,
                                              type: item.type,
                                              url: item.url,
                                            })),
                                            index: mIdx,
                                          });
                                        }}
                                      />
                                    ) : (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={m.url}
                                        alt=""
                                        className="w-full max-h-72 object-cover hover:opacity-95 transition-opacity cursor-pointer"
                                      />
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : post.image ? (
                              <div className={`px-4 ${post.text ? "pb-2" : "pt-3.5 pb-2"}`}>
                                <div
                                  className="rounded-xl overflow-hidden cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewerMedia({
                                      media: [{ type: "image", url: post.image! }],
                                      index: 0,
                                    });
                                  }}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={post.image}
                                    alt=""
                                    className="w-full object-cover hover:opacity-95 transition-opacity"
                                    style={{ maxHeight: 240 }}
                                  />
                                </div>
                              </div>
                            ) : null}

                            <div
                              className="flex items-center gap-4 px-4 py-2.5"
                              style={{ borderTop: "1px solid #1e2240" }}
                            >
                              <button
                                type="button"
                                onClick={() => void toggleLike(post.id)}
                                className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
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
                                onClick={() => setCommentPostId(post.id)}
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
            )}

            {/* Tab: Photos */}
            {activeSection === "photos" && (
              <div className="pb-8">
                {diaryImages.length === 0 && photos.length === 0 ? (
                  <p className="text-xs py-8 text-center" style={{ color: "#6b74a0" }}>
                    Chưa có ảnh nào trong nhật ký
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {photos.map((img) => (
                      <div
                        key={img.id}
                        className="aspect-square rounded-2xl overflow-hidden border border-[#1e2240]"
                        style={{ backgroundColor: "#111320" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {diaryImages.map((img) => (
                      <div
                        key={img.id}
                        onClick={() => {
                          if (img.postId) {
                            router.push(`/feed/${img.postId}`);
                          }
                        }}
                        className="aspect-square rounded-2xl overflow-hidden border border-[#1e2240] cursor-pointer hover:opacity-85 hover:border-[#6c63ff]/60 transition-all active:scale-[0.97] relative group"
                        style={{ backgroundColor: "#111320" }}
                        title={img.time}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="text-[10px] font-bold text-white px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
                            Xem chi tiết
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: Videos */}
            {activeSection === "videos" && (
              <div className="pb-8 space-y-3">
                {diaryVideos.length === 0 ? (
                  <p className="text-xs py-8 text-center" style={{ color: "#6b74a0" }}>
                    Chưa có video nào trong nhật ký
                  </p>
                ) : (
                  diaryVideos.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => {
                        if (v.postId) {
                          router.push(`/feed/${v.postId}`);
                        }
                      }}
                      className="overflow-hidden rounded-2xl cursor-pointer hover:border-[#6c63ff]/60 hover:shadow-lg transition-all active:scale-[0.99] group"
                      style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
                    >
                      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                        <video
                          src={v.url}
                          playsInline
                          muted
                          preload="metadata"
                          className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <div className="w-11 h-11 rounded-full bg-black/60 group-hover:bg-[#6c63ff] flex items-center justify-center text-white backdrop-blur-sm transition-colors shadow-lg">
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24" className="ml-0.5">
                              <polygon points="5 3 19 12 5 21 5 3" />
                            </svg>
                          </div>
                        </div>
                      </div>
                      <div className="px-3.5 py-3 flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-3">
                          <p className="text-sm font-semibold truncate" style={{ color: "#e8eaf2" }}>
                            {v.text?.trim() || "Video nhật ký"}
                          </p>
                          <p className="text-xs" style={{ color: "#6b74a0" }}>
                            {v.time}
                          </p>
                        </div>
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 group-hover:bg-[#6c63ff] group-hover:text-white transition-colors flex-shrink-0"
                          style={{ color: "#9b94ff", backgroundColor: "#1e2240" }}
                        >
                          Xem chi tiết →
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Comment Sheet */}
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

      {/* Report Modal */}
      {reportPostId && (
        <ReportModal
          open={!!reportPostId}
          targetId={reportPostId}
          targetName={name || "bài viết"}
          onClose={() => setReportPostId(null)}
        />
      )}

      {viewerMedia && (
        <ImageViewer
          media={viewerMedia.media}
          initialIndex={viewerMedia.index}
          open={!!viewerMedia}
          onClose={() => setViewerMedia(null)}
        />
      )}
    </div>
  );
}
