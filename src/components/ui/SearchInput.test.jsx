/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  it('forwards typed value and clears value with clear button', () => {
    const onChange = vi.fn();

    render(
      <SearchInput
        value="Dupont"
        onChange={onChange}
        placeholder="Rechercher employe"
      />
    );

    const input = screen.getByPlaceholderText('Rechercher employe');
    fireEvent.change(input, { target: { value: 'Durand' } });
    expect(onChange).toHaveBeenCalledTimes(1);

    const clearButton = screen.getByRole('button', { name: 'Effacer la recherche' });
    fireEvent.click(clearButton);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ target: expect.objectContaining({ value: '' }) }));
  });
});
