"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";

type Section = "main" | "change-password" | "delete-account" | "email" | "qr";

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "#6b74a0" }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
        style={{ backgroundColor: "#0d0f1a", border: "1px solid #1e2240" }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6b74a0" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: "#e8eaf2" }}
        />
        <button type="button" onClick={onToggle} style={{ color: "#6b74a0" }}>
          {show ? (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function QrCode({ seedText }: { seedText: string }) {
  const seed = seedText.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const cells = Array.from({ length: 21 }, (_, r) =>
    Array.from({ length: 21 }, (_, c) => {
      if ((r < 7 && c < 7) || (r < 7 && c > 13) || (r > 13 && c < 7)) return true;
      return (seed * (r + 1) * (c + 1)) % 7 < 3;
    }),
  );
  return (
    <svg viewBox="0 0 21 21" width="180" height="180" style={{ imageRendering: "pixelated" }}>
      {cells.map((row, r) =>
        row.map((on, c) =>
          on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#e8eaf2" /> : null,
        ),
      )}
    </svg>
  );
}

function Chevron({ danger }: { danger?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke={danger ? "#f87171" : "#3a4060"}
      strokeWidth={2}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function SecurityPage() {
  const { user, logout } = useApp();
  const router = useRouter();
  const [section, setSection] = useState<Section>("main");

  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteStep, setDeleteStep] = useState<"warn" | "confirm" | "done">("warn");

  const [editEmail, setEditEmail] = useState(false);
  const [newEmail, setNewEmail] = useState(user?.email || "");
  const [emailSaved, setEmailSaved] = useState(false);

  if (!user) return null;

  const resetSubState = () => {
    setPwSuccess(false);
    setPwError("");
    setCurPass("");
    setNewPass("");
    setConfirmPass("");
    setDeleteStep("warn");
    setDeleteConfirm("");
    setEditEmail(false);
    setEmailSaved(false);
    setNewEmail(user.email);
  };

  const goMain = () => {
    setSection("main");
    resetSubState();
  };

  const handleChangePassword = (e: FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (!curPass) {
      setPwError("Vui lòng nhập mật khẩu hiện tại.");
      return;
    }
    if (newPass.length < 6) {
      setPwError("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (newPass !== confirmPass) {
      setPwError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setPwLoading(true);
    window.setTimeout(() => {
      setPwLoading(false);
      setPwSuccess(true);
    }, 1000);
  };

  const strength = !newPass
    ? 0
    : newPass.length < 6
      ? 1
      : newPass.length < 8
        ? 2
        : newPass.length < 12
          ? 3
          : 4;
  const strengthColor =
    strength <= 1 ? "#f87171" : strength === 2 ? "#fbbf24" : strength === 3 ? "#34d399" : "#6c63ff";
  const strengthLabel =
    strength <= 1 ? "Yếu" : strength === 2 ? "Trung bình" : strength === 3 ? "Tốt" : "Rất mạnh";

  const BackBar = ({ title }: { title: string }) => (
    <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #1e2240" }}>
      <button type="button" onClick={goMain} style={{ color: "#6b74a0" }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
      </button>
      <span className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
        {title}
      </span>
    </div>
  );

  let body: ReactNode = null;

  if (section === "main") {
    body = (
      <>
        <div
          className="flex items-center gap-3 px-4 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid #1e2240" }}
        >
          <button type="button" onClick={() => router.push("/profile")} style={{ color: "#6b74a0" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <span className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
            Tài khoản & Bảo mật
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <p className="text-xs font-bold px-1 mb-1" style={{ color: "#6b74a0" }}>
            TÀI KHOẢN
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
            {(
              [
                { icon: "✉️", label: "Email", sub: user.email, id: "email" as Section },
                { icon: "📲", label: "Mã QR của tôi", sub: "Chia sẻ hồ sơ qua mã QR", id: "qr" as Section },
              ] as const
            ).map((item, i, arr) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left transition-colors"
                style={{
                  backgroundColor: "#111320",
                  borderBottom: i < arr.length - 1 ? "1px solid #1e2240" : "none",
                }}
              >
                <span className="text-lg w-7 text-center">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                    {item.label}
                  </p>
                  <p className="text-xs truncate" style={{ color: "#6b74a0" }}>
                    {item.sub}
                  </p>
                </div>
                <Chevron />
              </button>
            ))}
          </div>

          <p className="text-xs font-bold px-1 mb-1 mt-4" style={{ color: "#6b74a0" }}>
            BẢO MẬT
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e2240" }}>
            <button
              type="button"
              onClick={() => setSection("change-password")}
              className="w-full flex items-center gap-3 px-4 py-4 text-left"
              style={{ backgroundColor: "#111320", borderBottom: "1px solid #1e2240" }}
            >
              <span className="text-lg w-7 text-center">🔑</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                  Đổi mật khẩu
                </p>
                <p className="text-xs" style={{ color: "#6b74a0" }}>
                  Cập nhật mật khẩu định kỳ
                </p>
              </div>
              <Chevron />
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-4 text-left"
              style={{ backgroundColor: "#111320" }}
            >
              <span className="text-lg w-7 text-center">🛡️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "#e8eaf2" }}>
                  Xác thực 2 bước
                </p>
                <p className="text-xs" style={{ color: "#6b74a0" }}>
                  Chưa bật
                </p>
              </div>
              <div
                className="w-10 h-5 rounded-full relative"
                style={{ backgroundColor: "#1a1d2e", border: "1px solid #2e3454" }}
              >
                <div
                  className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full"
                  style={{ backgroundColor: "#3a4060" }}
                />
              </div>
            </button>
          </div>

          <p className="text-xs font-bold px-1 mb-1 mt-4" style={{ color: "#6b74a0" }}>
            VÙNG NGUY HIỂM
          </p>
          <button
            type="button"
            onClick={() => setSection("delete-account")}
            className="w-full flex items-center gap-3 px-4 py-4 text-left rounded-2xl"
            style={{ backgroundColor: "#111320", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <span className="text-lg w-7 text-center">🗑️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: "#f87171" }}>
                Xoá tài khoản
              </p>
              <p className="text-xs" style={{ color: "#6b74a0" }}>
                Xoá vĩnh viễn, không khôi phục được
              </p>
            </div>
            <Chevron danger />
          </button>
        </div>
      </>
    );
  }

  if (section === "change-password") {
    body = (
      <>
        <BackBar title="Đổi mật khẩu" />
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {pwSuccess ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-2xl mb-5 flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,229,255,0.1))",
                  border: "1px solid rgba(108,99,255,0.3)",
                }}
              >
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#6c63ff" strokeWidth={1.5}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold mb-2" style={{ color: "#e8eaf2" }}>
                Đổi mật khẩu thành công!
              </h3>
              <p className="text-sm mb-6" style={{ color: "#6b74a0" }}>
                Mật khẩu của bạn đã được cập nhật.
              </p>
              <button
                type="button"
                onClick={() => {
                  setPwSuccess(false);
                  setCurPass("");
                  setNewPass("");
                  setConfirmPass("");
                }}
                className="px-6 py-3 rounded-2xl text-sm font-bold"
                style={{ backgroundColor: "#1a1d2e", color: "#a0a8c8" }}
              >
                Đổi lại
              </button>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <PasswordField
                label="Mật khẩu hiện tại"
                value={curPass}
                onChange={setCurPass}
                show={showCur}
                onToggle={() => setShowCur((v) => !v)}
              />
              <div className="h-px" style={{ backgroundColor: "#1e2240" }} />
              <PasswordField
                label="Mật khẩu mới"
                value={newPass}
                onChange={setNewPass}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />
              <PasswordField
                label="Xác nhận mật khẩu mới"
                value={confirmPass}
                onChange={setConfirmPass}
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
              />

              {newPass ? (
                <div>
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 h-1 rounded-full transition-all"
                        style={{
                          backgroundColor: i <= strength ? strengthColor : "#1e2240",
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: "#6b74a0" }}>
                    Độ mạnh: {strengthLabel}
                  </p>
                </div>
              ) : null}

              {pwError ? (
                <p
                  className="text-xs px-3 py-2 rounded-xl"
                  style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}
                >
                  {pwError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all mt-2"
                style={{
                  background: pwLoading ? "#1a1d2e" : "linear-gradient(135deg, #6c63ff, #5b54e8)",
                  color: pwLoading ? "#6b74a0" : "#fff",
                  boxShadow: pwLoading ? "none" : "0 8px 24px rgba(108,99,255,0.3)",
                }}
              >
                {pwLoading ? "Đang lưu…" : "Cập nhật mật khẩu"}
              </button>
            </form>
          )}
        </div>
      </>
    );
  }

  if (section === "email") {
    body = (
      <>
        <BackBar title="Email" />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#6b74a0" }}>
              EMAIL HIỆN TẠI
            </p>
            <p className="text-sm font-bold" style={{ color: "#e8eaf2" }}>
              {user.email}
            </p>
            <p className="text-xs mt-1" style={{ color: "#3a4060" }}>
              Đã xác minh ✓
            </p>
          </div>

          {!emailSaved ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "#6b74a0" }}>
                  EMAIL MỚI
                </label>
                <div
                  className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
                  style={{
                    backgroundColor: "#0d0f1a",
                    border: `1px solid ${editEmail ? "#6c63ff" : "#1e2240"}`,
                  }}
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#6b74a0" strokeWidth={2}>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    type="email"
                    value={newEmail}
                    onFocus={() => setEditEmail(true)}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email-moi@example.com"
                    className="flex-1 bg-transparent outline-none text-sm"
                    style={{ color: "#e8eaf2" }}
                  />
                </div>
              </div>
              {editEmail && newEmail !== user.email ? (
                <button
                  type="button"
                  onClick={() => setEmailSaved(true)}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm"
                  style={{
                    background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                    color: "#fff",
                    boxShadow: "0 8px 24px rgba(108,99,255,0.3)",
                  }}
                >
                  Gửi link xác nhận
                </button>
              ) : null}
            </div>
          ) : (
            <div
              className="rounded-2xl p-5 text-center"
              style={{
                backgroundColor: "rgba(108,99,255,0.08)",
                border: "1px solid rgba(108,99,255,0.2)",
              }}
            >
              <p className="text-2xl mb-2">📬</p>
              <p className="text-sm font-bold mb-1" style={{ color: "#e8eaf2" }}>
                Kiểm tra email!
              </p>
              <p className="text-xs" style={{ color: "#6b74a0" }}>
                Chúng tôi đã gửi link xác nhận đến{" "}
                <span style={{ color: "#9b94ff" }}>{newEmail}</span>
              </p>
            </div>
          )}

          <div className="rounded-2xl p-4" style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}>
            <p className="text-xs leading-relaxed" style={{ color: "#6b74a0" }}>
              Sau khi thay đổi email, bạn sẽ cần đăng nhập lại bằng địa chỉ mới. Chúng tôi sẽ gửi link xác
              nhận trước khi áp dụng thay đổi.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (section === "qr") {
    body = (
      <>
        <BackBar title="Mã QR của tôi" />
        <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col items-center">
          <p className="text-sm mb-8 text-center" style={{ color: "#6b74a0" }}>
            Bạn bè có thể quét mã này để xem hồ sơ và kết nối với bạn trên Neardy
          </p>

          <div
            className="rounded-3xl p-6 mb-6 flex flex-col items-center gap-4"
            style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="relative w-5 h-5 flex items-center justify-center">
                <div
                  className="ping-ring-1 absolute inset-0 rounded-full"
                  style={{ backgroundColor: "rgba(108,99,255,0.3)" }}
                />
                <div
                  className="pulse-dot w-2 h-2 rounded-full relative z-10"
                  style={{ backgroundColor: "#6c63ff" }}
                />
              </div>
              <span className="font-extrabold text-sm" style={{ color: "#e8eaf2" }}>
                near<span style={{ color: "#6c63ff" }}>dy</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl" style={{ backgroundColor: "#0d0f1a", border: "1px solid #1e2240" }}>
              <QrCode seedText={user.email} />
            </div>

            <div className="text-center">
              <p className="font-extrabold text-base" style={{ color: "#e8eaf2" }}>
                {user.name}
              </p>
              <p className="text-xs" style={{ color: "#6b74a0" }}>
                @{user.email.split("@")[0]}
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/wall/${user.id}`;
                void navigator.clipboard?.writeText(url);
              }}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ backgroundColor: "#111320", color: "#a0a8c8", border: "1px solid #1e2240" }}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              Chia sẻ
            </button>
            <button
              type="button"
              className="flex-1 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #6c63ff, #5b54e8)", color: "#fff" }}
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Lưu ảnh
            </button>
          </div>
        </div>
      </>
    );
  }

  if (section === "delete-account") {
    body = (
      <>
        <BackBar title="Xoá tài khoản" />
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {deleteStep === "warn" && (
            <div className="space-y-4">
              <div
                className="rounded-2xl p-5"
                style={{
                  backgroundColor: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <p className="text-sm font-bold mb-3" style={{ color: "#f87171" }}>
                  ⚠️ Cảnh báo quan trọng
                </p>
                {[
                  "Tất cả dữ liệu của bạn sẽ bị xoá vĩnh viễn",
                  "Không thể khôi phục tài khoản sau khi xoá",
                  "Các cuộc trò chuyện sẽ bị xoá khỏi hệ thống",
                  "Bạn bè sẽ không còn thấy hồ sơ của bạn",
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2 mb-2">
                    <span className="text-xs mt-0.5" style={{ color: "#f87171" }}>
                      ✕
                    </span>
                    <p className="text-xs" style={{ color: "#a0a8c8" }}>
                      {t}
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setDeleteStep("confirm")}
                className="w-full py-3.5 rounded-2xl font-bold text-sm"
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  color: "#f87171",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                Tôi hiểu, tiếp tục
              </button>
              <button
                type="button"
                onClick={goMain}
                className="w-full py-3 rounded-2xl text-sm font-semibold"
                style={{ backgroundColor: "#111320", color: "#a0a8c8", border: "1px solid #1e2240" }}
              >
                Huỷ bỏ
              </button>
            </div>
          )}
          {deleteStep === "confirm" && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: "#a0a8c8" }}>
                Để xác nhận, hãy gõ chính xác:{" "}
                <span className="font-bold" style={{ color: "#f87171" }}>
                  XOÁ TÀI KHOẢN
                </span>
              </p>
              <div
                className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
                style={{
                  backgroundColor: "#0d0f1a",
                  border: `1px solid ${
                    deleteConfirm === "XOÁ TÀI KHOẢN" ? "rgba(239,68,68,0.5)" : "#1e2240"
                  }`,
                }}
              >
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="XOÁ TÀI KHOẢN"
                  className="w-full bg-transparent outline-none text-sm font-mono"
                  style={{ color: "#f87171" }}
                />
              </div>
              <button
                type="button"
                disabled={deleteConfirm !== "XOÁ TÀI KHOẢN"}
                onClick={() => setDeleteStep("done")}
                className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
                style={
                  deleteConfirm === "XOÁ TÀI KHOẢN"
                    ? {
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        boxShadow: "0 8px 24px rgba(239,68,68,0.3)",
                      }
                    : { backgroundColor: "#1a1d2e", color: "#3a4060" }
                }
              >
                Xoá vĩnh viễn
              </button>
            </div>
          )}
          {deleteStep === "done" && (
            <div className="text-center py-12 flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-2xl mb-5 flex items-center justify-center"
                style={{
                  backgroundColor: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                }}
              >
                <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth={1.5}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold mb-2" style={{ color: "#e8eaf2" }}>
                Tài khoản đã được xoá
              </h3>
              <p className="text-sm mb-6" style={{ color: "#6b74a0" }}>
                Tất cả dữ liệu của bạn đã bị xoá khỏi hệ thống.
              </p>
              <button
                type="button"
                onClick={() => void logout()}
                className="w-full max-w-xs py-3.5 rounded-2xl font-bold text-sm"
                style={{ background: "linear-gradient(135deg, #6c63ff, #5b54e8)", color: "#fff" }}
              >
                Về trang chủ
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col min-h-0">{body}</div>
    </div>
  );
}
