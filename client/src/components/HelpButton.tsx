import { HelpCircle, X } from "lucide-react";
import { useState } from "react";

interface HelpSection {
  title: string;
  content: string;
}

interface HelpButtonProps {
  title: string;
  sections: HelpSection[];
}

export function HelpButton({ title, sections }: HelpButtonProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      {/* Bouton d'aide global - coin bas gauche */}
      <button
        onClick={() => setShowHelp(!showHelp)}
        className="fixed bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-full shadow-2xl border-2 border-indigo-400 flex items-center justify-center hover:scale-110 transition-all z-50"
        title="Aide"
      >
        <HelpCircle className="w-7 h-7" />
      </button>

      {/* Modal d'aide */}
      {showHelp && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" 
          onClick={() => setShowHelp(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-indigo-500 shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <HelpCircle className="w-8 h-8 text-indigo-400" />
                {title}
              </h2>
              <button 
                onClick={() => setShowHelp(false)} 
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-white">
              {sections.map((section, index) => (
                <section key={index}>
                  <h3 className="text-xl font-bold text-indigo-400 mb-2">{section.title}</h3>
                  <p className="text-gray-300">{section.content}</p>
                </section>
              ))}
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </>
  );
}