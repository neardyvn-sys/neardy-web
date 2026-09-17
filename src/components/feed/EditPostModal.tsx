"use client";

import { useEffect, useState } from "react";
import { feedApi } from "@/lib/api";
import type { FeedPost } from "@/lib/types";

export default function EditPostModal({
  open,
  post,
  onClose,
  onSave,
}: {
  open: boolean;
  post: FeedPost | null;
  onClose: () => void;
  onSave: (updated: FeedPost) => void;
}) {
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && post) {
      setBody(post.body || "");
      setError("");
    }
  }, [open, post]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !post) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await feedApi.update(post.id, body.trim());
      onSave({
        ...post,
        body: res.body,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chỉnh sửa thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 space-y-4 slide-up"
        style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3" style={{ borderBottom: "1px solid #1e2240" }}>
          <h3 className="font-bold text-base" style={{ color: "#e8eaf2" }}>
            Chỉnh sửa bài viết
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-sm rounded-lg hover:bg-[#1a1d2e]"
            style={{ color: "#6b74a0" }}
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="text-xs rounded-xl px-3 py-2" style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171" }}>
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nội dung bài viết..."
            rows={4}
            className="w-full bg-[#0a0c14] border rounded-xl p-3 text-sm outline-none resize-none"
            style={{ borderColor: "#1e2240", color: "#e8eaf2" }}
            required
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                color: "#fff",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Đang lưu..." : "Lưu bài viết"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
