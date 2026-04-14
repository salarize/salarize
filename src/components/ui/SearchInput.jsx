import React from 'react';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher...',
  className = '',
  inputClassName = '',
  disabled = false
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
        </svg>
      </span>

      <input
        type="text"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 outline-none transition-colors focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-60 ${inputClassName}`}
      />

      {value ? (
        <button
          type="button"
          onClick={() => onChange?.({ target: { value: '' } })}
          className="absolute inset-y-0 right-2 flex items-center rounded p-1 text-slate-400 transition-colors hover:text-slate-600"
          aria-label="Effacer la recherche"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
