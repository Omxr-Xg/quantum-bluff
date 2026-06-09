import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import type { StoredVoiceCall } from '../voice/voiceCallStore.js'
import { storeGetCall, storeSaveCall } from '../voice/voiceCallStore.js'

export type PrivateCallChatOutcome = 'completed' | 'missed' | 'cancelled' | 'rejected'

export type PrivateCallEndContext = 'hangup' | 'cancel' | 'timeout' | 'reject' | 'ignore' | 'block'

export function resolvePrivateCallChatOutcome(
  call: StoredVoiceCall,
  context: PrivateCallEndContext,
): PrivateCallChatOutcome {
  if (call.connectedAt) return 'completed'
  if (context === 'cancel') return 'cancelled'
  if (context === 'reject' || context === 'block') return 'rejected'
  if (context === 'hangup') return 'cancelled'
  return 'missed'
}

function privatePeerId(call: StoredVoiceCall): string | null {
  const peer = call.memberIds.find((id) => id !== call.callerId)
  return peer ?? call.memberIds[0] ?? null
}

export async function logPrivateCallToFriendChat(
  io: Server | undefined,
  callId: string,
  outcome: PrivateCallChatOutcome,
): Promise<void> {
  const call = await storeGetCall(callId)
  if (!call || call.type !== 'private' || call.chatLogged) return

  const peerId = privatePeerId(call)
  if (!peerId) return

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { user1Id: call.callerId, user2Id: peerId },
        { user1Id: peerId, user2Id: call.callerId },
      ],
    },
    select: { id: true },
  })
  if (!friendship) return

  call.chatLogged = true
  await storeSaveCall(call)

  const durationSec =
    outcome === 'completed' && call.connectedAt
      ? Math.max(1, Math.round((Date.now() - call.connectedAt) / 1000))
      : 0

  const message = await prisma.friendMessage.create({
    data: {
      senderId: call.callerId,
      receiverId: peerId,
      content: '',
      kind: 'VOICE_CALL',
      callDurationSec: durationSec > 0 ? durationSec : null,
      callOutcome: outcome,
    },
    include: {
      sender: { select: { id: true, username: true } },
      receiver: { select: { id: true, username: true } },
    },
  })

  if (io) {
    const payload = {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      kind: message.kind,
      callDurationSec: message.callDurationSec,
      callOutcome: message.callOutcome,
      createdAt: message.createdAt.toISOString(),
      sender: message.sender,
      receiver: message.receiver,
    }
    io.to(`user:${peerId}`).emit('FRIEND_MESSAGE', payload)
    io.to(`user:${call.callerId}`).emit('FRIEND_MESSAGE', payload)
  }
}

export async function logPrivateCallBeforeEnd(
  io: Server | undefined,
  callId: string,
  context: PrivateCallEndContext,
): Promise<void> {
  const call = await storeGetCall(callId)
  if (!call || call.type !== 'private') return
  const outcome = resolvePrivateCallChatOutcome(call, context)
  await logPrivateCallToFriendChat(io, callId, outcome)
}
