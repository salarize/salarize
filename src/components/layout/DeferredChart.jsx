import { useState, useEffect } from 'react';

/**
 * Defers chart rendering until after the initial mount.
 * Prevents recharts' ResizeObserver from firing during React's render phase,
 * which causes React error #426 (cannot update while rendering).
 */
function DeferredChart({ height, children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready) return <div style={{ height }} />;
  return children;
}

export default DeferredChart;
