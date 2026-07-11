'use client';

import React, { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[CanvasErrorBoundary] Caught rendering error:', error);
    console.error('[CanvasErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#f7f7f8]">
          <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
            {/* Warning icon */}
            <div className="w-14 h-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
              <AlertTriangle size={24} className="text-red-400" />
            </div>

            {/* Message */}
            <div className="flex flex-col items-center gap-1">
              <h3 className="text-sm font-semibold text-[#1a1a1c]">
                Canvas Render Error
              </h3>
              <p className="text-xs text-[#6b6b70] leading-relaxed">
                The 3D renderer encountered an error. This usually happens when
                WebGL is not supported or a model file is corrupted.
              </p>
            </div>

            {/* Error detail */}
            {this.state.error && (
              <details className="w-full">
                <summary className="text-[10px] text-[#6b6b70] cursor-pointer hover:text-[#1a1a1c] transition-colors">
                  Error details
                </summary>
                <pre className="mt-2 p-2 bg-[#f0f0f2] rounded text-[10px] text-[#6b6b70] font-mono text-left overflow-auto max-h-[120px] whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-[#3b82f6] text-white rounded-lg hover:bg-[#2563eb] transition-colors shadow-sm"
              >
                <RefreshCw size={12} />
                Retry Render
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
