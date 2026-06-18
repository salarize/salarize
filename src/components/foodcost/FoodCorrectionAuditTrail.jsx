import React from 'react';

function FoodCorrectionAuditTrail({ corrections }) {
  if (!corrections?.length) {
    return <p className="text-slate-600 text-xs italic mt-2">Aucune modification enregistrée.</p>;
  }

  return (
    <div className="mt-2 space-y-1">
      {corrections.map(c => (
        <div key={c.id} className="flex items-start gap-2 text-xs py-1.5 border-b border-slate-800/40 last:border-0">
          <div className="flex-1 min-w-0">
            <span className="text-slate-400 font-semibold">{c.field_name}</span>
            <span className="text-slate-600 mx-1">·</span>
            <span className="text-red-400/70 line-through">{c.old_value ?? '—'}</span>
            <span className="text-slate-600 mx-1">→</span>
            <span className="text-green-400/80">{c.new_value ?? '—'}</span>
          </div>
          <div className="text-right flex-shrink-0 text-slate-600">
            <p>{c.edited_by ?? 'Inconnu'}</p>
            <p>{c.created_at ? new Date(c.created_at).toLocaleString('fr-BE', { dateStyle: 'short', timeStyle: 'short' }) : ''}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default FoodCorrectionAuditTrail;
