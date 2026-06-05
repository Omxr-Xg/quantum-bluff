import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VoiceMediaManager } from '../VoiceMediaManager'

describe('VoiceMediaManager', () => {
  let track: { enabled: boolean; readyState: string; kind: string; stop: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    track = { enabled: true, readyState: 'live', kind: 'audio', stop: vi.fn() }
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(async () => ({
          getAudioTracks: () => [track],
          getTracks: () => [track],
        })),
      },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('mute only toggles track.enabled', async () => {
    const media = new VoiceMediaManager()
    await media.ensureMic()
    media.setMicMuted(true)
    expect(track.enabled).toBe(false)
    media.setMicMuted(false)
    expect(track.enabled).toBe(true)
    media.destroy()
  })
})
