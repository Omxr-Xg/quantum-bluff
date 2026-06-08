import {
  clearBeloteAutoFillTimer,
  rescheduleBeloteAutoFill,
} from '../beloteRoomAutoFill.service.js'

describe('beloteRoomAutoFill', () => {
  it('clears timer without throwing', () => {
    clearBeloteAutoFillTimer('nonexistent-room')
    rescheduleBeloteAutoFill('nonexistent-room')
    expect(true).toBe(true)
  })
})
