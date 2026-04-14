/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CSVPreview } from './CSVPreview';

describe('CSVPreview', () => {
  it('shows a compact preview with truncation hints', () => {
    const rows = [
      ['Nom', 'Dept', 'Fonction', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
      ['Alice', 'RH', 'Manager', '1', '2', '3', '4', '5', '6'],
      ['Bob', 'Finance', 'Controller', '7', '8', '9', '10', '11', '12'],
      ['Carla', 'IT', 'Dev', '', '', '', '', '', ''],
      ['Dan', 'Sales', 'Closer', '13', '14', '15', '16', '17', '18']
    ];

    render(<CSVPreview rows={rows} />);

    expect(screen.getByText('Apercu du fichier')).toBeInTheDocument();
    expect(screen.getByText('5 lignes | 9 colonnes')).toBeInTheDocument();
    expect(screen.getByText('Nom')).toBeInTheDocument();
    expect(screen.getByText('+1 lignes | +1 colonnes non affichees')).toBeInTheDocument();
  });
});
