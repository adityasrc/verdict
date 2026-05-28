import { AlertTriangle, RefreshCw } from "lucide-react";
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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#030712] p-4 transition-colors duration-300">
          <div className="bg-white dark:bg-[#09090b] p-8 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-xl max-w-md w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
              Execution Halted
            </h1>
            
            <div className="bg-gray-50 dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-800 mb-8 text-left overflow-x-auto">
              <p className="text-sm font-mono text-red-600 dark:text-red-400 break-words">
                {this.state.error?.message || "Critical system failure encountered."}
              </p>
            </div>
            
            <Button
              variant="default"
              className="w-full gap-2"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4" />
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