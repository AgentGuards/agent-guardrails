"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-300">Something went wrong</p>
            <p className="mt-1 text-xs text-zinc-600">{this.state.error?.message}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="text-xs text-teal-400 hover:text-teal-300"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
