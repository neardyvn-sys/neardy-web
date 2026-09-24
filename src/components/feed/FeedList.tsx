"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import CommentSheet from "@/components/feed/CommentSheet";
import EditPostModal from "@/components/feed/EditPostModal";
import ReportModal from "@/components/feed/ReportModal";
import ImageViewer, { type MediaItem } from "@/components/ui/ImageViewer";
import { useApp } from "@/components/providers/AppProvider";
import { activityHidesApi, blocksApi, feedApi, friendsApi, reportsApi, uploadsApi } from "@/lib/api";
import DropdownMenu from "@/components/ui/DropdownMenu";
import type { FeedPost } from "@/lib/types";
import { initialsFromName } from "@/lib/types";

const MAX_MEDIA = 10;
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

type PendingMedia = {
  id: string;
  file: File;
  kind: "image" | "video";
  previewUrl: string;
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

function mediaGridClass(count: number) {
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-2";
  return "grid-cols-2";
}

import PostVideoPlayer from "@/components/ui/PostVideoPlayer";

function PostMediaGrid({
  media,
  onMediaClick,
}: {
  media: FeedPost["media"];
  onMediaClick?: (index: number) => void;
}) {
  if (!media.length) return null;
  return (
    <div className={`mx-4 mb-3 grid gap-1.5 ${mediaGridClass(media.length)}`}>
      {media.map((item, i) => {
        const tall = media.length === 1;
        const spanFull = media.length === 3 && i === 0;
        return (
          <div
            key={item.id || `${item.url}-${i}`}
            className={`overflow-hidden rounded-xl ${spanFull ? "col-span-2" : ""} ${
              onMediaClick ? "cursor-pointer" : ""
            }`}
            style={{ backgroundColor: "#0a0c14", border: "1px solid #1e2240" }}
            onClick={(e) => {
              if (item.type !== "video" && onMediaClick) {
                e.stopPropagation();
                onMediaClick(i);
              }
            }}
          >
            {item.type === "video" ? (
              <PostVideoPlayer
                src={item.url}
                className="w-full object-cover"
                style={{ maxHeight: tall ? 380 : 220, minHeight: tall ? 220 : 140 }}
                onMediaClick={onMediaClick ? () => onMediaClick(i) : undefined}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.url}
                alt=""
                className="w-full object-cover"
                style={{ maxHeight: tall ? 380 : 220, minHeight: tall ? 220 : 140 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function FeedList() {
  const router = useRouter();
  const { user, friends, refreshMatches } = useApp();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState<PendingMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);
  const [viewerMedia, setViewerMedia] = useState<{
    media: MediaItem[];
    index: number;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = (!!body.trim() || pending.length > 0) && !posting;

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
    try {
      await feedApi.delete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setActiveMenuId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xóa bài viết thất bại");
    }
  };

  const handleHidePost = async (postId: string) => {
    try {
      await feedApi.hide(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setActiveMenuId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ẩn bài viết thất bại");
    }
  };

  const handleHideUserActivity = async (authorId: string, authorName: string) => {
    if (confirm(`Bạn sẽ không thấy bài đăng của ${authorName} nữa. Tiếp tục?`)) {
      try {
        await activityHidesApi.hide(authorId);
        setPosts((prev) => prev.filter((p) => p.userId !== authorId));
        setActiveMenuId(null);
        alert(`Đã ẩn hoạt động của ${authorName}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Ẩn hoạt động thất bại");
      }
    }
  };

  const handleBlockUser = async (authorId: string, authorName: string) => {
    if (confirm(`Chặn ${authorName} xem nhật ký của tôi và tương tác với tôi?`)) {
      try {
        await blocksApi.block(authorId);
        setPosts((prev) => prev.filter((p) => p.userId !== authorId));
        setActiveMenuId(null);
        alert(`Đã chặn ${authorName}`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Chặn người dùng thất bại");
      }
    }
  };

  const handleReportUser = (authorId: string, authorName: string) => {
    setActiveMenuId(null);
    setReportTarget({ id: authorId, name: authorName });
  };

  const handleRemoveFriend = async (authorId: string, authorName: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa ${authorName} khỏi danh sách bạn bè?`)) {
      try {
        await friendsApi.unfriend(authorId);
        await refreshMatches();
        setActiveMenuId(null);
        alert(`Đã xóa ${authorName} khỏi danh sách bạn bè`);
      } catch (err) {
        alert(err instanceof Error ? err.message : "Xóa bạn thất bại");
      }
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await feedApi.list();
      setPosts(
        data.posts.map((p) => ({
          id: p.id,
          body: p.body,
          createdAt: p.created_at,
          userId: p.user_id,
          displayName: p.display_name,
          primaryPhoto: p.primary_photo,
          media: p.media || [],
          likeCount: p.like_count,
          commentCount: p.comment_count,
          likedByMe: p.liked_by_me,
        })),
      );
    } catch (e) {
      console.warn(e);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    return () => {
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = (files: FileList | null, kind: "image" | "video") => {
    if (!files?.length) return;
    setError("");
    const next: PendingMedia[] = [];
    for (const file of Array.from(files)) {
      if (pending.length + next.length >= MAX_MEDIA) {
        setError(`Tối đa ${MAX_MEDIA} ảnh/video mỗi bài`);
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

  const clearPending = () => {
    setPending((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  };

  const submit = async () => {
    if (!canSubmit) return;
    setPosting(true);
    setError("");
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
      await feedApi.create(body.trim(), media);
      setBody("");
      clearPending();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Đăng bài thất bại");
      console.warn(e);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (id: string) => {
    const prev = posts.find((p) => p.id === id);
    if (!prev) return;
    // Optimistic
    setPosts((list) =>
      list.map((p) =>
        p.id === id
          ? {
              ...p,
              likedByMe: !p.likedByMe,
              likeCount: p.likedByMe ? Math.max(0, p.likeCount - 1) : p.likeCount + 1,
            }
          : p,
      ),
    );
    try {
      const res = await feedApi.like(id);
      setPosts((list) =>
        list.map((p) =>
          p.id === id
            ? {
                ...p,
                likedByMe: res.liked,
                likeCount: res.liked
                  ? prev.likedByMe
                    ? prev.likeCount
                    : prev.likeCount + 1
                  : prev.likedByMe
                    ? Math.max(0, prev.likeCount - 1)
                    : prev.likeCount,
              }
            : p,
        ),
      );
    } catch {
      setPosts((list) => list.map((p) => (p.id === id ? prev : p)));
    }
  };

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="rounded-2xl p-4" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Bạn đang nghĩ gì?"
          rows={3}
          className="w-full bg-transparent outline-none text-sm resize-none mb-3"
          style={{ color: "#e8eaf2" }}
        />

        {pending.length > 0 && (
          <div className="mb-3 grid grid-cols-3 gap-2">
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

        {error && (
          <p className="text-xs mb-3 rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171" }}>
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
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
            disabled={posting || pending.length >= MAX_MEDIA}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
            title="Thêm ảnh"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={posting || pending.length >= MAX_MEDIA}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
            title="Thêm video"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </button>

          <span className="text-xs flex-1" style={{ color: "#3a4060" }}>
            {pending.length > 0 ? `${pending.length}/${MAX_MEDIA} media` : "Ảnh / video (nhiều)"}
          </span>

          <button
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{
              background: canSubmit ? "linear-gradient(135deg, #6c63ff, #5b54e8)" : "#1a1d2e",
              color: canSubmit ? "#fff" : "#3a4060",
            }}
          >
            {posting ? "Đang đăng…" : "Đăng"}
          </button>
        </div>
      </div>

      {loading && <div className="skeleton h-32 rounded-2xl" />}

      {posts.map((post) => {
        const isAuthor = user && user.id === post.userId;
        return (
          <article
            key={post.id}
            className="rounded-2xl relative"
            style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
          >
            <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
              <button onClick={() => router.push(`/wall/${post.userId}`)}>
                <Avatar
                  initials={initialsFromName(post.displayName)}
                  userId={post.userId}
                  size="md"
                  photoUrl={post.primaryPhoto}
                />
              </button>
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => router.push(`/wall/${post.userId}`)}
                  className="text-xs font-bold hover:underline text-left"
                  style={{ color: "#e8eaf2" }}
                >
                  {post.displayName}
                </button>
                <p className="text-xs" style={{ color: "#3a4060" }}>
                  {timeAgo(post.createdAt)}
                </p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId((cur) => (cur === post.id ? null : post.id));
                  }}
                  className="p-1.5 rounded-xl hover:bg-[#1a1d2e] text-xs font-bold transition-all text-slate-400"
                >
                  •••
                </button>

                <DropdownMenu
                  open={activeMenuId === post.id}
                  onClose={() => setActiveMenuId(null)}
                  align="right"
                  minWidth={240}
                  className="max-w-[280px]"
                  items={
                    isAuthor
                      ? [
                          {
                            key: "edit",
                            icon: "✏️",
                            label: "Chỉnh sửa bài viết",
                            onClick: () => router.push(`/feed/${post.id}/edit`),
                          },
                          {
                            key: "delete",
                            icon: "🗑️",
                            label: "Xóa bài viết",
                            danger: true,
                            onClick: () => void handleDeletePost(post.id),
                          },
                        ]
                      : [
                          {
                            key: "hide_post",
                            icon: "🗑️",
                            label: "Xóa bài đăng",
                            subLabel: "Bài đăng này sẽ ẩn khỏi nhật ký",
                            onClick: () => handleHidePost(post.id),
                          },
                          {
                            key: "hide_activity",
                            icon: "👁️‍🗨️",
                            label: "Ẩn hoạt động của người dùng",
                            subLabel: "Bạn sẽ ko thấy bài đăng của người này",
                            onClick: () => handleHideUserActivity(post.userId, post.displayName),
                          },
                          {
                            key: "block_user",
                            icon: "🚫",
                            label: "Chặn người đăng xem nhật ký của tôi",
                            danger: true,
                            onClick: () => void handleBlockUser(post.userId, post.displayName),
                          },
                          {
                            key: "report",
                            icon: "⚠️",
                            label: "Báo xấu",
                            danger: true,
                            onClick: () => void handleReportUser(post.userId, post.displayName),
                          },
                          ...(friends.has(post.userId)
                            ? [
                                {
                                  key: "remove_friend",
                                  icon: "👤❌",
                                  label: "Xóa bạn",
                                  danger: true,
                                  onClick: () =>
                                    void handleRemoveFriend(post.userId, post.displayName),
                                },
                              ]
                            : []),
                        ]
                  }
                />
              </div>
            </div>

            <div
              className="cursor-pointer"
              onClick={() => router.push(`/feed/${post.id}`)}
            >
              {post.body ? (
                <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: "#c8d0e8" }}>
                  {post.body}
                </p>
              ) : null}
              <PostMediaGrid
                media={post.media}
                onMediaClick={(idx) => setViewerMedia({ media: post.media, index: idx })}
              />
            </div>

            <div className="flex items-center gap-4 px-4 py-3" style={{ borderTop: "1px solid #1e2240" }}>
              <button
                onClick={() => void toggleLike(post.id)}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: post.likedByMe ? "#f472b6" : "#6b74a0" }}
              >
                ♥ {post.likeCount}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCommentPostId(post.id);
                }}
                className="flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: "#6b74a0" }}
              >
                💬 {post.commentCount}
              </button>
            </div>
          </article>
        );
      })}

      {!loading && posts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sm font-semibold" style={{ color: "#6b74a0" }}>
            Chưa có bài viết — hãy đăng bài đầu tiên
          </p>
        </div>
      )}

      {commentPostId && (
        <CommentSheet
          postId={commentPostId}
          open
          onClose={() => setCommentPostId(null)}
          onCommented={() => {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === commentPostId ? { ...p, commentCount: p.commentCount + 1 } : p,
              ),
            );
          }}
        />
      )}

      {editingPost && (
        <EditPostModal
          open={!!editingPost}
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={(updated) => {
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }}
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

      {reportTarget && (
        <ReportModal
          open={!!reportTarget}
          targetId={reportTarget.id}
          targetName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}
