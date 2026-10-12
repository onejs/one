import { useEffect, useId, useRef, useState } from 'react'
import { createPlayer } from './player'
import type {
  AudioPlayer,
  AudioPlayerOptions,
  AudioSource,
  AudioStatus,
} from './types'

// player hooks keep expo's names. source changes replace the player's source;
// the player is removed on unmount.

// StrictMode double-invokes the useState initializer, so render-phase
// allocation can create players the effect cleanup never sees. every
// allocated player is tracked per hook instance (the id is stable across the
// strict double render); the mount effect releases all but the retained one,
// and unmount releases the retained one. this is the effect-ownership of
// every allocation, keeping the synchronous return.
const unclaimedPlayers = new Map<string, AudioPlayer[]>()

function trackPlayer(instanceId: string, player: AudioPlayer): void {
  const pending = unclaimedPlayers.get(instanceId)
  if (pending) {
    pending.push(player)
  } else {
    unclaimedPlayers.set(instanceId, [player])
  }
}

function releaseDiscardedPlayers(instanceId: string, retained: AudioPlayer): void {
  const pending = unclaimedPlayers.get(instanceId)
  unclaimedPlayers.delete(instanceId)
  if (!pending) return
  for (const player of pending) {
    if (player !== retained) player.remove()
  }
}

export function useAudioPlayer(
  source: AudioSource = null,
  options: AudioPlayerOptions = {}
): AudioPlayer {
  const instanceId = useId()
  const [player, setPlayer] = useState(() => {
    const created = createPlayer(source, options)
    trackPlayer(instanceId, created)
    return created
  })
  const key = JSON.stringify(source ?? null)
  const first = useRef(true)
  // the key re-runs the effect only when the source value changes, so an
  // identical source object on re-render does not reload the player.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    try {
      player.replace(source)
    } catch (error) {
      // StrictMode remounts run cleanup (which removes the player) without
      // unmounting: swap the corpse for a fresh player on the same source.
      if (error instanceof Error && error.message.includes('was removed')) {
        setPlayer(createPlayer(source, options))
      } else {
        throw error
      }
    }
  }, [key])
  useEffect(() => {
    // own every render-phase allocation, including a StrictMode-discarded
    // initializer result; unmount releases the retained player.
    releaseDiscardedPlayers(instanceId, player)
    return () => player.remove()
    // instanceId is stable for the hook instance; it keys the discard sweep.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player])
  return player
}

export function useAudioPlayerStatus(player: AudioPlayer): AudioStatus {
  const [status, setStatus] = useState<AudioStatus>(() => player.getStatus())
  useEffect(() => {
    // the remount window between remove and the fresh player has no live
    // player; skip it, the player dep resubscribes once it swaps.
    let subscription: { remove(): void } | undefined
    try {
      setStatus(player.getStatus())
      subscription = player.addListener('playbackStatusUpdate', setStatus)
    } catch {
      return
    }
    return () => subscription.remove()
  }, [player])
  return status
}
