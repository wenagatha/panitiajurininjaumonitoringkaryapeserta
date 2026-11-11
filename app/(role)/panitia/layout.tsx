import type { ReactNode } from "react";
import { Suspense } from "react";
import { connection } from "next/server";
import Sidebar from "@/components/layout/Sidebar";
import { requireStaffRole } from "@/lib/auth";

async function PanitiaLayoutContent({
  children,
}: {
  children: ReactNode;
}) {
  await connection();
  const profile = await requireStaffRole("panitia");

  return (
    <div className="min-h-screen bg-[#f3f7f5] md:flex">
      <Sidebar role="panitia" displayName={profile.nama} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function PanitiaLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f7f5]" />}>
      <PanitiaLayoutContent>{children}</PanitiaLayoutContent>
    </Suspense>
  );
}
