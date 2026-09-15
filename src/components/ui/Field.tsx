import type { ReactNode } from "react";

export default function Field({
  label,
  icon,
  action,
  children,
}: {
  label: string;
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5 ml-1" style={{ color: "#6b74a0" }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2.5 px-4 py-3 rounded-2xl"
        style={{ backgroundColor: "#111320", border: "1px solid #1e2240" }}
      >
        <span style={{ color: "#6b74a0" }}>{icon}</span>
        {children}
        {action && <span className="flex-shrink-0">{action}</span>}
      </div>
    </div>
  );
}
