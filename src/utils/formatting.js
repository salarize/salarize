// Number formatting utilities

export const formatCurrency = (value, decimals = 2) => {
  if (value == null || isNaN(value)) return '€0';
  return `€${value.toLocaleString('fr-BE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

export const formatPercent = (value, decimals = 1) => {
  if (value == null || isNaN(value)) return '0%';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatNumber = (value) => {
  if (value == null || isNaN(value)) return '0';
  return value.toLocaleString('fr-BE');
};

// Helper pour formater les periodes (2024-03 -> Mars 2024)
export const formatPeriod = (period) => {
  if (!period || period === 'Unknown') return period;
  const [year, month] = period.split('-');
  const months = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  const monthIndex = parseInt(month, 10) - 1;
  if (monthIndex >= 0 && monthIndex < 12) {
    return `${months[monthIndex]} ${year}`;
  }
  return period;
};
