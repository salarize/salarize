import { useState } from 'react';

const M = { top: 24, right: 32, bottom: 44, left: 58 };
const VW = 640;

/**
 * Pure SVG bar chart — no ResizeObserver, no external library, no React #426.
 *
 * Props:
 *  data        - array of objects
 *  xKey        - key for x-axis category
 *  yKey        - key for bar height value
 *  height      - pixel height of the SVG
 *  color       - default bar color
 *  colorFn     - (row) => color string — overrides color per bar
 *  formatX     - (value) => string — x-axis label formatter
 *  formatY     - (value) => string — y-axis tick and tooltip formatter
 *  formatTooltip - (row) => JSX/string — full tooltip content
 *  referenceLine - { value, label } — horizontal reference line
 */
export function SvgBarChart({
  data = [],
  xKey,
  yKey,
  height = 256,
  color = '#8B5CF6',
  colorFn,
  formatX,
  formatY,
  formatTooltip,
  referenceLine,
}) {
  const [hovered, setHovered] = useState(null);

  if (!data.length) return null;

  const VH = height;
  const iW = VW - M.left - M.right;
  const iH = VH - M.top - M.bottom;

  const vals = data.map(d => Number(d[yKey]) || 0);
  const maxVal = Math.max(...vals, 1) * 1.08;

  const toY = (v) => iH - (v / maxVal) * iH;
  const toH = (v) => (v / maxVal) * iH;

  const slotW = iW / data.length;
  const barW = Math.min(slotW * 0.65, 56);

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => (maxVal / yTickCount) * i);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VW} ${VH}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        <g transform={`translate(${M.left},${M.top})`}>
          {/* Grid + Y ticks */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={0} y1={toY(v)} x2={iW} y2={toY(v)} stroke="#e2e8f0" strokeDasharray="4 2" />
              <text
                x={-6} y={toY(v)}
                textAnchor="end" dominantBaseline="middle"
                fontSize={10} fill="#94a3b8"
              >
                {formatY ? formatY(v) : v}
              </text>
            </g>
          ))}

          {/* X axis baseline */}
          <line x1={0} y1={iH} x2={iW} y2={iH} stroke="#e2e8f0" />

          {/* Reference line */}
          {referenceLine && (
            <g>
              <line
                x1={0} y1={toY(referenceLine.value)}
                x2={iW} y2={toY(referenceLine.value)}
                stroke="#6366f1" strokeDasharray="5 5" strokeWidth={2}
              />
              {referenceLine.label && (
                <text
                  x={iW + 4} y={toY(referenceLine.value)}
                  dominantBaseline="middle"
                  fontSize={10} fill="#6366f1" fontWeight={600}
                >
                  {referenceLine.label}
                </text>
              )}
            </g>
          )}

          {/* Bars */}
          {data.map((d, i) => {
            const v = Number(d[yKey]) || 0;
            const bH = toH(v);
            const x = i * slotW + (slotW - barW) / 2;
            const y = toY(v);
            const fill = colorFn ? colorFn(d) : color;

            return (
              <g
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                <rect
                  x={x} y={y} width={barW} height={bH}
                  rx={4} ry={4}
                  fill={fill}
                  opacity={hovered !== null && hovered !== i ? 0.55 : 1}
                />
                <text
                  x={x + barW / 2} y={iH + 14}
                  textAnchor="middle" fontSize={10} fill="#94a3b8"
                >
                  {formatX ? formatX(d[xKey]) : d[xKey]}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Floating tooltip — outside SVG so it's never clipped */}
      {hovered !== null && (() => {
        const d = data[hovered];
        const content = formatTooltip ? formatTooltip(d) : (formatY ? formatY(Number(d[yKey])) : String(d[yKey]));
        // Approximate left% based on bar centre in viewBox
        const pct = (M.left + hovered * (iW / data.length) + (iW / data.length) / 2) / VW * 100;
        return (
          <div
            className="pointer-events-none absolute top-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-pre-line z-20 -translate-x-1/2"
            style={{ left: `${pct}%` }}
          >
            {content}
          </div>
        );
      })()}
    </div>
  );
}

/**
 * Stacked vertical bar chart (hours by dept).
 *
 * Props:
 *  data      - array of objects, one per period
 *  xKey      - key for x-axis label
 *  keys      - array of value keys to stack
 *  colors    - array of colors (parallel to keys)
 *  height    - pixel height
 *  formatX   - (value) => string
 *  formatY   - (value) => string
 *  formatTooltip - (row, total) => string
 *  legendLabels  - optional map key→label
 */
export function SvgStackedBarChart({
  data = [],
  xKey,
  keys = [],
  colors = [],
  height = 380,
  formatX,
  formatY,
  formatTooltip,
  legendLabels = {},
}) {
  const [hovered, setHovered] = useState(null);

  if (!data.length || !keys.length) return null;

  const VH = height;
  const legendH = 24;
  const iW = VW - M.left - M.right;
  const iH = VH - M.top - M.bottom - legendH;

  const totals = data.map(d => keys.reduce((s, k) => s + (Number(d[k]) || 0), 0));
  const maxVal = Math.max(...totals, 1) * 1.08;

  const toH = (v) => (v / maxVal) * iH;

  const slotW = iW / data.length;
  const barW = Math.min(slotW * 0.65, 48);

  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => (maxVal / yTickCount) * i);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block', overflow: 'visible' }}>
        <g transform={`translate(${M.left},${M.top})`}>
          {/* Grid + Y ticks */}
          {yTicks.map((v, i) => (
            <g key={i}>
              <line x1={0} y1={iH - toH(v)} x2={iW} y2={iH - toH(v)} stroke="#e2e8f0" strokeDasharray="4 2" />
              <text x={-6} y={iH - toH(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="#94a3b8">
                {formatY ? formatY(v) : v}
              </text>
            </g>
          ))}

          <line x1={0} y1={iH} x2={iW} y2={iH} stroke="#e2e8f0" />

          {/* Stacked bars */}
          {data.map((d, i) => {
            const x = i * slotW + (slotW - barW) / 2;
            let stackY = iH;

            return (
              <g
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                {keys.map((k, ki) => {
                  const v = Number(d[k]) || 0;
                  const segH = toH(v);
                  stackY -= segH;
                  return (
                    <rect
                      key={k}
                      x={x} y={stackY} width={barW} height={segH}
                      fill={colors[ki] || '#8B5CF6'}
                      rx={ki === keys.length - 1 ? 4 : 0}
                      opacity={hovered !== null && hovered !== i ? 0.55 : 1}
                    />
                  );
                })}
                <text x={x + barW / 2} y={iH + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
                  {formatX ? formatX(d[xKey]) : d[xKey]}
                </text>
              </g>
            );
          })}

          {/* Legend */}
          {keys.slice(0, 8).map((k, i) => (
            <g key={k} transform={`translate(${i * 90}, ${iH + 32})`}>
              <rect width={10} height={10} rx={2} fill={colors[i] || '#8B5CF6'} />
              <text x={14} y={9} fontSize={9} fill="#64748b">
                {legendLabels[k] || k}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const d = data[hovered];
        const total = totals[hovered];
        const content = formatTooltip ? formatTooltip(d, total) : `${formatY ? formatY(total) : total}`;
        const pct = (M.left + hovered * slotW + slotW / 2) / VW * 100;
        return (
          <div
            className="pointer-events-none absolute top-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-pre-line z-20 -translate-x-1/2"
            style={{ left: `${pct}%` }}
          >
            {content}
          </div>
        );
      })()}
    </div>
  );
}

/**
 * Horizontal bar chart (suppliers by cost).
 *
 * Props:
 *  data       - array of { [labelKey]: string, [valueKey]: number }
 *  labelKey   - key for bar labels (Y axis)
 *  valueKey   - key for bar values (X axis)
 *  height     - pixel height
 *  color      - bar fill color
 *  formatValue - (v) => string — tooltip + x-tick formatter
 */
export function SvgHBarChart({
  data = [],
  labelKey,
  valueKey,
  height = 288,
  color = '#16a34a',
  formatValue,
}) {
  const [hovered, setHovered] = useState(null);
  if (!data.length) return null;

  const HM = { top: 8, right: 80, bottom: 32, left: 140 };
  const VH = height;
  const iW = VW - HM.left - HM.right;
  const iH = VH - HM.top - HM.bottom;

  const vals = data.map(d => Number(d[valueKey]) || 0);
  const maxVal = Math.max(...vals, 1) * 1.05;

  const slotH = iH / data.length;
  const barH = Math.min(slotH * 0.6, 32);

  const xTickCount = 4;
  const xTicks = Array.from({ length: xTickCount + 1 }, (_, i) => (maxVal / xTickCount) * i);

  return (
    <div className="relative w-full" style={{ height }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} style={{ display: 'block', overflow: 'visible' }}>
        <g transform={`translate(${HM.left},${HM.top})`}>
          {/* X ticks + grid */}
          {xTicks.map((v, i) => {
            const x = (v / maxVal) * iW;
            return (
              <g key={i}>
                <line x1={x} y1={0} x2={x} y2={iH} stroke="#e2e8f0" strokeDasharray="4 2" />
                <text x={x} y={iH + 14} textAnchor="middle" fontSize={10} fill="#94a3b8">
                  {formatValue ? formatValue(v) : v}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const v = Number(d[valueKey]) || 0;
            const bW = (v / maxVal) * iW;
            const y = i * slotH + (slotH - barH) / 2;
            const label = String(d[labelKey] || '');

            return (
              <g
                key={i}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                <text
                  x={-6} y={y + barH / 2}
                  textAnchor="end" dominantBaseline="middle"
                  fontSize={11} fill="#334155"
                >
                  {label.length > 18 ? label.slice(0, 17) + '…' : label}
                </text>
                <rect
                  x={0} y={y} width={bW} height={barH}
                  rx={4} ry={4} fill={color}
                  opacity={hovered !== null && hovered !== i ? 0.55 : 1}
                />
                <text
                  x={bW + 4} y={y + barH / 2}
                  dominantBaseline="middle" fontSize={10} fill="#64748b"
                >
                  {formatValue ? formatValue(v) : v}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Tooltip */}
      {hovered !== null && (() => {
        const d = data[hovered];
        const v = Number(d[valueKey]) || 0;
        const pct = (HM.left + (v / maxVal) * iW / 2) / VW * 100;
        const topPct = (HM.top + hovered * slotH) / VH * 100;
        return (
          <div
            className="pointer-events-none absolute bg-slate-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl z-20 -translate-x-1/2"
            style={{ left: `${pct}%`, top: `${topPct}%` }}
          >
            {d[labelKey]}: {formatValue ? formatValue(v) : v}
          </div>
        );
      })()}
    </div>
  );
}
