import { useState } from "react";
import { Eye, Bell, X, Palette, Volume2 } from "lucide-react";
import { useAccessibility } from "../contexts/AccessibilityContext";

interface AccessibilityMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccessibilityMenu({ isOpen, onClose }: AccessibilityMenuProps) {
  const { highContrast, toggleHighContrast, visualAlerts, toggleVisualAlerts, colorblindMode, toggleColorblindMode } = useAccessibility();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center">
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
                ></div>
              </button>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Active des couleurs plus contrastées et des bordures plus épaisses pour faciliter la lecture et la navigation.
            </p>
          </div>

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
                ></div>
              </button>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Remplace les sons par des flashs visuels et des vibrations. Les notifications importantes clignotent à l'écran.
            </p>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Mode Déficient Visuel</h3>
                  <p className="text-gray-400 text-sm">Pour les personnes daltoniennes</p>
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
                ></div>
              </button>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-3">
              Ajoute des formes géométriques distinctes à côté des symboles des cartes pour différencier les couleurs sans dépendre uniquement de la perception des couleurs.
            </p>
            <div className="bg-slate-700/50 rounded-lg p-3 text-xs text-gray-300 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold">♥ Cœur:</span>
                <span>Cercle plein (●)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold">♦ Carreau:</span>
                <span>Losange plein (◆)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-bold bg-gray-200 px-1 rounded">♣ Trèfle:</span>
                <span>Carré plein (■)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-900 font-bold bg-gray-200 px-1 rounded">♠ Pique:</span>
                <span>Triangle (▲)</span>
              </div>
            </div>
          </div>

          <div className="bg-green-600/10 border border-green-600/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="text-green-400 font-semibold mb-1">Information</h4>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Ces paramètres sont sauvegardés automatiquement et s'appliquent à toutes vos sessions de jeu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}