import { describe, expect, it } from 'vitest';
import { filterPayrollEmployees, normalizeSearchToken } from './payrollSearch';

describe('payrollSearch', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalizeSearchToken('  Dév. Équipe / RH  ')).toBe('dev equipe rh');
  });

  it('filters by name, department, and function (accent-insensitive)', () => {
    const rows = [
      { name: 'Élodie Martin', dept: 'Achats', function: 'Responsable' },
      { name: 'Nabil Dupont', dept: 'Finance', function: 'Contrôleur de gestion' },
      { name: 'Sofia Leroy', dept: 'RH', function: 'People Ops' }
    ];

    expect(filterPayrollEmployees(rows, 'elodie')).toHaveLength(1);
    expect(filterPayrollEmployees(rows, 'controleur')).toHaveLength(1);
    expect(filterPayrollEmployees(rows, 'ACHATS')).toHaveLength(1);
    expect(filterPayrollEmployees(rows, 'inconnu')).toHaveLength(0);
  });
});
