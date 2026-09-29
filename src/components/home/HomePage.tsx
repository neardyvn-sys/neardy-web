"use client";

import Link from "next/link";
import Logo from "@/components/brand/Logo";
import AmbientBackground from "@/components/layout/AmbientBackground";
import { FEATURES } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      <AmbientBackground />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-4xl mx-auto w-full">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            style={{ color: "#a0a8c8" }}
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold px-5 py-2 rounded-xl transition-all"
            style={{ backgroundColor: "#6c63ff", color: "#fff" }}
          >
            Thử ngay
          </Link>
        </div>
      </nav>

      <section className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <div className="relative w-40 h-40 flex items-center justify-center mb-10">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="absolute rounded-full border"
              style={{
                width: `${i * 44}px`,
                height: `${i * 44}px`,
                borderColor: `rgba(108,99,255,${0.35 - i * 0.08})`,
              }}
            />
          ))}
          {[
            { top: "20%", left: "68%", color: "#6c63ff" },
            { top: "58%", left: "75%", color: "#00e5ff" },
            { top: "72%", left: "38%", color: "#a78bfa" },
            { top: "30%", left: "22%", color: "#00e5ff" },
          ].map((dot, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                top: dot.top,
                left: dot.left,
                backgroundColor: dot.color,
                boxShadow: `0 0 8px ${dot.color}`,
              }}
            />
          ))}
          <div
            className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "#6c63ff" }}
          >
            <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4 max-w-xl">
          Khám phá người{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #6c63ff, #00e5ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            xung quanh bạn
          </span>
        </h1>
        <p className="text-base max-w-sm mb-10" style={{ color: "#a0a8c8" }}>
          Neardy dùng GPS để tìm những người đang ở gần bạn nhất — kết nối thật, gặp gỡ thật.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm transition-all"
            style={{
              background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
              color: "#fff",
              boxShadow: "0 8px 32px rgba(108,99,255,0.35)",
            }}
          >
            Bắt đầu miễn phí →
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-bold text-sm transition-all"
            style={{ backgroundColor: "#111320", color: "#a0a8c8", border: "1px solid #1e2240" }}
          >
            Đã có tài khoản
          </Link>
        </div>
      </section>

      <section className="relative z-10 px-6 pb-20 max-w-4xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl p-5"
              style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
            >
              <span className="text-2xl mb-3 block">{f.icon}</span>
              <h3 className="font-bold text-sm mb-1" style={{ color: "#e8eaf2" }}>
                {f.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "#6b74a0" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 text-center pb-8 text-xs" style={{ color: "#2e3454" }}>
        © 2026 Neardy · Tìm quanh đây
      </footer>
    </div>
  );
}
