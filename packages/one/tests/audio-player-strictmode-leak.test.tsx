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

async function loadPlayerModule() {
  return import('../src/platform/audio/player')
}

async function loadHooks() {
  return import('../src/platform/audio/hooks')
}

function Probe({ source }: { source: AudioSource }) {
  const { useAudioPlayer, useAudioPlayerStatus } = Probe.hooks
  const player = useAudioPlayer(source, { updateInterval: 50 })
  const status: AudioStatus = useAudioPlayerStatus(player)
  // read the status so the subscription path mounts like production usage.
  void status
  return null
}
Probe.hooks = {} as Awaited<ReturnType<typeof loadHooks>>

// the fake audio transport records every constructed element (one per
// allocated player). a released player is one whose remove() ran; the
// remove spy's `instances` are the distinct `this` receivers, so its size is
// the released count and created minus released is the unreleased count.
async function mountAndUnmount(strict: boolean) {
  const created = stubAudioElement()
  const playerModule = await loadPlayerModule()
  Probe.hooks = await loadHooks()
  const removeSpy = vi.spyOn(playerModule.AudioPlayer.prototype, 'remove')
  let root: ReturnType<typeof create> | undefined
  await act(async () => {
    const tree = <Probe source="https://example.com/a.mp3" />
    root = create(strict ? <StrictMode>{tree}</StrictMode> : tree)
  })
  await act(async () => {
    root!.unmount()
  })
  return { allocated: created.length, released: new Set(removeSpy.mock.instances).size }
}

describe('audio player StrictMode ownership', () => {
  it('releases every allocated player on StrictMode mount and unmount', async () => {
    const { allocated, released } = await mountAndUnmount(true)
    // StrictMode double-invokes the state initializer, so more than one
    // player is allocated; the assertion below guards that premise.
    expect(allocated).toBeGreaterThanOrEqual(2)
    expect(released).toBe(allocated)
  })

  it('releases its single player on an ordinary mount and unmount', async () => {
    const { allocated, released } = await mountAndUnmount(false)
    expect(allocated).toBe(1)
    expect(released).toBe(1)
  })
})
