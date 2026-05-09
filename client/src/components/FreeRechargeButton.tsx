import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Zap, Loader2 } from 'lucide-react'
import {
  fetchFreeRechargeStatus,
  claimFreeRecharge,
  FREE_RECHARGE_AMOUNT,
  FreeRechargeApiError,
  type FreeRechargeStatus,
} from '../utils/freeRecharge'
import {
  clearLocalNotice,
  dispatchLocalNotice,
  FREE_RECHARGE_BALANCE_NOTICE_ID,
  FREE_RECHARGE_COOLDOWN_NOTICE_ID,
} from '../utils/localNotices'
import { ChipIcon } from './ChipIcon'
import { motion } from 'motion/react'

type FreeRechargeButtonProps = {
  /** Callback quand la recharge est effectuée (retourne le nouveau solde) */
  onClaimed?: (newBalance: number) => void
  /** Classes CSS personnalisées */
  className?: string
  /** Si true, montre plus de détails */
  showDetails?: boolean
}

/**
 * Composant affichant le bouton de recharge gratuite ou le compteur de cooldown.
 *
 * État 1 : Recharge disponible → bouton doré avec animation
 * État 2 : Cooldown — pas de bloc dans le lobby ; détail dans les notifications (cloche).
 */
export function FreeRechargeButton({
  onClaimed,
  className = '',
  showDetails = false,
}: FreeRechargeButtonProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<FreeRechargeStatus | null>(null)
  const lastBalanceNoticeBodyRef = useRef<string | null>(null)
  const lastCooldownTimeSigRef = useRef<string | null>(null)
  /** Chargement / rafraîchissement du statut (évite ReferenceError si absent ; polling sans masquer l’UI une fois `status` connu). */
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayTime, setDisplayTime] = useState<{
    hours: number
    minutes: number
  } | null>(null)

  // Charger le statut initial
  useEffect(() => {
    loadStatus()
    // Recharger toutes les 30 secondes
    const interval = setInterval(loadStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  // Mettre à jour le compte à rebours toutes les secondes quand cooldown actif
  useEffect(() => {
    if (!status?.nextRechargeAt) {
      setDisplayTime(null)
      return
    }

    const updateTime = () => {
      const now = new Date()
      const nextRecharge = new Date(status.nextRechargeAt!)
      const diff = Math.max(0, nextRecharge.getTime() - now.getTime())

      if (diff === 0) {
        // Cooldown expiré, recharger
        loadStatus()
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      setDisplayTime({ hours, minutes })
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [status?.nextRechargeAt])

  /** Solde trop élevé : notice « balance » ; cooldown : notice séparée ; sinon on nettoie. */
  useEffect(() => {
    if (!status) return
    if (status.canRecharge) {
      clearLocalNotice(FREE_RECHARGE_BALANCE_NOTICE_ID)
      clearLocalNotice(FREE_RECHARGE_COOLDOWN_NOTICE_ID)
      lastBalanceNoticeBodyRef.current = null
      lastCooldownTimeSigRef.current = null
      return
    }
    if (status.nextRechargeAt) {
      clearLocalNotice(FREE_RECHARGE_BALANCE_NOTICE_ID)
      lastBalanceNoticeBodyRef.current = null
      return
    }
    clearLocalNotice(FREE_RECHARGE_COOLDOWN_NOTICE_ID)
    lastCooldownTimeSigRef.current = null
    if (!status.message) return
    if (lastBalanceNoticeBodyRef.current === status.message) return
    lastBalanceNoticeBodyRef.current = status.message
    dispatchLocalNotice({
      id: FREE_RECHARGE_BALANCE_NOTICE_ID,
      title: t('notifications.freeRechargeNoticeTitle'),
      body: status.message,
    })
  }, [status, t])

  /** Cooldown : mise à jour de la notice quand le délai affiché change (à la minute près). */
  useEffect(() => {
    if (!status || status.canRecharge || !status.nextRechargeAt) return
    if (!displayTime) return
    const { hours, minutes } = displayTime
    const sig = `${hours}:${minutes}`
    if (lastCooldownTimeSigRef.current === sig) return
    lastCooldownTimeSigRef.current = sig
    const formatted =
      hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : '…'
    dispatchLocalNotice({
      id: FREE_RECHARGE_COOLDOWN_NOTICE_ID,
      title: t('notifications.freeRechargeCooldownTitle'),
      body: t('notifications.freeRechargeCooldownBody', { time: formatted }),
    })
  }, [status, displayTime, t])

  const loadStatus = async () => {
    setError(null)
    try {
      const s = await fetchFreeRechargeStatus()
      if (s) {
        setStatus(s)
      } else {
        setError('Impossible de charger le statut')
      }
    } catch (err) {
      setError('Impossible de charger le statut')
      console.error(err)
    }
  }

  const handleClaim = async () => {
    if (!status?.canRecharge || claiming) return

    setClaiming(true)
    setError(null)

    try {
      const result = await claimFreeRecharge()
      setStatus({
        ...status,
        canRecharge: false,
        nextRechargeAt: result.nextRechargeAt,
        lastRechargeAt: new Date().toISOString(),
      })
      onClaimed?.(result.newBalance)
    } catch (err) {
      setError(
        err instanceof FreeRechargeApiError
          ? err.message
          : 'Erreur réseau. Réessaie plus tard.',
      )
      console.error(err)
    } finally {
      setClaiming(false)
    }
  }

  if (!status) {
    if (error) {
      return (
        <div className={`flex flex-col items-stretch gap-2 ${className}`}>
          <div className="text-sm text-red-400 text-center">{error}</div>
          <button
            type="button"
            onClick={() => void loadStatus()}
            disabled={loading}
            className="text-xs text-amber-400 underline disabled:opacity-50"
          >
            Réessayer
          </button>
        </div>
      )
    }
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
        <span className="text-sm text-gray-400">Chargement...</span>
      </div>
    )
  }

  // === ÉTAT 1 : RECHARGE DISPONIBLE ===
  if (status.canRecharge) {
    return (
      <motion.div
        className={className}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={handleClaim}
          disabled={claiming}
          className={`
            relative w-full flex items-center justify-center gap-2 px-4 py-3
            bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500
            hover:from-amber-400 hover:via-amber-300 hover:to-yellow-400
            text-gray-900 font-bold rounded-lg
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow-lg hover:shadow-amber-500/50
            ${claiming ? 'animate-pulse' : ''}
          `}
        >
          {/* Icône animée */}
          <motion.div
            animate={{ rotate: status.canRecharge ? 360 : 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <Zap className="w-5 h-5 text-amber-900" />
          </motion.div>

          {/* Texte et chips */}
          <span className="text-sm">Recharger maintenant</span>
          <div className="flex items-center gap-1 ml-auto bg-white/20 px-2 py-1 rounded">
            <ChipIcon className="w-4 h-4" />
            <span className="text-xs font-bold">+{FREE_RECHARGE_AMOUNT}</span>
          </div>

          {claiming && <Loader2 className="absolute w-4 h-4 animate-spin" />}
        </button>

        {showDetails && (
          <div className="mt-2 text-xs text-gray-400 text-center">
            {status.lastRechargeAt ? (
              <p>Dernière recharge: {new Date(status.lastRechargeAt).toLocaleString()}</p>
            ) : (
              <p>Première recharge gratuite!</p>
            )}
          </div>
        )}

        {error && <div className="mt-2 text-xs text-red-400 text-center">{error}</div>}
      </motion.div>
    )
  }

  // === ÉTAT 2 : COOLDOWN — détail dans les notifications (cloche), pas de bloc dans le lobby ===
  if (!status.canRecharge && status.nextRechargeAt) {
    return null
  }

  // === ÉTAT 3 : SOLDE TROP ÉLEVÉ — détail dans le centre de notifications (cloche) ===
  if (!status.canRecharge && !displayTime) {
    return null
  }

  // État par défaut
  return null
}
