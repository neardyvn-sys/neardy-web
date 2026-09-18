export interface NearbyUser {
  id: string;
  name: string;
  avatar: string;
  status: string;
  distanceKm: number | null;
  online: boolean;
  bio: string;
  age?: number;
  gender?: string | null;
  photoUrl?: string | null;
  conversationId?: string;
}

export type NearbyGender = "woman" | "man" | "nonbinary";

export interface NearbyFilters {
  minAge?: number;
  maxAge?: number;
  maxDistanceKm?: number;
  genders?: NearbyGender[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  primaryPhoto?: string | null;
  coverUrl?: string | null;
  bio?: string;
  onboardingCompleted?: boolean;
}

export interface MatchItem {
  matchId: string;
  conversationId: string;
  userId: string;
  displayName: string;
  primaryPhoto?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
  online?: boolean;
}

export interface FeedPost {
  id: string;
  body: string;
  createdAt: string;
  userId: string;
  displayName: string;
  primaryPhoto?: string | null;
  media: { id: string; type: string; url: string }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
}

export type FilterTab = "all" | "online";
export type Tab = "nearby" | "messages" | "contacts" | "feed" | "profile";
export type PermissionState = "loading" | "granted" | "denied";

export type ChatMsgType = "text" | "image" | "video" | "emoji" | "call_log";

export interface CallLogData {
  call_id?: string;
  call_type?: "audio" | "video";
  status?: "ended" | "missed" | "rejected" | "cancelled" | string;
  duration_seconds?: number;
  caller_id?: string;
  callee_id?: string;
}

export interface ChatMessage {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
  createdAt?: string;
  msgType?: ChatMsgType;
  mediaUrl?: string | null;
  recalled?: boolean;
}

export interface DiaryPost {
  id: string;
  text: string;
  time: string;
  likes: number;
  likedByMe?: boolean;
  commentCount?: number;
  image?: string;
  media?: { id: string; type: string; url: string }[];
}

export type CallType = "audio" | "video";
export type CallPhase = "idle" | "outgoing" | "incoming" | "active";
export type CallRole = "caller" | "callee";

export interface CallPeer {
  id: string;
  name: string;
  avatar: string;
  photoUrl?: string | null;
}

export function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

export function colorIndexFromId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}
