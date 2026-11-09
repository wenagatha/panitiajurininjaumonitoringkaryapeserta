import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";

export default function PanitiaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f7f5] md:flex">
      <Sidebar role="panitia" />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          {children}
        </div>
      </div>
    </div>
  );
}
