interface ChipStackProps {
  amount: number;
  size?: "small" | "medium" | "large";
  maxChips?: number; // Nombre max de jetons à afficher
}

interface ChipType {
  value: number;
  color: string;
  borderColor: string;
  pattern: string;
}

export function ChipStack({ amount, size = "medium", maxChips = 10 }: ChipStackProps) {
  // Définition des types de jetons par valeur (du plus grand au plus petit)
  const chipTypes: ChipType[] = [
    { value: 1000, color: "bg-gradient-to-br from-yellow-400 to-yellow-600", borderColor: "border-yellow-700", pattern: "bg-yellow-300" },
    { value: 500, color: "bg-gradient-to-br from-purple-500 to-purple-700", borderColor: "border-purple-800", pattern: "bg-purple-400" },
    { value: 100, color: "bg-gradient-to-br from-gray-800 to-black", borderColor: "border-gray-600", pattern: "bg-gray-700" },
    { value: 25, color: "bg-gradient-to-br from-green-500 to-green-700", borderColor: "border-green-800", pattern: "bg-green-400" },
    { value: 10, color: "bg-gradient-to-br from-blue-500 to-blue-700", borderColor: "border-blue-800", pattern: "bg-blue-400" },
    { value: 5, color: "bg-gradient-to-br from-red-500 to-red-700", borderColor: "border-red-800", pattern: "bg-red-400" },
    { value: 1, color: "bg-gradient-to-br from-gray-100 to-gray-300", borderColor: "border-gray-400", pattern: "bg-gray-200" },
  ];

  // Calculer la distribution des jetons
  const getChipDistribution = (total: number): { type: ChipType; count: number }[] => {
    const distribution: { type: ChipType; count: number }[] = [];
    let remaining = total;

    for (const chipType of chipTypes) {
      if (remaining >= chipType.value) {
        const count = Math.floor(remaining / chipType.value);
        if (count > 0) {
          distribution.push({ type: chipType, count: Math.min(count, maxChips) });
          remaining -= count * chipType.value;
        }
      }
    }

    return distribution;
  };

  const chipDistribution = getChipDistribution(amount);

  // Tailles des jetons selon le paramètre size
  const sizeClasses = {
    small: { width: "w-6", height: "h-6", offset: "2px", fontSize: "text-[6px]" },
    medium: { width: "w-8", height: "h-8", offset: "3px", fontSize: "text-[8px]" },
    large: { width: "w-10", height: "h-10", offset: "4px", fontSize: "text-[10px]" },
  };

  const currentSize = sizeClasses[size];

  if (chipDistribution.length === 0) return null;

  return (
    <div className="flex gap-1 items-end">
      {chipDistribution.map((chip, stackIndex) => (
        <div key={stackIndex} className="relative flex flex-col-reverse items-center">
          {/* Pile de jetons (maximum maxChips jetons affichés) */}
          {Array.from({ length: Math.min(chip.count, 5) }).map((_, index) => (
            <div
              key={index}
              className={`${currentSize.width} ${currentSize.height} ${chip.type.color} rounded-full border-2 ${chip.type.borderColor} shadow-lg relative`}
              style={{
                marginTop: index > 0 ? `-${currentSize.offset}` : "0",
                zIndex: index,
              }}
            >
              {/* Motif central du jeton */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`${currentSize.width === "w-6" ? "w-3 h-3" : currentSize.width === "w-8" ? "w-4 h-4" : "w-5 h-5"} ${chip.type.pattern} rounded-full border border-white/30`}></div>
              </div>
              
              {/* Valeur du jeton (sur le premier jeton de la pile) */}
              {index === 0 && (
                <div className={`absolute inset-0 flex items-center justify-center ${currentSize.fontSize} font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]`}>
                  {chip.type.value >= 1000 ? `${chip.type.value / 1000}K` : chip.type.value}
                </div>
              )}
            </div>
          ))}
          
          {/* Badge de comptage si plus de 5 jetons */}
          {chip.count > 5 && (
            <div className="absolute -top-2 -right-2 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-lg z-10">
              ×{chip.count}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}