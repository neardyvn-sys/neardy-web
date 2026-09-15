"use client";

import { useEffect, useRef, useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { feedApi, uploadsApi } from "@/lib/api";
import { initialsFromName } from "@/lib/types";

export type FeedComment = {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  displayName: string;
  parentId?: string | null;
  mediaUrl?: string | null;
  likeCount: number;
  likedByMe: boolean;
  replies: FeedComment[];
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "vừa xong";
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  return `${Math.floor(h / 24)} ngày`;
}

function mapComment(c: {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  display_name: string;
  parent_id?: string | null;
  media_url?: string | null;
  like_count: number;
  liked_by_me: boolean;
  replies?: {
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    display_name: string;
    parent_id?: string | null;
    media_url?: string | null;
    like_count: number;
    liked_by_me: boolean;
  }[];
}): FeedComment {
  return {
    id: c.id,
    body: c.body || "",
    createdAt: c.created_at,
    userId: c.user_id,
    displayName: c.display_name,
    parentId: c.parent_id,
    mediaUrl: c.media_url,
    likeCount: c.like_count || 0,
    likedByMe: !!c.liked_by_me,
    replies: (c.replies || []).map((r) => mapComment({ ...r, replies: [] })),
  };
}

function CommentRow({
  comment,
  isReply,
  onLike,
  onReply,
}: {
  comment: FeedComment;
  isReply?: boolean;
  onLike: (id: string) => void;
  onReply: (c: FeedComment) => void;
}) {
  return (
    <div className={`flex gap-2.5 ${isReply ? "ml-8" : ""}`}>
      <Avatar initials={initialsFromName(comment.displayName)} userId={comment.userId} size="sm" />
      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl px-3 py-2"
          style={{ backgroundColor: "#161929", border: "1px solid #1e2240" }}
        >
          <p className="text-xs font-bold mb-0.5" style={{ color: "#e8eaf2" }}>
            {comment.displayName}
          </p>
          {comment.body ? (
            <p className="text-sm leading-relaxed" style={{ color: "#c8d0e8" }}>
              {comment.body}
            </p>
          ) : null}
          {comment.mediaUrl ? (
            <a
              href={comment.mediaUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block overflow-hidden rounded-xl"
              style={{ border: "1px solid #1e2240" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={comment.mediaUrl} alt="" className="max-h-48 w-full object-cover" />
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          <span className="text-[10px]" style={{ color: "#3a4060" }}>
            {timeAgo(comment.createdAt)}
          </span>
          <button
            type="button"
            onClick={() => onLike(comment.id)}
            className="text-[10px] font-semibold"
            style={{ color: comment.likedByMe ? "#f472b6" : "#6b74a0" }}
          >
            Thích{comment.likeCount > 0 ? ` · ${comment.likeCount}` : ""}
          </button>
          {!isReply && (
            <button
              type="button"
              onClick={() => onReply(comment)}
              className="text-[10px] font-semibold"
              style={{ color: "#6b74a0" }}
            >
              Trả lời
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentSheet({
  postId,
  open,
  onClose,
  onCommented,
}: {
  postId: string;
  open: boolean;
  onClose: () => void;
  onCommented?: () => void;
}) {
  const [comments, setComments] = useState<FeedComment[]>([]);
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<FeedComment | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const totalCount = comments.reduce((s, c) => s + 1 + c.replies.length, 0);
  const canSend = (!!text.trim() || !!imageFile) && !sending;

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setText("");
    setReplyTo(null);
    clearImage();
    (async () => {
      try {
        const data = await feedApi.comments(postId);
        if (cancelled) return;
        setComments(data.comments.map(mapComment));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Không tải được bình luận");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    const t = window.setTimeout(() => inputRef.current?.focus(), 280);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!loading && comments.length) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [loading, comments.length]);

  if (!open) return null;

  const toggleLike = async (commentId: string) => {
    const snapshot = comments;

    const applyLocal = (list: FeedComment[], likedOverride?: boolean): FeedComment[] =>
      list.map((c) => {
        const bump = (item: FeedComment): FeedComment => {
          if (item.id !== commentId) return item;
          const nextLiked = likedOverride ?? !item.likedByMe;
          if (nextLiked === item.likedByMe) return item;
          return {
            ...item,
            likedByMe: nextLiked,
            likeCount: nextLiked ? item.likeCount + 1 : Math.max(0, item.likeCount - 1),
          };
        };
        return { ...bump(c), replies: c.replies.map(bump) };
      });

    setComments((list) => applyLocal(list));
    try {
      const res = await feedApi.likeComment(commentId);
      setComments((list) => applyLocal(list, res.liked));
    } catch {
      setComments(snapshot);
    }
  };

  const startReply = (c: FeedComment) => {
    setReplyTo(c);
    inputRef.current?.focus();
  };

  const submit = async () => {
    if (!canSend) return;
    setSending(true);
    setError("");
    try {
      let mediaUrl: string | undefined;
      if (imageFile) {
        const uploaded = await uploadsApi.file(imageFile, "image");
        mediaUrl = uploaded.public_url;
      }
      const created = await feedApi.comment(postId, {
        body: text.trim() || undefined,
        parent_id: replyTo?.id,
        media_url: mediaUrl,
      });
      const mapped = mapComment({ ...created, replies: [] });

      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id ? { ...c, replies: [...c.replies, mapped] } : c,
          ),
        );
      } else {
        setComments((prev) => [...prev, mapped]);
      }

      setText("");
      setReplyTo(null);
      clearImage();
      onCommented?.();
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gửi bình luận thất bại");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md flex flex-col slide-up"
        style={{
          backgroundColor: "#111320",
          border: "1px solid #1e2240",
          borderBottom: "none",
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          maxHeight: "78vh",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center pt-3 pb-2 flex-shrink-0">
          <span className="w-10 h-1 rounded-full" style={{ backgroundColor: "#2e3454" }} />
        </div>

        <div className="flex items-center justify-between px-5 pb-3 flex-shrink-0">
          <h3 className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
            Bình luận
            {totalCount > 0 ? (
              <span className="font-semibold" style={{ color: "#6b74a0" }}>
                {" "}
                · {totalCount}
              </span>
            ) : null}
          </h3>
          <button type="button" onClick={onClose} style={{ color: "#6b74a0" }} aria-label="Đóng">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-5 space-y-4 min-h-[180px]">
          {loading && (
            <div className="py-10 text-center text-xs" style={{ color: "#6b74a0" }}>
              Đang tải…
            </div>
          )}
          {!loading && comments.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm font-semibold" style={{ color: "#6b74a0" }}>
                Chưa có bình luận
              </p>
              <p className="text-xs mt-1" style={{ color: "#3a4060" }}>
                Hãy là người đầu tiên bình luận
              </p>
            </div>
          )}
          {!loading &&
            comments.map((c) => (
              <div key={c.id} className="space-y-3">
                <CommentRow comment={c} onLike={(id) => void toggleLike(id)} onReply={startReply} />
                {c.replies.map((r) => (
                  <CommentRow
                    key={r.id}
                    comment={r}
                    isReply
                    onLike={(id) => void toggleLike(id)}
                    onReply={startReply}
                  />
                ))}
              </div>
            ))}
        </div>

        {error && (
          <p
            className="mx-5 mt-2 text-xs rounded-xl px-3 py-2"
            style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171" }}
          >
            {error}
          </p>
        )}

        {replyTo && (
          <div
            className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.2)" }}
          >
            <p className="text-xs truncate" style={{ color: "#9b94ff" }}>
              Đang trả lời <span className="font-bold">{replyTo.displayName}</span>
            </p>
            <button type="button" onClick={() => setReplyTo(null)} className="text-xs font-semibold" style={{ color: "#6b74a0" }}>
              Hủy
            </button>
          </div>
        )}

        {imagePreview && (
          <div className="mx-4 mt-2 relative w-20 h-20 rounded-xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-1 right-1 w-5 h-5 rounded-full text-xs font-bold"
              style={{ backgroundColor: "rgba(0,0,0,0.65)", color: "#fff" }}
            >
              ×
            </button>
          </div>
        )}

        <div
          className="flex-shrink-0 flex items-center gap-2 px-4 py-3 mt-2"
          style={{ borderTop: "1px solid #1e2240" }}
        >
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
            disabled={sending}
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
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
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
            placeholder={replyTo ? `Trả lời ${replyTo.displayName}…` : "Viết bình luận…"}
            disabled={sending}
            className="flex-1 bg-transparent outline-none text-sm px-3 py-2.5 rounded-2xl"
            style={{ backgroundColor: "#0a0c14", border: "1px solid #1e2240", color: "#e8eaf2" }}
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSend}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold flex-shrink-0"
            style={
              canSend
                ? {
                    background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                    color: "#fff",
                  }
                : { backgroundColor: "#1a1d2e", color: "#3a4060" }
            }
          >
            {sending ? "…" : "Gửi"}
          </button>
        </div>
      </div>
    </div>
  );
}
