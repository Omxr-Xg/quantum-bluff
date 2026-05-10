/**
 * Recharge gratuite avec cooldown — constantes et types.
 *
 * ## Comportement métier
 * - Un joueur authentifié peut recevoir **FREE_RECHARGE_AMOUNT** jetons **gratuitement**
 *   si son solde est **strictement inférieur** à **FREE_RECHARGE_THRESHOLD** (considéré « en difficulté »).
 * - Après chaque crédit, un **cooldown** de **FREE_RECHARGE_COOLDOWN_HOURS** bloque toute nouvelle recharge.
 * - Le statut (`GET /status`) et la prise (`POST /claim`) sont alignés sur les mêmes règles.
 *
 * ## Risques / limites
 * - **Économie du jeu** : crée des jetons « hors jeu » (pas d’achat, pas de buy-in) → inflation douce du
 *   volume de jetons en circulation si beaucoup de comptes utilisent la fonction souvent.
 * - **Abus** : comptes multiples, bots (mitigé par auth + cooldown + seuil ; un rate limit sur `claim` limite le spam).
 * - **Cohérence** : sans transaction stricte, deux requêtes parallèles pourraient créditer deux fois ;
 *   `claim` utilise une transaction **Serializable** pour réduire ce risque sur PostgreSQL.
 * - **Solde** : les jetons sont partagés avec le reste du produit (tables, tournois) ; une recharge peut
 *   changer l’éligibilité à d’autres modes (mises min, etc.).
 *
 * Client : garder **FREE_RECHARGE_*** ici et dans `client/src/utils/freeRecharge.ts` identiques.
 */

/** Jetons crédités à chaque recharge (client : garder aligné). */
export const FREE_RECHARGE_AMOUNT = 500
/**
 * Solde max pour rester éligible : si `chips >= seuil`, pas de recharge (joueur pas « en difficulté »).
 */
export const FREE_RECHARGE_THRESHOLD = 1200
export const FREE_RECHARGE_COOLDOWN_HOURS = 4

export interface FreeRechargeStatus {
  canRecharge: boolean
  nextRechargeAt: string | null // ISO string, null si disponible immédiatement
  hoursUntilRecharge: number | null
  minutesUntilRecharge: number | null
  totalMinutesUntilRecharge: number | null
  lastRechargeAt: string | null
  message: string
}

export interface FreeRechargeClaimResult {
  success: boolean
  newBalance: number
  addedAmount: number
  nextRechargeAt: string | null
  message: string
}
