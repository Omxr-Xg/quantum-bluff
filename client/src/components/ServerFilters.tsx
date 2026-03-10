import { useState } from "react";
import { Filter, DollarSign, Users, Bot, Zap } from "lucide-react";

interface ServerFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

interface FilterState {
  maxBet: number | null;
  minPlayers: number | null;
  noBots: boolean;
  hiddenBets: boolean;
}

type FilterValue = number | boolean | null;

export function ServerFilters({ onFilterChange }: ServerFiltersProps) {

  const [activeFilters, setActiveFilters] = useState<FilterState>({
    maxBet: null,
    minPlayers: null,
    noBots: false,
    hiddenBets: false
  });

  const toggleFilter = (filterKey: keyof FilterState, value: FilterValue) => {

    const newFilters: FilterState = {
      ...activeFilters,
      [filterKey]: value
    };

    setActiveFilters(newFilters);
    onFilterChange(newFilters);
  };

  const quickTags = [
    {
      key: "maxBet" as keyof FilterState,
      value: 50,
      label: "Mises < 50$",
      icon: DollarSign,
      active: activeFilters.maxBet === 50,
      color: "green"
    },
    {
      key: "maxBet" as keyof FilterState,
      value: 100,
      label: "Mises < 100$",
      icon: DollarSign,
      active: activeFilters.maxBet === 100,
      color: "blue"
    },
    {
      key: "minPlayers" as keyof FilterState,
      value: 4,
      label: "4+ Joueurs",
      icon: Users,
      active: activeFilters.minPlayers === 4,
      color: "purple"
    },
    {
      key: "noBots" as keyof FilterState,
      value: true,
      label: "Sans Bots",
      icon: Bot,
      active: activeFilters.noBots,
      color: "red"
    },
    {
      key: "hiddenBets" as keyof FilterState,
      value: true,
      label: "Paris Caches",
      icon: Zap,
      active: activeFilters.hiddenBets,
      color: "yellow"
    }
  ];

  const colorClasses = {
    green: {
      active: "bg-green-600 border-green-500 text-white",
      inactive: "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
    },
    blue: {
      active: "bg-blue-600 border-blue-500 text-white",
      inactive: "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
    },
    purple: {
      active: "bg-purple-600 border-purple-500 text-white",
      inactive: "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
    },
    red: {
      active: "bg-red-600 border-red-500 text-white",
      inactive: "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
    },
    yellow: {
      active: "bg-yellow-600 border-yellow-500 text-white",
      inactive: "bg-slate-700 border-slate-600 text-gray-300 hover:bg-slate-600"
    }
  };

  const resetFilters = () => {

    const resetState: FilterState = {
      maxBet: null,
      minPlayers: null,
      noBots: false,
      hiddenBets: false
    };

    setActiveFilters(resetState);
    onFilterChange(resetState);
  };

  const hasActiveFilters = Object.values(activeFilters)
    .some(v => v !== null && v !== false);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-4">

      <div className="flex items-center justify-between mb-3">

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-purple-400" />
          <h3 className="text-white font-semibold">
            Filtres Rapides
          </h3>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors"
          >
            Reinitialiser
          </button>
        )}

      </div>

      <div className="flex flex-wrap gap-2">

        {quickTags.map((tag) => {

          const Icon = tag.icon;

          const colors =
            colorClasses[tag.color as keyof typeof colorClasses];

          return (
            <button
              key={tag.label}
              onClick={() => {

                if (tag.key === "maxBet" || tag.key === "minPlayers") {

                  toggleFilter(
                    tag.key,
                    tag.active ? null : (tag.value as number)
                  );

                } else {

                  toggleFilter(
                    tag.key,
                    !tag.active
                  );

                }

              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 font-semibold text-sm transition-all transform hover:scale-105 ${
                tag.active
                  ? colors.active
                  : colors.inactive
              }`}
            >

              <Icon className="w-4 h-4" />

              {tag.label}

            </button>
          );

        })}

      </div>

      {hasActiveFilters && (

        <div className="mt-3 pt-3 border-t border-slate-700">

          <p className="text-xs text-gray-400">
            Filtres actifs: Reduction de la charge memorielle par reconnaissance
          </p>

        </div>

      )}

    </div>
  );
}