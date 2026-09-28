"use client";

import { AVATAR_COLORS } from "@/lib/constants";
import { colorIndexFromId } from "@/lib/types";

export default function Avatar({
  initials,
  userId = "0",
  size = "md",
  online,
  className = "",
  photoUrl,
}: {
  initials: string;
  userId?: string | number;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
  photoUrl?: string | null;
}) {
  const sizes = {
    xs: "w-6 h-6 text-[10px] rounded-lg",
    sm: "w-7 h-7 text-xs rounded-lg",
    md: "w-10 h-10 text-xs rounded-xl",
    lg: "w-12 h-12 text-sm rounded-xl",
    xl: "w-20 h-20 text-xl rounded-2xl",
  };
  const idx =
    typeof userId === "number" ? userId : colorIndexFromId(String(userId));
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className={`${sizes[size]} object-cover`} />
      ) : (
        <div
          className={`${sizes[size]} bg-gradient-to-br ${color} flex items-center justify-center font-bold text-white`}
        >
          {initials}
        </div>
      )}
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
          style={{ backgroundColor: "#00e5ff", borderColor: "#111320" }}
        />
      )}
    </div>
  );
}
