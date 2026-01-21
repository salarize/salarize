import React from 'react';

// Empty State Component
const EmptyState = React.memo(({
  icon,
  title,
  description,
  action,
  variant = 'default', // 'default', 'compact', 'large'
  illustration = null, // SVG illustration optionnelle
  tips = [] // Conseils optionnels
}) => {
  const sizes = {
    default: 'py-12',
    compact: 'py-6',
    large: 'py-16',
  };

  const iconSizes = {
    default: 'w-16 h-16',
    compact: 'w-12 h-12',
    large: 'w-20 h-20',
  };

  return (
    <div className={`text-center ${sizes[variant]}`}>
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : icon ? (
        <div className={`${iconSizes[variant]} bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm`}>
          {icon}
        </div>
      ) : null}
      <h3 className={`font-semibold text-slate-800 mb-2 ${variant === 'large' ? 'text-xl' : 'text-lg'}`}>
        {title}
      </h3>
      {description && (
        <p className="text-slate-500 mb-4 max-w-sm mx-auto leading-relaxed">{description}</p>
      )}
      {tips.length > 0 && (
        <div className="mb-4 text-left max-w-sm mx-auto">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Conseils</p>
          <ul className="text-sm text-slate-500 space-y-1">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-violet-400 mt-0.5">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
      {action}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
