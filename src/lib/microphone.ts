/** Shared media-device permission helpers (microphone + camera). */

export type MediaErrorKind =
  | "permission_denied"
  | "unavailable"
  | "insecure_context"
  | "no_device"
  | "unknown";

/** @deprecated use MediaErrorKind */
export type MicErrorKind = MediaErrorKind;

export type MediaDeviceKind = "microphone" | "camera" | "both";

export function isMediaSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  return !!navigator.mediaDevices?.getUserMedia;
}

/** @deprecated use isMediaSupported */
export const isMicSupported = isMediaSupported;

export function classifyMediaError(err: unknown): MediaErrorKind {
  if (!isMediaSupported()) return "insecure_context";
  if (!err || typeof err !== "object") return "unknown";
  const name = "name" in err ? String((err as { name?: string }).name) : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission_denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "no_device";
  }
  if (name === "NotReadableError" || name === "AbortError" || name === "OverconstrainedError") {
    return "unavailable";
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (
      msg === "microphone_permission_denied" ||
      msg === "camera_permission_denied" ||
      msg === "media_permission_denied"
    ) {
      return "permission_denied";
    }
    if (msg === "microphone_insecure_context" || msg === "media_insecure_context") {
      return "insecure_context";
    }
    if (
      msg === "microphone_no_device" ||
      msg === "camera_no_device" ||
      msg === "media_no_device"
    ) {
      return "no_device";
    }
    if (
      msg === "microphone_unavailable" ||
      msg === "camera_unavailable" ||
      msg === "media_unavailable"
    ) {
      return "unavailable";
    }
  }
  return "unknown";
}

/** @deprecated use classifyMediaError */
export const classifyMicError = classifyMediaError;

export function mediaErrorMessage(kind: MediaErrorKind, devices: MediaDeviceKind = "microphone"): string {
  const both = devices === "both";
  const cam = devices === "camera";
  switch (kind) {
    case "permission_denied":
      if (both) return "Cần quyền microphone và camera";
      if (cam) return "Cần quyền truy cập camera";
      return "Cần quyền truy cập microphone";
    case "insecure_context":
      return "Trình duyệt yêu cầu HTTPS để dùng camera/microphone";
    case "no_device":
      if (both) return "Không tìm thấy microphone hoặc camera";
      if (cam) return "Không tìm thấy camera trên thiết bị";
      return "Không tìm thấy microphone trên thiết bị";
    case "unavailable":
      if (both) return "Microphone hoặc camera đang được ứng dụng khác sử dụng";
      if (cam) return "Camera đang được ứng dụng khác sử dụng";
      return "Microphone đang được ứng dụng khác sử dụng";
    default:
      if (both) return "Không truy cập được camera/microphone";
      if (cam) return "Không truy cập được camera";
      return "Không truy cập được microphone";
  }
}

/** @deprecated use mediaErrorMessage */
export function micErrorMessage(kind: MicErrorKind): string {
  return mediaErrorMessage(kind, "microphone");
}

function detectBrowser(): "safari" | "chrome" | "firefox" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Safari/i.test(ua) && !/Chrome|CriOS|Chromium/i.test(ua)) return "safari";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Chrome|CriOS|Chromium|Edg/i.test(ua)) return "chrome";
  return "other";
}

export function mediaPermissionSteps(
  kind: MediaErrorKind,
  devices: MediaDeviceKind = "microphone",
): string[] {
  const both = devices === "both";
  const label = both ? "Microphone và Camera" : devices === "camera" ? "Camera" : "Microphone";

  if (kind === "insecure_context") {
    return [
      "Mở Neardy qua https:// hoặc localhost",
      "Trình duyệt không cho phép camera/micro trên kết nối không bảo mật",
    ];
  }
  if (kind === "no_device") {
    return [
      both
        ? "Kiểm tra microphone và camera đã kết nối / bật trên thiết bị"
        : devices === "camera"
          ? "Kiểm tra camera đã kết nối hoặc không bị che / tắt cứng"
          : "Kiểm tra microphone đã cắm hoặc bật trên thiết bị",
      "Thử rút/cắm lại thiết bị hoặc chọn đúng thiết bị trong hệ điều hành",
    ];
  }
  if (kind === "unavailable") {
    return [
      "Đóng ứng dụng khác đang dùng camera/microphone (Zoom, Meet, Discord…)",
      "Thử tải lại trang và gọi lại",
    ];
  }

  const browser = detectBrowser();
  if (browser === "safari") {
    return [
      "Nhấn nút aA / biểu tượng khóa trên thanh địa chỉ",
      `Chọn Cài đặt trang web → ${label} → Cho phép`,
      "Tải lại trang nếu cần, rồi nhấn Thử lại bên dưới",
    ];
  }
  if (browser === "firefox") {
    return [
      "Nhấn biểu tượng camera/micro hoặc khóa trên thanh địa chỉ",
      `Chọn Cho phép quyền ${label} cho trang này`,
      "Nhấn Thử lại bên dưới",
    ];
  }
  if (browser === "chrome") {
    return [
      "Nhấn biểu tượng khóa hoặc điều chỉnh quyền bên trái thanh địa chỉ",
      `Bật ${label} → Cho phép`,
      "Nhấn Thử lại bên dưới",
    ];
  }
  return [
    "Mở cài đặt quyền của trình duyệt cho trang này",
    `Bật quyền ${label}`,
    "Nhấn Thử lại bên dưới",
  ];
}

/** @deprecated use mediaPermissionSteps */
export function micPermissionSteps(kind: MicErrorKind): string[] {
  return mediaPermissionSteps(kind, "microphone");
}

export function mediaErrorToCode(kind: MediaErrorKind, withVideo: boolean): string {
  const prefix = withVideo ? "media" : "microphone";
  switch (kind) {
    case "permission_denied":
      return `${prefix}_permission_denied`;
    case "insecure_context":
      return `${prefix}_insecure_context`;
    case "no_device":
      return `${prefix}_no_device`;
    case "unavailable":
      return `${prefix}_unavailable`;
    default:
      return `${prefix}_unavailable`;
  }
}

/** Warm up device permission during ringing (releases stream immediately). */
export async function prefetchMedia(withVideo: boolean): Promise<MediaErrorKind | null> {
  if (!isMediaSupported()) return "insecure_context";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo,
    });
    for (const track of stream.getTracks()) track.stop();
    return null;
  } catch (err) {
    return classifyMediaError(err);
  }
}

/** @deprecated use prefetchMedia(false) */
export async function prefetchMicrophone(): Promise<MicErrorKind | null> {
  return prefetchMedia(false);
}
