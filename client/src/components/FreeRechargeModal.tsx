import { useEffect, useState } from 'react'
import { X, Zap, Clock, AlertCircle } from 'lucide-react'
import {
  fetchFreeRechargeStatus,
  claimFreeRecharge,
  type FreeRechargeStatus,
} from '../utils/freeRecharge'
import { ChipIcon } from './ChipIcon'
import { motion, AnimatePresence } from 'motion/react'

type FreeRechargeModalProps = {
  open: boolean
  onClose: () => void
  /** Notifie le parent quand la recharge est effectuée */
  onClaimed?: (newBalance: number) => void
}

const FREE_RECHARGE_AMOUNT = 1000
const FREE_RECHARGE_THRESHOLD = 200
const COOLDOWN_HOURS = 4

/**
 * Modal affichant le système de recharge gratuite avec cooldown intelligent.
 *
 * Affiche :
 * - État 1 : Bouton doré animé pour recharger
 * - État 2 : Compteur de cooldown avec temps restant
 * - Infos sur le système et la dernière recharge
 */
export function FreeRechargeModal({ open, onClose, onClaimed }: FreeRechargeModalProps) {
  const [status, setStatus] = useState<FreeRechargeStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayTime, setDisplayTime] = useState<{
    hours: number
    minutes: number
  } | null>(null)

  useEffect(() => {
    if (!open) {
      setError(null)
      return
    }

    loadStatus()
  }, [open])

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

        // Afficher un message de succès
        setTimeout(() => {
          setError(null)
        }, 3000)
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

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg shadow-2xl max-w-md w-full mx-4 overflow-hidden border border-amber-500/20"
          >
            {/* En-tête */}
            <div className="relative bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Zap className="w-6 h-6 text-amber-900" />
                </motion.div>
                <h2 className="text-xl font-bold text-gray-900">Recharge de Secours</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-900 hover:text-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <p className="text-sm text-gray-300">
                  Recevez <span className="font-bold text-amber-400">{FREE_RECHARGE_AMOUNT} jetons gratuits</span> quand votre solde devient critique.
                </p>
                <p className="text-xs text-gray-400">
                  Après une recharge, vous devrez attendre <span className="font-bold">{COOLDOWN_HOURS} heures</span> avant la prochaine.
                </p>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin">
                    <Zap className="w-8 h-8 text-amber-500" />
                  </div>
                </div>
              ) : status?.canRecharge ? (
                /* BOUTON DE RECHARGE */
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClaim}
                  disabled={claiming}
                  className={`
                    w-full py-4 px-4 rounded-lg font-bold text-lg
                    bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500
                    hover:from-amber-400 hover:via-amber-300 hover:to-yellow-400
                    text-gray-900
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-lg hover:shadow-amber-500/50
                    flex items-center justify-center gap-2
                  `}
                >
                  {claiming ? (
                    <>
                      <div className="animate-spin">
                        <Zap className="w-5 h-5" />
                      </div>
                      <span>Recharge en cours...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      <span>Recharger Maintenant</span>
                      <div className="ml-auto flex items-center gap-1 bg-white/20 px-2 py-1 rounded">
                        <ChipIcon className="w-4 h-4" />
                        <span className="text-sm">+{FREE_RECHARGE_AMOUNT}</span>
                      </div>
                    </>
                  )}
                </motion.button>
              ) : (
                /* COMPTEUR DE COOLDOWN */
                <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold text-gray-300">Prochaine recharge disponible</span>
                  </div>
                  {displayTime && (
                    <div className="text-3xl font-bold text-amber-400">
                      {displayTime.hours > 0
                        ? `${displayTime.hours}h ${displayTime.minutes}m`
                        : displayTime.minutes > 0
                          ? `${displayTime.minutes}m`
                          : 'Bientôt!'}
                    </div>
                  )}
                </div>
              )}

              {/* Dernière recharge */}
              {status?.lastRechargeAt && (
                <div className="text-xs text-gray-500 text-center border-t border-gray-700 pt-4">
                  Dernière recharge:{' '}
                  <span className="text-gray-300">
                    {new Date(status.lastRechargeAt).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Message d'erreur */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-900/50 border border-red-700 rounded-lg p-3 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300">{error}</p>
                </motion.div>
              )}

              {/* Conseils */}
              <div className="bg-gray-700/30 rounded-lg p-4 space-y-2">
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wide">Conseils</h3>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Utilisez cette recharge de secours pour revenir en jeu</li>
                  <li>• Respectez le cooldown de {COOLDOWN_HOURS}h pour éviter les abus</li>
                  <li>• Gérez vos jetons intelligemment entre deux recharges</li>
                  <li>• Les mises doivent être réalistes avec votre solde</li>
                </ul>
              </div>

              {/* Bouton de fermeture */}
              <button
                onClick={onClose}
                className="w-full py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
