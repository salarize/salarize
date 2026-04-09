const MONITORING_ENDPOINT = import.meta.env.VITE_MONITORING_ENDPOINT || '';
const MONITORING_APP = import.meta.env.VITE_MONITORING_APP || 'salarize-web';
const MONITORING_DEBUG = import.meta.env.VITE_MONITORING_DEBUG === 'true';

const safeLog = (...args) => {
  if (MONITORING_DEBUG) {
    console.log('[Monitoring]', ...args);
  }
};

const canSend = () => Boolean(MONITORING_ENDPOINT);

export const sendMonitoringEvent = (type, payload = {}) => {
  if (!canSend()) return;

  const body = JSON.stringify({
    type,
    app: MONITORING_APP,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    timestamp: new Date().toISOString(),
    payload,
  });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(MONITORING_ENDPOINT, blob);
      safeLog('sendBeacon', type, sent ? 'ok' : 'failed');
      if (sent) return;
    }

    fetch(MONITORING_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch((err) => safeLog('fetch failed', err));
  } catch (err) {
    safeLog('transport exception', err);
  }
};

export const reportError = (error, context = {}) => {
  const err = error instanceof Error ? error : new Error(String(error || 'Unknown error'));
  sendMonitoringEvent('error', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    context,
  });
};

export const reportWebVital = (metric) => {
  if (!metric) return;
  sendMonitoringEvent('web-vital', {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || null,
  });
};
