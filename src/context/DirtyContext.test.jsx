/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { DirtyProvider, useDirtyContext } from './DirtyContext';

function DirtyConsumer() {
  const { hasDirty, dirtyCount, setDirty, clearDirty, clearAllDirty } = useDirtyContext();

  return (
    <div>
      <span data-testid="status">{hasDirty ? 'dirty' : 'clean'}</span>
      <span data-testid="count">{dirtyCount}</span>
      <button onClick={() => setDirty('cdr-cell-1', true)}>set-dirty</button>
      <button onClick={() => clearDirty('cdr-cell-1')}>clear-dirty</button>
      <button onClick={() => clearAllDirty()}>clear-all</button>
    </div>
  );
}

describe('DirtyContext', () => {
  it('tracks dirty keys and clears them', () => {
    render(
      <DirtyProvider>
        <DirtyConsumer />
      </DirtyProvider>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('clean');
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('set-dirty'));
    expect(screen.getByTestId('status')).toHaveTextContent('dirty');
    expect(screen.getByTestId('count')).toHaveTextContent('1');

    fireEvent.click(screen.getByText('clear-dirty'));
    expect(screen.getByTestId('status')).toHaveTextContent('clean');
    expect(screen.getByTestId('count')).toHaveTextContent('0');

    fireEvent.click(screen.getByText('set-dirty'));
    fireEvent.click(screen.getByText('clear-all'));
    expect(screen.getByTestId('status')).toHaveTextContent('clean');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });
});
