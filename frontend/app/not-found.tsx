"use client";

import Link from "next/link";
import CyberButton from "@/components/ui/CyberButton";
import NexisLogo from "@/components/ui/NexisLogo";

export default function NotFound() {
  return (
    <div className="h-full flex flex-col items-center justify-center font-mono gap-4 p-6 bg-[#03070D] text-[#C0D8F0]">
      <NexisLogo size={48} accent="magenta" />
      <h1 className="text-2xl font-bold text-[#FF0055] tracking-widest glow-magenta">
        404 // TARGET_NOT_FOUND
      </h1>
      <p className="text-xs text-[#5A7A9A] max-w-md text-center">
        The requested telemetry target, endpoint, or routing path does not exist in the active fleet registry.
      </p>
      <Link href="/">
        <CyberButton accent="cyan" size="md">
          RETURN TO HUD DASHBOARD
        </CyberButton>
      </Link>
    </div>
  );
}
