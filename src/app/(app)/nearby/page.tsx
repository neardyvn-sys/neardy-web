"use client";

import NearbyList from "@/components/nearby/NearbyList";
import { useApp } from "@/components/providers/AppProvider";

export default function NearbyPage() {
  const { users, permissionState, friends, toggleFriend, passUser } = useApp();
  return (
    <NearbyList
      users={users}
      permissionState={permissionState}
      friends={friends}
      onToggleFriend={toggleFriend}
      onPass={passUser}
    />
  );
}
