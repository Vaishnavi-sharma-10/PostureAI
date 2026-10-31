import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('[ErrorBoundary] Caught component execution error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-[#161b2a] border border-[#ff6b6b]/40 shadow-2xl max-w-lg mx-auto my-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#ff6b6b]/15 text-[#ff6b6b] flex items-center justify-center mx-auto border border-[#ff6b6b]/30">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold font-telemetry text-white">
              {this.props.fallbackTitle || 'Component Encountered An Issue'}
            </h3>
            <p className="text-xs text-[#949eb5] leading-relaxed">
              {this.props.fallbackMessage ||
                'The view caught an unexpected event, but the rest of the application remains fully functional.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00e5ff] text-[#0e1321] text-xs font-bold font-telemetry hover:bg-[#c3f5ff] transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Reloading Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
