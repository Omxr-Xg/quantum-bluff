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
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-[#020716]/92 backdrop-blur-md transition-opacity">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_35%,rgba(37,99,235,0.22),transparent_60%),linear-gradient(165deg,#020716_0%,#061326_48%,#02040c_100%)]" />
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-blue-200/15 bg-white/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_34px_rgba(59,130,246,0.20)]">
            <div className="absolute h-16 w-16 rounded-full border border-blue-200/15" />
            <div className="h-14 w-14 rounded-full border-2 border-blue-950 border-t-cyan-200 border-r-blue-300 animate-spin" />
          </div>
          <p className="relative text-blue-100 text-lg font-medium animate-pulse tracking-wide">
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
