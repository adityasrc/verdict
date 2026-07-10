import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Button } from "../components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("System fault caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface px-4">
          <div className="w-full max-w-lg">
            {/* Top accent bar */}
            <div className="w-full h-2 bg-error mb-0 border-[4px] border-on-surface border-b-0" />
            <div className="bg-surface border-[4px] border-on-surface border-t-0 brutal-shadow p-8 text-center">

              {/* Giant error number */}
              <p className="font-black text-[120px] leading-none tracking-tighter text-on-surface opacity-10 select-none">
                ERR
              </p>

              <h1 className="font-headline-md text-2xl font-black uppercase text-on-surface tracking-tighter -mt-4 mb-6">
                Execution Halted
              </h1>

              {/* Error message in terminal style */}
              <div className="bg-on-surface p-4 mb-8 text-left overflow-x-auto">
                <p className="font-label-mono text-sm text-error break-words">
                  &gt; {this.state.error?.message || "Critical system failure encountered."}
                </p>
              </div>

              <Button
                variant="brutal-error"
                size="lg"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <span className="material-symbols-outlined">refresh</span>
                Reinitialize Session
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;