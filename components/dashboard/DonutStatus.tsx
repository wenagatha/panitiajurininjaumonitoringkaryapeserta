import { STATUS_KARYA, getStatusLabel } from "@/lib/status";
import type { StatusKarya } from "@/types/karya";

type DonutStatusProps = {
  total: number;
  counts: Record<StatusKarya, number>;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DonutStatus({ total, counts }: DonutStatusProps) {
  let offset = 0;

  return (
    <section className="min-h-[360px] rounded-xl border border-[#dce5e0] border-t-[3px] border-t-[#e9a16f] bg-white p-5 shadow-[0_2px_8px_rgba(27,61,49,0.035)] sm:p-6">
      <h2 className="text-sm font-bold text-[#29463d]">Status karya</h2>
      <p className="mt-1 text-xs text-[#8a9691]">Status seluruh karya peserta</p>
      <div className="mt-3 flex flex-col items-center gap-4 sm:mt-6 sm:grid sm:grid-cols-2 sm:items-center sm:gap-6">
        <div
          role="img"
          aria-label={`Donut status karya, total ${total} karya`}
          className="relative size-[210px] shrink-0 sm:justify-self-center"
        >
          <svg viewBox="0 0 160 160" className="size-full -rotate-90">
            <circle
              cx="80"
              cy="80"
              r={RADIUS}
              fill="none"
              stroke="#edf1ee"
              strokeWidth="16"
            />
            {total > 0 &&
              STATUS_KARYA.map((status) => {
                const length = (counts[status.value] / total) * CIRCUMFERENCE;
                const segmentOffset = offset;
                offset += length;

                return (
                  <circle
                    key={status.value}
                    cx="80"
                    cy="80"
                    r={RADIUS}
                    fill="none"
                    stroke={status.color}
                    strokeWidth="16"
                    strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                    strokeDashoffset={-segmentOffset}
                  />
                );
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[26px] font-bold leading-none text-[#21463d]">
              {total}
            </span>
            <span className="mt-1 text-[10px] text-[#87928e]">karya</span>
          </div>
        </div>
        <ul className="w-fit space-y-3 sm:justify-self-center">
          {STATUS_KARYA.map((status) => (
            <li
              key={status.value}
              className="grid grid-cols-[160px_28px] items-center gap-3 text-sm"
            >
              <span className="flex items-center gap-2 text-[#64716c]">
                <span
                  aria-hidden="true"
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                {getStatusLabel(status.value)}
              </span>
              <span className="font-semibold tabular-nums text-[#38544a]">
                {counts[status.value]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
