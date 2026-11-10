import { STATUS_KARYA, getStatusLabel } from "@/lib/status";
import type { StatusKarya } from "@/types/karya";

type DonutStatusProps = {
  total: number;
  counts: Record<StatusKarya, number>;
};

const CENTER = 80;
const OUTER_RADIUS = 62;
const INNER_RADIUS = 46;
const RADIUS = (OUTER_RADIUS + INNER_RADIUS) / 2;
const STROKE_WIDTH = OUTER_RADIUS - INNER_RADIUS;

function getPoint(radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.cos(radians),
    y: CENTER + radius * Math.sin(radians),
  };
}

function getSegmentPath(startAngle: number, endAngle: number) {
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = getPoint(OUTER_RADIUS, startAngle);
  const outerEnd = getPoint(OUTER_RADIUS, endAngle);
  const innerEnd = getPoint(INNER_RADIUS, endAngle);
  const innerStart = getPoint(INNER_RADIUS, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${OUTER_RADIUS} ${OUTER_RADIUS} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export default function DonutStatus({ total, counts }: DonutStatusProps) {
  let currentAngle = -90;
  const segments = total > 0
    ? STATUS_KARYA.flatMap((status) => {
        const count = counts[status.value];
        const angle = (count / total) * 360;
        if (count <= 0 || angle <= 0) {
          return [];
        }

        const startAngle = currentAngle;
        currentAngle += angle;
        return [{ status, angle, startAngle, endAngle: currentAngle }];
      })
    : [];

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
          <svg viewBox="0 0 160 160" className="size-full">
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="#edf1ee"
              strokeWidth={STROKE_WIDTH}
            />
            {segments.map(({ status, angle, startAngle, endAngle }) =>
              angle >= 360 ? (
                <circle
                  key={status.value}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={status.color}
                  strokeWidth={STROKE_WIDTH}
                />
              ) : (
                <path
                  key={status.value}
                  d={getSegmentPath(startAngle, endAngle)}
                  fill={status.color}
                />
              ),
            )}
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
