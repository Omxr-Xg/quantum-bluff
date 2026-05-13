/**
 * `useNumberFieldInput` — controleur d'input numerique avec saisie libre.
 *
 * Objectifs UX :
 *  - Permettre de **taper n'importe quel chiffre** sans clamp en cours de
 *    saisie (sinon l'utilisateur ne peut pas, ex., taper "1" puis "0" pour
 *    arriver a 10 si le `min` est 5).
 *  - Afficher la cellule en **rouge** quand la valeur est invalide
 *    (< min, > max, vide, non entiere si requis).
 *  - **Overwrite du 0 initial** : si la valeur affichee est "0", le focus
 *    selectionne tout pour que le prochain chiffre tape ecrase au lieu de
 *    s'ajouter (sinon on tapait "5" sur "0" → "05" → 5, brouillon visuel).
 *  - **Resync** quand le parent change la valeur (preset, reset, etc.),
 *    sauf si l'utilisateur est en train de saisir (focus actif).
 *
 * Le parent reste responsable de la **validation finale** (au submit).
 * Le state parent peut temporairement contenir une valeur < min ou > max
 * pendant la saisie ; pense a verrouiller le bouton de soumission tant
 * que `isInvalid` est `true` ou a re-valider explicitement.
 */
import { useCallback, useEffect, useRef, useState } from "react";

type UseNumberFieldInputOptions = {
  /** Source de verite numerique du parent. */
  value: number;
  /** Callback appele a chaque saisie valide (non vide, finie). */
  onChange: (next: number) => void;
  /** Borne minimale incluse. Si absent, pas de borne basse. */
  min?: number;
  /** Borne maximale incluse. Si absent, pas de borne haute. */
  max?: number;
  /** Forcer un entier (defaut `true`). Mettre `false` pour autoriser les decimaux. */
  integer?: boolean;
};

/** Classes Tailwind a appliquer en sus pour forcer une bordure rouge. */
export const NUMBER_FIELD_INVALID_CLASS =
  "!border-red-500/80 focus:!border-red-400 !ring-1 !ring-red-500/30 focus:!ring-red-400/40";

export function useNumberFieldInput({
  value,
  onChange,
  min,
  max,
  integer = true,
}: UseNumberFieldInputOptions) {
  const [inputValue, setInputValue] = useState<string>(() => String(value));
  /** Pendant un focus actif, on n'ecrase pas la string en cours par la prop. */
  const focusedRef = useRef(false);

  useEffect(() => {
    setInputValue((current) => {
      if (focusedRef.current) return current;
      const parsed = current === "" ? Number.NaN : Number(current);
      if (parsed === value) return current;
      return String(value);
    });
  }, [value]);

  const parsedDuringEdit = inputValue === "" ? Number.NaN : Number(inputValue);
  const isFiniteNum = Number.isFinite(parsedDuringEdit);
  const isInteger = integer ? isFiniteNum && Number.isInteger(parsedDuringEdit) : true;
  const inMin = isFiniteNum && (min == null || parsedDuringEdit >= min);
  const inMax = isFiniteNum && (max == null || parsedDuringEdit <= max);
  const isInvalid = !isFiniteNum || !isInteger || !inMin || !inMax;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInputValue(raw);
      if (raw === "") return;
      const num = Number(raw);
      if (Number.isFinite(num)) onChange(num);
    },
    [onChange],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      focusedRef.current = true;
      /* "0" tout court ou suite de zeros : on selectionne pour ecraser. */
      if (inputValue === "" || /^0+$/.test(inputValue)) {
        e.currentTarget.select();
      }
    },
    [inputValue],
  );

  const handleBlur = useCallback(() => {
    focusedRef.current = false;
    if (inputValue === "" || !Number.isFinite(Number(inputValue))) {
      setInputValue(String(value));
    }
  }, [inputValue, value]);

  return { inputValue, isInvalid, handleChange, handleFocus, handleBlur };
}
