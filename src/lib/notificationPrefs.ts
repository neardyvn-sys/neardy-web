export type NotificationPrefs = {
  all: boolean;
  messages: boolean;
  connections: boolean;
  diary: boolean;
  nearby: boolean;
};

export const NOTIFICATION_PREFS_KEY = "neardy_notification_prefs";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  all: true,
  messages: true,
  connections: true,
  diary: true,
  nearby: true,
};

export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFS;
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS };
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed };
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS };
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs) {
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
}

export function notificationPrefsSummary(prefs: NotificationPrefs): string {
  if (!prefs.all) return "Đã tắt";
  const keys = ["messages", "connections", "diary", "nearby"] as const;
  const onCount = keys.filter((k) => prefs[k]).length;
  if (onCount === keys.length) return "Bật tất cả";
  if (onCount === 0) return "Đã tắt";
  return "Tùy chỉnh";
}
