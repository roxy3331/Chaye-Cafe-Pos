import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  declare props: { children: React.ReactNode };
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-900">Kuch galat ho gaya</h2>
              <p className="text-slate-500 mt-2 text-sm">
                App mein error aaya. Data safe hai, sirf page refresh karo.
              </p>
              {this.state.error && (
                <p className="text-xs text-slate-400 mt-3 font-mono bg-slate-50 rounded-xl p-3 text-left break-all">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-900 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              Page Refresh Karo
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
