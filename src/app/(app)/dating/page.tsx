"use client";

import { useEffect, useState, useCallback } from "react";
import { nearbyApi, likesApi } from "@/lib/api";
import { useApp } from "@/components/providers/AppProvider";
import SwipeDeck, { CandidateUser } from "@/components/dating/SwipeDeck";
import MatchModal from "@/components/dating/MatchModal";

export default function DatingPage() {
  const { user } = useApp();
  const [candidates, setCandidates] = useState<CandidateUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchedUser, setMatchedUser] = useState<{
    id: string;
    display_name: string;
    primary_photo?: string | null;
  } | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);

  const loadCandidates = useCallback(() => {
    setLoading(true);
    nearbyApi
      .list({ min_age: 18, max_age: 50, max_distance_km: 100 })
      .then((res) => {
        setCandidates(res.users || []);
      })
      .catch((err) => {
        console.error("Failed to load candidates:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  const handleSwipe = async (
    target: CandidateUser,
    action: "like" | "pass" | "superlike"
  ) => {
    try {
      const kind = action === "superlike" ? "superlike" : action === "like" ? "like" : "pass";
      const res = await likesApi.like(target.id, kind);
      if (res.matched) {
        setMatchedUser({
          id: target.id,
          display_name: target.display_name,
          primary_photo: target.primary_photo,
        });
        setShowMatchModal(true);
      }
    } catch (err) {
      console.error("Failed to process swipe:", err);
    }
  };

  return (
    <div className="w-full flex flex-col">
      {/* Sub Header / Refresh */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-lg">🔥</span>
          <p className="text-xs font-bold text-gray-300">
            Gợi ý tương hợp hôm nay
          </p>
        </div>

        <button
          onClick={loadCandidates}
          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-300 font-semibold active:scale-95"
          title="Tải lại gợi ý"
        >
          <span>🔄</span> Tải mới
        </button>
      </div>

      {/* Main Deck Container */}
      <div className="flex-1 flex flex-col justify-center items-center w-full">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-3 border-[#ff4b72] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold">Đang tìm đối tượng phù hợp...</p>
          </div>
        ) : (
          <SwipeDeck
            candidates={candidates}
            onSwipe={handleSwipe}
            onRefresh={loadCandidates}
          />
        )}
      </div>

      {/* Match Overlay Modal */}
      <MatchModal
        isOpen={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        myUser={
          user
            ? {
                name: user.name,
                photoUrl: user.primaryPhoto,
              }
            : null
        }
        targetUser={matchedUser}
      />
    </div>
  );
}
