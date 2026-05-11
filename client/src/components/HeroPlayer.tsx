import { SuitLucideIcon } from "./suitLucide";

interface Card {
  suit: string;
  value: string;
}

interface HeroPlayerProps {
  name: string;
  chips: number;
  cards: Card[];
  colorblindMode?: boolean; // Mode daltonien
}

export function HeroPlayer({ name, chips, cards, colorblindMode = false }: HeroPlayerProps) {
  const getSuitColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
  };

  // Mode daltonien : formes/motifs différents au lieu de seulement couleur
  const getSuitShape = (suit: string) => {
    if (!colorblindMode) return null;
    
    const shapes: { [key: string]: string } = {
      hearts: '●',     // Cercle plein pour Cœur
      diamonds: '◆',   // Losange plein pour Carreau
      clubs: '■',      // Carré plein pour Trèfle
      spades: '▲',     // Triangle pour Pique
    };
    return shapes[suit] || '';
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
      {/* Cartes privées du héros (plus grandes) */}
      <div className="flex gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className="relative w-28 h-40 bg-white rounded-xl shadow-2xl border-4 border-yellow-400 flex flex-col items-center justify-between p-3 transform hover:scale-105 transition-transform"
          >
            {/* Valeur en haut */}
            <div className={`text-3xl font-bold ${getSuitColor(card.suit)}`}>
              {card.value}
              {colorblindMode && (
                <span className="ml-1 text-sm">{getSuitShape(card.suit)}</span>
              )}
            </div>
            
            {/* Symbole au centre */}
            <div className={`flex items-center justify-center ${getSuitColor(card.suit)}`}>
              <SuitLucideIcon suit={card.suit} className="h-14 w-14" strokeWidth={1.75} />
            </div>
            
            {/* Valeur en bas (inversée) */}
            <div className={`text-3xl font-bold ${getSuitColor(card.suit)} rotate-180`}>
              {card.value}
              {colorblindMode && (
                <span className="ml-1 text-sm rotate-180 inline-block">{getSuitShape(card.suit)}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Info du héros */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl px-8 py-4 shadow-2xl border-4 border-blue-400 min-w-[280px]">
        <div className="flex items-center justify-between gap-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-4 border-white flex items-center justify-center shadow-lg">
            <span className="text-white text-2xl font-bold">
              {name.charAt(0)}
            </span>
          </div>
          
          {/* Info */}
          <div className="flex-1">
            <div className="text-white text-xl font-bold">
              {name}
            </div>
            {/* Montant 20% plus grand (text-lg -> text-2xl) */}
            <div className="text-yellow-300 text-2xl font-extrabold">
              ${chips.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}