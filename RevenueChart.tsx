import { useState } from 'react';
import { formatCurrency } from '../lib/format.ts';

interface DataPoint {
  bucket: string;
  revenue: number;
  orders: number;
}

export function RevenueChart({
  daily,
  weekly,
  monthly,
}: {
  daily: DataPoint[];
  weekly: DataPoint[];
  monthly: DataPoint[];
}) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const rawData = period === 'daily' ? daily : period === 'weekly' ? weekly : monthly;
  const data = rawData.length > 0 ? rawData : [{ bucket: 'Today', revenue: 0, orders: 0 }];
  const maxVal = Math.max(1000, ...data.map((d) => d.revenue));

  const chartWidth = 680;
  const chartHeight = 220;
  const padX = 18;
  const padY = 18;
  const usableW = chartWidth - padX * 2;
  const usableH = chartHeight - padY * 2;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? padX + usableW / 2 : padX + (i / (data.length - 1)) * usableW;
    const y = padY + usableH - (d.revenue / maxVal) * usableH;
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${chartHeight - padY} L ${points[0].x.toFixed(1)} ${chartHeight - padY} Z`
      : '';

  const hovered = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="font-display text-base font-semibold text-white">Revenue Analytics</h3>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            {hovered ? `${hovered.bucket} · ${formatCurrency(hovered.revenue)} (${hovered.orders} orders)` : 'Verified Razorpay settlements'}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setPeriod(tab);
                setHoverIdx(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors cursor-pointer ${
                period === tab ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[480px] h-56">
          <defs>
            <linearGradient id="nexoraRevFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.38" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal reference lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = padY + usableH * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={padX}
                y1={y}
                x2={chartWidth - padX}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#nexoraRevFill)" />}
          {linePath && (
            <path d={linePath} fill="none" stroke="#60A5FA" strokeWidth="2.5" strokeLinecap="round" />
          )}

          {points.map((pt, i) => (
            <g key={pt.bucket} onMouseEnter={() => setHoverIdx(i)} className="cursor-pointer">
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoverIdx === i ? 6 : 4}
                fill={hoverIdx === i ? '#FFFFFF' : '#3B82F6'}
                stroke="#05070E"
                strokeWidth="2"
              />
              <rect x={pt.x - 16} y={0} width={32} height={chartHeight} fill="transparent" />
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-500 tabular-nums">
        <span>{data[0]?.bucket}</span>
        <span>{data[Math.floor(data.length / 2)]?.bucket}</span>
        <span>{data[data.length - 1]?.bucket}</span>
      </div>
    </div>
  );
}
