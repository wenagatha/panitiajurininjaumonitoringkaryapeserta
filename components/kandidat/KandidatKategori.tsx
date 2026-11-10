"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AksiKandidatJuri from "@/components/kandidat/AksiKandidatJuri";
import { useJuriAktif } from "@/components/juri/JuriAktifProvider";
import { ATURAN_LOMBA } from "@/lib/aturan-lomba";
import { formatTanggal } from "@/lib/format-tanggal";
import { JURI_CONTOH } from "@/lib/juri-contoh";
import { useStatusKarya } from "@/lib/review-status";
import { getStatusLabel, getStatusStyle } from "@/lib/status";
import {
  getPeringkatKategori,
  useKandidatKategori,
  usePeringkatKategori as useStatePeringkatKategori,
  useStateJuri,
  type RiwayatJuri,
} from "@/lib/state-juri";
import type { KategoriLomba, StatusKarya } from "@/types/karya";

export type KandidatKategoriItem = {
  karya: { id: string; status: StatusKarya };
  peserta: { id: string; nama: string; asal: string };
};

type KandidatKategoriProps = {
  kategori: KategoriLomba;
  items: KandidatKategoriItem[];
  role?: "panitia" | "juri";
};

function getInisial(nama: string): string {
  return nama
    .split(/\s+/)
    .slice(0, 2)
    .map((bagian) => bagian[0])
    .join("")
    .toLocaleUpperCase("id-ID");
}

export default function KandidatKategori({
  kategori,
  items,
  role = "panitia",
}: KandidatKategoriProps) {
  if (role === "juri") {
    return <KandidatKategoriJuri kategori={kategori} items={items} />;
  }
  return (
    <KandidatKategoriContent
      kategori={kategori}
      items={items}
      role="panitia"
    />
  );
}

function KandidatKategoriJuri({
  kategori,
  items,
}: Omit<KandidatKategoriProps, "role">) {
  const juriAktif = useJuriAktif();
  return (
    <KandidatKategoriContent
      kategori={kategori}
      items={items}
      role="juri"
      juriAktif={juriAktif}
    />
  );
}

function KandidatKategoriContent({
  kategori,
  items,
  role,
  juriAktif,
}: Omit<KandidatKategoriProps, "role"> & {
  role: "panitia" | "juri";
  juriAktif?: (typeof JURI_CONTOH)[number];
}) {
  const [query, setQuery] = useState("");
  const judulKategori =
    kategori === "cerita" ? "Cerita HAM" : "Komik Bergambar";
  const aturan = ATURAN_LOMBA[kategori];
  const works = useMemo(() => items.map((item) => item.karya), [items]);
  const { statuses, ready, error: statusError } = useStatusKarya(works);
  const { state, error: stateError } = useStateJuri();
  const { kandidat: choices, error: candidateError } =
    useKandidatKategori(kategori);
  const { peringkat: ranks, error: rankError } =
    useStatePeringkatKategori(kategori);
  const itemByWorkId = useMemo(
    () => new Map(items.map((item) => [item.karya.id, item])),
    [items],
  );
  // TODO: hanya karya berstatus diverifikasi; nantinya juga dijaga oleh RLS Supabase.
  const candidates = useMemo(() => {
    const rankByWorkId = new Map(
      getPeringkatKategori(kategori, state).map((rank) => [
        rank.karyaId,
        rank,
      ]),
    );
    return choices.flatMap((choice) => {
      const item = itemByWorkId.get(choice.karyaId);
      if (
        !item ||
        (statuses[item.karya.id] ?? item.karya.status) !== "diverifikasi"
      ) {
        return [];
      }
      const selectedBy = choice.juriIds
        .map((id) => JURI_CONTOH.find((juri) => juri.id === id))
        .filter((juri): juri is (typeof JURI_CONTOH)[number] => Boolean(juri));
      const rank = rankByWorkId.get(choice.karyaId);
      return [{ ...item, selectedBy, ditandaiPada: choice.ditandaiPada, rank }];
    }).sort((first, second) => {
      if (role === "juri" && first.rank && second.rank) {
        return first.rank.peringkat - second.rank.peringkat;
      }
      if (role === "juri" && first.rank) {
        return -1;
      }
      if (role === "juri" && second.rank) {
        return 1;
      }
      return Date.parse(first.ditandaiPada) - Date.parse(second.ditandaiPada);
    }).slice(0, aturan.batasKandidat);
  }, [aturan.batasKandidat, choices, itemByWorkId, kategori, role, state, statuses]);

  const searchTerm = query.trim().toLocaleLowerCase("id-ID");
  const filteredCandidates = candidates.filter(
    ({ peserta }) =>
      !searchTerm ||
      peserta.nama.toLocaleLowerCase("id-ID").includes(searchTerm) ||
      peserta.asal.toLocaleLowerCase("id-ID").includes(searchTerm),
  );
  const candidateIds = new Set(candidates.map(({ karya }) => karya.id));
  const slots = ranks.filter(({ karyaId }) => candidateIds.has(karyaId));
  const slotByRank = new Map(
    slots.map((rank) => [
      rank.peringkat,
      itemByWorkId.get(rank.karyaId)?.peserta.nama ?? "",
    ]),
  );
  const history = state.riwayat
    .filter((entry) => {
      const item = itemByWorkId.get(entry.karyaId);
      return (
        item !== undefined &&
        (statuses[item.karya.id] ?? item.karya.status) === "diverifikasi"
      );
    })
    .sort((first, second) => Date.parse(second.waktu) - Date.parse(first.waktu))
    .slice(0, 10);
  const error = statusError || candidateError || rankError || stateError;

  if (role === "juri" && !ready) {
    return (
      <main className="mx-auto max-w-[920px]">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#a33340]">
            {error}
          </p>
        )}
        <p role="status" className="text-sm text-[#84918b]">
          Memuat daftar karya...
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[920px]">
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#a33340]">
          {error}
        </p>
      )}
      {role === "panitia" ? (
        <section className="mb-4 rounded-xl border border-[#dce5e0] bg-white px-5 py-7 text-center shadow-[0_2px_8px_rgba(27,61,49,0.06)] sm:py-8">
          <svg
            aria-hidden="true"
            viewBox="0 0 96 88"
            fill="none"
            className="mx-auto mb-2 h-20 w-24"
          >
            <path
              d="M25 25H71V43C71 58 61 68 48 68S25 58 25 43V25Z"
              fill="#fff3d4"
              stroke="#75847d"
              strokeWidth="2"
            />
            <path
              d="M25 31H18C13 31 10 35 11 41C12 48 18 52 27 52M71 31H78C83 31 86 35 85 41C84 48 78 52 69 52"
              stroke="#75847d"
              strokeWidth="2"
            />
            <path d="M48 68V75M36 78H60" stroke="#75847d" strokeWidth="2" />
            <path d="M48 7V14M19 18L24 23M77 18L72 23" stroke="#9aa49f" strokeWidth="2" />
          </svg>
          <h1 className="text-[22px] font-bold tracking-tight text-[#24453b]">
            Kandidat Pemenang
          </h1>
          <p className="mx-auto mt-1 max-w-[440px] text-xs text-[#84918b]">
            Karya yang dipilih juri sebagai kandidat pemenang.
          </p>
        </section>
      ) : (
        <header className="mb-4">
          <p className="text-xs font-medium text-[#84918b]">Penilaian</p>
          <h1 className="mt-1 text-[22px] font-bold tracking-tight text-[#24453b]">
            Kandidat Pemenang
          </h1>
          <p className="mt-1 text-xs text-[#84918b]">{judulKategori}</p>
        </header>
      )}

      <section className="rounded-xl border border-[#dce5e0] bg-white p-5 shadow-[0_2px_8px_rgba(27,61,49,0.06)] sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-[#29463d]">
              Kandidat {judulKategori}
            </h2>
            <p className="mt-1 text-xs text-[#84918b]">
              {role === "panitia"
                ? "Karya yang sudah diverifikasi dan dipilih juri."
                : `${candidates.length} dari ${aturan.batasKandidat} kandidat`}
            </p>
          </div>
          <label className="sr-only" htmlFor={`candidate-search-${kategori}`}>
            Cari nama atau asal peserta
          </label>
          <input
            id={`candidate-search-${kategori}`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama atau asal peserta"
            className="h-10 w-full rounded-lg border border-[#dfe6e2] px-3 text-xs text-[#354a42] outline-none placeholder:text-[#9aa49f] focus:border-[#6b9b86] focus:ring-2 focus:ring-[#6b9b86]/15 sm:max-w-[280px]"
          />
        </div>

        {role === "panitia" && (
          <p className="mt-4 text-xs text-[#718079]">
            {candidates.length} dari {aturan.batasKandidat} kandidat
          </p>
        )}

        {role === "juri" && (
          <>
            <section className="mt-4 rounded-lg border border-[#e3eae6] bg-[#f9fbfa] p-3">
              <h3 className="text-xs font-bold text-[#29463d]">
                Peringkat saat ini
              </h3>
              <ol className="mt-2 grid gap-2 sm:grid-cols-2">
                {Array.from(
                  { length: aturan.jumlahPeringkat },
                  (_, index) => index + 1,
                ).map((rank) => (
                  <li
                    key={rank}
                    className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs"
                  >
                    <span className="w-5 font-semibold tabular-nums text-[#64716c]">
                      {rank}
                    </span>
                    <span className="text-[#52675f]">
                      {slotByRank.get(rank) || "Kosong"}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            <details className="mt-4 rounded-lg border border-[#e3eae6] p-3">
              <summary className="cursor-pointer text-xs font-bold text-[#29463d]">
                Riwayat perubahan
              </summary>
              {history.length === 0 ? (
                <p className="mt-3 text-xs text-[#84918b]">
                  Belum ada riwayat perubahan.
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-md bg-[#f7faf8] px-3 py-2 text-[11px] text-[#52766a]"
                    >
                      <p>
                        {JURI_CONTOH.find((juri) => juri.id === entry.juriId)
                          ?.nama ?? entry.juriId}
                        {" — "}
                        {itemByWorkId.get(entry.karyaId)?.peserta.nama ?? entry.karyaId}
                        {" — "}
                        {describeHistory(entry)}
                      </p>
                      <p className="mt-1 text-[10px] text-[#84918b]">
                        {new Date(entry.waktu).toLocaleString("id-ID")}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </details>
          </>
        )}

        {candidates.length === 0 ? (
          <p className="mt-4 rounded-lg border border-[#e8eeea] px-4 py-8 text-center text-xs text-[#87938e]">
            Belum ada kandidat
          </p>
        ) : filteredCandidates.length === 0 ? (
          <p className="mt-4 rounded-lg border border-[#e8eeea] px-4 py-8 text-center text-xs text-[#87938e]">
            Tidak ada kandidat yang cocok
          </p>
        ) : (
          <ol className="mt-3 space-y-2" aria-label={`Kandidat ${judulKategori}`}>
            {filteredCandidates.map((candidate, index) => {
              const status =
                statuses[candidate.karya.id] ?? candidate.karya.status;
              const statusStyle = getStatusStyle(status);
              const isSelectedByActive = candidate.selectedBy.some(
                (juri) => juri.id === juriAktif?.id,
              );
              const rank = candidate.rank;
              return (
                <li
                  key={candidate.karya.id}
                  className="rounded-lg border border-[#e3eae6] bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    {role === "panitia" && (
                      <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-[#64716c]">
                        {index + 1}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#eaf4ef] text-[10px] font-bold text-[#356454]"
                    >
                      {getInisial(candidate.peserta.nama)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-[#345248]">
                        {candidate.peserta.nama}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-[#89958f]">
                        {candidate.peserta.asal}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[10px] text-[#718079]">
                          Dipilih oleh{" "}
                          {candidate.selectedBy.map((juri) => juri.nama).join(", ")}
                        </span>
                        {role === "juri" && isSelectedByActive && (
                          <span className="rounded-full bg-[#eaf4ef] px-2 py-0.5 text-[9px] font-semibold text-[#28634d]">
                            Pilihan Anda
                          </span>
                        )}
                        {role === "juri" && rank && (
                          <span className="rounded-full bg-[#fff4d8] px-2 py-0.5 text-[9px] font-semibold text-[#946914]">
                            Peringkat {rank.peringkat}
                          </span>
                        )}
                        {role === "panitia" && rank && (
                          <span className="rounded-full bg-[#fff4d8] px-2 py-0.5 text-[9px] font-semibold text-[#946914]">
                            Peringkat {rank.peringkat}
                          </span>
                        )}
                        {role === "panitia" && statusStyle && (
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-semibold ${statusStyle.badgeClass}`}
                          >
                            <span
                              aria-hidden="true"
                              className="mr-1 mt-0.5 size-1.5 rounded-full"
                              style={{ backgroundColor: statusStyle.color }}
                            />
                            {getStatusLabel(status)}
                          </span>
                        )}
                      </span>
                      {role === "juri" && rank && (
                        <span className="mt-1 block text-[10px] text-[#84918b]">
                          Ditetapkan oleh {rank.ditetapkanOleh} pada{" "}
                          {formatTanggal(rank.ditetapkanPada.slice(0, 10))}
                        </span>
                      )}
                    </span>
                  </div>
                  {role === "juri" && juriAktif && (
                    <AksiKandidatJuri
                      karyaId={candidate.karya.id}
                      namaPeserta={candidate.peserta.nama}
                      juriAktif={juriAktif}
                      dipilihAktif={isSelectedByActive}
                      peringkat={rank}
                      jumlahPeringkat={aturan.jumlahPeringkat}
                      slotByRank={Object.fromEntries(
                        Array.from(slotByRank.entries()).flatMap(
                          ([number, nama]) => {
                            const occupant = ranks.find(
                              (itemRank) => itemRank.peringkat === number,
                            );
                            return occupant ? [[number, {
                              karyaId: occupant.karyaId,
                              nama,
                            }]] : [];
                          },
                        ),
                      )}
                    />
                  )}
                  {role === "panitia" && (
                    <Link
                      href={`/panitia/karya/${candidate.karya.id}?dari=kandidat&kategori=${kategori}`}
                      className="mt-3 inline-flex rounded-lg bg-[#245c4f] px-3 py-2.5 text-[10px] font-semibold text-white transition hover:bg-[#19483e]"
                    >
                      Lihat karya
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}

function describeHistory(entry: RiwayatJuri): string {
  switch (entry.jenis) {
    case "jadikan-kandidat":
      return "dijadikan kandidat";
    case "batalkan-kandidat":
      return "pilihan kandidat dibatalkan";
    case "tetapkan-peringkat":
      return `ditetapkan di peringkat ${entry.nilaiBaru}`;
    case "pindah-peringkat":
      return `dipindah dari peringkat ${entry.nilaiLama} ke ${entry.nilaiBaru}`;
    case "hapus-peringkat":
      return `peringkat ${entry.nilaiLama} dikosongkan${entry.catatan ? ` (${entry.catatan})` : ""}`;
  }
}
