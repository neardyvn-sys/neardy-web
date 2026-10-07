"use client";

import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/brand/Logo";
import Field from "@/components/ui/Field";
import { useApp } from "@/components/providers/AppProvider";
import GoogleSignInButton from "./GoogleSignInButton";

export type AuthView = "login" | "register" | "verify" | "forgot" | "reset";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const {
    loginWithPassword,
    registerWithPassword,
    verifyEmail,
    resendOtp,
    forgotPassword,
    resetPassword,
    loginWithGoogle,
  } = useApp();

  const [view, setView] = useState<AuthView>(mode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Sync mode with view if mode changes externally
  useEffect(() => {
    setView(mode);
  }, [mode]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }
    setLoading(true);
    try {
      await loginWithPassword(cleanEmail, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      if (msg.toLowerCase().includes("chưa được xác thực") || msg.toLowerCase().includes("email_not_verified")) {
        setView("verify");
        setInfo("Email của bạn chưa được xác thực. Chúng tôi đã gửi mã OTP tới " + cleanEmail);
        setCooldown(60);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanName) {
      setError("Vui lòng nhập họ và tên của bạn.");
      return;
    }
    if (!cleanEmail || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }
    if (password.length < 6) {
      setError("Mật khẩu phải có tối thiểu 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const res = await registerWithPassword(cleanEmail, password, cleanName);
      if (res.requires_email_verification) {
        setView("verify");
        setOtpCode("");
        setInfo(res.message || "Chúng tôi đã gửi mã OTP tới email của bạn.");
        setCooldown(60);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!cleanEmail || !cleanCode) {
      setError("Vui lòng nhập đủ email và mã OTP 6 số.");
      return;
    }
    if (cleanCode.length !== 6) {
      setError("Mã OTP phải gồm 6 chữ số.");
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(cleanEmail, cleanCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xác thực thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Vui lòng nhập email trước.");
      return;
    }

    setLoading(true);
    try {
      const res = await resendOtp(cleanEmail);
      setInfo(res.message || "Đã gửi lại mã OTP.");
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi lại mã.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Vui lòng nhập địa chỉ email đã đăng ký.");
      return;
    }

    setLoading(true);
    try {
      const res = await forgotPassword(cleanEmail);
      setInfo(res.message || "Mã đặt lại mật khẩu đã được gửi đến email của bạn.");
      setView("reset");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setCooldown(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yêu cầu thất bại");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();

    if (!cleanEmail || !cleanCode || !newPassword) {
      setError("Vui lòng điền đầy đủ thông tin.");
      return;
    }
    if (cleanCode.length !== 6) {
      setError("Mã OTP phải gồm 6 chữ số.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Mật khẩu mới tối thiểu 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword(cleanEmail, cleanCode, newPassword);
      setView("login");
      setPassword("");
      setOtpCode("");
      setNewPassword("");
      setConfirmPassword("");
      setInfo(res.message || "Đặt lại mật khẩu thành công. Vui lòng đăng nhập.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt lại mật khẩu thất bại");
    } finally {
      setLoading(false);
    }
  };

  // 1. VIEW: VERIFY EMAIL OTP
  if (view === "verify") {
    return (
      <AuthShell>
        <button
          type="button"
          onClick={() => {
            setView("login");
            setError("");
            setInfo("");
          }}
          className="flex items-center gap-1.5 mb-6 text-sm hover:text-white transition-colors"
          style={{ color: "#6b74a0" }}
        >
          <BackIcon />
          Quay lại đăng nhập
        </button>

        <Logo size="md" />

        <div className="mt-6 mb-6">
          <div
            className="w-14 h-14 rounded-2xl mb-4 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(108,99,255,0.2), rgba(0,229,255,0.1))",
              border: "1px solid rgba(108,99,255,0.3)",
            }}
          >
            <MailIcon size={24} color="#6c63ff" />
          </div>
          <h2 className="text-2xl font-extrabold" style={{ color: "#e8eaf2" }}>
            Xác thực email
          </h2>
          <p className="text-sm mt-1" style={{ color: "#a0a8c8" }}>
            Mã OTP 6 số đã được gửi tới:
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color: "#9b94ff" }}>
            {email}
          </p>
        </div>

        {info && (
          <p
            className="text-xs px-3 py-2.5 rounded-xl mb-4"
            style={{ backgroundColor: "rgba(108,99,255,0.12)", color: "#a5b4fc", border: "1px solid rgba(108,99,255,0.25)" }}
          >
            {info}
          </p>
        )}

        {error && (
          <p
            className="text-xs px-3 py-2.5 rounded-xl mb-4"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {error}
          </p>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <Field label="Mã xác thực OTP (6 chữ số)" icon={<KeyIcon />}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(val);
                setError("");
              }}
              className="w-full bg-transparent outline-none text-lg font-mono tracking-widest text-center"
              style={{ color: "#e8eaf2" }}
              autoFocus
            />
          </Field>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
            style={{
              background:
                loading || otpCode.length !== 6
                  ? "#1a1d2e"
                  : "linear-gradient(135deg, #6c63ff, #5b54e8)",
              color: loading || otpCode.length !== 6 ? "#6b74a0" : "#fff",
              boxShadow:
                loading || otpCode.length !== 6
                  ? "none"
                  : "0 8px 24px rgba(108,99,255,0.3)",
            }}
          >
            {loading ? "Đang xác thực…" : "Xác nhận & Bắt đầu"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: "#6b74a0" }}>
            Không nhận được mã?{" "}
            {cooldown > 0 ? (
              <span className="font-semibold" style={{ color: "#a5b4fc" }}>
                Gửi lại sau {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="font-semibold hover:underline"
                style={{ color: "#9b94ff" }}
              >
                Gửi lại mã OTP
              </button>
            )}
          </p>
        </div>
      </AuthShell>
    );
  }

  // 2. VIEW: FORGOT PASSWORD REQUEST
  if (view === "forgot") {
    return (
      <AuthShell>
        <button
          type="button"
          onClick={() => {
            setView("login");
            setError("");
            setInfo("");
          }}
          className="flex items-center gap-1.5 mb-6 text-sm hover:text-white transition-colors"
          style={{ color: "#6b74a0" }}
        >
          <BackIcon />
          Quay lại đăng nhập
        </button>

        <Logo size="md" />

        <div className="mt-6 mb-6">
          <h2 className="text-2xl font-extrabold" style={{ color: "#e8eaf2" }}>
            Quên mật khẩu?
          </h2>
          <p className="text-sm mt-1" style={{ color: "#6b74a0" }}>
            Nhập email của bạn — chúng tôi sẽ gửi mã OTP để bạn đặt lại mật khẩu mới.
          </p>
        </div>

        {error && (
          <p
            className="text-xs px-3 py-2.5 rounded-xl mb-4"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {error}
          </p>
        )}

        <form onSubmit={handleForgot} className="space-y-4">
          <Field label="Email đã đăng ký" icon={<MailIcon />}>
            <input
              type="email"
              placeholder="ban@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "#e8eaf2" }}
              autoFocus
            />
          </Field>

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
            style={{
              background:
                loading || !email.trim()
                  ? "#1a1d2e"
                  : "linear-gradient(135deg, #6c63ff, #5b54e8)",
              color: loading || !email.trim() ? "#6b74a0" : "#fff",
              boxShadow:
                loading || !email.trim() ? "none" : "0 8px 24px rgba(108,99,255,0.3)",
            }}
          >
            {loading ? "Đang gửi…" : "Gửi mã OTP đặt lại mật khẩu"}
          </button>
        </form>
      </AuthShell>
    );
  }

  // 3. VIEW: RESET PASSWORD WITH OTP
  if (view === "reset") {
    return (
      <AuthShell>
        <button
          type="button"
          onClick={() => {
            setView("forgot");
            setError("");
            setInfo("");
          }}
          className="flex items-center gap-1.5 mb-6 text-sm hover:text-white transition-colors"
          style={{ color: "#6b74a0" }}
        >
          <BackIcon />
          Quay lại đổi email
        </button>

        <Logo size="md" />

        <div className="mt-6 mb-6">
          <h2 className="text-2xl font-extrabold" style={{ color: "#e8eaf2" }}>
            Đặt lại mật khẩu
          </h2>
          <p className="text-sm mt-1" style={{ color: "#a0a8c8" }}>
            Nhập mã OTP 6 số đã gửi tới <span className="font-bold text-white">{email}</span>
          </p>
        </div>

        {info && (
          <p
            className="text-xs px-3 py-2.5 rounded-xl mb-4"
            style={{ backgroundColor: "rgba(108,99,255,0.12)", color: "#a5b4fc", border: "1px solid rgba(108,99,255,0.25)" }}
          >
            {info}
          </p>
        )}

        {error && (
          <p
            className="text-xs px-3 py-2.5 rounded-xl mb-4"
            style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {error}
          </p>
        )}

        <form onSubmit={handleResetPassword} className="space-y-3">
          <Field label="Mã xác thực OTP (6 chữ số)" icon={<KeyIcon />}>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              value={otpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setOtpCode(val);
                setError("");
              }}
              className="w-full bg-transparent outline-none text-base font-mono tracking-widest text-center"
              style={{ color: "#e8eaf2" }}
              autoFocus
            />
          </Field>

          <Field
            label="Mật khẩu mới"
            icon={<LockIcon />}
            action={
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                style={{ color: "#6b74a0" }}
              >
                {showNewPass ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            }
          >
            <input
              type={showNewPass ? "text" : "password"}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "#e8eaf2" }}
            />
          </Field>

          <Field label="Xác nhận mật khẩu mới" icon={<LockIcon />}>
            <input
              type={showNewPass ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-sm"
              style={{ color: "#e8eaf2" }}
            />
          </Field>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6 || !newPassword}
            className="w-full py-3.5 rounded-2xl font-bold text-sm mt-2 transition-all"
            style={{
              background:
                loading || otpCode.length !== 6 || !newPassword
                  ? "#1a1d2e"
                  : "linear-gradient(135deg, #6c63ff, #5b54e8)",
              color: loading || otpCode.length !== 6 || !newPassword ? "#6b74a0" : "#fff",
              boxShadow:
                loading || otpCode.length !== 6 || !newPassword
                  ? "none"
                  : "0 8px 24px rgba(108,99,255,0.3)",
            }}
          >
            {loading ? "Đang xử lý…" : "Cập nhật mật khẩu"}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: "#6b74a0" }}>
            Không nhận được mã?{" "}
            {cooldown > 0 ? (
              <span className="font-semibold" style={{ color: "#a5b4fc" }}>
                Gửi lại sau {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleForgot}
                disabled={loading}
                className="font-semibold hover:underline"
                style={{ color: "#9b94ff" }}
              >
                Gửi lại mã OTP
              </button>
            )}
          </p>
        </div>
      </AuthShell>
    );
  }

  // 4. MAIN VIEWS: LOGIN / REGISTER
  const isLogin = view === "login";

  return (
    <AuthShell>
      <Link
        href="/"
        className="flex items-center gap-1.5 mb-8 text-sm hover:text-white transition-colors"
        style={{ color: "#6b74a0" }}
      >
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

      {info && (
        <p
          className="text-xs px-3 py-2.5 rounded-xl mb-4"
          style={{ backgroundColor: "rgba(108,99,255,0.12)", color: "#a5b4fc", border: "1px solid rgba(108,99,255,0.25)" }}
        >
          {info}
        </p>
      )}

      {error && (
        <p
          className="text-xs px-3 py-2 rounded-xl mb-4"
          style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#f87171" }}
        >
          {error}
        </p>
      )}

      <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-3">
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
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              style={{ color: "#6b74a0" }}
            >
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
              onClick={() => {
                setView("forgot");
                setError("");
                setInfo("");
              }}
              className="text-xs font-semibold hover:underline"
              style={{ color: "#9b94ff" }}
            >
              Quên mật khẩu?
            </button>
          </div>
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
        <span className="text-xs" style={{ color: "#6b74a0" }}>
          hoặc
        </span>
        <div className="flex-1 h-px" style={{ backgroundColor: "#1e2240" }} />
      </div>

      <GoogleSignInButton
        mode={isLogin ? "login" : "register"}
        disabled={loading}
        onSuccess={async (idToken) => {
          setError("");
          try {
            await loginWithGoogle(idToken);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Đăng nhập Google thất bại");
          }
        }}
        onError={(msg) => setError(msg)}
      />

      <p className="text-center text-xs mt-6" style={{ color: "#6b74a0" }}>
        {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
        <button
          type="button"
          onClick={() => {
            setView(isLogin ? "register" : "login");
            setError("");
            setInfo("");
          }}
          className="font-semibold hover:underline"
          style={{ color: "#9b94ff" }}
        >
          {isLogin ? "Đăng ký" : "Đăng nhập"}
        </button>
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

function MailIcon({ size = 15, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth={2}>
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

function KeyIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M21 2l-2 2m-1.5 1.5L14 9a5 5 0 1 0 3 3l3.5-3.5 1.5 1.5 2-2-3-3z" />
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
