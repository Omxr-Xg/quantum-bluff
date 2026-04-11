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
      
      // Si on est en mode "Développement", on affiche le vrai message d'erreur
      const isDev = import.meta.env.DEV;

      return (
        <div className="fixed inset-0 z-[100000] flex flex-col items-center justify-center p-6 bg-slate-950 text-white">
          <div className="max-w-md w-full text-center p-8 bg-slate-900 border border-purple-500/30 rounded-2xl shadow-[0_0_40px_rgba(168,85,247,0.15)]">
            <h2 className="text-3xl mb-4">💥</h2>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Anomalie système</h2>
            
            <p className="text-sm text-slate-400 mb-6">
              Une erreur inattendue a perturbé l'interface. Pas de panique, vos jetons sont en sécurité sur le serveur.
            </p>

            {/* On cache le charabia technique aux joueurs, on ne le montre qu'à toi */}
            {isDev && (
              <pre className="text-xs text-left overflow-auto max-h-32 p-3 bg-slate-950/50 text-red-400 rounded-lg mb-6 border border-red-900/50">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              // Un VRAI rechargement qui nettoie la mémoire et relance l'application proprement
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 transition-colors rounded-xl font-semibold shadow-lg shadow-purple-600/20"
            >
              Relancer l'interface
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
