import type { BotActionRequest } from './botAI.js'

export function sanitizeBotDecision(
  decision: {
    action: 'FOLD' | 'CALL' | 'CHECK' | 'RAISE'
    amount?: number
    reasoning?: string
  },
  req: BotActionRequest,
) {
  const callAmount = Math.max(0, req.callAmount)
  const chips = Math.max(0, req.playerChips)
  const minRaise = Math.max(1, req.minRaise)

  if (decision.action === 'CHECK') {
    if (callAmount > 0) {
      return chips >= callAmount
        ? { action: 'CALL' as const, amount: callAmount, reasoning: 'sanitized: call instead of invalid check' }
        : { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of invalid check' }
    }
    return { action: 'CHECK' as const, reasoning: decision.reasoning }
  }

  if (decision.action === 'CALL') {
    if (callAmount <= 0) {
      return { action: 'CHECK' as const, reasoning: 'sanitized: check instead of useless call' }
    }
    if (chips < callAmount) {
      return { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of impossible call' }
    }
    return { action: 'CALL' as const, amount: callAmount, reasoning: decision.reasoning }
  }

  if (decision.action === 'RAISE') {
    const proposed = typeof decision.amount === 'number' ? Math.floor(decision.amount) : 0

    if (callAmount > chips) {
      return { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of impossible raise' }
    }

    if (proposed < minRaise) {
      if (minRaise <= chips) {
        return { action: 'RAISE' as const, amount: minRaise, reasoning: 'sanitized: clamped to minRaise' }
      }
      if (callAmount === 0) {
        return { action: 'CHECK' as const, reasoning: 'sanitized: check instead of invalid raise' }
      }
      return chips >= callAmount
        ? { action: 'CALL' as const, amount: callAmount, reasoning: 'sanitized: call instead of invalid raise' }
        : { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of invalid raise' }
    }

    return {
      action: 'RAISE' as const,
      amount: proposed,
      reasoning: decision.reasoning,
    }
  }

  return { action: 'FOLD' as const, reasoning: decision.reasoning }
}
