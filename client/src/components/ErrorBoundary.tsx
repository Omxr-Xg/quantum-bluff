import { Component, type ReactNode } from "react";
import { reportError } from "../utils/errorReporting";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    reportError(error, { boundary: "ErrorBoundary", componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-slate-900 text-white rounded-xl">
          <h2 className="text-xl font-bold text-red-400 mb-2">Une erreur s'est produite</h2>
          <pre className="text-sm text-left overflow-auto max-h-40 p-4 bg-slate-800 rounded-lg mb-4">
            {this.state.error.toString()}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium"
          >
            Réessayer
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
