import type { ReactNode } from "react";
import { Suspense } from "react";
import Sidebar from "@/components/layout/Sidebar";
import { JuriAktifProvider } from "@/components/juri/JuriAktifProvider";
import { getJuriAktif } from "@/lib/juri-aktif";
import { requireStaffRole } from "@/lib/auth";

async function JuriLayoutContent({ children }: { children: ReactNode }) {
  const [profile, juriAktif] = await Promise.all([
    requireStaffRole("juri"),
    getJuriAktif(),
  ]);
  return (
    <JuriAktifProvider juriAktif={juriAktif}>
      <div className="min-h-screen bg-[#f3f7f5] md:flex">
        <Sidebar role="juri" displayName={profile.nama} />
        <div className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            {children}
          </div>
        </div>
      </div>
    </JuriAktifProvider>
  );
}

export default function JuriLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f7f5]" />}>
      <JuriLayoutContent>{children}</JuriLayoutContent>
    </Suspense>
  );
}
