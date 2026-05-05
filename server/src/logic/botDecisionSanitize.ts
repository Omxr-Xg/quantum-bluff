import type { BotActionRequest } from './botAI.js'

export function sanitizeBotDecision(
  decision: {
    action: 'FOLD' | 'CALL' | 'CHECK' | 'RAISE'
    amount?: number
    reasoning?: string
    style?: string
  },
  req: BotActionRequest,
) {
  const passMeta = decision.style ? { style: decision.style } : {}
  const callAmount = Math.max(0, req.callAmount)
  const chips = Math.max(0, req.playerChips)
  const minRaise = Math.max(1, req.minRaise)

  if (decision.action === 'CHECK') {
    if (callAmount > 0) {
      return chips >= callAmount
        ? { action: 'CALL' as const, amount: callAmount, reasoning: 'sanitized: call instead of invalid check', ...passMeta }
        : { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of invalid check', ...passMeta }
    }
    return { action: 'CHECK' as const, reasoning: decision.reasoning, ...passMeta }
  }

  if (decision.action === 'CALL') {
    if (callAmount <= 0) {
      return { action: 'CHECK' as const, reasoning: 'sanitized: check instead of useless call', ...passMeta }
    }
    if (chips < callAmount) {
      return { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of impossible call', ...passMeta }
    }
    return { action: 'CALL' as const, amount: callAmount, reasoning: decision.reasoning, ...passMeta }
  }

  if (decision.action === 'RAISE') {
    const proposed = typeof decision.amount === 'number' ? Math.floor(decision.amount) : 0

    if (callAmount > chips) {
      return { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of impossible raise', ...passMeta }
    }

    if (proposed < minRaise) {
      if (minRaise <= chips) {
        return { action: 'RAISE' as const, amount: minRaise, reasoning: 'sanitized: clamped to minRaise', ...passMeta }
      }
      if (callAmount === 0) {
        return { action: 'CHECK' as const, reasoning: 'sanitized: check instead of invalid raise', ...passMeta }
      }
      return chips >= callAmount
        ? { action: 'CALL' as const, amount: callAmount, reasoning: 'sanitized: call instead of invalid raise', ...passMeta }
        : { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of invalid raise', ...passMeta }
    }

    return {
      action: 'RAISE' as const,
      amount: proposed,
      reasoning: decision.reasoning,
      ...passMeta,
    }
  }

  return { action: 'FOLD' as const, reasoning: decision.reasoning, ...passMeta }
}
