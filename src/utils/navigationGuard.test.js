import { describe, expect, it } from 'vitest';
import { shouldBlockNavigation } from './navigationGuard';

describe('navigationGuard', () => {
  it('blocks navigation when unsaved state exists and force is false', () => {
    expect(shouldBlockNavigation({ force: false, hasBlockingUnsaved: true })).toBe(true);
  });

  it('does not block when force is true', () => {
    expect(shouldBlockNavigation({ force: true, hasBlockingUnsaved: true })).toBe(false);
  });

  it('does not block when there is no unsaved state', () => {
    expect(shouldBlockNavigation({ force: false, hasBlockingUnsaved: false })).toBe(false);
  });
});
