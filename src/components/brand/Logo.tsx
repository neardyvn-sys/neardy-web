"use client";

export default function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const dotSize = size === "lg" ? "w-4 h-4" : size === "md" ? "w-3 h-3" : "w-2.5 h-2.5";
  const ringBase = size === "lg" ? "w-10 h-10" : size === "md" ? "w-8 h-8" : "w-6 h-6";
  const textSize = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-base";
  return (
    <div className="flex items-center gap-2">
      <div className={`relative ${ringBase} flex items-center justify-center`}>
        <div
          className="ping-ring-1 absolute inset-0 rounded-full"
          style={{ backgroundColor: "rgba(108,99,255,0.25)" }}
        />
        <div
          className="ping-ring-2 absolute inset-0 rounded-full"
          style={{ backgroundColor: "rgba(108,99,255,0.15)" }}
        />
        <div
          className={`pulse-dot relative z-10 ${dotSize} rounded-full`}
          style={{ backgroundColor: "#6c63ff" }}
        />
      </div>
      <span className={`${textSize} font-extrabold tracking-tight`} style={{ color: "#e8eaf2" }}>
        near<span style={{ color: "#6c63ff" }}>dy</span>
      </span>
    </div>
  );
}
