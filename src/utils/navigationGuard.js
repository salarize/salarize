export function shouldBlockNavigation({ force = false, hasBlockingUnsaved = false }) {
  if (force) return false;
  return Boolean(hasBlockingUnsaved);
}
