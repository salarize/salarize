export const normalizeEmail = (value) => (value || '').trim().toLowerCase();

export const canonicalizeInvitationEmail = (value) => {
  const normalized = normalizeEmail(value);
  if (!normalized.includes('@')) return normalized;

  const [localRaw, domainRaw] = normalized.split('@');
  const domain = domainRaw.toLowerCase();

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const local = localRaw.split('+')[0].replace(/\./g, '');
    return `${local}@gmail.com`;
  }

  return normalized;
};

export const buildEmailCandidates = (value) => {
  const normalized = normalizeEmail(value);
  if (!normalized.includes('@')) return [];

  const [localRaw, domainRaw] = normalized.split('@');
  const domain = domainRaw.toLowerCase();
  const candidates = new Set([normalized]);

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const local = localRaw.split('+')[0];
    const compact = local.replace(/\./g, '');
    candidates.add(`${local}@gmail.com`);
    candidates.add(`${local}@googlemail.com`);
    candidates.add(`${compact}@gmail.com`);
    candidates.add(`${compact}@googlemail.com`);
  }

  return [...candidates];
};
