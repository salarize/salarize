import React from 'react';

// Spinner avec logo S - reutilisable
const LoadingSpinner = ({ size = 'md', text = '', subtext = '', fullScreen = false, light = false }) => {
  const sizes = {
    sm: { container: 'w-10 h-10', text: 'text-sm', border: 'border-2' },
    md: { container: 'w-16 h-16', text: 'text-xl', border: 'border-4' },
    lg: { container: 'w-20 h-20', text: 'text-2xl', border: 'border-4' }
  };

  const s = sizes[size];
  const bgColor = light ? 'bg-white' : 'bg-slate-950';
  const textColor = light ? 'text-slate-800' : 'text-white';
  const subtextColor = light ? 'text-slate-500' : 'text-slate-400';

  const spinner = (
    <div className="text-center">
      <div className={`${s.container} relative mx-auto ${text || subtext ? 'mb-4' : ''}`}>
        <div className={`${s.container} ${s.border} border-violet-500/30 rounded-full`}></div>
        <div className={`${s.container} ${s.border} border-violet-500 border-t-transparent rounded-full animate-spin absolute inset-0`}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${s.text} font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent`}>S</span>
        </div>
      </div>
      {text && <p className={`${textColor} text-base font-medium mb-1`}>{text}</p>}
      {subtext && <p className={`${subtextColor} text-sm`}>{subtext}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bgColor}`}>
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
