import { reportError, reportWebVital } from './client';

let monitoringInitialized = false;

const setupGlobalErrorMonitoring = () => {
  if (typeof window === 'undefined') return;
  if (window.__salarizeErrorMonitoringInstalled) return;

  window.__salarizeErrorMonitoringInstalled = true;

  window.addEventListener('error', (event) => {
    if (event?.error) {
      reportError(event.error, { source: 'window.error' });
    } else {
      reportError(new Error(event?.message || 'Window error'), {
        source: 'window.error',
        file: event?.filename,
        line: event?.lineno,
        column: event?.colno,
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    if (reason instanceof Error) {
      reportError(reason, { source: 'unhandledrejection' });
    } else {
      reportError(new Error(typeof reason === 'string' ? reason : 'Unhandled promise rejection'), {
        source: 'unhandledrejection',
        reason,
      });
    }
  });
};

const setupWebVitalsMonitoring = async () => {
  try {
    const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
    onCLS(reportWebVital);
    onFCP(reportWebVital);
    onINP(reportWebVital);
    onLCP(reportWebVital);
    onTTFB(reportWebVital);
  } catch (error) {
    reportError(error, { source: 'web-vitals-init' });
  }
};

export const initMonitoring = () => {
  if (monitoringInitialized) return;
  monitoringInitialized = true;

  setupGlobalErrorMonitoring();
  setupWebVitalsMonitoring();
};

export { reportError };
