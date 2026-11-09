import type { KategoriLomba } from "@/types/karya";

type ChartPendaftaranProps = {
  cerita: number;
  komik: number;
  total: number;
};

const BARS: ReadonlyArray<{
  kategori: KategoriLomba;
  label: string;
  className: string;
}> = [
  { kategori: "cerita", label: "Lomba Cerita", className: "bg-[#245c4f]" },
  { kategori: "komik", label: "Lomba Komik", className: "bg-[#e9a16f]" },
];

export default function ChartPendaftaran({
  cerita,
  komik,
  total,
}: ChartPendaftaranProps) {
  const highestCount = Math.max(cerita, komik, 1);
  const values: Record<KategoriLomba, number> = { cerita, komik };

  return (
    <section className="min-h-[360px] rounded-xl border border-[#dce5e0] border-t-[3px] border-t-[#18a394] bg-white p-5 shadow-[0_2px_8px_rgba(27,61,49,0.035)] sm:p-6">
      <h2 className="text-sm font-bold text-[#29463d]">Peserta per lomba</h2>
      <p className="mt-1 text-xs text-[#8a9691]">
        Total peserta yang daftar Lomba Cerita dan Lomba Komik
      </p>
      <div
        role="img"
        aria-label={`Peserta per lomba: ${cerita} peserta Lomba Cerita, ${komik} peserta Lomba Komik`}
        className="mx-auto mt-5 flex h-[250px] max-w-[400px] items-end justify-center gap-12 border-b border-[#edf0ee] px-6"
      >
        {BARS.map((bar) => {
          const value = values[bar.kategori];
          const height = value === 0 ? 0 : Math.max(18, (value / highestCount) * 176);

          return (
            <div
              key={bar.kategori}
              className="flex h-full w-[104px] flex-col items-center justify-end"
            >
              <span className="mb-2 text-sm font-bold text-[#29463d]">
                {value}
              </span>
              <div
                aria-hidden="true"
                className={`w-full rounded-t-[9px] ${bar.className}`}
                style={{ height: `${height}px` }}
              />
              <span className="mt-2 whitespace-nowrap text-[11px] text-[#718079]">
                {bar.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-xs text-[#83908a]">
        Total {total} peserta
      </p>
    </section>
  );
}
