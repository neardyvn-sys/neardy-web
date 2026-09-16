import type { Metadata } from "next";
import "./globals.css";
import { CallProvider } from "@/components/call/CallProvider";
import { AppProvider } from "@/components/providers/AppProvider";

export const metadata: Metadata = {
  title: "Neardy — Tìm bạn gần bạn",
  description: "Khám phá người xung quanh bạn với Neardy",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <AppProvider>
          <CallProvider>{children}</CallProvider>
        </AppProvider>
      </body>
    </html>
  );
}
