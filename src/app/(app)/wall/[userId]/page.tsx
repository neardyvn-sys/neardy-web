"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/components/providers/AppProvider";
import { usersApi, visitsApi } from "@/lib/api";
import { initialsFromName } from "@/lib/types";
import Avatar from "@/components/ui/Avatar";

export default function UserWallPage() {
  const params = useParams();
  const userId = String(params.userId);
  const router = useRouter();
  const { friends, toggleFriend, matches, users } = useApp();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState<number | undefined>();
  const [photo, setPhoto] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const match = matches.find((m) => m.userId === userId);
  const nearby = users.find((u) => u.id === userId);

  useEffect(() => {
    if (!userId) return;
    visitsApi.record(userId).catch(() => {});
  }, [userId]);

  useEffect(() => {
    usersApi
      .get(userId)
      .then((p) => {
        setName(p.display_name);
        setBio(p.bio || "");
        setAge(p.age);
        setCoverUrl(p.cover_url || null);
        setPhoto(p.photos.find((x) => x.is_primary)?.url || p.photos[0]?.url || null);
        if (typeof p.online === "boolean") {
          setIsOnline(p.online);
        }
      })
      .catch(() => {
        setName("Người dùng");
      });
  }, [userId]);

  // Sync with matches and nearby realtime presence updates
  useEffect(() => {
    if (match && typeof match.online === "boolean") {
      setIsOnline(match.online);
    } else if (nearby && typeof nearby.online === "boolean") {
      setIsOnline(nearby.online);
    }
  }, [match?.online, nearby?.online]);

  const coverBgStyle = coverUrl
    ? coverUrl.startsWith("http") || coverUrl.startsWith("/media") || coverUrl.startsWith("data:")
      ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { background: coverUrl }
    : { background: "linear-gradient(135deg, #2d1b69, #0f1a3d)" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0c14", color: "#e8eaf2" }}>
      <div className="relative h-44 transition-all" style={coverBgStyle}>
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur"
          style={{ backgroundColor: "rgba(0,0,0,0.45)", color: "#e8eaf2" }}
        >
          ← Quay lại
        </button>
      </div>
      <div className="max-w-md mx-auto px-4">
        <div className="flex items-end justify-between -mt-10 mb-4">
          <Avatar initials={initialsFromName(name || "?")} userId={userId} size="xl" photoUrl={photo} online={isOnline} />
          <div className="flex gap-2 pb-1">
            {match && (
              <button
                onClick={() => router.push(`/messages/${userId}`)}
                className="px-4 py-2 rounded-xl text-xs font-semibold"
                style={{
                  backgroundColor: "rgba(0,229,255,0.1)",
                  color: "#00e5ff",
                  border: "1px solid rgba(0,229,255,0.2)",
                }}
              >
                Nhắn tin
              </button>
            )}
            <button
              onClick={() => void toggleFriend(userId)}
              className="px-4 py-2 rounded-xl text-xs font-semibold"
              style={
                friends.has(userId)
                  ? {
                      backgroundColor: "rgba(0,229,255,0.1)",
                      color: "#00e5ff",
                      border: "1px solid rgba(0,229,255,0.2)",
                    }
                  : {
                      background: "linear-gradient(135deg, #6c63ff, #5b54e8)",
                      color: "#fff",
                    }
              }
            >
              {friends.has(userId) ? "✓ Đã kết nối" : "+ Kết bạn"}
            </button>
          </div>
        </div>
        <h2 className="text-xl font-extrabold mb-1">
          {name}
          {age ? `, ${age}` : ""}
        </h2>
        <p className="text-sm mb-6" style={{ color: "#a0a8c8" }}>
          {bio || "Chưa có bio"}
        </p>
      </div>
    </div>
  );
}
