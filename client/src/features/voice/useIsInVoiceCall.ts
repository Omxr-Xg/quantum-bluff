import { useVoiceOptional } from '../../contexts/VoiceContext'

/** True pendant un appel privé/groupe (sonnerie, connexion ou communication). */
export function useIsInVoiceCall(): boolean {
  const voice = useVoiceOptional()
  if (!voice) return false
  if (voice.channelId?.startsWith('call:')) return true
  const oc = voice.outgoingCall
  if (!oc) return false
  return oc.status === 'dialing' || oc.status === 'connecting' || oc.status === 'connected'
}
