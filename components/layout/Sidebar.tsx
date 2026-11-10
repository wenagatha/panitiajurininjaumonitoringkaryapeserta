"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { JURI_CONTOH } from "@/lib/juri-contoh";
import { useJuriAktif } from "@/components/juri/JuriAktifProvider";
import { ubahJuriAktif } from "@/lib/juri-aktif-actions";

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

function Navigation({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedCategory = searchParams.get("kategori");
  const isCandidateReview = searchParams.get("dari") === "kandidat";
  const isWinnerReview = searchParams.get("dari") === "pemenang";
  const menu = ROLE_MENUS.find((item) => item.role === role);

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
                        ? "bg-[#eaf4ef] font-semibold text-[#245c4f]"
                        : "text-[#606d69] hover:bg-[#f4f7f5] hover:text-[#245c4f]"
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
                                  ? "bg-[#eaf4ef] font-semibold text-[#245c4f]"
                                  : "text-[#606d69] hover:bg-[#f4f7f5] hover:text-[#245c4f]"
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
  const router = useRouter();
  const [error, setError] = useState("");

  async function changeJuri(id: string) {
    try {
      await ubahJuriAktif(id);
      setError("");
      router.push("/juri/karya");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Mode demo juri gagal diperbarui.",
      );
    }
  }

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
      <label className="mt-3 block text-[10px] font-medium text-[#718079]">
        Mode demo: pilih juri
        <select
          value={juriAktif.id}
          onChange={(event) => void changeJuri(event.target.value)}
          className="mt-1 h-9 w-full rounded-lg border border-[#dfe6e2] bg-white px-2 text-xs text-[#465e56] outline-none focus:border-[#6b9b86]"
        >
          {JURI_CONTOH.map((juri) => (
            <option key={juri.id} value={juri.id}>
              {juri.nama}
            </option>
          ))}
        </select>
      </label>
      {/* TODO: hapus pemilih demo saat Supabase Auth dipakai. */}
      {error && (
        <p role="alert" className="mt-2 text-[10px] text-[#a33340]">
          {error}
        </p>
      )}
      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center rounded-lg border border-[#dfe6e2] px-3 py-2 text-xs font-semibold text-[#465e56] transition hover:bg-[#f6f8f7]"
        // TODO: sambungkan ke Supabase signOut.
      >
        Keluar
      </button>
    </>
  );
}

function SidebarProfile({ role }: { role: Role }) {
  if (role === "juri") {
    return <JuriSidebarProfile />;
  }

  return (
    <>
      <p className="text-[13px] font-semibold text-[#344b44]">Panitia</p>
      <p className="mt-0.5 text-[11px] text-[#87938f]">Admin Kemenham</p>
      <button
        type="button"
        className="mt-3 flex w-full items-center justify-center rounded-lg border border-[#dfe6e2] px-3 py-2 text-xs font-semibold text-[#465e56] transition hover:bg-[#f6f8f7]"
        // TODO: sambungkan ke Supabase signOut.
      >
        Keluar
      </button>
    </>
  );
}

export default function Sidebar({ role }: { role: Role }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-[#e5ebe8] bg-white md:flex">
        <Brand />
        <div className="mt-4">
          <Suspense fallback={null}>
            <Navigation role={role} />
          </Suspense>
        </div>
        <div className="mt-auto border-t border-[#edf0ee] p-4">
          <SidebarProfile role={role} />
        </div>
      </aside>

      <div className="sticky top-0 z-30 border-b border-[#e5ebe8] bg-white md:hidden">
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            aria-label={isMobileOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={isMobileOpen}
            onClick={() => setIsMobileOpen((open) => !open)}
            className="mr-4 rounded-lg p-2 text-[#245c4f] hover:bg-[#eef5f1]"
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
          <div className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-[#edf0ee] py-4">
            <Suspense fallback={null}>
              <Navigation
                role={role}
                onNavigate={() => setIsMobileOpen(false)}
              />
            </Suspense>
            <div className="mx-4 mt-2 border-t border-[#edf0ee] pt-3">
              <SidebarProfile role={role} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
