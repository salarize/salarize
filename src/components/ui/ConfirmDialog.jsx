import React, { useEffect, useRef } from 'react';

const TONE_STYLES = {
  danger: {
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    confirm: 'bg-red-600 hover:bg-red-700 text-white',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-700',
    confirm: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  neutral: {
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-600',
    confirm: 'bg-slate-800 hover:bg-slate-900 text-white',
  },
};

export function ConfirmDialog({
  isOpen,
  title = 'Confirmer',
  description = '',
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  tone = 'danger',
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}) {
  const cancelRef = useRef(null);
  const styles = TONE_STYLES[tone] || TONE_STYLES.danger;

  useEffect(() => {
    if (!isOpen) return undefined;

    const focusTimer = setTimeout(() => {
      cancelRef.current?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel?.();
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${styles.iconBg}`}>
              <svg className={`w-5 h-5 ${styles.iconText}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
            </div>
          </div>

          {children ? <div className="mt-3">{children}</div> : null}
        </div>

        <div className="px-5 pb-5 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-3.5 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`px-3.5 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirm}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
