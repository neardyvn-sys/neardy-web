export const LOCATION_SHARING_KEY = "neardy_location_sharing";

export const FALLBACK_LOCATION = { lat: 21.028, lng: 105.834 };

export function loadLocationSharing(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(LOCATION_SHARING_KEY);
    if (raw === null) return true;
    return raw === "1" || raw === "true";
  } catch {
    return true;
  }
}

export function saveLocationSharing(on: boolean) {
  localStorage.setItem(LOCATION_SHARING_KEY, on ? "1" : "0");
}

export function locationSharingSummary(
  sharing: boolean,
  permissionState: "loading" | "granted" | "denied",
): string {
  if (!sharing) return "Không chia sẻ";
  if (permissionState === "granted") return "Luôn bật";
  if (permissionState === "denied") return "Trình duyệt tắt";
  return "Đang kiểm tra…";
}
