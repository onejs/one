import { StrictMode } from 'react'
import { act, create } from 'react-test-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubAudioElement } from './audio-element-fake'
import type { AudioPlayer, AudioSource, AudioStatus } from '../src/platform/audio/types'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  vi.useRealTimers()
})

async function loadHooks() {
  return import('../src/platform/audio/hooks')
}

function Probe({
  source,
  onPlayer,
  onStatus,
}: {
  source: AudioSource
  onPlayer: (player: AudioPlayer) => void
  onStatus: (status: AudioStatus) => void
}) {
  const { useAudioPlayer, useAudioPlayerStatus } = Probe.hooks
  const player = useAudioPlayer(source, { updateInterval: 50 })
  const status = useAudioPlayerStatus(player)
  onPlayer(player)
  onStatus(status)
  return null
}
Probe.hooks = {} as Awaited<ReturnType<typeof loadHooks>>

describe('audio player hooks', () => {
  it('creates one player, replaces on source change, removes on unmount', async () => {
    stubAudioElement()
    Probe.hooks = await loadHooks()
    const players: AudioPlayer[] = []
    let root: ReturnType<typeof create>
    await act(async () => {
      root = create(
        <Probe source="https://example.com/a.mp3" onPlayer={(p) => players.push(p)} onStatus={() => {}} />
      )
    })
    await act(async () => {
      root.update(
        <Probe source="https://example.com/b.mp3" onPlayer={(p) => players.push(p)} onStatus={() => {}} />
      )
    })
    const first = players[0]
    expect(players.every((player) => player === first)).toBe(true)
    // same player, source replaced rather than recreated.
    await act(async () => {
      root.unmount()
    })
    expect(() => first.play()).toThrow('AudioPlayer.play: the player was removed')
  })

  it('does not replace an identical source object on re-render', async () => {
    const created = stubAudioElement()
    Probe.hooks = await loadHooks()
    let root: ReturnType<typeof create>
    await act(async () => {
      root = create(
        <Probe
          source={{ uri: 'https://example.com/a.mp3' }}
          onPlayer={() => {}}
          onStatus={() => {}}
        />
      )
    })
    const loads = created[0].loadCalls
    await act(async () => {
      root.update(
        <Probe
          source={{ uri: 'https://example.com/a.mp3' }}
          onPlayer={() => {}}
          onStatus={() => {}}
        />
      )
    })
    // replace() calls element.load(); no replace means no new load.
    expect(created[0].loadCalls).toBe(loads)
    await act(async () => {
      root.unmount()
    })
  })

  it('publishes status updates to subscribers', async () => {
    vi.useFakeTimers()
    const created = stubAudioElement()
    Probe.hooks = await loadHooks()
    const statuses: AudioStatus[] = []
    let root: ReturnType<typeof create>
    await act(async () => {
      root = create(
        <Probe source="https://example.com/a.mp3" onPlayer={() => {}} onStatus={(s) => statuses.push(s)} />
      )
    })
    expect(statuses.length).toBeGreaterThanOrEqual(1)
    expect(statuses[0]).toMatchObject({ playing: false, isLoaded: false })
    await act(async () => {
      created[0].readyState = 4
      created[0].duration = 90
      created[0].paused = false
      await vi.advanceTimersByTimeAsync(60)
    })
    const last = statuses[statuses.length - 1]
    expect(last).toMatchObject({ playing: true, isLoaded: true, duration: 90 })
    await act(async () => {
      root.unmount()
    })
  })

  it('survives a StrictMode remount with a usable player', async () => {
    stubAudioElement()
    Probe.hooks = await loadHooks()
    const players: AudioPlayer[] = []
    let root: ReturnType<typeof create>
    await act(async () => {
      root = create(
        <StrictMode>
          <Probe source="https://example.com/a.mp3" onPlayer={(p) => players.push(p)} onStatus={() => {}} />
        </StrictMode>
      )
    })
    // the remount removes the first player and swaps in a fresh one.
    expect(players.length).toBeGreaterThanOrEqual(2)
    const first = players[0]
    const live = players[players.length - 1]
    expect(() => first.play()).toThrow('AudioPlayer.play: the player was removed')
    expect(() => live.play()).not.toThrow()
    await act(async () => {
      root.unmount()
    })
    expect(() => live.play()).toThrow('AudioPlayer.play: the player was removed')
  })
})
