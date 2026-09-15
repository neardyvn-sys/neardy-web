"use client";

import { useApp } from "@/components/providers/AppProvider";
import MyWall from "@/components/wall/MyWall";

export default function MyWallPage() {
  const { user } = useApp();
  if (!user) return null;
  return <MyWall user={user} />;
}
