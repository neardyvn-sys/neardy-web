"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

export default function Logo({ size = "md", onClick, className = "" }: LogoProps) {
  const dotSize = size === "lg" ? "w-4 h-4" : size === "md" ? "w-3 h-3" : "w-2.5 h-2.5";
  const ringBase = size === "lg" ? "w-10 h-10" : size === "md" ? "w-8 h-8" : "w-6 h-6";
  const textSize = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-base";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-2 cursor-pointer select-none transition-all hover:opacity-90 active:scale-95 text-left border-none bg-transparent p-0 ${className}`}
      title="Tải lại trang"
      aria-label="Tải lại trang"
    >
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
    </button>
  );
}
