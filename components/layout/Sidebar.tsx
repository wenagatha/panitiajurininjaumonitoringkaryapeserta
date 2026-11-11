"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { useJuriAktif } from "@/components/juri/JuriAktifProvider";
import { signOutAction } from "@/lib/auth-actions";

type Role = "panitia" | "juri";
type IconName = "dashboard" | "people" | "document" | "award" | "trophy";

type MenuItem = {
  label: string;
  href: string;
  icon: IconName;
  subItems?: ReadonlyArray<{
    label: string;
    href: string;
    category?: "cerita" | "komik";
  }>;
};

type MenuGroup = {
  title: string;
  items: MenuItem[];
};

const ROLE_MENUS: ReadonlyArray<{ role: Role; groups: MenuGroup[] }> = [
  {
    role: "panitia",
    groups: [
      {
        title: "MONITORING & MENINJAU",
        items: [
          { label: "Dashboard", href: "/panitia", icon: "dashboard" },
          {
            label: "Daftar Peserta",
            href: "/panitia/peserta/cerita",
            icon: "people",
            subItems: [
              {
                label: "Lomba Cerita HAM",
                href: "/panitia/peserta/cerita",
                category: "cerita",
              },
              {
                label: "Lomba Komik Bergambar",
                href: "/panitia/peserta/komik",
                category: "komik",
              },
            ],
          },
          {
            label: "Daftar Karya Peserta",
            href: "/panitia/karya",
            icon: "document",
            subItems: [
              {
                label: "Lomba Cerita HAM",
                href: "/panitia/karya",
                category: "cerita",
              },
              {
                label: "Lomba Komik Bergambar",
                href: "/panitia/karya/komik",
                category: "komik",
              },
            ],
          },
        ],
      },
      {
        title: "PEMENANG",
        items: [
          {
            label: "Kandidat Pemenang",
            href: "/panitia/kandidat/cerita",
            icon: "award",
            subItems: [
              {
                label: "Cerita HAM",
                href: "/panitia/kandidat/cerita",
                category: "cerita",
              },
              {
                label: "Komik Bergambar",
                href: "/panitia/kandidat/komik",
                category: "komik",
              },
            ],
          },
          {
            label: "Pemenang",
            href: "/panitia/pemenang/cerita",
            icon: "trophy",
            subItems: [
              {
                label: "Cerita HAM",
                href: "/panitia/pemenang/cerita",
                category: "cerita",
              },
              {
                label: "Komik Bergambar",
                href: "/panitia/pemenang/komik",
                category: "komik",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    role: "juri",
    groups: [
      {
        title: "PENILAIAN",
        items: [
          {
            label: "Daftar Karya Peserta",
            href: "/juri/karya",
            icon: "document",
          },
          {
            label: "Kandidat Pemenang",
            href: "/juri/kandidat",
            icon: "award",
          },
        ],
      },
      {
        title: "PEMENANG",
        items: [{ label: "Pemenang", href: "/juri/pemenang", icon: "trophy" }],
      },
    ],
  },
];

function MenuIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    dashboard: (
      <>
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 3.5 5" />
      </>
    ),
    document: (
      <>
        <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
        <path d="M14 3.5v5h5M8 13h8M8 17h8" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="5" />
        <path d="m8.5 12-1 9 4.5-2.5 4.5 2.5-1-9" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 4h8v4a4 4 0 0 1-8 0V4ZM8 6H5v2a4 4 0 0 0 4 4m7-6h3v2a4 4 0 0 1-4 4m-3 4v3m-4 2h8m-7-5h6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-[18px] shrink-0"
    >
      {paths[name]}
    </svg>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 py-5">
      <Image
        src="/image/logo-kemenham.png"
        alt="Logo Kementerian HAM"
        width={34}
        height={34}
        className="size-[34px] object-contain"
      />
      <span className="text-sm font-bold text-[#214d43]">
        Kementerian HAM
      </span>
    </div>
  );
}

function RoleBanner({ role }: { role: Role }) {
  const isPanitia = role === "panitia";

  return (
    <div
      className={`mx-4 mb-5 rounded-xl border px-3 py-2.5 ${
        isPanitia
          ? "border-[#c8def5] bg-[#edf6ff]"
          : "border-[#cbd6f5] bg-[#eef2ff]"
      }`}
    >
      <p
        className={`text-[9px] font-bold tracking-[0.14em] ${
          isPanitia ? "text-[#4776a8]" : "text-[#596ba6]"
        }`}
      >
        AREA AKSES
      </p>
      <p
        className={`mt-0.5 text-xs font-bold ${
          isPanitia ? "text-[#245b91]" : "text-[#3e528f]"
        }`}
      >
        {isPanitia ? "PANITIA" : "JURI"}
      </p>
    </div>
  );
}

function Navigation({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("kategori");
  const isCandidateReview = searchParams.get("dari") === "kandidat";
  const isWinnerReview = searchParams.get("dari") === "pemenang";
  const menu = ROLE_MENUS.find((item) => item.role === role);
  const activeItemClass =
    role === "panitia"
      ? "bg-[#dceeff] font-semibold text-[#245b91]"
      : "bg-[#e2eaff] font-semibold text-[#3e528f]";
  const activeSubItemClass =
    role === "panitia"
      ? "bg-[#dceeff] font-semibold text-[#245b91]"
      : "bg-[#e2eaff] font-semibold text-[#3e528f]";
  const hoverItemClass =
    role === "panitia"
      ? "text-[#53697d] hover:bg-[#f1f7fd] hover:text-[#245b91]"
      : "text-[#59647e] hover:bg-[#f2f5ff] hover:text-[#3e528f]";

  return (
    <nav aria-label={`Menu ${role}`}>
      {menu?.groups.map((group) => (
        <div key={group.title} className="mb-6">
          <h2 className="mb-2 px-5 text-[10px] font-bold tracking-[0.08em] text-[#82918c]">
            {group.title}
          </h2>
          <ul className="space-y-1 px-3">
            {group.items.map((item) => {
              const subItems = item.subItems ?? [];
              const isActive =
                pathname === item.href ||
                (item.href !== `/${role}` && pathname.startsWith(`${item.href}/`));
              const isParentActive = item.subItems
                ? item.subItems.some(
                    (subItem) =>
                      pathname === subItem.href ||
                      pathname.startsWith(`${subItem.href}/`),
                  ) ||
                  (role === "panitia" &&
                    item.href === "/panitia/kandidat/cerita" &&
                    isCandidateReview) ||
                  (role === "panitia" &&
                    item.href === "/panitia/pemenang/cerita" &&
                    isWinnerReview)
                : isActive;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={
                      !item.subItems && isParentActive ? "page" : undefined
                    }
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${
                      isParentActive
                        ? activeItemClass
                        : hoverItemClass
                    }`}
                  >
                    <MenuIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                  {subItems.length > 0 && isParentActive && (
                    <ul className="ml-4 mt-1 space-y-1 border-l border-[#dce8e1] pl-2">
                      {subItems.map((subItem) => {
                        const requestedSubItem = requestedCategory
                          ? subItems.find(
                              (candidate) =>
                                candidate.category === requestedCategory,
                            )
                          : undefined;
                        const activeSubItemHref = requestedSubItem?.href ?? subItems
                          .filter(
                            (candidate) =>
                              pathname === candidate.href ||
                              pathname.startsWith(`${candidate.href}/`),
                          )
                          .sort(
                            (first, second) =>
                              second.href.length - first.href.length,
                          )[0]?.href;
                        const isSubItemActive =
                          activeSubItemHref === subItem.href;

                        return (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              onClick={onNavigate}
                              aria-current={isSubItemActive ? "page" : undefined}
                              className={`block rounded-lg px-3 py-2 text-xs transition ${
                                isSubItemActive
                                ? activeSubItemClass
                                : hoverItemClass
                              }`}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function JuriSidebarProfile() {
  const juriAktif = useJuriAktif();

  return (
    <>
      <p className="text-[13px] font-semibold text-[#344b44]">
        {juriAktif.nama}
      </p>
      <p className="mt-0.5 text-[11px] text-[#87938f]">
        {juriAktif.kategori === "cerita"
          ? "Juri Cerita HAM"
          : "Juri Komik Bergambar"}
      </p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="mt-3 flex w-full items-center justify-center rounded-lg border border-[#dfe6e2] px-3 py-2 text-xs font-semibold text-[#465e56] transition hover:bg-[#f6f8f7]"
        >
          Keluar
        </button>
      </form>
    </>
  );
}

function SidebarProfile({
  role,
  displayName,
}: {
  role: Role;
  displayName: string;
}) {
  if (role === "juri") {
    return <JuriSidebarProfile />;
  }

  return (
    <>
      <p className="text-[13px] font-semibold text-[#344b44]">{displayName}</p>
      <p className="mt-0.5 text-[11px] text-[#87938f]">Admin Kemenham</p>
      <form action={signOutAction}>
        <button
          type="submit"
          className="mt-3 flex w-full items-center justify-center rounded-lg border border-[#dfe6e2] px-3 py-2 text-xs font-semibold text-[#465e56] transition hover:bg-[#f6f8f7]"
        >
          Keluar
        </button>
      </form>
    </>
  );
}

export default function Sidebar({
  role,
  displayName,
}: {
  role: Role;
  displayName: string;
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r md:flex ${
          role === "panitia"
            ? "border-[#d7e5f2] bg-[#f8fbff]"
            : "border-[#d9e0f2] bg-[#f8f9ff]"
        }`}
      >
        <Brand />
        <RoleBanner role={role} />
        <div>
          <Suspense fallback={null}>
            <Navigation role={role} />
          </Suspense>
        </div>
        <div className="mt-auto border-t border-[#edf0ee] p-4">
          <SidebarProfile role={role} displayName={displayName} />
        </div>
      </aside>

      <div
        className={`sticky top-0 z-30 border-b md:hidden ${
          role === "panitia"
            ? "border-[#d7e5f2] bg-[#f8fbff]"
            : "border-[#d9e0f2] bg-[#f8f9ff]"
        }`}
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            aria-label={isMobileOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen((open) => !open)}
            className={`mr-4 rounded-lg p-2 ${
              role === "panitia"
                ? "text-[#245b91] hover:bg-[#eaf4ff]"
                : "text-[#3e528f] hover:bg-[#e9eeff]"
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-5"
            >
              {isMobileOpen ? (
                <path d="m6 6 12 12M18 6 6 18" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        {isMobileOpen && (
          <div
            className={`max-h-[calc(100vh-72px)] overflow-y-auto border-t py-4 ${
              role === "panitia" ? "border-[#e1ebf5]" : "border-[#e3e7f4]"
            }`}
          >
            <RoleBanner role={role} />
            <Suspense fallback={null}>
              <Navigation
                role={role}
                onNavigate={() => setIsMobileOpen(false)}
              />
            </Suspense>
            <div className="mx-4 mt-2 border-t border-[#edf0ee] pt-3">
              <SidebarProfile role={role} displayName={displayName} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
