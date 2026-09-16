export type MicErrorKind =
  | "permission_denied"
  | "unavailable"
  | "insecure_context"
  | "no_device"
  | "unknown";

export function isMicSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  return !!navigator.mediaDevices?.getUserMedia;
}

export function classifyMicError(err: unknown): MicErrorKind {
  if (!isMicSupported()) return "insecure_context";
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
    if (err.message === "microphone_permission_denied") return "permission_denied";
    if (err.message === "microphone_unavailable") return "unavailable";
    if (err.message === "microphone_insecure_context") return "insecure_context";
  }
  return "unknown";
}

export function micErrorMessage(kind: MicErrorKind): string {
  switch (kind) {
    case "permission_denied":
      return "Cần quyền truy cập microphone";
    case "insecure_context":
      return "Trình duyệt yêu cầu HTTPS để dùng microphone";
    case "no_device":
      return "Không tìm thấy microphone trên thiết bị";
    case "unavailable":
      return "Microphone đang được ứng dụng khác sử dụng";
    default:
      return "Không truy cập được microphone";
  }
}

function detectBrowser(): "safari" | "chrome" | "firefox" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/Safari/i.test(ua) && !/Chrome|CriOS|Chromium/i.test(ua)) return "safari";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Chrome|CriOS|Chromium|Edg/i.test(ua)) return "chrome";
  return "other";
}

export function micPermissionSteps(kind: MicErrorKind): string[] {
  if (kind === "insecure_context") {
    return [
      "Mở Neardy qua https:// hoặc localhost",
      "Trình duyệt không cho phép micro trên kết nối không bảo mật",
    ];
  }
  if (kind === "no_device") {
    return [
      "Kiểm tra microphone đã cắm hoặc bật trên thiết bị",
      "Thử rút/cắm lại tai nghe hoặc chọn đúng thiết bị âm thanh trong hệ điều hành",
    ];
  }
  if (kind === "unavailable") {
    return [
      "Đóng ứng dụng khác đang dùng microphone (Zoom, Meet, Discord…)",
      "Thử tải lại trang và gọi lại",
    ];
  }

  const browser = detectBrowser();
  if (browser === "safari") {
    return [
      "Nhấn nút aA / biểu tượng khóa trên thanh địa chỉ",
      "Chọn Cài đặt trang web → Microphone → Cho phép",
      "Tải lại trang nếu cần, rồi nhấn Thử lại bên dưới",
    ];
  }
  if (browser === "firefox") {
    return [
      "Nhấn biểu tượng micro hoặc khóa trên thanh địa chỉ",
      "Chọn Cho phép quyền Microphone cho trang này",
      "Nhấn Thử lại bên dưới",
    ];
  }
  if (browser === "chrome") {
    return [
      "Nhấn biểu tượng khóa hoặc điều chỉnh quyền bên trái thanh địa chỉ",
      "Bật Microphone → Cho phép",
      "Nhấn Thử lại bên dưới",
    ];
  }
  return [
    "Mở cài đặt quyền của trình duyệt cho trang này",
    "Bật quyền Microphone",
    "Nhấn Thử lại bên dưới",
  ];
}

export async function queryMicPermission(): Promise<PermissionState | "unsupported"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unsupported";
  }
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unsupported";
  }
}

/** Warm up mic permission during ringing (releases stream immediately). */
export async function prefetchMicrophone(): Promise<MicErrorKind | null> {
  if (!isMicSupported()) return "insecure_context";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    for (const track of stream.getTracks()) track.stop();
    return null;
  } catch (err) {
    return classifyMicError(err);
  }
}
