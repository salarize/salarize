import React from 'react';

// Page transition wrapper
function PageTransition({ children, className = '' }) {
  return (
    <div className="min-h-screen bg-white">
      <div className={`page-transition ${className}`}>
        {children}
      </div>
    </div>
  );
}

export default PageTransition;
