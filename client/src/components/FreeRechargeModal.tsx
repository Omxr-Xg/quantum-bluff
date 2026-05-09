import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Zap, AlertCircle, Bell } from 'lucide-react'
import {
  fetchFreeRechargeStatus,
  claimFreeRecharge,
  FREE_RECHARGE_AMOUNT,
  FREE_RECHARGE_COOLDOWN_HOURS,
  FREE_RECHARGE_THRESHOLD,
  FreeRechargeApiError,
  type FreeRechargeStatus,
} from '../utils/freeRecharge'
import { ChipIcon } from './ChipIcon'
import { motion, AnimatePresence } from 'motion/react'
import {
  clearLocalNotice,
  dispatchLocalNotice,
  FREE_RECHARGE_BALANCE_NOTICE_ID,
  FREE_RECHARGE_COOLDOWN_NOTICE_ID,
} from '../utils/localNotices'

type FreeRechargeModalProps = {
  open: boolean
  onClose: () => void
  /** Notifie le parent quand la recharge est effectuée */
  onClaimed?: (newBalance: number) => void
}

/**
 * Modal affichant le système de recharge gratuite avec cooldown intelligent.
 *
 * Affiche :
 * - État 1 : Bouton doré animé pour recharger
 * - État 2 : Cooldown — renvoi vers les notifications (cloche)
 * - Infos sur le système et la dernière recharge
 */
export function FreeRechargeModal({ open, onClose, onClaimed }: FreeRechargeModalProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<FreeRechargeStatus | null>(null)
  const lastBalanceNoticeBodyRef = useRef<string | null>(null)
  const lastCooldownTimeSigRef = useRef<string | null>(null)
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
    if (!open || !status) return
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
  }, [open, status, t])

  useEffect(() => {
    if (!open || !status || status.canRecharge || !status.nextRechargeAt) return
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
  }, [open, status, displayTime, t])

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
      setStatus({
        ...status,
        canRecharge: false,
        nextRechargeAt: result.nextRechargeAt,
        lastRechargeAt: new Date().toISOString(),
      })
      onClaimed?.(result.newBalance)

      setTimeout(() => {
        setError(null)
      }, 3000)
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
                  Recevez <span className="font-bold text-amber-400">{FREE_RECHARGE_AMOUNT} jetons gratuits</span> si votre solde est sous{' '}
                  <span className="font-bold text-amber-400/90">{FREE_RECHARGE_THRESHOLD}</span> jetons.
                </p>
                <p className="text-xs text-gray-400">
                  Après une recharge, vous devrez attendre <span className="font-bold">{FREE_RECHARGE_COOLDOWN_HOURS} heures</span> avant la prochaine.
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
              ) : status?.nextRechargeAt ? (
                <div className="bg-slate-700/40 border border-slate-600 rounded-lg p-4 flex gap-3 items-start">
                  <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-slate-300">{t('notifications.freeRechargeDetailInBell')}</p>
                </div>
              ) : (
                <div className="bg-slate-700/40 border border-slate-600 rounded-lg p-4 flex gap-3 items-start">
                  <Bell className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-slate-300">{t('notifications.freeRechargeDetailInBell')}</p>
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
                  <li>• Respectez le cooldown de {FREE_RECHARGE_COOLDOWN_HOURS}h pour éviter les abus</li>
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
