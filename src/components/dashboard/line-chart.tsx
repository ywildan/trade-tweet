import { formatNumber } from "@/lib/format";

const WIDTH = 560;
const HEIGHT = 168;
const PAD = { top: 14, right: 8, bottom: 24, left: 38 };

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.pow(10, Math.floor(Math.log10(value)));
  const fraction = value / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

function formatDayLabel(day: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00.000Z`));
}

/** Line chart satu seri per kartu, tayangan dan interaksi terpisah. */
export function LineChart({
  values,
  labels,
  label,
  tone = "accent",
  formatValue = formatNumber,
}: {
  values: number[];
  labels: string[];
  label: string;
  tone?: "accent" | "repost";
  formatValue?: (value: number) => string;
}) {
  const max = niceMax(Math.max(...values, 0));
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const step = values.length > 1 ? plotWidth / (values.length - 1) : 0;
  const baseline = PAD.top + plotHeight;

  const points = values.map((value, index) => ({
    x: PAD.left + index * step,
    y: PAD.top + plotHeight - (value / max) * plotHeight,
  }));

  const line = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join(" ");
  const last = points[points.length - 1];
  const area = `${line} L${last.x.toFixed(2)},${baseline} L${PAD.left},${baseline} Z`;
  const colorClass = tone === "repost" ? "text-repost" : "text-accent";

  return (
    <figure className={colorClass}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`${label} per hari`}
      >
        {[0, 0.5, 1].map((ratio) => {
          const y = PAD.top + plotHeight * (1 - ratio);
          return (
            <g key={ratio}>
              <line
                x1={PAD.left}
                x2={WIDTH - PAD.right}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <text
                x={PAD.left - 6}
                y={y + 3}
                textAnchor="end"
                className="fill-text text-[10px]"
              >
                {formatValue(max * ratio)}
              </text>
            </g>
          );
        })}

        <path d={area} fill="currentColor" fillOpacity={0.1} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => (
          <circle
            key={labels[index]}
            cx={point.x}
            cy={point.y}
            r={2.4}
            fill="currentColor"
          >
            <title>{`${label} ${labels[index]}: ${formatValue(values[index])}`}</title>
          </circle>
        ))}

        {[0, Math.floor((labels.length - 1) / 2), labels.length - 1].map(
          (index) => (
            <text
              key={index}
              x={PAD.left + index * step}
              y={HEIGHT - 6}
              textAnchor={
                index === 0
                  ? "start"
                  : index === labels.length - 1
                    ? "end"
                    : "middle"
              }
              className="fill-text text-[10px]"
            >
              {formatDayLabel(labels[index])}
            </text>
          ),
        )}
      </svg>
    </figure>
  );
}
