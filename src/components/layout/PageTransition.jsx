import React from 'react';

// Page transition wrapper - evite le flash blanc
function PageTransition({ children, className = '', dark = false }) {
  const bgColor = dark ? 'bg-slate-950' : 'bg-slate-50';
  return (
    <div className={`min-h-screen ${bgColor}`}>
      <div className={`page-transition ${className}`}>
        {children}
      </div>
    </div>
  );
}

export default PageTransition;
