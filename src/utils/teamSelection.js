export const paginateItems = (items, pageIndex, pageSize) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safePageSize = Number(pageSize) > 0 ? Number(pageSize) : 10;
  const safePage = Number(pageIndex) >= 0 ? Number(pageIndex) : 0;
  const start = safePage * safePageSize;
  return safeItems.slice(start, start + safePageSize);
};

export const buildPageWindow = (currentPage, totalPages, windowSize = 5) => {
  const safeTotal = Math.max(0, Number(totalPages) || 0);
  if (safeTotal <= 1) return [];

  const safeWindow = Math.max(1, Number(windowSize) || 5);
  const safeCurrent = Math.min(Math.max(0, Number(currentPage) || 0), safeTotal - 1);

  const start = Math.max(0, safeCurrent - Math.floor(safeWindow / 2));
  const end = Math.min(safeTotal - 1, start + safeWindow - 1);
  const normalizedStart = Math.max(0, end - safeWindow + 1);

  return Array.from({ length: end - normalizedStart + 1 }, (_, index) => normalizedStart + index);
};

export const getSelectionState = (allNames, selectedSet) => {
  const safeNames = Array.isArray(allNames) ? allNames : [];
  const selected = selectedSet instanceof Set ? selectedSet : new Set();

  const selectedCount = safeNames.reduce((count, name) => count + (selected.has(name) ? 1 : 0), 0);
  const allSelected = safeNames.length > 0 && selectedCount === safeNames.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return {
    selectedCount,
    allSelected,
    someSelected,
  };
};

export const toggleSelectionForNames = (selectedSet, names, shouldSelect) => {
  const next = new Set(selectedSet instanceof Set ? selectedSet : []);
  const safeNames = Array.isArray(names) ? names : [];

  if (shouldSelect) {
    safeNames.forEach((name) => next.add(name));
  } else {
    safeNames.forEach((name) => next.delete(name));
  }

  return next;
};
