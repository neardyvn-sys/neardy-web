"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ChatPanel from "@/components/chat/ChatPanel";
import { useApp } from "@/components/providers/AppProvider";
import { usersApi } from "@/lib/api";
import { initialsFromName, type NearbyUser } from "@/lib/types";

export default function ChatPage() {
  const params = useParams();
  const rawId = String(params.userId);
  const router = useRouter();
  const { user, users, matches, friends, refreshMatches } = useApp();
  const [fetched, setFetched] = useState<NearbyUser | null>(null);

  const match = matches.find((m) => m.userId === rawId || m.conversationId === rawId);
  const targetUserId = match ? match.userId : rawId;
  const nearby = users.find((u) => u.id === targetUserId);
  const isFriend = friends.has(targetUserId);

  useEffect(() => {
    if (nearby || match) return;
    let cancelled = false;
    usersApi
      .get(targetUserId)
      .then((p) => {
        if (cancelled) return;
        setFetched({
          id: p.id,
          name: p.display_name,
          avatar: initialsFromName(p.display_name),
          status: p.bio || "Người dùng Neardy",
          distanceKm: 0,
          online: Boolean(p.online),
          bio: p.bio || "",
          age: p.age,
          photoUrl: p.photos.find((x) => x.is_primary)?.url || p.photos[0]?.url || null,
        });
      })
      .catch(() => {
        if (!cancelled) setFetched(null);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUserId, nearby, match]);

  const peer: NearbyUser | null = (() => {
    // Prefer match as it contains realtime presence and primary conversation
    if (match) {
      return {
        id: match.userId,
        name: match.displayName,
        avatar: initialsFromName(match.displayName),
        status: "Đã kết nối",
        distanceKm: nearby?.distanceKm ?? 0,
        online: Boolean(match.online),
        bio: nearby?.bio || "",
        photoUrl: match.primaryPhoto || nearby?.photoUrl || null,
        conversationId: match.conversationId,
      };
    }
    if (nearby) {
      return { ...nearby };
    }
    if (fetched) {
      return { ...fetched };
    }
    return null;
  })();

  if (!user) return null;

  if (!peer) {
    return (
      <div className="p-8 text-center" style={{ color: "#6b74a0" }}>
        <p className="mb-4">Không tìm thấy người dùng.</p>
        <button onClick={() => router.push("/nearby")} className="underline" style={{ color: "#9b94ff" }}>
          Về Gần đây
        </button>
      </div>
    );
  }

  return (
    <ChatPanel
      peer={peer}
      myId={user.id}
      myName={user.name}
      myAvatar={user.avatar}
      conversationId={match?.conversationId}
      isFriend={isFriend}
      onClose={() => {
        void refreshMatches();
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/messages");
        }
      }}
    />
  );
}
