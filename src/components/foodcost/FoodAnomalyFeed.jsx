import React from 'react';
import { exportAnomaliesToXlsx } from '../../utils/foodExport';

const ANOMALY_LABELS = {
  price_increase: 'Hausse de prix',
  unusual_quantity: 'Quantité inhabituelte',
  unknown_unit: 'Unité inconnue',
  missing_supplier: 'Fournisseur manquant',
};

const SEVERITY_STYLES = {
  high: { label: 'Haute', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  medium: { label: 'Moyenne', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  low: { label: 'Basse', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
};

function FoodAnomalyFeed({ anomalies, onResolve }) {
  if (!anomalies?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-white font-bold text-lg">Aucune anomalie</h3>
        <p className="text-slate-400 text-sm mt-2">Les anomalies apparaîtront ici après import et validation.</p>
      </div>
    );
  }

  const high = anomalies.filter(a => a.severity === 'high');
  const medium = anomalies.filter(a => a.severity === 'medium');
  const low = anomalies.filter(a => a.severity === 'low');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {high.length > 0 && <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20">{high.length} haute{high.length > 1 ? 's' : ''}</span>}
          {medium.length > 0 && <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">{medium.length} moyenne{medium.length > 1 ? 's' : ''}</span>}
          {low.length > 0 && <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full border border-blue-500/20">{low.length} basse{low.length > 1 ? 's' : ''}</span>}
        </div>
        <button
          onClick={() => exportAnomaliesToXlsx(anomalies)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs rounded-xl transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Exporter
        </button>
      </div>

      <div className="space-y-2">
        {[...high, ...medium, ...low].map(anomaly => {
          const sev = SEVERITY_STYLES[anomaly.severity] ?? SEVERITY_STYLES.low;
          return (
            <div key={anomaly.id} className={`flex items-start gap-4 p-4 bg-slate-800/30 border rounded-xl ${sev.color.split(' ').slice(2).join(' ')}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sev.color}`}>
                    {sev.label}
                  </span>
                  <span className="text-slate-400 text-xs">
                    {ANOMALY_LABELS[anomaly.anomaly_type] ?? anomaly.anomaly_type}
                  </span>
                  {anomaly.food_articles?.canonical_name && (
                    <span className="text-orange-300 text-xs">· {anomaly.food_articles.canonical_name}</span>
                  )}
                  {anomaly.food_suppliers?.name && (
                    <span className="text-slate-400 text-xs">· {anomaly.food_suppliers.name}</span>
                  )}
                </div>
                <p className="text-slate-300 text-sm">{anomaly.description}</p>
                {anomaly.value != null && (
                  <p className="text-slate-500 text-xs mt-1">
                    Valeur: {anomaly.value?.toFixed(4)} € · Seuil: {anomaly.threshold?.toFixed(4)} €
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => onResolve?.(anomaly.id, 'reviewed')}
                  className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Vu
                </button>
                <button
                  onClick={() => onResolve?.(anomaly.id, 'ignored')}
                  className="px-2 py-1 text-slate-500 hover:text-slate-300 text-xs transition-colors"
                >
                  Ignorer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FoodAnomalyFeed;
