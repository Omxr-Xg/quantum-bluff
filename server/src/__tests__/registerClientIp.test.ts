import type { Request } from 'express'
import { getRegisterClientIp } from '../utils/registerClientIp.js'

describe('getRegisterClientIp', () => {
  const base = { headers: {}, ip: '', socket: { remoteAddress: undefined } } as unknown as Request

  it('prefers CF-Connecting-IP when present', () => {
    const req = {
      ...base,
      headers: { 'cf-connecting-ip': '203.0.113.9' },
      ip: '10.0.0.1',
    } as unknown as Request
    expect(getRegisterClientIp(req)).toBe('203.0.113.9')
  })

  it('falls back to X-Forwarded-For first hop', () => {
    const req = {
      ...base,
      headers: { 'x-forwarded-for': '198.51.100.2, 10.0.0.1' },
      ip: '10.0.0.1',
    } as unknown as Request
    expect(getRegisterClientIp(req)).toBe('198.51.100.2')
  })
})
