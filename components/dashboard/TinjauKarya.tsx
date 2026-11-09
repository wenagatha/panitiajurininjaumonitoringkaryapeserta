"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getStatusLabel, getStatusStyle, STATUS_KARYA } from "@/lib/status";
import { useStatusKarya } from "@/lib/review-status";
import type { StatusKarya } from "@/types/karya";
import type { KaryaDaftarItem } from "./KaryaCategoryList";

type TinjauKaryaProps = {
  item: KaryaDaftarItem;
  role?: "panitia" | "juri";
};

function formatTanggal(tanggal: string): string {
  return new Date(`${tanggal}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function TinjauKarya({
  item,
  role = "panitia",
}: TinjauKaryaProps) {
  const karya = useMemo(() => [item.karya], [item.karya]);
  const { statuses, setStatus, ready, error } = useStatusKarya(karya);
  const status = statuses[item.karya.id] ?? item.karya.status;
  const [draftStatus, setDraftStatus] = useState<StatusKarya>(item.karya.status);
  const [saved, setSaved] = useState(false);
  const kategoriJudul =
    item.peserta.kategori === "cerita" ? "Cerita HAM" : "Lomba Komik Bergambar";
  const karyaBaseHref = role === "panitia" ? "/panitia/karya" : "/juri/karya";
  const backHref =
    item.peserta.kategori === "cerita"
      ? karyaBaseHref
      : `${karyaBaseHref}/komik`;
  const visibleFiles =
    role === "juri"
      ? item.berkas.filter((file) => file.jenis === "karya")
      : item.berkas;
  const statusStyle = getStatusStyle(status);

  useEffect(() => {
    if (!ready) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      if (role === "panitia" && status === "menunggu") {
        const updated = setStatus(item.karya.id, "diproses");
        setDraftStatus(updated ? "diproses" : status);
      } else {
        setDraftStatus(status);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [item.karya.id, ready, role, setStatus, status]);

  function saveDecision() {
    if (setStatus(item.karya.id, draftStatus)) {
      setSaved(true);
    } else {
      setSaved(false);
    }
  }

  if (role === "juri" && status !== "diverifikasi") {
    return (
      <main className="mx-auto max-w-[820px]">
        <p className="rounded-lg border border-[#dce5e0] bg-white p-5 text-sm text-[#84918b]">
          Karya ini tidak tersedia untuk ditinjau oleh juri.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[820px]">
      <Link
        href={backHref}
        className="text-xs font-semibold text-[#3d7563] hover:underline"
      >
        ← Kembali ke {kategoriJudul}
      </Link>

      <header className="mb-5 mt-5">
        <p className="text-xs font-medium text-[#84918b]">
          Tinjauan {role === "panitia" ? "Panitia" : "Juri"}
        </p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-[#24453b]">
          {item.peserta.nama}
        </h1>
        <p className="mt-1 text-sm text-[#84918b]">{kategoriJudul}</p>
      </header>

      <section className="overflow-hidden rounded-xl border border-[#dce5e0] bg-white shadow-[0_2px_8px_rgba(27,61,49,0.06)]">
        <div className="h-1.5 bg-gradient-to-r from-[#00a477] via-[#14c9a7] to-[#f0b52c]" />
        <div className="p-5 sm:p-6">
          <dl className="grid gap-x-8 gap-y-5 border-b border-[#e8eeea] pb-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-[#84918b]">Peserta</dt>
              <dd className="mt-1 text-sm font-semibold text-[#345248]">
                {item.peserta.nama}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#84918b]">Asal sekolah / kampus</dt>
              <dd className="mt-1 text-sm font-semibold text-[#345248]">
                {item.peserta.asal}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#84918b]">Tanggal mendaftar</dt>
              <dd className="mt-1 text-sm font-semibold text-[#345248]">
                {formatTanggal(item.peserta.tanggalDaftar)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#84918b]">Status saat ini</dt>
              <dd className="mt-1">
                {statusStyle && (
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle.badgeClass}`}>
                    {getStatusLabel(status)}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          <div className="pt-5">
            <h2 className="text-sm font-bold text-[#29463d]">
              Berkas untuk ditinjau
            </h2>
            {visibleFiles.some((file) => file.isDemo) && (
              <p className="mt-1 text-xs text-[#a75c20]">
                Berkas demo yang sama ditampilkan untuk setiap peserta.
              </p>
            )}
            <div className="mt-3 space-y-2">
              {visibleFiles.map((file, index) => (
                <details
                  key={`${file.jenis}-${file.href}`}
                  open={index === 0}
                  className="overflow-hidden rounded-lg border border-[#d6e0da]"
                >
                  <summary className="cursor-pointer px-3 py-3 text-xs font-semibold text-[#345248]">
                    {file.label}
                  </summary>
                  <div className="border-t border-[#e8eeea] p-3">
                    <div className="mb-2 text-right">
                      <a
                        href={file.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[#3d7563] underline"
                      >
                        Buka PDF di tab baru
                      </a>
                    </div>
                    <iframe
                      title={file.label}
                      src={file.href}
                      className="h-[min(75vh,760px)] w-full rounded-md border border-[#e8eeea] bg-[#f7f8f7]"
                    />
                  </div>
                </details>
              ))}
            </div>
          </div>

          {role === "panitia" && (
            <div className="mt-5 border-t border-[#e8eeea] pt-5">
              <h2 className="text-sm font-bold text-[#29463d]">
                Keputusan tinjauan
              </h2>
              <p className="mt-1 text-xs text-[#84918b]">
                Saat karya dibuka untuk ditinjau, status Menunggu otomatis
                menjadi Diproses.
              </p>
              <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor={`decision-${item.karya.id}`}>
                  Pilih status hasil tinjauan
                </label>
                <select
                  id={`decision-${item.karya.id}`}
                  value={draftStatus}
                  onChange={(event) => {
                    setDraftStatus(event.target.value as StatusKarya);
                    setSaved(false);
                  }}
                  className="h-10 w-full rounded-lg border border-[#e0b349] bg-[#fffaf0] px-3 text-xs font-semibold text-[#85520d] outline-none focus:ring-2 focus:ring-[#f0c458]/30 sm:max-w-[350px]"
                >
                  {STATUS_KARYA.map((option) => (
                    <option key={option.value} value={option.value}>
                      {getStatusLabel(option.value)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={saveDecision}
                  className="rounded-lg bg-[#245c4f] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#19483e]"
                >
                  Simpan keputusan
                </button>
              </div>
              {saved && (
                <p role="status" className="mt-3 text-xs font-medium text-[#1f6746]">
                  Status berhasil disimpan di browser ini.
                </p>
              )}
              {error && (
                <p role="alert" className="mt-3 text-xs font-medium text-[#a33340]">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
