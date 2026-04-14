/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('focuses cancel by default, confirms action, and supports Escape', async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen
        title="Supprimer"
        description="Confirmer suppression"
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Annuler' });
    const confirmButton = screen.getByRole('button', { name: 'Supprimer' });

    await waitFor(() => expect(cancelButton).toHaveFocus());

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
