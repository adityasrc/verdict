import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
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
        <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
          <div className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-elevated p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-error-muted border border-error/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="h-6 w-6 text-error" />
              </div>

              <p className="font-semibold text-[72px] leading-none tracking-tight text-text-muted/20 select-none">
                ERR
              </p>

              <h1 className="text-heading-sm font-semibold text-text-primary tracking-tight -mt-2 mb-6">
                Execution Halted
              </h1>

              <div className="bg-canvas border border-border rounded-lg p-4 mb-8 text-left overflow-x-auto">
                <p className="font-mono text-mono-sm text-error break-words">
                  &gt; {this.state.error?.message || "Critical system failure encountered."}
                </p>
              </div>

              <Button
                variant="destructive"
                size="lg"
                className="w-full"
                onClick={() => window.location.reload()}
              >
                <RotateCcw className="h-4 w-4" />
                Reinitialize Session
              </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
