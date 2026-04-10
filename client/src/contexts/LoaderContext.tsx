import { createContext, useState, useContext, ReactNode } from 'react';

// 1. On définit ce que notre cerveau sait faire
interface LoaderContextType {
  isLoading: boolean;
  message: string;
  showLoader: (msg?: string) => void;
  hideLoader: () => void;
}

const LoaderContext = createContext<LoaderContextType | undefined>(undefined);

// 2. On crée le composant Provider qui va envelopper l'application
export const LoaderProvider = ({ children }: { children: ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showLoader = (msg = 'Chargement en cours...') => {
    setMessage(msg);
    setIsLoading(true);
  };

  const hideLoader = () => {
    setIsLoading(false);
    setMessage('');
  };

  return (
    <LoaderContext.Provider value={{ isLoading, message, showLoader, hideLoader }}>
      {children}
      
      {/* 3. L'INTERFACE VISUELLE DU LOADER (Tailwind) */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm transition-opacity">
          {/* Le Spinner */}
          <div className="w-16 h-16 border-4 border-slate-700 border-t-purple-500 rounded-full animate-spin mb-4 shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
          {/* Le Message */}
          <p className="text-purple-300 text-lg font-medium animate-pulse tracking-wide">
            {message}
          </p>
        </div>
      )}
    </LoaderContext.Provider>
  );
};

// 4. Un Hook personnalisé pour l'utiliser facilement partout
export const useLoader = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader doit être utilisé à l\'intérieur d\'un LoaderProvider');
  }
  return context;
};