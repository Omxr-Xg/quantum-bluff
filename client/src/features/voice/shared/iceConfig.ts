const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/** JSON dans VITE_ICE_SERVERS, ex. [{"urls":"stun:..."},{"urls":"turn:...","username":"u","credential":"p"}] */
export function resolveIceConfiguration(): RTCConfiguration {
  const raw = (import.meta.env.VITE_ICE_SERVERS ?? '').toString().trim()
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) {
        const hasTurn = parsed.some(
          (s) =>
            typeof s === 'object' &&
            s != null &&
            String((s as RTCIceServer).urls ?? '')
              .toLowerCase()
              .includes('turn'),
        )
        if (!hasTurn && import.meta.env.PROD) {
          console.warn(
            '[voice] VITE_ICE_SERVERS sans TURN — audio inter-réseaux (4G/box) souvent impossible.',
          )
        }
        return { iceServers: parsed as RTCIceServer[], iceCandidatePoolSize: 10 }
      }
    } catch {
      console.warn('[voice] VITE_ICE_SERVERS invalide — STUN par défaut')
    }
  }
  if (import.meta.env.PROD) {
    console.warn('[voice] Pas de VITE_ICE_SERVERS — STUN seul (ajouter TURN Metered sur Vercel).')
  }
  return { iceServers: DEFAULT_ICE_SERVERS, iceCandidatePoolSize: 10 }
}

export function getIceServersConfig(): RTCConfiguration {
  return resolveIceConfiguration()
}
