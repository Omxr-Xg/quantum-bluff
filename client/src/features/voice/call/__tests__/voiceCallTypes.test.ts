import { describe, expect, it } from 'vitest'
import { CallState, canTransitionCallState } from '../voiceCallTypes'

describe('CallState transitions', () => {
  it('allows IDLE → OUTGOING', () => {
    expect(canTransitionCallState(CallState.IDLE, CallState.OUTGOING)).toBe(true)
  })

  it('allows OUTGOING → ACCEPTED → NEGOTIATING → CONNECTED', () => {
    expect(canTransitionCallState(CallState.OUTGOING, CallState.ACCEPTED)).toBe(true)
    expect(canTransitionCallState(CallState.ACCEPTED, CallState.NEGOTIATING)).toBe(true)
    expect(canTransitionCallState(CallState.NEGOTIATING, CallState.CONNECTED)).toBe(true)
  })

  it('rejects invalid jumps', () => {
    expect(canTransitionCallState(CallState.IDLE, CallState.CONNECTED)).toBe(false)
    expect(canTransitionCallState(CallState.OUTGOING, CallState.NEGOTIATING)).toBe(false)
  })
})
