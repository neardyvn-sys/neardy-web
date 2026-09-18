"use client";

import { useRouter } from "next/navigation";
import Avatar from "@/components/ui/Avatar";
import { initialsFromName } from "@/lib/types";

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  myUser: { name: string; avatar?: string; photoUrl?: string | null } | null;
  targetUser: { id: string; display_name: string; primary_photo?: string | null } | null;
}

export default function MatchModal({
  isOpen,
  onClose,
  myUser,
  targetUser,
}: MatchModalProps) {
  const router = useRouter();

  if (!isOpen || !targetUser) return null;

  const handleStartChat = () => {
    onClose();
    router.push(`/messages/${targetUser.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl border border-[#ff4b72]/40 relative overflow-hidden flex flex-col items-center gap-6"
        style={{
          background: "linear-gradient(180deg, #180b1f 0%, #0d0f1a 100%)",
        }}
      >
        {/* Glow background */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#ff4b72]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#00e5ff]/20 rounded-full blur-3xl pointer-events-none" />

        {/* Title */}
        <div className="space-y-1 relative z-10">
          <div className="inline-block px-3 py-1 rounded-full bg-[#ff4b72]/15 text-[#ff4b72] text-xs font-extrabold uppercase tracking-widest animate-pulse">
            Tương Hợp Hoàn Hảo!
          </div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff4b72] via-[#ff85a2] to-[#00e5ff]">
            It&apos;s a Match! 🎉
          </h2>
          <p className="text-xs text-gray-400">
            Bạn và <span className="text-white font-semibold">{targetUser.display_name}</span> đều có cảm tình với nhau.
          </p>
        </div>

        {/* Avatars */}
        <div className="relative z-10 flex items-center justify-center gap-4 my-2">
          {/* My Avatar */}
          <div className="relative transform -rotate-6 transition-transform hover:rotate-0 duration-300">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#ff4b72] shadow-lg shadow-[#ff4b72]/30">
              <Avatar
                initials={initialsFromName(myUser?.name || "Tôi")}
                photoUrl={myUser?.photoUrl}
                size="xl"
                className="w-full h-full"
              />
            </div>
            <span className="absolute -bottom-2 -right-2 text-xl">💖</span>
          </div>

          {/* Heart indicator */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff4b72] to-[#9b94ff] flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-[#ff4b72]/50 animate-bounce">
            ⚡
          </div>

          {/* Target Avatar */}
          <div className="relative transform rotate-6 transition-transform hover:rotate-0 duration-300">
            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#00e5ff] shadow-lg shadow-[#00e5ff]/30">
              <Avatar
                initials={initialsFromName(targetUser.display_name)}
                userId={targetUser.id}
                photoUrl={targetUser.primary_photo}
                size="xl"
                className="w-full h-full"
              />
            </div>
            <span className="absolute -bottom-2 -left-2 text-xl">✨</span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-3 relative z-10">
          <button
            onClick={handleStartChat}
            className="w-full py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-[#ff4b72] to-[#6c63ff] shadow-lg shadow-[#ff4b72]/30 hover:opacity-95 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
          >
            <span>💬</span> Gửi tin nhắn ngay
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-semibold text-gray-400 bg-white/5 hover:bg-white/10 hover:text-white transition-all text-xs"
          >
            Tiếp tục quẹt thẻ 🔥
          </button>
        </div>
      </div>
    </div>
  );
}
