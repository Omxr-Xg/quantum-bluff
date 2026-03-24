import { Eye, Bell, X, Palette, Volume2, ChevronDown } from "lucide-react";
import { useAccessibility } from "../contexts/AccessibilityContext";

interface AccessibilityMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilityMenu({ isOpen, onClose }: AccessibilityMenuProps) {
  const {
    highContrast,
    toggleHighContrast,
    visualAlerts,
    toggleVisualAlerts,
    colorblindMode,
    toggleColorblindMode,
    // NOUVEAU : On récupère le type et le setter
    colorblindType,
    setColorblindType,
  } = useAccessibility();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center shadow-lg">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Accessibilité</h2>
              <p className="text-gray-400 text-sm">Options pour tous les joueurs</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6 space-y-6">

          {/* High contrast */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Contraste Élevé</h3>
                  <p className="text-gray-400 text-sm">Pour les personnes malvoyantes</p>
                </div>
              </div>
              <button
                onClick={toggleHighContrast}
                className={`relative w-16 h-8 rounded-full transition-all ${
                  highContrast ? "bg-green-600" : "bg-slate-600"
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    highContrast ? "translate-x-8" : ""
                  }`}
                />
              </button>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Active des couleurs plus contrastées et des bordures plus épaisses pour faciliter la lecture.
            </p>
          </div>

          {/* Visual alerts */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Alertes Visuelles</h3>
                  <p className="text-gray-400 text-sm">Pour les personnes malentendantes</p>
                </div>
              </div>
              <button
                onClick={toggleVisualAlerts}
                className={`relative w-16 h-8 rounded-full transition-all ${
                  visualAlerts ? "bg-green-600" : "bg-slate-600"
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    visualAlerts ? "translate-x-8" : ""
                  }`}
                />
              </button>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Remplace les sons par des flashs visuels et des vibrations.
            </p>
          </div>

          {/* Colorblind Mode & Dropdown */}
          <div className={`rounded-xl p-6 border transition-all ${colorblindMode ? 'bg-slate-800 border-slate-600' : 'bg-slate-800/50 border-slate-700'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Mode Daltonien</h3>
                  <p className="text-gray-400 text-sm">Ajuste les couleurs et ajoute des textures</p>
                </div>
              </div>
              <button
                onClick={toggleColorblindMode}
                className={`relative w-16 h-8 rounded-full transition-all ${
                  colorblindMode ? "bg-green-600" : "bg-slate-600"
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                    colorblindMode ? "translate-x-8" : ""
                  }`}
                />
              </button>
            </div>

            {/* NOUVEAU : Menu déroulant qui apparaît si le mode est actif */}
            {colorblindMode && (
              <div className="mt-6 pt-5 border-t border-slate-700 animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sélectionnez votre type de daltonisme :
                </label>
                <div className="relative">
                  <select
                    value={colorblindType || "protanopia"}
                    onChange={(e) => setColorblindType && setColorblindType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg px-4 py-3 appearance-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all cursor-pointer"
                  >
                    <option value="protanopia">Protanopie (Difficulté avec le Rouge)</option>
                    <option value="deuteranopia">Deutéranopie (Difficulté avec le Vert)</option>
                    <option value="tritanopia">Tritanopie (Difficulté avec le Bleu)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-green-400 font-semibold mb-1">Information</h4>
                <p className="text-gray-300 text-sm">
                  Ces paramètres sont sauvegardés automatiquement.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}