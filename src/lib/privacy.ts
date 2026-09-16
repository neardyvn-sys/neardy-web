import type { PrivacySettings } from "@/lib/api";

export function privacySummary(p: PrivacySettings): string {
  if (p.nearby_visibility === "hidden" || p.wall_visibility === "private") return "Riêng tư";
  if (
    p.nearby_visibility === "matches" ||
    p.wall_visibility === "friends" ||
    p.message_permission === "friends"
  ) {
    return "Chỉ bạn bè";
  }
  return "Công khai";
}
