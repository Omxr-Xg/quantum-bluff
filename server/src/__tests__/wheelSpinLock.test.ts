import { wheelSpinLock } from '../wheel/wheelSpinLock.js'

describe('wheelSpinLock', () => {
  it('empêche un second spin simultané', () => {
    expect(wheelSpinLock.tryAcquire('u1')).toBe(true)
    expect(wheelSpinLock.tryAcquire('u1')).toBe(false)
    wheelSpinLock.release('u1')
    expect(wheelSpinLock.tryAcquire('u1')).toBe(true)
    wheelSpinLock.release('u1')
  })
})
