import { describe, expect, it } from 'vitest';
import {
  buildPageWindow,
  getSelectionState,
  paginateItems,
  toggleSelectionForNames,
} from './teamSelection';

describe('teamSelection', () => {
  it('paginates items with page size 10', () => {
    const items = Array.from({ length: 24 }, (_, index) => `emp-${index + 1}`);

    expect(paginateItems(items, 0, 10)).toHaveLength(10);
    expect(paginateItems(items, 1, 10)[0]).toBe('emp-11');
    expect(paginateItems(items, 2, 10)).toEqual(['emp-21', 'emp-22', 'emp-23', 'emp-24']);
  });

  it('toggles global selection across all filtered pages', () => {
    const allFilteredNames = Array.from({ length: 25 }, (_, index) => `employee-${index + 1}`);
    let selection = new Set(['outside-filter-user']);

    selection = toggleSelectionForNames(selection, allFilteredNames, true);
    expect(selection.has('outside-filter-user')).toBe(true);
    expect(allFilteredNames.every((name) => selection.has(name))).toBe(true);

    selection = toggleSelectionForNames(selection, allFilteredNames, false);
    expect(selection.has('outside-filter-user')).toBe(true);
    expect(allFilteredNames.some((name) => selection.has(name))).toBe(false);
  });

  it('computes tri-state checkbox state correctly', () => {
    const names = ['a', 'b', 'c', 'd'];

    expect(getSelectionState(names, new Set())).toMatchObject({
      selectedCount: 0,
      allSelected: false,
      someSelected: false,
    });

    expect(getSelectionState(names, new Set(['a', 'b']))).toMatchObject({
      selectedCount: 2,
      allSelected: false,
      someSelected: true,
    });

    expect(getSelectionState(names, new Set(['a', 'b', 'c', 'd']))).toMatchObject({
      selectedCount: 4,
      allSelected: true,
      someSelected: false,
    });
  });

  it('builds compact page windows around current page', () => {
    expect(buildPageWindow(0, 12, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(buildPageWindow(5, 12, 5)).toEqual([3, 4, 5, 6, 7]);
    expect(buildPageWindow(11, 12, 5)).toEqual([7, 8, 9, 10, 11]);
  });
});
