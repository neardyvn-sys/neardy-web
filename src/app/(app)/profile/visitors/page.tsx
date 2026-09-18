"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import VisitorsSheet from "@/components/profile/VisitorsSheet";

export default function VisitorsPage() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    router.back();
  };

  return (
    <div className="min-h-screen bg-[#0a0c14] flex flex-col justify-center items-center p-4">
      <VisitorsSheet isOpen={isOpen} onClose={handleClose} />
    </div>
  );
}
