export type VoiceChannelKind = 'waiting' | 'table' | 'call'

export type ParsedVoiceChannel = {
  kind: VoiceChannelKind
  id: string
  channelId: string
}

export function buildWaitingChannelId(roomId: string): string {
  return `waiting:${roomId}`
}

export function buildTableChannelId(gameId: string): string {
  return `table:${gameId}`
}

export function buildCallChannelId(callId: string): string {
  return `call:${callId}`
}

export function parseVoiceChannelId(channelId: string): ParsedVoiceChannel | null {
  const idx = channelId.indexOf(':')
  if (idx <= 0) return null
  const kind = channelId.slice(0, idx) as VoiceChannelKind
  const id = channelId.slice(idx + 1)
  if (!id) return null
  if (kind !== 'waiting' && kind !== 'table' && kind !== 'call') return null
  return { kind, id, channelId }
}

/** Ancien format : gameId seul → canal table. */
export function resolveChannelId(data: {
  channelId?: string
  gameId?: string
}): string | null {
  if (data.channelId && typeof data.channelId === 'string') {
    return parseVoiceChannelId(data.channelId) ? data.channelId : null
  }
  if (data.gameId && typeof data.gameId === 'string') {
    return buildTableChannelId(data.gameId)
  }
  return null
}
