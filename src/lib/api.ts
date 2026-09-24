const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080";
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8080";

const ACCESS_KEY = "neardy_access_token";
const REFRESH_KEY = "neardy_refresh_token";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function refreshAccess(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  const res = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const json = await res.json();
  setTokens(json.data.access_token, json.data.refresh_token);
  return json.data.access_token as string;
}

export async function api<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (options.auth !== false) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && options.auth !== false) {
    const next = await refreshAccess();
    if (next) {
      headers.set("Authorization", `Bearer ${next}`);
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(res.status, json.error || res.statusText || "request failed");
  }
  return json.data as T;
}

export const authApi = {
  register: (body: { email: string; password: string; display_name: string }) =>
    api<{ access_token: string; refresh_token: string; user_id: string; expires_in: number }>(
      "/v1/auth/register",
      { method: "POST", body: JSON.stringify(body), auth: false },
    ),
  login: (body: { email: string; password: string }) =>
    api<{ access_token: string; refresh_token: string; user_id: string; expires_in: number }>(
      "/v1/auth/login",
      { method: "POST", body: JSON.stringify(body), auth: false },
    ),
  logout: async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await api("/v1/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refresh }),
          auth: false,
        });
      }
    } finally {
      clearTokens();
    }
  },
};

export type MeProfile = {
  id: string;
  email: string;
  display_name: string;
  bio: string | null;
  cover_url?: string | null;
  birth_date?: string;
  age?: number;
  gender: string | null;
  looking_for: string[];
  location?: { lat: number; lng: number };
  onboarding_completed: boolean;
  privacy?: PrivacySettings;
  photos: { id: string; url: string; is_primary: boolean }[];
  online?: boolean;
};

export type PrivacySettings = {
  nearby_visibility: "everyone" | "matches" | "hidden";
  wall_visibility: "everyone" | "friends" | "private";
  show_age: boolean;
  show_distance: boolean;
  show_online: boolean;
  message_permission: "everyone" | "friends";
};

export const meApi = {
  get: () => api<MeProfile>("/v1/me"),
  patch: (body: Record<string, unknown>) =>
    api<MeProfile>("/v1/me", { method: "PATCH", body: JSON.stringify(body) }),
  addPhoto: (body: { url: string; sort_order?: number; is_primary?: boolean }) =>
    api<{ id: string; url: string; sort_order: number; is_primary: boolean }>("/v1/me/photos", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setLocation: (lat: number, lng: number) =>
    api("/v1/me/location", { method: "PATCH", body: JSON.stringify({ lat, lng }) }),
  privacy: () => api<PrivacySettings>("/v1/me/privacy"),
  patchPrivacy: (body: Partial<PrivacySettings>) =>
    api<PrivacySettings>("/v1/me/privacy", { method: "PATCH", body: JSON.stringify(body) }),
};

export const blocksApi = {
  list: () =>
    api<{
      blocks: {
        user_id: string;
        display_name: string;
        primary_photo: string | null;
        created_at: string;
      }[];
    }>("/v1/blocks"),
  block: (userId: string) =>
    api("/v1/blocks", { method: "POST", body: JSON.stringify({ user_id: userId }) }),
  unblock: (userId: string) => api(`/v1/blocks/${userId}`, { method: "DELETE" }),
};

export const reportsApi = {
  report: (targetId: string, reason = "feed_post") =>
    api("/v1/reports", {
      method: "POST",
      body: JSON.stringify({ target_id: targetId, reason }),
    }),
};

export const activityHidesApi = {
  list: () =>
    api<{
      activity_hides: {
        user_id: string;
        display_name: string;
        primary_photo: string | null;
        created_at: string;
      }[];
    }>("/v1/activity-hides"),
  hide: (userId: string) =>
    api("/v1/activity-hides", { method: "POST", body: JSON.stringify({ user_id: userId }) }),
  unhide: (userId: string) => api(`/v1/activity-hides/${userId}`, { method: "DELETE" }),
};

export const nearbyApi = {
  list: (filters?: {
    min_age?: number;
    max_age?: number;
    max_distance_km?: number;
    gender?: string;
  }) => {
    const q = new URLSearchParams({ page: "0", limit: "50" });
    if (filters?.min_age && filters.min_age > 0) q.set("min_age", String(filters.min_age));
    if (filters?.max_age && filters.max_age > 0) q.set("max_age", String(filters.max_age));
    if (filters?.max_distance_km && filters.max_distance_km > 0) {
      q.set("max_distance_km", String(filters.max_distance_km));
    }
    if (filters?.gender) q.set("gender", filters.gender);
    return api<{
      users: {
        id: string;
        display_name: string;
        bio: string | null;
        gender: string | null;
        age: number | null;
        distance_km: number | null;
        show_online?: boolean;
        online?: boolean;
        primary_photo: string | null;
      }[];
    }>(`/v1/nearby?${q.toString()}`);
  },
};

export const likesApi = {
  like: (
    userId: string,
    kind: "like" | "pass" | "superlike" = "like",
    opts?: { message?: string; hide_activity?: boolean },
  ) =>
    api<{ matched: boolean; match_id?: string; conversation_id?: string }>("/v1/likes", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        kind,
        message: opts?.message || "",
        hide_activity: !!opts?.hide_activity,
      }),
    }),
  matches: () =>
    api<{
      matches: {
        match_id: string;
        conversation_id: string;
        user_id: string;
        display_name: string;
        primary_photo: string | null;
        created_at: string;
        unread_count: number;
        last_message?: string | null;
        last_message_at?: string | null;
        last_message_type?: string | null;
        online?: boolean;
      }[];
    }>("/v1/matches"),
  sentLikes: (opts?: { kind?: string; limit?: number; offset?: number }) => {
    const params = new URLSearchParams();
    if (opts?.kind) params.set("kind", opts.kind);
    if (opts?.limit) params.set("limit", String(opts.limit));
    if (opts?.offset) params.set("offset", String(opts.offset));
    const qs = params.toString();
    return api<{
      likes: {
        user_id: string;
        display_name: string;
        primary_photo: string | null;
        age?: number;
        bio?: string;
        gender?: string;
        kind: "like" | "superlike";
        created_at: string;
        matched: boolean;
        match_id?: string;
        conversation_id?: string;
        online?: boolean;
      }[];
    }>(`/v1/likes/sent${qs ? `?${qs}` : ""}`);
  },
  messages: (conversationId: string) =>
    api<{
      messages: {
        id: string;
        sender_id: string;
        type: string;
        body: string | null;
        media_url: string | null;
        created_at: string;
        deleted_at?: string | null;
        recalled?: boolean;
      }[];
      peer_last_read_at?: string | null;
    }>(`/v1/conversations/${conversationId}/messages?limit=100`),
};

export type FriendRequestItem = {
  id: string;
  user_id: string;
  display_name: string;
  primary_photo: string | null;
  message: string;
  hide_activity: boolean;
  direction: "received" | "sent";
  created_at: string;
};

export const friendRequestsApi = {
  list: () =>
    api<{
      received: FriendRequestItem[];
      sent: FriendRequestItem[];
      received_count: number;
      sent_count: number;
    }>("/v1/friend-requests"),
  create: (body: { user_id: string; message: string; hide_activity?: boolean }) =>
    api<{
      request_id: string;
      auto_accepted?: boolean;
      conversation_id?: string;
      match_id?: string;
    }>("/v1/friend-requests", { method: "POST", body: JSON.stringify(body) }),
  accept: (id: string) =>
    api<{ match_id: string; conversation_id: string }>(`/v1/friend-requests/${id}/accept`, {
      method: "POST",
    }),
  reject: (id: string) => api(`/v1/friend-requests/${id}/reject`, { method: "POST" }),
  cancel: (id: string) => api(`/v1/friend-requests/${id}/cancel`, { method: "POST" }),
};

export const friendsApi = {
  unfriend: (userId: string) =>
    api<{ unfriended: boolean }>(`/v1/friends/${userId}`, { method: "DELETE" }),
};

export const feedApi = {
  list: (opts?: { userId?: string; limit?: number }) => {
    const q = new URLSearchParams({
      page: "0",
      limit: String(opts?.limit ?? 30),
    });
    if (opts?.userId) q.set("user_id", opts.userId);
    return api<{
      posts: {
        id: string;
        body: string;
        created_at: string;
        user_id: string;
        display_name: string;
        primary_photo: string | null;
        media: { id: string; type: string; url: string }[];
        like_count: number;
        comment_count: number;
        liked_by_me: boolean;
        audience_type?: "friends" | "private" | "custom_include" | "custom_exclude";
        audience_user_ids?: string[];
      }[];
    }>(`/v1/feed?${q.toString()}`);
  },
  create: (
    body: string,
    media: { type: "image" | "video"; url: string; sort_order: number }[] = [],
    audience?: {
      type?: "friends" | "private" | "custom_include" | "custom_exclude";
      selectedUserIds?: string[];
    },
  ) =>
    api("/v1/posts", {
      method: "POST",
      body: JSON.stringify({
        body,
        media,
        audience_type: audience?.type,
        audience_user_ids: audience?.selectedUserIds,
      }),
    }),
  get: (id: string) =>
    api<{
      id: string;
      body: string;
      created_at: string;
      user_id: string;
      display_name: string;
      primary_photo: string | null;
      media: { id: string; type: string; url: string }[];
      like_count: number;
      comment_count: number;
      liked_by_me: boolean;
      audience_type?: "friends" | "private" | "custom_include" | "custom_exclude";
      audience_user_ids?: string[];
    }>(`/v1/posts/${id}`),
  update: (
    id: string,
    body?: string,
    media?: { type: "image" | "video"; url: string; sort_order: number }[],
    audience?: {
      type?: "friends" | "private" | "custom_include" | "custom_exclude";
      selectedUserIds?: string[];
    },
  ) =>
    api<{
      id: string;
      body: string;
      created_at: string;
      user_id: string;
      display_name: string;
      primary_photo: string | null;
      media: { id: string; type: string; url: string }[];
      like_count: number;
      comment_count: number;
      liked_by_me: boolean;
      audience_type?: "friends" | "private" | "custom_include" | "custom_exclude";
      audience_user_ids?: string[];
    }>(`/v1/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(body !== undefined ? { body } : {}),
        ...(media !== undefined ? { media } : {}),
        ...(audience?.type !== undefined ? { audience_type: audience.type } : {}),
        ...(audience?.selectedUserIds !== undefined
          ? { audience_user_ids: audience.selectedUserIds }
          : {}),
      }),
    }),
  updateAudience: (
    id: string,
    audience: {
      type: "friends" | "private" | "custom_include" | "custom_exclude";
      selectedUserIds?: string[];
    },
  ) =>
    api<{
      id: string;
      body: string;
      created_at: string;
      user_id: string;
      display_name: string;
      primary_photo: string | null;
      media: { id: string; type: string; url: string }[];
      like_count: number;
      comment_count: number;
      liked_by_me: boolean;
      audience_type?: "friends" | "private" | "custom_include" | "custom_exclude";
      audience_user_ids?: string[];
    }>(`/v1/posts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        audience_type: audience.type,
        audience_user_ids: audience.selectedUserIds ?? [],
      }),
    }),
  delete: (id: string) =>
    api<{ deleted: boolean; id: string }>(`/v1/posts/${id}`, { method: "DELETE" }),
  hide: (id: string) =>
    api<{ hidden: boolean; id: string }>(`/v1/posts/${id}/hide`, { method: "POST" }),
  unhide: (id: string) =>
    api<{ hidden: boolean; id: string }>(`/v1/posts/${id}/hide`, { method: "DELETE" }),
  like: (id: string) => api<{ liked: boolean }>(`/v1/posts/${id}/likes`, { method: "POST" }),
  comments: (id: string) =>
    api<{
      comments: {
        id: string;
        body: string;
        created_at: string;
        user_id: string;
        display_name: string;
        parent_id?: string | null;
        media_url?: string | null;
        like_count: number;
        liked_by_me: boolean;
        replies?: {
          id: string;
          body: string;
          created_at: string;
          user_id: string;
          display_name: string;
          parent_id?: string | null;
          media_url?: string | null;
          like_count: number;
          liked_by_me: boolean;
        }[];
      }[];
      count: number;
    }>(`/v1/posts/${id}/comments?page=0&limit=200`),
  comment: (
    id: string,
    payload: { body?: string; parent_id?: string; media_url?: string },
  ) =>
    api<{
      id: string;
      body: string;
      created_at: string;
      user_id: string;
      display_name: string;
      parent_id?: string | null;
      media_url?: string | null;
      like_count: number;
      liked_by_me: boolean;
    }>(`/v1/posts/${id}/comments`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  likeComment: (commentId: string) =>
    api<{ liked: boolean }>(`/v1/comments/${commentId}/likes`, { method: "POST" }),
};

export const usersApi = {
  get: (id: string) => api<MeProfile>(`/v1/users/${id}`),
};

export type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type IceServersResponse = {
  ice_servers: IceServerConfig[];
  ttl: number;
  expires_at: string;
};

/** Production ICE config — temporary TURN credentials from the API only. */
export const webrtcApi = {
  iceServers: () => api<IceServersResponse>("/api/webrtc/ice-servers"),
};

/** @deprecated use webrtcApi.iceServers */
export const callsApi = {
  iceConfig: () => webrtcApi.iceServers(),
};

export type PresenceStatus = {
  user_id: string;
  online: boolean;
  last_seen_at?: string;
};

export const presenceApi = {
  get: async (userId: string): Promise<PresenceStatus> => {
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/api/users/${userId}/presence`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new ApiError(res.status, json.error || "presence lookup failed");
    }
    return json as PresenceStatus;
  },
};

export const uploadsApi = {
  /** Upload via API → Cloudflare R2 (multipart). */
  file: async (file: File, kind: "image" | "video") => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/v1/uploads/file`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const json = await res.json();
    if (!res.ok) {
      throw new ApiError(res.status, json.error || "upload failed");
    }
    return json.data as { public_url: string; key: string; mode: string };
  },

  /** Direct browser → R2 via presigned PUT (needs R2 bucket CORS). */
  presignAndPut: async (file: File, kind: "image" | "video") => {
    const meta = await api<{
      upload_url: string;
      public_url: string;
      key: string;
      mode: string;
    }>("/v1/uploads", {
      method: "POST",
      body: JSON.stringify({
        kind,
        filename: file.name,
        content_type: file.type || "application/octet-stream",
        content_length: file.size,
      }),
    });
    const put = await fetch(meta.upload_url, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!put.ok) {
      throw new ApiError(put.status, "R2 PUT failed");
    }
    return { public_url: meta.public_url, key: meta.key, mode: meta.mode };
  },
};

export interface VisitorUser {
  id: string;
  display_name: string;
  bio?: string;
  gender?: string;
  age?: number;
  distance_km?: number;
  primary_photo?: string;
  show_online: boolean;
  online: boolean;
  visited_at: string;
}

export const visitsApi = {
  record: (targetUserId: string) =>
    api<{ recorded: boolean }>(`/v1/users/${targetUserId}/visit`, {
      method: "POST",
    }),
  list: (page = 0, limit = 20) =>
    api<{ visitors: VisitorUser[]; total_count: number; page: number; limit: number }>(
      `/v1/me/visitors?page=${page}&limit=${limit}`,
    ),
};

export type AICompanion = {
  id: string;
  name: string;
  slug: string;
  gender: string | null;
  avatar: string | null;
  personality: string;
  speaking_style: string;
  is_active: boolean;
  level: string;
  affection_points: number;
  next_level_points: number;
};

export type AIMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export const aiApi = {
  companions: () => api<{ companions: AICompanion[] }>("/api/ai/companions"),
  getCompanion: (id: string) => api<AICompanion>(`/api/ai/companions/${id}`),
  messages: (convId: string) => api<{ messages: AIMessage[] }>(`/api/ai/conversations/${convId}/messages`),
  streamChat: async (
    payload: { companion_id: string; message: string; conversation_id?: string },
    onChunk: (chunk: string) => void,
    onError?: (err: string) => void,
  ) => {
    const token = getAccessToken();
    const res = await fetch(`${API_URL}/api/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      let errMsg = "Chat request failed";
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error) errMsg = parsed.error;
      } catch {}
      throw new ApiError(res.status, errMsg);
    }

    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const dataStr = line.slice(6).trim();
        if (dataStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.chunk) onChunk(parsed.chunk);
          if (parsed.error && onError) onError(parsed.error);
        } catch {}
      }
    }
  },
};

export function wsUrl() {
  const token = getAccessToken();
  return `${WS_URL}/v1/ws?token=${encodeURIComponent(token || "")}`;
}

export { API_URL };


