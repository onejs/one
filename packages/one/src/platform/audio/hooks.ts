import { useEffect, useRef, useState } from 'react'
import { createPlayer } from './player'
import type {
  AudioPlayer,
  AudioPlayerOptions,
  AudioSource,
  AudioStatus,
} from './types'

// player hooks keep expo's names. source changes replace the player's source;
// the player is removed on unmount.

export function useAudioPlayer(
  source: AudioSource = null,
  options: AudioPlayerOptions = {}
): AudioPlayer {
  const [player, setPlayer] = useState(() => createPlayer(source, options))
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
  useEffect(() => () => player.remove(), [player])
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
