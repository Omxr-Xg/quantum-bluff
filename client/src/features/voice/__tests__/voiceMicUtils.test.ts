import { describe, expect, it } from 'vitest'
import { hasLiveLocalAudio } from '../voiceMicUtils'

function mockTrack(readyState: MediaStreamTrackState): MediaStreamTrack {
  return { readyState, kind: 'audio' } as MediaStreamTrack
}

function mockStream(tracks: MediaStreamTrack[]): MediaStream {
  return { getAudioTracks: () => tracks } as MediaStream
}

describe('hasLiveLocalAudio', () => {
  it('returns false for null/undefined', () => {
    expect(hasLiveLocalAudio(null)).toBe(false)
    expect(hasLiveLocalAudio(undefined)).toBe(false)
  })

  it('returns false when all tracks are ended', () => {
    expect(hasLiveLocalAudio(mockStream([mockTrack('ended')]))).toBe(false)
  })

  it('returns true when at least one track is live', () => {
    expect(hasLiveLocalAudio(mockStream([mockTrack('ended'), mockTrack('live')]))).toBe(true)
    expect(hasLiveLocalAudio(mockStream([mockTrack('live')]))).toBe(true)
  })
})
