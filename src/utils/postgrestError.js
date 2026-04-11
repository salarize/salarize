const KNOWN_MISSING_SCHEMA_CODES = new Set(['PGRST202', 'PGRST205', '42P01', '42883']);

const toLower = (value) => String(value || '').toLowerCase();

const detectMissingSchema = (code, message, details, hint) => {
  if (KNOWN_MISSING_SCHEMA_CODES.has(code)) return true;
  const haystack = `${message} ${details} ${hint}`;
  return (
    haystack.includes('schema cache') ||
    haystack.includes('could not find the table') ||
    haystack.includes('could not find the function') ||
    haystack.includes('relation') && haystack.includes('does not exist') ||
    haystack.includes('undefined_table') ||
    haystack.includes('undefined_function')
  );
};

const detectPermissionError = (code, message, details, hint) => {
  if (code === '42501') return true;
  const haystack = `${message} ${details} ${hint}`;
  return haystack.includes('permission denied') || haystack.includes('row-level security');
};

export const normalizePostgrestError = (error, options = {}) => {
  if (!error) {
    return {
      code: null,
      message: '',
      details: '',
      hint: '',
      target: options.target || null,
      isMissingSchema: false,
      isPermissionError: false,
      raw: error,
    };
  }

  const code = String(error.code || '').toUpperCase() || null;
  const message = String(error.message || '');
  const details = String(error.details || '');
  const hint = String(error.hint || '');
  const target = options.target || null;

  const normalizedMessage = toLower(message);
  const normalizedDetails = toLower(details);
  const normalizedHint = toLower(hint);

  const isMissingSchema = detectMissingSchema(code, normalizedMessage, normalizedDetails, normalizedHint);
  const isPermissionError = detectPermissionError(code, normalizedMessage, normalizedDetails, normalizedHint);

  return {
    code,
    message,
    details,
    hint,
    target,
    isMissingSchema,
    isPermissionError,
    raw: error,
  };
};
