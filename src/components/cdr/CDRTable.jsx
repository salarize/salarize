import React, { useState, useRef, useEffect } from 'react';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const STATUS_LABELS = { active: 'Actif', cancelled: 'Annulé', pending_cancel: 'À annuler' };
const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-slate-100 text-slate-400 line-through',
  pending_cancel: 'bg-amber-100 text-amber-700',
};
const STATUS_CYCLE = { active: 'pending_cancel', pending_cancel: 'cancelled', cancelled: 'active' };

function fmt(val) {
  if (!val && val !== 0) return '';
  return Number(val).toLocaleString('fr-BE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// Inline editable cell
function Cell({ value, onSave, disabled, highlight }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const start = () => {
    if (disabled) return;
    setDraft(value ? String(value) : '');
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const confirm = () => {
    setEditing(false);
    const num = parseFloat(draft.replace(',', '.')) || 0;
    if (num !== (value || 0)) onSave(num);
  };

  const bgClass = highlight === 'over' ? 'bg-red-50' : highlight === 'under' ? 'bg-emerald-50' : '';

  if (editing) {
    return (
      <td className="border-r border-slate-100 px-0">
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={confirm}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') setEditing(false); }}
          className="w-full px-2 py-1.5 text-right text-xs font-medium border-2 border-violet-400 rounded outline-none bg-violet-50"
          style={{ minWidth: 70 }}
        />
      </td>
    );
  }

  return (
    <td
      onClick={start}
      className={`border-r border-slate-100 px-2 py-2 text-right text-xs font-medium cursor-pointer hover:bg-violet-50 transition-colors ${bgClass} ${disabled ? 'cursor-default hover:bg-transparent' : ''} ${value ? 'text-slate-800' : 'text-slate-300'}`}
      style={{ minWidth: 70 }}
    >
      {value ? fmt(value) : disabled ? '' : <span className="opacity-0 group-hover:opacity-30">—</span>}
    </td>
  );
}

export default function CDRTable({ companyId, categories, entries, budget, viewMode, year, onUpsertEntry, onUpsertBudget, onUpdateCategoryStatus, isViewerOnly }) {
  const [collapsed, setCollapsed] = useState({});

  // Build lookup: entryAmount[categoryId][month] and budgetAmount[categoryId][month]
  const entryMap = {};
  entries.forEach(e => {
    if (e.year !== year) return;
    if (!entryMap[e.category_id]) entryMap[e.category_id] = {};
    entryMap[e.category_id][e.month] = (entryMap[e.category_id][e.month] || 0) + Number(e.amount);
  });
  const budgetMap = {};
  budget.forEach(b => {
    if (b.year !== year) return;
    if (!budgetMap[b.category_id]) budgetMap[b.category_id] = {};
    budgetMap[b.category_id][b.month] = Number(b.budget_amount);
  });

  // Group categories: parents + their children
  const parents = categories.filter(c => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (parentId) => categories.filter(c => c.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);

  // Month totals across all categories
  const monthTotals = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return categories.reduce((sum, cat) => {
      if (cat.parent_id) return sum; // only leaf? actually sum all leaves
      return sum;
    }, 0);
  });

  // Leaf sum per month
  const leaves = categories.filter(c => !categories.some(p => p.parent_id === c.id));
  const totalByMonth = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return leaves.reduce((sum, cat) => sum + (entryMap[cat.id]?.[m] || 0), 0);
  });
  const grandTotal = totalByMonth.reduce((a, b) => a + b, 0);

  const getValue = (catId, month) => {
    if (viewMode === 'budget') return budgetMap[catId]?.[month] || 0;
    return entryMap[catId]?.[month] || 0;
  };

  const getHighlight = (catId, month) => {
    if (viewMode !== 'ecart') return null;
    const real = entryMap[catId]?.[month] || 0;
    const bud = budgetMap[catId]?.[month] || 0;
    if (!bud) return null;
    return real > bud ? 'over' : 'under';
  };

  const handleSave = (catId, month) => (amount) => {
    if (viewMode === 'budget') {
      onUpsertBudget(companyId, catId, month, year, amount);
    } else {
      onUpsertEntry(companyId, catId, month, year, amount);
    }
  };

  const renderRow = (cat, isChild = false) => {
    const rowTotal = Array.from({ length: 12 }, (_, i) => getValue(cat.id, i + 1)).reduce((a, b) => a + b, 0);
    const isParent = categories.some(c => c.parent_id === cat.id);
    const isCollapsed = collapsed[cat.id];

    return (
      <React.Fragment key={cat.id}>
        <tr className={`group border-b border-slate-100 ${isParent ? 'bg-slate-50' : 'hover:bg-violet-50/30'} ${cat.status === 'cancelled' ? 'opacity-40' : ''}`}>
          {/* Category name */}
          <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 whitespace-nowrap" style={{ minWidth: 200 }}>
            <div className="flex items-center gap-1.5">
              {isParent && (
                <button onClick={() => setCollapsed(p => ({ ...p, [cat.id]: !p[cat.id] }))} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {isChild && <span className="w-3 h-3 flex-shrink-0" />}
              <span className={`${isParent ? 'font-semibold text-slate-800' : ''} ${isChild ? 'pl-2 text-slate-600' : ''}`}>{cat.name}</span>
              {/* Status badge */}
              {!isViewerOnly && (
                <button
                  onClick={() => onUpdateCategoryStatus(cat.id, STATUS_CYCLE[cat.status || 'active'])}
                  className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[cat.status || 'active']}`}
                >
                  {STATUS_LABELS[cat.status || 'active']}
                </button>
              )}
            </div>
          </td>

          {/* Month cells */}
          {Array.from({ length: 12 }, (_, i) => (
            <Cell
              key={i}
              value={getValue(cat.id, i + 1)}
              onSave={handleSave(cat.id, i + 1)}
              disabled={isViewerOnly || isParent}
              highlight={getHighlight(cat.id, i + 1)}
            />
          ))}

          {/* Row total */}
          <td className="px-3 py-2 text-right text-xs font-bold text-slate-800 bg-slate-50 border-l border-slate-200">
            {rowTotal ? fmt(rowTotal) : '—'} €
          </td>
        </tr>

        {/* Children */}
        {isParent && !isCollapsed && childrenOf(cat.id).map(child => renderRow(child, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-900 text-slate-300">
            <th className="sticky left-0 z-20 bg-slate-900 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-slate-700" style={{ minWidth: 200 }}>
              Catégorie
            </th>
            {MONTHS.map((m, i) => (
              <th key={i} className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider border-r border-slate-700 whitespace-nowrap" style={{ minWidth: 70 }}>
                {m}
              </th>
            ))}
            <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider bg-slate-800">
              TOTAL
            </th>
          </tr>
        </thead>
        <tbody>
          {parents.map(parent => renderRow(parent, false))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-900 text-white border-t-2 border-slate-700">
            <td className="sticky left-0 z-10 bg-slate-900 px-3 py-3 text-xs font-bold uppercase tracking-wider border-r border-slate-700">
              Total mensuel
            </td>
            {totalByMonth.map((t, i) => (
              <td key={i} className="px-2 py-3 text-right text-xs font-bold border-r border-slate-700">
                {t ? fmt(t) : '—'}
              </td>
            ))}
            <td className="px-3 py-3 text-right text-xs font-bold bg-slate-800">
              {grandTotal ? fmt(grandTotal) : '—'} €
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
