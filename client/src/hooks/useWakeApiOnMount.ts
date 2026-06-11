import { useEffect } from "react";
import { wakeApiServer } from "../utils/wakeApi";

/** Réveille l’API en arrière-plan sur les écrans de connexion. */
export function useWakeApiOnMount(): void {
  useEffect(() => {
    void wakeApiServer(3);
  }, []);
}
