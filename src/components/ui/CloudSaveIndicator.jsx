import React from 'react';

// status: 'idle' | 'saving' | 'saved' | 'error'
export function CloudSaveIndicator({ status }) {
  if (status === 'idle') return null;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-medium transition-all duration-300 ${
        status === 'saving'
          ? 'text-slate-400'
          : status === 'saved'
            ? 'text-emerald-500'
            : 'text-red-400'
      }`}
    >
      {status === 'saving' && (
        <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
      )}
      {status === 'saved' && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.5"
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4" />
        </svg>
      )}
      {status === 'error' && (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
      <span>
        {status === 'saving' ? 'Sauvegarde...' : status === 'saved' ? 'Sauvegarde' : 'Erreur de sauvegarde'}
      </span>
    </div>
  );
}

