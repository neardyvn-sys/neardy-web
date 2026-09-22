"use client";

import { useEffect, useRef } from "react";

export interface DropdownItem {
  key: string;
  label: React.ReactNode;
  subLabel?: string;
  icon?: string;
  danger?: boolean;
  onClick: () => void;
}

interface DropdownMenuProps {
  open: boolean;
  onClose: () => void;
  items: DropdownItem[];
  align?: "left" | "right";
  minWidth?: number;
  className?: string;
}

export default function DropdownMenu({
  open,
  onClose,
  items,
  align = "right",
  minWidth = 160,
  className = "",
}: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute z-30 mt-1 rounded-2xl overflow-hidden shadow-2xl text-xs backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${
        align === "right" ? "right-0" : "left-0"
      } ${className}`}
      style={{
        backgroundColor: "#161929",
        border: "1px solid #282c4d",
        minWidth,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className="w-full px-4 py-2.5 text-left flex items-start gap-2.5 transition-colors hover:bg-[#1f233a] active:bg-[#282d4a] font-medium"
            style={{ color: item.danger ? "#f87171" : "#e8eaf2" }}
          >
            {item.icon && <span className="text-sm shrink-0 mt-0.5">{item.icon}</span>}
            <div className="flex-1 min-w-0">
              <div className="leading-snug">{item.label}</div>
              {item.subLabel && (
                <div className="text-[10px] leading-tight mt-0.5 font-normal" style={{ color: "#8a94b8" }}>
                  {item.subLabel}
                </div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
