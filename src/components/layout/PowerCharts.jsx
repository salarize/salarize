import { useMemo, useState } from 'react';

const DEFAULT_WIDTH = 720;

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function Sparkline({
  data = [],
  valueKey = 'value',
  width = 120,
  height = 32,
  color = '#4f46e5',
  strokeWidth = 2,
  showArea = true,
}) {
  const values = useMemo(() => data.map((item) => toNumber(item?.[valueKey])), [data, valueKey]);
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const stepX = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * height;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {showArea && <path d={areaPath} fill={color} opacity={0.12} />}
      <path d={linePath} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.6} fill={color} />
    </svg>
  );
}

export function WaterfallChart({
  data = [],
  height = 280,
  positiveColor = '#10b981',
  negativeColor = '#ef4444',
  totalColor = '#334155',
  formatValue,
  onBarClick,
  selectedKey = null,
  labelKey = 'label',
  valueKey = 'value',
  includeTotal = true,
}) {
  const [hovered, setHovered] = useState(null);
  if (!Array.isArray(data) || data.length === 0) return null;

  const rows = [];
  let cumulative = 0;
  data.forEach((item, i) => {
    const v = toNumber(item?.[valueKey]);
    const start = cumulative;
    const end = cumulative + v;
    rows.push({
      key: item?.key || `${item?.[labelKey] || 'row'}-${i}`,
      label: String(item?.[labelKey] || ''),
      value: v,
      start,
      end,
      isTotal: false,
      raw: item,
    });
    cumulative = end;
  });

  if (includeTotal) {
    rows.push({
      key: '__total__',
      label: 'Total',
      value: cumulative,
      start: 0,
      end: cumulative,
      isTotal: true,
      raw: null,
    });
  }

  const minY = Math.min(0, ...rows.map((r) => Math.min(r.start, r.end)));
  const maxY = Math.max(0, ...rows.map((r) => Math.max(r.start, r.end)));
  const span = Math.max(maxY - minY, 1);

  const margin = { top: 20, right: 16, bottom: 64, left: 72 };
  const width = DEFAULT_WIDTH;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const slotW = innerW / rows.length;
  const barW = Math.min(44, slotW * 0.62);

  const toY = (v) => margin.top + ((maxY - v) / span) * innerH;
  const zeroY = toY(0);

  const ticks = Array.from({ length: 5 }, (_, i) => minY + (span / 4) * i);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
        {ticks.map((tick, i) => {
          const y = toY(tick);
          return (
            <g key={i}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 2" />
              <text x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#94a3b8">
                {formatValue ? formatValue(tick) : tick.toFixed(0)}
              </text>
            </g>
          );
        })}

        <line x1={margin.left} x2={width - margin.right} y1={zeroY} y2={zeroY} stroke="#cbd5e1" />

        {rows.map((row, i) => {
          const x = margin.left + i * slotW + (slotW - barW) / 2;
          const top = toY(Math.max(row.start, row.end));
          const bottom = toY(Math.min(row.start, row.end));
          const h = Math.max(1.5, bottom - top);
          const fill = row.isTotal ? totalColor : row.value >= 0 ? positiveColor : negativeColor;
          const active = selectedKey && row.key === selectedKey;

          return (
            <g
              key={row.key}
              onMouseEnter={() => setHovered(row.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onBarClick && onBarClick(row)}
              style={{ cursor: onBarClick ? 'pointer' : 'default' }}
            >
              {!row.isTotal && i < rows.length - 1 && (
                <line
                  x1={x + barW}
                  x2={margin.left + (i + 1) * slotW + (slotW - barW) / 2}
                  y1={toY(row.end)}
                  y2={toY(row.end)}
                  stroke="#94a3b8"
                  strokeDasharray="3 2"
                  opacity={0.6}
                />
              )}
              <rect
                x={x}
                y={top}
                width={barW}
                height={h}
                rx={4}
                fill={fill}
                opacity={active ? 1 : hovered && hovered !== row.key ? 0.4 : 0.88}
                stroke={active ? '#0f172a' : 'transparent'}
                strokeWidth={active ? 1.3 : 0}
              />
              <text
                x={x + barW / 2}
                y={height - margin.bottom + 14}
                textAnchor="middle"
                fontSize={10}
                fill="#64748b"
              >
                {row.label.length > 12 ? `${row.label.slice(0, 11)}...` : row.label}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && (() => {
        const row = rows.find((r) => r.key === hovered);
        if (!row) return null;
        const idx = rows.findIndex((r) => r.key === row.key);
        const pct = ((margin.left + idx * slotW + slotW / 2) / width) * 100;
        return (
          <div
            className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl"
            style={{ left: `${clamp(pct, 8, 92)}%` }}
          >
            <div className="font-semibold">{row.label}</div>
            <div>{row.value >= 0 ? '+' : ''}{formatValue ? formatValue(row.value) : row.value.toFixed(2)}</div>
          </div>
        );
      })()}
    </div>
  );
}

export function ParetoChart({
  data = [],
  labelKey = 'label',
  valueKey = 'value',
  height = 300,
  color = '#16a34a',
  lineColor = '#0f172a',
  formatValue,
  onBarClick,
  selectedKey = null,
}) {
  const [hovered, setHovered] = useState(null);
  if (!Array.isArray(data) || data.length === 0) return null;

  const sorted = [...data]
    .map((item, i) => ({
      ...item,
      key: item?.key || `${item?.[labelKey] || 'row'}-${i}`,
      value: toNumber(item?.[valueKey]),
      label: String(item?.[labelKey] || ''),
    }))
    .sort((a, b) => b.value - a.value);

  const total = sorted.reduce((sum, row) => sum + row.value, 0);
  const cumulative = [];
  let running = 0;
  sorted.forEach((row) => {
    running += row.value;
    cumulative.push(total > 0 ? (running / total) * 100 : 0);
  });

  const maxValue = Math.max(...sorted.map((r) => r.value), 1);
  const margin = { top: 18, right: 52, bottom: 74, left: 62 };
  const width = DEFAULT_WIDTH;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const slotW = innerW / sorted.length;
  const barW = Math.min(38, slotW * 0.58);
  const toYBar = (v) => margin.top + innerH - (v / maxValue) * innerH;
  const toYLine = (v) => margin.top + innerH - (v / 100) * innerH;

  const linePoints = sorted
    .map((row, i) => {
      const x = margin.left + i * slotW + slotW / 2;
      const y = toYLine(cumulative[i]);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const yTicks = Array.from({ length: 5 }, (_, i) => (maxValue / 4) * i);
  const pTicks = [0, 25, 50, 75, 100];

  return (
    <div className="relative w-full" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
        {yTicks.map((tick, i) => {
          const y = toYBar(tick);
          return (
            <g key={i}>
              <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 2" />
              <text x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#94a3b8">
                {formatValue ? formatValue(tick) : tick.toFixed(0)}
              </text>
            </g>
          );
        })}

        {pTicks.map((tick) => {
          const y = toYLine(tick);
          return (
            <text key={`p-${tick}`} x={width - margin.right + 8} y={y} dominantBaseline="middle" fontSize={10} fill="#94a3b8">
              {tick}%
            </text>
          );
        })}

        {sorted.map((row, i) => {
          const x = margin.left + i * slotW + (slotW - barW) / 2;
          const y = toYBar(row.value);
          const h = margin.top + innerH - y;
          const active = selectedKey && row.key === selectedKey;
          return (
            <g
              key={row.key}
              onMouseEnter={() => setHovered(row.key)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onBarClick && onBarClick(row)}
              style={{ cursor: onBarClick ? 'pointer' : 'default' }}
            >
              <rect
                x={x}
                y={y}
                width={barW}
                height={h}
                rx={4}
                fill={color}
                opacity={active ? 1 : hovered && hovered !== row.key ? 0.45 : 0.9}
                stroke={active ? '#0f172a' : 'transparent'}
                strokeWidth={active ? 1.3 : 0}
              />
              <text x={x + barW / 2} y={height - margin.bottom + 15} textAnchor="middle" fontSize={10} fill="#64748b">
                {row.label.length > 11 ? `${row.label.slice(0, 10)}...` : row.label}
              </text>
            </g>
          );
        })}

        <polyline fill="none" stroke={lineColor} strokeWidth={2} points={linePoints} />
        {sorted.map((row, i) => {
          const x = margin.left + i * slotW + slotW / 2;
          const y = toYLine(cumulative[i]);
          return <circle key={`pt-${row.key}`} cx={x} cy={y} r={2.8} fill={lineColor} />;
        })}
      </svg>

      {hovered && (() => {
        const idx = sorted.findIndex((r) => r.key === hovered);
        if (idx === -1) return null;
        const row = sorted[idx];
        const pct = ((margin.left + idx * slotW + slotW / 2) / width) * 100;
        return (
          <div
            className="pointer-events-none absolute top-2 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs text-white shadow-xl"
            style={{ left: `${clamp(pct, 8, 92)}%` }}
          >
            <div className="font-semibold">{row.label}</div>
            <div>{formatValue ? formatValue(row.value) : row.value.toFixed(2)}</div>
            <div className="text-slate-300">Cumul: {cumulative[idx].toFixed(1)}%</div>
          </div>
        );
      })()}
    </div>
  );
}

export function HeatmapMatrix({
  rows = [],
  cols = [],
  values = {},
  height = 260,
  formatValue,
  onCellClick,
  selectedCell = null,
}) {
  if (!rows.length || !cols.length) return null;

  const margin = { top: 26, right: 14, bottom: 54, left: 126 };
  const width = DEFAULT_WIDTH;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const cellW = innerW / cols.length;
  const cellH = innerH / rows.length;

  const numericValues = [];
  rows.forEach((r) => cols.forEach((c) => numericValues.push(toNumber(values?.[r]?.[c]))));
  const min = Math.min(...numericValues, 0);
  const max = Math.max(...numericValues, 1);
  const span = Math.max(max - min, 1);

  const toColor = (value) => {
    const ratio = (toNumber(value) - min) / span;
    const hue = 218 - ratio * 100;
    const sat = 72;
    const light = 94 - ratio * 38;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {rows.map((row, ri) => {
          const y = margin.top + ri * cellH + cellH / 2;
          return (
            <text key={row} x={margin.left - 8} y={y} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill="#64748b">
              {row.length > 22 ? `${row.slice(0, 21)}...` : row}
            </text>
          );
        })}

        {cols.map((col, ci) => {
          const x = margin.left + ci * cellW + cellW / 2;
          return (
            <text
              key={col}
              x={x}
              y={height - margin.bottom + 15}
              textAnchor="middle"
              fontSize={10}
              fill="#64748b"
            >
              {col.length > 9 ? `${col.slice(0, 8)}...` : col}
            </text>
          );
        })}

        {rows.map((row, ri) => cols.map((col, ci) => {
          const value = toNumber(values?.[row]?.[col]);
          const x = margin.left + ci * cellW;
          const y = margin.top + ri * cellH;
          const isSelected = selectedCell && selectedCell.row === row && selectedCell.col === col;
          return (
            <g key={`${row}-${col}`}>
              <rect
                x={x + 0.8}
                y={y + 0.8}
                width={cellW - 1.6}
                height={cellH - 1.6}
                rx={5}
                fill={toColor(value)}
                stroke={isSelected ? '#0f172a' : '#e2e8f0'}
                strokeWidth={isSelected ? 1.8 : 1}
                onClick={() => onCellClick && onCellClick({ row, col, value })}
                style={{ cursor: onCellClick ? 'pointer' : 'default' }}
              />
              <text
                x={x + cellW / 2}
                y={y + cellH / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={9.5}
                fill={value > (min + max) / 2 ? '#0f172a' : '#475569'}
              >
                {formatValue ? formatValue(value) : Math.round(value)}
              </text>
            </g>
          );
        }))}
      </svg>
    </div>
  );
}
