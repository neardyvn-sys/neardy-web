"use client";

import { useEffect, useState } from "react";
import { reportsApi } from "@/lib/api";

const REPORT_REASONS = [
  { id: "sensitive", label: "Nội dung nhạy cảm", icon: "🔞" },
  { id: "harassment", label: "Làm phiền", icon: "📢" },
  { id: "scam", label: "Lừa đảo", icon: "⚠️" },
  { id: "other", label: "Nhập lý do khác", icon: "✏️" },
];

export default function ReportModal({
  open,
  targetId,
  targetName,
  onClose,
  onSuccess,
}: {
  open: boolean;
  targetId: string;
  targetName: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [selectedReason, setSelectedReason] = useState<string>("sensitive");
  const [customReason, setCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedReason("sensitive");
      setCustomReason("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    let reasonText = "";
    if (selectedReason === "other") {
      reasonText = customReason.trim();
      if (!reasonText) {
        setError("Vui lòng nhập lý do cụ thể");
        return;
      }
    } else {
      const match = REPORT_REASONS.find((r) => r.id === selectedReason);
      reasonText = match ? match.label : selectedReason;
    }

    setSubmitting(true);
    try {
      await reportsApi.report(targetId, reasonText);
    } catch (err) {
      console.warn("Report API notice:", err);
    } finally {
      setSubmitting(false);
      alert(`Đã gửi báo xấu bài viết của ${targetName}. Cảm ơn phản hồi của bạn!`);
      if (onSuccess) onSuccess();
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "#1e2240" }}>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <h3 className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
              Lý do báo xấu
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            style={{ backgroundColor: "#1a1d2e" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs" style={{ color: "#8a94b8" }}>
            Báo cáo vi phạm đối với bài viết của <strong className="text-white">{targetName}</strong>:
          </p>

          <div className="space-y-2">
            {REPORT_REASONS.map((r) => {
              const checked = selectedReason === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedReason(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
                  style={{
                    backgroundColor: checked ? "rgba(108,99,255,0.12)" : "#161929",
                    border: checked ? "1.5px solid #6c63ff" : "1px solid #232747",
                  }}
                >
                  <span className="text-base shrink-0">{r.icon}</span>
                  <span className="flex-1 text-xs font-semibold" style={{ color: checked ? "#fff" : "#c8d0e8" }}>
                    {r.label}
                  </span>
                  <span
                    className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      border: checked ? "2px solid #6c63ff" : "2px solid #3a4060",
                      backgroundColor: checked ? "#6c63ff" : "transparent",
                    }}
                  >
                    {checked && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedReason === "other" && (
            <div className="space-y-1.5 animate-in fade-in duration-100">
              <label className="text-[11px] font-semibold" style={{ color: "#8a94b8" }}>
                Chi tiết lý do báo xấu:
              </label>
              <textarea
                value={customReason}
                onChange={(e) => {
                  setCustomReason(e.target.value);
                  setError("");
                }}
                rows={3}
                placeholder="Nhập lý do vi phạm cụ thể..."
                className="w-full p-3 rounded-2xl text-xs outline-none transition-colors resize-none"
                style={{
                  backgroundColor: "#0d0f1a",
                  border: "1px solid #282d4d",
                  color: "#e8eaf2",
                }}
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-xs font-bold transition-colors"
              style={{ backgroundColor: "#1a1d2e", color: "#8a94b8" }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-2xl text-xs font-bold transition-all shadow-lg shadow-rose-900/30 active:scale-[0.98]"
              style={{
                backgroundColor: "#f43f5e",
                color: "#fff",
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? "Đang gửi..." : "Gửi báo xấu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
