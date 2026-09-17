"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import EditPostModal from "@/components/feed/EditPostModal";
import ImageViewer, { type MediaItem } from "@/components/ui/ImageViewer";
import { useApp } from "@/components/providers/AppProvider";
import { feedApi, uploadsApi } from "@/lib/api";
import type { FeedPost } from "@/lib/types";
import { initialsFromName } from "@/lib/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}

type CommentItem = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  display_name: string;
  parent_id?: string | null;
  media_url?: string | null;
  like_count: number;
  liked_by_me: boolean;
  replies?: CommentItem[];
};

export default function PostDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ postId: string }>;
}) {
  const params = use(paramsPromise);
  const postId = params.postId;
  const router = useRouter();
  const { user } = useApp();

  const [post, setPost] = useState<FeedPost | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [inputBody, setInputBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentItem | null>(null);
  const [postingComment, setPostingComment] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<{
    media: MediaItem[];
    index: number;
  } | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);

  const isAuthor = user && post && user.id === post.userId;
  const canSendComment = (!!inputBody.trim() || !!imageFile) && !postingComment && !!post;

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [pData, cData] = await Promise.all([
        feedApi.get(postId),
        feedApi.comments(postId),
      ]);
      setPost({
        id: pData.id,
        body: pData.body,
        createdAt: pData.created_at,
        userId: pData.user_id,
        displayName: pData.display_name,
        primaryPhoto: pData.primary_photo,
        media: pData.media || [],
        likeCount: pData.like_count,
        commentCount: pData.comment_count,
        likedByMe: pData.liked_by_me,
      });
      setComments(cData.comments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể tải bài viết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [postId]);

  const handleToggleLikePost = async () => {
    if (!post) return;
    const prev = post;
    setPost({
      ...post,
      likedByMe: !post.likedByMe,
      likeCount: post.likedByMe ? Math.max(0, post.likeCount - 1) : post.likeCount + 1,
    });
    try {
      const res = await feedApi.like(post.id);
      setPost((cur) =>
        cur
          ? {
              ...cur,
              likedByMe: res.liked,
              likeCount: res.liked
                ? prev.likedByMe
                  ? prev.likeCount
                  : prev.likeCount + 1
                : prev.likedByMe
                  ? Math.max(0, prev.likeCount - 1)
                  : prev.likeCount,
            }
          : null,
      );
    } catch {
      setPost(prev);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSendComment || !post) return;
    setPostingComment(true);
    try {
      let mediaUrl: string | undefined;
      if (imageFile) {
        const uploaded = await uploadsApi.file(imageFile, "image");
        mediaUrl = uploaded.public_url;
      }
      await feedApi.comment(post.id, {
        body: inputBody.trim() || undefined,
        parent_id: replyTarget?.id,
        media_url: mediaUrl,
      });
      setInputBody("");
      setReplyTarget(null);
      clearImage();
      const cData = await feedApi.comments(post.id);
      setComments(cData.comments || []);
      setPost((prev) => (prev ? { ...prev, commentCount: prev.commentCount + 1 } : null));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gửi bình luận thất bại");
    } finally {
      setPostingComment(false);
    }
  };

  const handleToggleCommentLike = async (commentId: string) => {
    try {
      const res = await feedApi.likeComment(commentId);
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              liked_by_me: res.liked,
              like_count: res.liked ? c.like_count + 1 : Math.max(0, c.like_count - 1),
            };
          }
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.map((r) =>
                r.id === commentId
                  ? {
                      ...r,
                      liked_by_me: res.liked,
                      like_count: res.liked ? r.like_count + 1 : Math.max(0, r.like_count - 1),
                    }
                  : r,
              ),
            };
          }
          return c;
        }),
      );
    } catch {
      // ignore
    }
  };

  const handleDeletePost = async () => {
    if (!post || !confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
    setDeleting(true);
    try {
      await feedApi.delete(post.id);
      router.push("/feed");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Xóa bài viết thất bại");
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid #1e2240", backgroundColor: "#0d0f1a" }}
      >
        <button type="button" onClick={() => router.back()} style={{ color: "#6b74a0" }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
          Bài viết
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full space-y-4">
        {error ? (
          <div className="text-center py-12">
            <p className="text-sm font-semibold" style={{ color: "#f87171" }}>
              {error}
            </p>
            <button
              type="button"
              onClick={() => router.push("/feed")}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: "#1a1d2e", color: "#9b94ff" }}
            >
              Quay lại Feed
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            <div className="skeleton h-32 rounded-2xl" />
            <div className="skeleton h-20 rounded-2xl" />
          </div>
        ) : post ? (
          <>
            {/* Main Post Card */}
            <article className="rounded-2xl overflow-hidden relative" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
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

                {isAuthor && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      className="p-2 rounded-xl hover:bg-[#1a1d2e]"
                      style={{ color: "#6b74a0" }}
                    >
                      •••
                    </button>
                    {menuOpen && (
                      <div
                        className="absolute right-0 mt-1 z-20 rounded-xl overflow-hidden shadow-lg text-xs"
                        style={{ backgroundColor: "#161929", border: "1px solid #1e2240", minWidth: 140 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            setEditOpen(true);
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-[#1a1d2e]"
                          style={{ color: "#e8eaf2" }}
                        >
                          ✏️ Chỉnh sửa bài viết
                        </button>
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => {
                            setMenuOpen(false);
                            void handleDeletePost();
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-[#1a1d2e]"
                          style={{ color: "#f87171" }}
                        >
                          🗑️ Xóa bài viết
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {post.body ? (
                <p className="px-4 pb-3 text-sm leading-relaxed" style={{ color: "#c8d0e8" }}>
                  {post.body}
                </p>
              ) : null}

              {post.media.length > 0 && (
                <div className="mx-4 mb-3 space-y-2">
                  {post.media.map((item, idx) => (
                    <div
                      key={item.id || `${item.url}-${idx}`}
                      className="overflow-hidden rounded-xl cursor-pointer"
                      style={{ backgroundColor: "#0a0c14", border: "1px solid #1e2240" }}
                      onClick={() => setViewerMedia({ media: post.media, index: idx })}
                    >
                      {item.type === "video" ? (
                        <video src={item.url} controls playsInline className="w-full object-cover max-h-80" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.url} alt="" className="w-full object-cover max-h-80" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 px-4 py-3" style={{ borderTop: "1px solid #1e2240" }}>
                <button
                  onClick={() => void handleToggleLikePost()}
                  className="flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: post.likedByMe ? "#f472b6" : "#6b74a0" }}
                >
                  ♥ {post.likeCount} lượt thích
                </button>
                <span className="text-xs font-semibold" style={{ color: "#6b74a0" }}>
                  💬 {post.commentCount} bình luận
                </span>
              </div>
            </article>

            {/* Comments List */}
            <div className="space-y-3 pb-8">
              <p className="text-xs font-bold px-1" style={{ color: "#6b74a0" }}>
                BÌNH LUẬN ({comments.length})
              </p>

              {comments.length === 0 ? (
                <div className="text-center py-8" style={{ color: "#3a4060" }}>
                  <p className="text-xs">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
                </div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl space-y-2"
                    style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar
                          initials={initialsFromName(c.display_name)}
                          userId={c.user_id}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-bold" style={{ color: "#e8eaf2" }}>
                            {c.display_name}
                          </p>
                          <p className="text-[10px]" style={{ color: "#3a4060" }}>
                            {timeAgo(c.created_at)}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleToggleCommentLike(c.id)}
                        className="text-xs font-semibold flex items-center gap-1"
                        style={{ color: c.liked_by_me ? "#f472b6" : "#6b74a0" }}
                      >
                        ♥ {c.like_count > 0 ? c.like_count : ""}
                      </button>
                    </div>

                    {c.body ? (
                      <p className="text-xs leading-relaxed" style={{ color: "#c8d0e8" }}>
                        {c.body}
                      </p>
                    ) : null}

                    {c.media_url && (
                      <div
                        className="mt-2 overflow-hidden rounded-xl max-w-xs cursor-pointer"
                        style={{ border: "1px solid #1e2240" }}
                        onClick={() =>
                          setViewerMedia({
                            media: [{ type: "image", url: c.media_url! }],
                            index: 0,
                          })
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={c.media_url} alt="" className="max-h-48 w-full object-cover" />
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setReplyTarget(c)}
                      className="text-[11px] font-semibold"
                      style={{ color: "#9b94ff" }}
                    >
                      Trả lời
                    </button>

                    {/* Replies */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="pl-4 mt-2 border-l-2 space-y-2" style={{ borderColor: "#1e2240" }}>
                        {c.replies.map((r) => (
                          <div key={r.id} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold" style={{ color: "#9b94ff" }}>
                                {r.display_name}
                              </p>
                              <button
                                type="button"
                                onClick={() => void handleToggleCommentLike(r.id)}
                                className="text-[10px] font-semibold"
                                style={{ color: r.liked_by_me ? "#f472b6" : "#6b74a0" }}
                              >
                                ♥ {r.like_count > 0 ? r.like_count : ""}
                              </button>
                            </div>
                            {r.body ? (
                              <p className="text-xs" style={{ color: "#c8d0e8" }}>
                                {r.body}
                              </p>
                            ) : null}
                            {r.media_url && (
                              <a
                                href={r.media_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 block overflow-hidden rounded-xl max-w-xs"
                                style={{ border: "1px solid #1e2240" }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={r.media_url} alt="" className="max-h-36 w-full object-cover" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Comment Form Bar fixed at bottom */}
            <div
              className="fixed bottom-0 left-0 right-0 p-3 flex flex-col gap-2 max-w-md mx-auto z-30"
              style={{ backgroundColor: "#0d0f1a", borderTop: "1px solid #1e2240" }}
            >
              {replyTarget && (
                <div className="flex items-center justify-between text-xs px-2" style={{ color: "#9b94ff" }}>
                  <span>Đang trả lời <b>{replyTarget.display_name}</b></span>
                  <button type="button" onClick={() => setReplyTarget(null)} className="text-xs">
                    ✕
                  </button>
                </div>
              )}

              {imagePreview && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff" }}
                  >
                    ×
                  </button>
                </div>
              )}

              <form onSubmit={handleSendComment} className="flex items-center gap-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }}
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={postingComment}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
                  title="Đính kèm ảnh"
                >
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
                <input
                  type="text"
                  value={inputBody}
                  onChange={(e) => setInputBody(e.target.value)}
                  placeholder={replyTarget ? `Trả lời ${replyTarget.display_name}...` : "Viết bình luận..."}
                  className="flex-1 bg-[#111320] border rounded-xl px-3.5 py-2 text-xs outline-none"
                  style={{ borderColor: "#1e2240", color: "#e8eaf2" }}
                />
                <button
                  type="submit"
                  disabled={!canSendComment}
                  className="px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0"
                  style={{
                    background: canSendComment ? "linear-gradient(135deg, #6c63ff, #5b54e8)" : "#1a1d2e",
                    color: canSendComment ? "#fff" : "#3a4060",
                  }}
                >
                  {postingComment ? "..." : "Gửi"}
                </button>
              </form>
            </div>
          </>
        ) : null}
      </div>

      {editOpen && post && (
        <EditPostModal
          open={editOpen}
          post={post}
          onClose={() => setEditOpen(false)}
          onSave={(updated) => setPost(updated)}
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

