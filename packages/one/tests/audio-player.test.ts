import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubAudioElement } from './audio-element-fake'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn() },
}))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.useRealTimers()
})

async function loadNativePlayer(hybrid: unknown) {
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  return import('../src/platform/audio/player.native')
}

// an in-memory hybrid standing in for the native module. it tracks player
// state per id; assertions target js mapping, validation and listener
// behavior, never native playback semantics.
function fakeHybrid() {
  type Player = {
    uri?: string
    playing: boolean
    loaded: boolean
    time: number
    duration: number
    loop: boolean
    muted: boolean
    volume: number
    rate: number
    pitch: boolean
    finished: boolean
    error?: string
  }
  const players = new Map<string, Player>()
  let next = 1
  const fail = (code: string, verb: string, detail: string): never => {
    throw Object.assign(new Error(`${code}: Audio.${verb}: ${detail}`), { code })
  }
  const get = (id: string): Player => {
    const player = players.get(id)
    if (!player) fail('E_AUDIO_STATE', 'player', 'unknown player')
    return player!
  }
  const status = (id: string) => {
    const player = get(id)
    return {
      currentTime: player.time,
      duration: player.duration,
      playing: player.playing,
      paused: player.loaded && !player.playing,
      isLoaded: player.loaded,
      isBuffering: false,
      loop: player.loop,
      muted: player.muted,
      volume: player.volume,
      playbackRate: player.rate,
      shouldCorrectPitch: player.pitch,
      ...(player.error !== undefined && { error: player.error }),
      didJustFinish: player.finished,
    }
  }
  return {
    players,
    hybrid: {
      createPlayer: (sourceUri?: string) => {
        const id = `player-${next++}`
        players.set(id, {
          uri: sourceUri,
          playing: false,
          loaded: sourceUri !== undefined,
          time: 0,
          duration: sourceUri === undefined ? 0 : 120,
          loop: false,
          muted: false,
          volume: 1,
          rate: 1,
          pitch: true,
          finished: false,
        })
        return id
      },
      playerPlay: (id: string) => {
        get(id).playing = true
      },
      playerPause: (id: string) => {
        get(id).playing = false
      },
      playerSeek: async (id: string, seconds: number) => {
        get(id).time = seconds
      },
      playerReplace: (id: string, sourceUri?: string) => {
        const player = get(id)
        player.uri = sourceUri
        player.loaded = sourceUri !== undefined
        player.time = 0
        player.finished = false
        player.error = undefined
      },
      removePlayer: (id: string) => {
        if (!players.delete(id)) fail('E_AUDIO_STATE', 'removePlayer', 'unknown player')
      },
      getPlayerStatus: status,
      setPlayerRate: (id: string, rate: number) => {
        if (rate < 0 || rate > 2) fail('E_AUDIO_RATE', 'setPlayerRate', 'outside the range')
        get(id).rate = rate
      },
      setPlayerVolume: (id: string, volume: number) => {
        get(id).volume = volume
      },
      setPlayerMuted: (id: string, muted: boolean) => {
        get(id).muted = muted
      },
      setPlayerLoop: (id: string, loop: boolean) => {
        get(id).loop = loop
      },
      setPlayerPitchCorrection: (id: string, enabled: boolean) => {
        get(id).pitch = enabled
      },
    },
  }
}

describe('native AudioPlayer', () => {
  it('creates players with normalized sources and independent state', async () => {
    const { createPlayer } = await loadNativePlayer(fakeHybrid().hybrid)
    const first = createPlayer('file:///a.mp3')
    const second = createPlayer({ uri: 'https://example.com/b.mp3', headers: { a: 'b' } })
    const empty = createPlayer()
    expect(first.id).not.toBe(second.id)
    expect(first.isLoaded).toBe(true)
    expect(first.duration).toBe(120)
    expect(empty.isLoaded).toBe(false)
    expect(empty.duration).toBe(0)
    first.play()
    expect(first.playing).toBe(true)
    expect(first.paused).toBe(false)
    expect(second.playing).toBe(false)
    first.pause()
    expect(first.playing).toBe(false)
    expect(first.paused).toBe(true)
    await first.seekTo(30)
    expect(first.currentTime).toBe(30)
  })

  it('reads and writes props with validation', async () => {
    const { createPlayer } = await loadNativePlayer(fakeHybrid().hybrid)
    const player = createPlayer('file:///a.mp3')
    expect(player.volume).toBe(1)
    player.volume = 0.5
    expect(player.volume).toBe(0.5)
    player.muted = true
    player.loop = true
    player.shouldCorrectPitch = false
    expect(player.muted).toBe(true)
    expect(player.loop).toBe(true)
    expect(player.shouldCorrectPitch).toBe(false)
    expect(player.isAudioSamplingSupported).toBe(false)
    expect(() => {
      player.volume = 2
    }).toThrow('AudioPlayer.volume: expected volume between 0 and 1')
    expect(() => {
      player.muted = 'yes' as never
    }).toThrow('AudioPlayer.muted: expected a boolean')
    expect(() => player.seekTo(-1)).toThrow(
      'AudioPlayer.seekTo: expected a finite nonnegative seek position in seconds'
    )
  })

  it('sets playback rate and restores the coded range error', async () => {
    const { createPlayer } = await loadNativePlayer(fakeHybrid().hybrid)
    const player = createPlayer('file:///a.mp3')
    player.setPlaybackRate(1.5, 'high')
    expect(player.playbackRate).toBe(1.5)
    expect(() => player.setPlaybackRate(3)).toThrow(
      expect.objectContaining({ code: 'E_AUDIO_RATE' })
    )
    expect(() => player.setPlaybackRate(Number.NaN)).toThrow(
      'AudioPlayer.setPlaybackRate: expected a finite playback rate'
    )
    expect(() => player.setPlaybackRate(1, 'ultra' as never)).toThrow(
      "AudioPlayer.setPlaybackRate: expected pitch quality 'low', 'medium' or 'high'"
    )
  })

  it('reports expo-shaped status with the mute quirk', async () => {
    const { createPlayer } = await loadNativePlayer(fakeHybrid().hybrid)
    const player = createPlayer('file:///a.mp3')
    expect(player.getStatus()).toEqual({
      currentTime: 0,
      didJustFinish: false,
      duration: 120,
      error: null,
      id: player.id,
      isBuffering: false,
      isLoaded: true,
      loop: false,
      mute: false,
      playbackRate: 1,
      playing: false,
      shouldCorrectPitch: true,
    })
  })

  it('replaces sources and removes idempotently', async () => {
    const { createPlayer } = await loadNativePlayer(fakeHybrid().hybrid)
    const player = createPlayer('file:///a.mp3')
    player.replace('file:///b.mp3')
    expect(player.isLoaded).toBe(true)
    player.replace(null)
    expect(player.isLoaded).toBe(false)
    player.remove()
    player.remove()
    expect(() => player.play()).toThrow('AudioPlayer.play: the player was removed')
    expect(() => player.currentTime).toThrow('AudioPlayer.status: the player was removed')
    expect(() => player.getStatus()).toThrow('AudioPlayer.status: the player was removed')
  })

  it('validates sources and options at creation', async () => {
    const { createPlayer } = await loadNativePlayer(fakeHybrid().hybrid)
    expect(() => createPlayer(7)).toThrow('Audio.createPlayer: assetId sources are not supported')
    expect(() => createPlayer('  ')).toThrow('Audio.createPlayer: expected a non-empty audio uri')
    expect(() => createPlayer({ uri: 7 } as never)).toThrow(
      'Audio.createPlayer: expected a non-empty audio uri'
    )
    expect(() => createPlayer('file:///a.mp3', { updateInterval: 0 })).toThrow(
      'Audio.createPlayer: expected updateInterval to be a positive number of milliseconds'
    )
    expect(() => createPlayer('file:///a.mp3', { crossOrigin: 'yes' as never })).toThrow(
      "Audio.createPlayer: expected crossOrigin 'anonymous' or 'use-credentials'"
    )
    expect(() =>
      createPlayer('file:///a.mp3', { headers: undefined } as never)
    ).not.toThrow()
  })

  it('emits status to listeners on subscribe and on interval', async () => {
    vi.useFakeTimers()
    const { createPlayer } = await loadNativePlayer(fakeHybrid().hybrid)
    const player = createPlayer('file:///a.mp3', { updateInterval: 100 })
    const seen: string[] = []
    const subscription = player.addListener('playbackStatusUpdate', (status) =>
      seen.push(`${status.playing}:${status.currentTime}`)
    )
    await vi.advanceTimersByTimeAsync(0)
    expect(seen).toEqual(['false:0'])
    await player.seekTo(10)
    player.play()
    await vi.advanceTimersByTimeAsync(100)
    expect(seen).toEqual(['false:0', 'true:10'])
    subscription.remove()
    await vi.advanceTimersByTimeAsync(500)
    expect(seen).toHaveLength(2)
  })

  it('validates listener subscriptions and clears them all', async () => {
    const { createPlayer } = await loadNativePlayer(fakeHybrid().hybrid)
    const player = createPlayer('file:///a.mp3')
    expect(() => player.addListener('audioSampleUpdate' as never, () => {})).toThrow(
      "AudioPlayer.addListener: expected 'playbackStatusUpdate'"
    )
    expect(() => player.addListener('playbackStatusUpdate', 'x' as never)).toThrow(
      'AudioPlayer.addListener: expected a listener function'
    )
    let calls = 0
    player.addListener('playbackStatusUpdate', () => {
      calls++
    })
    player.removeAllListeners()
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(calls).toBe(0)
    player.remove()
    expect(() => player.addListener('playbackStatusUpdate', () => {})).toThrow(
      'AudioPlayer.addListener: the player was removed'
    )
  })
})

describe('web AudioPlayer', () => {
  it('drives one element per player with independent state', async () => {
    const created = stubAudioElement()
    const { createPlayer } = await import('../src/platform/audio/player')
    const first = createPlayer('https://example.com/a.mp3')
    const second = createPlayer()
    expect(created).toHaveLength(2)
    expect(created[0].src).toBe('https://example.com/a.mp3')
    expect(created[1].src).toBe('')
    expect(first.id).not.toBe(second.id)
    created[0].duration = 120
    created[0].readyState = 4
    expect(first.duration).toBe(120)
    expect(first.isLoaded).toBe(true)
    expect(second.duration).toBe(0)
    expect(second.isLoaded).toBe(false)
    first.play()
    expect(first.playing).toBe(true)
    expect(first.paused).toBe(false)
    first.pause()
    expect(first.playing).toBe(false)
    created[0].seeking = false
    await first.seekTo(30)
    expect(created[0].currentTime).toBe(30)
  })

  it('waits for seeked while seeking and tracks finish and errors', async () => {
    const created = stubAudioElement()
    const { createPlayer } = await import('../src/platform/audio/player')
    const player = createPlayer('https://example.com/a.mp3')
    created[0].seeking = true
    let resolved = false
    const seeked = player.seekTo(5).then(() => {
      resolved = true
    })
    expect(resolved).toBe(false)
    created[0].fire('seeked')
    await seeked
    expect(resolved).toBe(true)
    created[0].fire('ended')
    expect(player.getStatus().didJustFinish).toBe(true)
    player.play()
    expect(player.getStatus().didJustFinish).toBe(false)
    created[0].error = { message: 'decode failed' }
    created[0].fire('error')
    expect(player.getStatus().error).toBe('decode failed')
    player.replace('https://example.com/b.mp3')
    expect(player.getStatus().error).toBeNull()
    expect(created[0].src).toBe('https://example.com/b.mp3')
    player.replace(null)
    expect(created[0].src).toBe('')
  })

  it('maps props, rate and pitch onto the element', async () => {
    const created = stubAudioElement()
    const { createPlayer } = await import('../src/platform/audio/player')
    const player = createPlayer('https://example.com/a.mp3', { crossOrigin: 'anonymous' })
    expect(created[0].crossOrigin).toBe('anonymous')
    player.volume = 0.25
    player.muted = true
    player.loop = true
    player.shouldCorrectPitch = false
    expect(created[0].volume).toBe(0.25)
    expect(created[0].muted).toBe(true)
    expect(created[0].loop).toBe(true)
    expect(created[0].preservesPitch).toBe(false)
    player.setPlaybackRate(1.5, 'high')
    expect(created[0].playbackRate).toBe(1.5)
    expect(player.getStatus().playbackRate).toBe(1.5)
    expect(() => player.setPlaybackRate(3)).toThrow(
      expect.objectContaining({ code: 'E_AUDIO_RATE' })
    )
    player.remove()
    expect(created[0].paused).toBe(true)
    expect(created[0].src).toBe('')
    expect(() => player.play()).toThrow('AudioPlayer.play: the player was removed')
  })

  it('emits status to web listeners', async () => {
    vi.useFakeTimers()
    stubAudioElement()
    const { createPlayer } = await import('../src/platform/audio/player')
    const player = createPlayer('https://example.com/a.mp3', { updateInterval: 50 })
    const seen: number[] = []
    player.addListener('playbackStatusUpdate', (status) => seen.push(status.currentTime))
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(100)
    expect(seen.length).toBeGreaterThanOrEqual(2)
    player.removeAllListeners()
  })
})
