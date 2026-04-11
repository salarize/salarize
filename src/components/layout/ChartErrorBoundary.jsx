import React from 'react';

/**
 * Silent error boundary for recharts components.
 * Catches rendering crashes (React #426, ResizeObserver races, NaN data)
 * without bringing down the entire app.
 */
class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn('[Salarize] Chart rendering error (caught):', error?.message);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center w-full h-full min-h-[120px] text-slate-400 text-sm">
          Graphique indisponible
        </div>
      );
    }
    return this.props.children;
  }
}

export default ChartErrorBoundary;
