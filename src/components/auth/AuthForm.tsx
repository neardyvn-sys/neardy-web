"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/brand/Logo";
import Field from "@/components/ui/Field";
import { useApp } from "@/components/providers/AppProvider";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { loginWithPassword } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const isLogin = mode === "login";

  const handleForgot = (e: FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSent(true);
    }, 1200);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (!isLogin && !name) {
      setError("Vui lòng nhập tên của bạn.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    setLoading(true);
    try {
      await loginWithPassword(email.trim(), password, isLogin ? undefined : name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (forgotMode) {
    return (
      <AuthShell>
        <button
          onClick={() => {
            setForgotMode(false);
            setForgotSent(false);
            setForgotEmail("");
          }}
          className="flex items-center gap-1.5 mb-8 text-sm"
          style={{ color: "#6b74a0" }}
        >
          <BackIcon />
          Quay lại đăng nhập
        </button>
        <Logo size="md" />
        {!forgotSent ? (
          <>
            <h2 className="mt-6 mb-1 text-2xl font-extrabold" style={{ color: "#e8eaf2" }}>
              Quên mật khẩu?
            </h2>
            <p className="text-sm mb-8" style={{ color: "#6b74a0" }}>
              Nhập email của bạn — chúng tôi sẽ gửi link đặt lại mật khẩu
            </p>
            <form onSubmit={handleForgot} className="space-y-3">
              <Field label="Email đã đăng ký" icon={<MailIcon />}>
                <input
                  type="email"
                  placeholder="ban@email.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                  style={{ color: "#e8eaf2" }}
                  autoFocus
                />
              </Field>
              <button
                type="submit"
                disabled={forgotLoading || !forgotEmail}
                className="w-full py-3.5 rounded-2xl font-bold text-sm mt-2 transition-all"
                style={{
                  background:
                    forgotLoading || !forgotEmail
                      ? "#1a1d2e"
                      : "linear-gradient(135deg, #6c63ff, #5b54e8)",
                  color: forgotLoading || !forgotEmail ? "#6b74a0" : "#fff",
                  boxShadow:
                    forgotLoading || !forgotEmail ? "none" : "0 8px 24px rgba(108,99,255,0.3)",
                }}
              >
                {forgotLoading ? "Đang gửi…" : "Gửi link đặt lại"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center mt-10">
            <div
              className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,229,255,0.1))",
                border: "1px solid rgba(108,99,255,0.3)",
              }}
            >
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#6c63ff" strokeWidth={1.5}>
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.91a16 16 0 0 0 6.08 6.08l.98-.98a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h3 className="text-xl font-extrabold mb-2" style={{ color: "#e8eaf2" }}>
              Kiểm tra email nhé!
            </h3>
            <p className="text-sm mb-1" style={{ color: "#a0a8c8" }}>
              Chúng tôi đã gửi link đặt lại mật khẩu đến
            </p>
            <p className="text-sm font-bold mb-6" style={{ color: "#9b94ff" }}>
              {forgotEmail}
            </p>
            <button
              onClick={() => {
                setForgotMode(false);
                setForgotSent(false);
                setForgotEmail("");
              }}
              className="w-full py-3.5 rounded-2xl font-bold text-sm"
              style={{
                background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                color: "#fff",
                boxShadow: "0 8px 24px rgba(108,99,255,0.3)",
              }}
            >
              Quay lại đăng nhập
            </button>
          </div>
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Link href="/" className="flex items-center gap-1.5 mb-8 text-sm" style={{ color: "#6b74a0" }}>
        <BackIcon />
        Trang chủ
      </Link>
      <Logo size="md" />
      <h2 className="mt-6 mb-1 text-2xl font-extrabold" style={{ color: "#e8eaf2" }}>
        {isLogin ? "Chào mừng trở lại" : "Tạo tài khoản mới"}
      </h2>
      <p className="text-sm mb-8" style={{ color: "#6b74a0" }}>
        {isLogin ? "Đăng nhập để khám phá người xung quanh" : "Chỉ mất 30 giây để bắt đầu"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        {!isLogin && (
          <Field label="Tên của bạn" icon={<UserIcon />}>
            <input
              type="text"
              placeholder="Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "#e8eaf2" }}
            />
          </Field>
        )}
        <Field label="Email" icon={<MailIcon />}>
          <input
            type="email"
            placeholder="ban@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "#e8eaf2" }}
          />
        </Field>
        <Field
          label="Mật khẩu"
          icon={<LockIcon />}
          action={
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ color: "#6b74a0" }}>
              {showPass ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          }
        >
          <input
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent outline-none text-sm"
            style={{ color: "#e8eaf2" }}
          />
        </Field>

        {isLogin && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setForgotMode(true)}
              className="text-xs font-semibold"
              style={{ color: "#9b94ff" }}
            >
              Quên mật khẩu?
            </button>
          </div>
        )}

        {error && (
          <p
            className="text-xs px-3 py-2 rounded-xl"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-sm mt-2 transition-all"
          style={{
            background: loading ? "#1a1d2e" : "linear-gradient(135deg, #6c63ff, #5b54e8)",
            color: loading ? "#6b74a0" : "#fff",
            boxShadow: loading ? "none" : "0 8px 24px rgba(108,99,255,0.3)",
          }}
        >
          {loading ? "Đang xử lý…" : isLogin ? "Đăng nhập" : "Tạo tài khoản"}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px" style={{ backgroundColor: "#1e2240" }} />
        <span className="text-xs" style={{ color: "#2e3454" }}>
          hoặc
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "#1e2240" }} />
      </div>

      <button
        className="w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        style={{ backgroundColor: "#111320", color: "#a0a8c8", border: "1px solid #1e2240" }}
        onClick={() => setError("Google OAuth: cấu hình GOOGLE_CLIENT_ID trên API rồi dùng id_token.")}
      >
        <GoogleIcon />
        Tiếp tục với Google
      </button>

      <p className="text-center text-xs mt-6" style={{ color: "#6b74a0" }}>
        {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
        <Link href={isLogin ? "/register" : "/login"} className="font-semibold" style={{ color: "#9b94ff" }}>
          {isLogin ? "Đăng ký" : "Đăng nhập"}
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5"
      style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}
    >
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute w-72 h-72 rounded-full blur-3xl opacity-15"
          style={{
            background: "radial-gradient(circle, #6c63ff, transparent)",
            top: "5%",
            left: "5%",
          }}
        />
      </div>
      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
