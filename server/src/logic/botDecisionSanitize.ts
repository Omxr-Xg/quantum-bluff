import type { BotActionRequest } from './botAI.js'

function callOrAllIn(callAmount: number, chips: number) {
  if (chips >= callAmount) return { kind: 'full' as const, amount: callAmount }
  if (chips > 0) return { kind: 'short' as const, amount: chips }
  return { kind: 'none' as const, amount: 0 }
}

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
      const c = callOrAllIn(callAmount, chips)
      if (c.kind === 'full') {
        return { action: 'CALL' as const, amount: c.amount, reasoning: 'sanitized: call instead of invalid check', ...passMeta }
      }
      if (c.kind === 'short') {
        return {
          action: 'CALL' as const,
          amount: c.amount,
          reasoning: 'sanitized: all-in call instead of invalid check',
          ...passMeta,
        }
      }
      return { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of invalid check (no chips)', ...passMeta }
    }
    return { action: 'CHECK' as const, reasoning: decision.reasoning, ...passMeta }
  }

  if (decision.action === 'CALL') {
    if (callAmount <= 0) {
      return { action: 'CHECK' as const, reasoning: 'sanitized: check instead of useless call', ...passMeta }
    }
    const c = callOrAllIn(callAmount, chips)
    if (c.kind === 'full') {
      return { action: 'CALL' as const, amount: callAmount, reasoning: decision.reasoning, ...passMeta }
    }
    if (c.kind === 'short') {
      return {
        action: 'CALL' as const,
        amount: c.amount,
        reasoning: `${decision.reasoning ?? 'call'}; sanitized: all-in for remaining chips`,
        ...passMeta,
      }
    }
    return { action: 'FOLD' as const, reasoning: 'sanitized: fold instead of impossible call', ...passMeta }
  }

  if (decision.action === 'RAISE') {
    const proposed = typeof decision.amount === 'number' ? Math.floor(decision.amount) : 0

    if (callAmount > chips) {
      const c = callOrAllIn(callAmount, chips)
      if (c.kind === 'short') {
        return {
          action: 'CALL' as const,
          amount: c.amount,
          reasoning: 'sanitized: all-in call instead of impossible raise',
          ...passMeta,
        }
      }
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
