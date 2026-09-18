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
    <div className="min-h-screen bg-[#0a0c14] text-[#e8eaf2] flex flex-col pb-20">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-[#1e2240] bg-[#0d0f1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔥</span>
          <div>
            <h1 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-[#ff4b72] to-[#6c63ff]">
              Hẹn Hò Neardy
            </h1>
            <p className="text-[10px] text-gray-400">Vuốt để tìm kiếm một nửa phù hợp</p>
          </div>
        </div>

        <button
          onClick={loadCandidates}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-xs text-gray-300"
          title="Tải lại gợi ý"
        >
          🔄 Tải mới
        </button>
      </div>

      {/* Main Deck Container */}
      <div className="flex-1 flex flex-col justify-center items-center p-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-3 border-[#ff4b72] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Đang tìm đối tượng phù hợp...</p>
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
