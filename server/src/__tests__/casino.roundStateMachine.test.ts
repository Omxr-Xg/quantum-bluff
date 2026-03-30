import { assertRoundTransition } from '../casino/services/roundStateMachine.service.js'

describe('casino round state machine', () => {
  it('accepts valid transition chain', () => {
    expect(() => {
      assertRoundTransition('CREATED', 'BETTING_OPEN')
      assertRoundTransition('BETTING_OPEN', 'BETTING_CLOSED')
      assertRoundTransition('BETTING_CLOSED', 'SPINNING')
      assertRoundTransition('SPINNING', 'RESULT_READY')
      assertRoundTransition('RESULT_READY', 'SETTLED')
      assertRoundTransition('SETTLED', 'ARCHIVED')
    }).not.toThrow()
  })

  it('rejects invalid transition', () => {
    expect(() =>
      assertRoundTransition('CREATED', 'RESULT_READY')
    ).toThrow('INVALID_ROUND_STATE_TRANSITION')
  })
})

