import React, { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../ui';
import { useDirtyContext } from '../../context/DirtyContext';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_LABELS = { active: 'Actif', cancelled: 'Annule', pending_cancel: 'A annuler' };
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

function Cell({ value, onSave, disabled, highlight, dirtyKey, setDirty, clearDirty }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef(null);

  const start = () => {
    if (disabled) return;
    setDraft(value || value === 0 ? String(value) : '');
    setEditing(true);
  };

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!editing) {
      clearDirty(dirtyKey);
      return;
    }
    const isDirty = draft !== String(value ?? '');
    if (isDirty) setDirty(dirtyKey, true);
    else clearDirty(dirtyKey);
  }, [editing, draft, value, dirtyKey, setDirty, clearDirty]);

  useEffect(() => {
    return () => clearDirty(dirtyKey);
  }, [dirtyKey, clearDirty]);

  const confirm = () => {
    setEditing(false);
    clearDirty(dirtyKey);
    const num = parseFloat(draft.replace(',', '.')) || 0;
    if (num !== (value || 0)) onSave(num);
  };

  const cancel = () => {
    setEditing(false);
    clearDirty(dirtyKey);
  };

  const bgClass = highlight === 'over' ? 'bg-red-50' : highlight === 'under' ? 'bg-emerald-50' : '';
  const isDirty = draft !== String(value ?? '');

  if (editing) {
    return (
      <td className="border-r border-slate-100 px-0 relative">
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={confirm}
          onKeyDown={(event) => {
            if (event.key === 'Enter') confirm();
            if (event.key === 'Escape') cancel();
          }}
          className="w-full px-2 py-1.5 text-right text-xs font-medium border-2 border-violet-400 rounded outline-none bg-violet-50"
          style={{ minWidth: 70 }}
        />
        {isDirty && (
          <span
            className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white z-10 pointer-events-none"
            title="Modification non confirmee - Entree pour valider, Echap pour annuler"
          />
        )}
      </td>
    );
  }

  return (
    <td
      onClick={start}
      className={`border-r border-slate-100 px-2 py-2 text-right text-xs font-medium cursor-pointer hover:bg-violet-50 transition-colors ${bgClass} ${disabled ? 'cursor-default hover:bg-transparent' : ''} ${value ? 'text-slate-800' : 'text-slate-300'}`}
      style={{ minWidth: 70 }}
    >
      {value ? fmt(value) : disabled ? '' : <span className="opacity-0 group-hover:opacity-30">-</span>}
    </td>
  );
}

export default function CDRTable({
  companyId,
  categories,
  entries,
  budget,
  viewMode,
  year,
  onUpsertEntry,
  onUpsertBudget,
  onUpdateCategoryStatus,
  onDeleteCategory,
  isViewerOnly,
}) {
  const [collapsed, setCollapsed] = useState({});
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState(null);
  const { setDirty, clearDirty } = useDirtyContext();

  const entryMap = {};
  entries.forEach((entry) => {
    if (entry.year !== year) return;
    if (!entryMap[entry.category_id]) entryMap[entry.category_id] = {};
    entryMap[entry.category_id][entry.month] = (entryMap[entry.category_id][entry.month] || 0) + Number(entry.amount);
  });

  const budgetMap = {};
  budget.forEach((row) => {
    if (row.year !== year) return;
    if (!budgetMap[row.category_id]) budgetMap[row.category_id] = {};
    budgetMap[row.category_id][row.month] = Number(row.budget_amount);
  });

  const parents = categories.filter((category) => !category.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const childrenOf = (parentId) => categories.filter((category) => category.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);

  const leaves = categories.filter((category) => !categories.some((parent) => parent.parent_id === category.id));
  const totalByMonth = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return leaves.reduce((sum, category) => sum + (entryMap[category.id]?.[month] || 0), 0);
  });
  const grandTotal = totalByMonth.reduce((a, b) => a + b, 0);

  const getValue = (categoryId, month) => {
    if (viewMode === 'budget') return budgetMap[categoryId]?.[month] || 0;
    return entryMap[categoryId]?.[month] || 0;
  };

  const getHighlight = (categoryId, month) => {
    if (viewMode !== 'ecart') return null;
    const real = entryMap[categoryId]?.[month] || 0;
    const bud = budgetMap[categoryId]?.[month] || 0;
    if (!bud) return null;
    return real > bud ? 'over' : 'under';
  };

  const handleSave = (categoryId, month) => (amount) => {
    if (viewMode === 'budget') {
      onUpsertBudget(companyId, categoryId, month, year, amount);
      return;
    }
    onUpsertEntry(companyId, categoryId, month, year, amount);
  };

  const confirmDeleteCategory = async () => {
    if (!pendingDeleteCategory || !onDeleteCategory) return;
    await onDeleteCategory(pendingDeleteCategory.id);
    setPendingDeleteCategory(null);
  };

  const renderRow = (category, isChild = false) => {
    const rowTotal = Array.from({ length: 12 }, (_, index) => getValue(category.id, index + 1)).reduce((a, b) => a + b, 0);
    const isParent = categories.some((child) => child.parent_id === category.id);
    const isCollapsed = collapsed[category.id];

    return (
      <React.Fragment key={category.id}>
        <tr className={`group border-b border-slate-100 ${isParent ? 'bg-slate-50' : 'hover:bg-violet-50/30'} ${category.status === 'cancelled' ? 'opacity-40' : ''}`}>
          <td className="sticky left-0 z-10 bg-inherit border-r border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 whitespace-nowrap" style={{ minWidth: 200 }}>
            <div className="flex items-center gap-1.5">
              {isParent && (
                <button onClick={() => setCollapsed((prev) => ({ ...prev, [category.id]: !prev[category.id] }))} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className={`w-3 h-3 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
              {isChild && <span className="w-3 h-3 flex-shrink-0" />}
              <span className={`${isParent ? 'font-semibold text-slate-800' : ''} ${isChild ? 'pl-2 text-slate-600' : ''}`}>{category.name}</span>

              {!isViewerOnly && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    onClick={() => onUpdateCategoryStatus(category.id, STATUS_CYCLE[category.status || 'active'])}
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 ${STATUS_COLORS[category.status || 'active']}`}
                  >
                    {STATUS_LABELS[category.status || 'active']}
                  </button>
                  {onDeleteCategory && (
                    <button
                      onClick={() => setPendingDeleteCategory(category)}
                      className="p-1 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Supprimer cette categorie"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </td>

          {Array.from({ length: 12 }, (_, index) => (
            <Cell
              key={index}
              value={getValue(category.id, index + 1)}
              onSave={handleSave(category.id, index + 1)}
              disabled={isViewerOnly || isParent}
              highlight={getHighlight(category.id, index + 1)}
              dirtyKey={`cdr-cell-${category.id}-${year}-${index + 1}`}
              setDirty={setDirty}
              clearDirty={clearDirty}
            />
          ))}

          <td className="px-3 py-2 text-right text-xs font-bold text-slate-800 bg-slate-50 border-l border-slate-200">
            {rowTotal ? fmt(rowTotal) : '-'} EUR
          </td>
        </tr>

        {isParent && !isCollapsed && childrenOf(category.id).map((child) => renderRow(child, true))}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-900 text-slate-300">
              <th className="sticky left-0 z-20 bg-slate-900 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider border-r border-slate-700" style={{ minWidth: 200 }}>
                Categorie
              </th>
              {MONTHS.map((month, index) => (
                <th key={index} className="px-2 py-3 text-right text-xs font-semibold uppercase tracking-wider border-r border-slate-700 whitespace-nowrap" style={{ minWidth: 70 }}>
                  {month}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider bg-slate-800">TOTAL</th>
            </tr>
          </thead>
          <tbody>{parents.map((parent) => renderRow(parent, false))}</tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white border-t-2 border-slate-700">
              <td className="sticky left-0 z-10 bg-slate-900 px-3 py-3 text-xs font-bold uppercase tracking-wider border-r border-slate-700">
                Total mensuel
              </td>
              {totalByMonth.map((total, index) => (
                <td key={index} className="px-2 py-3 text-right text-xs font-bold border-r border-slate-700">
                  {total ? fmt(total) : '-'}
                </td>
              ))}
              <td className="px-3 py-3 text-right text-xs font-bold bg-slate-800">{grandTotal ? fmt(grandTotal) : '-'} EUR</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDeleteCategory)}
        tone="danger"
        title="Supprimer cette categorie CDR ?"
        description={`Categorie: ${pendingDeleteCategory?.name || ''}`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onCancel={() => setPendingDeleteCategory(null)}
        onConfirm={confirmDeleteCategory}
      >
        <p className="text-xs text-slate-500">
          Les lignes liees a cette categorie seront supprimees ou dissociees selon la configuration de la base.
        </p>
      </ConfirmDialog>
    </>
  );
}
