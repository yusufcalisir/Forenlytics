"use client";

import React, { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  moduleName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[Forenlytics] ${this.props.moduleName || "Module"} crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="bg-brand-panel border border-red-500/20 rounded-xl p-8 max-w-md text-center">
            <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-lg mb-2">Module Error</h3>
            <p className="text-neutral-400 text-sm mb-6">
              {this.props.moduleName || "This module"} encountered an unexpected error and could not render.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-2 bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan rounded-md text-sm hover:bg-brand-cyan/20 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
