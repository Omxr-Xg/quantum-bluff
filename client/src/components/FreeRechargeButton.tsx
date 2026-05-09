import { useEffect, useState } from 'react'
import { Clock, Zap, Loader2 } from 'lucide-react'
import {
  fetchFreeRechargeStatus,
  claimFreeRecharge,
  type FreeRechargeStatus,
} from '../utils/freeRecharge'
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

const FREE_RECHARGE_AMOUNT = 300 // Montant rechargé pour joueurs en difficulté

/**
 * Composant affichant le bouton de recharge gratuite ou le compteur de cooldown.
 *
 * État 1 : Recharge disponible → bouton doré avec animation
 * État 2 : Cooldown actif → affiche "Prochaine recharge dans Xh Ym"
 */
export function FreeRechargeButton({
  onClaimed,
  className = '',
  showDetails = false,
}: FreeRechargeButtonProps) {
  const [status, setStatus] = useState<FreeRechargeStatus | null>(null)
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

  const loadStatus = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await fetchFreeRechargeStatus()
      if (s) {
        setStatus(s)
      }
    } catch (err) {
      setError('Impossible de charger le statut')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async () => {
    if (!status?.canRecharge || claiming) return

    setClaiming(true)
    setError(null)

    try {
      const result = await claimFreeRecharge()
      if (result?.success) {
        setStatus({
          ...status,
          canRecharge: false,
          nextRechargeAt: result.nextRechargeAt,
          lastRechargeAt: new Date().toISOString(),
        })
        onClaimed?.(result.newBalance)
      } else {
        setError('Recharge échouée. Réessaye plus tard.')
      }
    } catch (err) {
      setError('Erreur lors de la recharge')
      console.error(err)
    } finally {
      setClaiming(false)
    }
  }

  if (!status) {
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

  // === ÉTAT 2 : COOLDOWN ACTIF ===
  if (!status.canRecharge && displayTime) {
    const { hours, minutes } = displayTime
    const formattedTime =
      hours > 0 ? `${hours}h ${minutes}m` : minutes > 0 ? `${minutes}m` : 'Bientôt...'

    return (
      <div className={className}>
        <div
          className={`
            flex items-center justify-center gap-3 px-4 py-3
            bg-gray-700/50 border border-gray-600 rounded-lg
            text-gray-300 font-medium
          `}
        >
          <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm">Prochaine recharge</div>
            <div className="text-xs text-amber-400 font-bold">{formattedTime}</div>
          </div>
        </div>

        {showDetails && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            <p>Gère tes jetons intelligemment en attendant</p>
          </div>
        )}
      </div>
    )
  }

  // === ÉTAT 3 : SOLDE TROP ÉLEVÉ ===
  if (!status.canRecharge && !displayTime) {
    return (
      <div className={className}>
        <div
          className={`
            flex items-center justify-center gap-3 px-4 py-3
            bg-red-900/30 border border-red-700/50 rounded-lg
            text-gray-300 font-medium
          `}
        >
          <span className="text-2xl">🚫</span>
          <div className="flex-1 text-left">
            <div className="text-sm">Solde suffisant</div>
            <div className="text-xs text-red-400">{status.message}</div>
          </div>
        </div>

        {showDetails && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            <p>Dépense tes jetons pour devenir éligible</p>
          </div>
        )}
      </div>
    )
  }

  // État par défaut
  return null
}
