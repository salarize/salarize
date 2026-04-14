import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const DirtyContext = createContext(null);

export function DirtyProvider({ children }) {
  const [dirtyMap, setDirtyMap] = useState({});

  const setDirty = useCallback((key, isDirty = true) => {
    if (!key) return;
    setDirtyMap((prev) => {
      if (isDirty) {
        if (prev[key]) return prev;
        return { ...prev, [key]: true };
      }
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearDirty = useCallback((key) => {
    if (!key) return;
    setDirtyMap((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const clearAllDirty = useCallback(() => {
    setDirtyMap({});
  }, []);

  const value = useMemo(() => {
    const dirtyKeys = Object.keys(dirtyMap);
    return {
      dirtyMap,
      dirtyKeys,
      dirtyCount: dirtyKeys.length,
      hasDirty: dirtyKeys.length > 0,
      setDirty,
      clearDirty,
      clearAllDirty,
    };
  }, [dirtyMap, setDirty, clearDirty, clearAllDirty]);

  return <DirtyContext.Provider value={value}>{children}</DirtyContext.Provider>;
}

export function useDirtyContext() {
  const ctx = useContext(DirtyContext);
  if (ctx) return ctx;
  return {
    dirtyMap: {},
    dirtyKeys: [],
    dirtyCount: 0,
    hasDirty: false,
    setDirty: () => {},
    clearDirty: () => {},
    clearAllDirty: () => {},
  };
}
