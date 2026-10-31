import type { AudioNowPlayingInfo, AudioRemoteCommandEvent } from '../specs/OneAudio.nitro'

// the one browser media session, owned by the singleton or by one player
// instance. a claim moves ownership without clearing the metadata first;
// owners release only their own claim, so an old owner's cleanup never
// clears a newer one, and a claim that finishes after a newer claim or
// release (slow artwork) rejects instead of taking ownership back.

export type NowPlayingOwner = {
  // 'global' for the singleton, else the player id.
  key: string
  element: HTMLAudioElement
  play: () => Promise<unknown>
  pause: () => Promise<unknown>
  seek: (positionMs: number) => Promise<unknown>
}

const listeners = new Set<(event: AudioRemoteCommandEvent) => void>()
const syncEvents = ['play', 'pause', 'ended'] as const
let owner: NowPlayingOwner | undefined
let claim = 0
let pendingKey: string | undefined
let installed = false

function sync(): void {
  if (!owner || !navigator.mediaSession?.metadata) return
  navigator.mediaSession.playbackState =
    owner.element.paused || owner.element.ended ? 'paused' : 'playing'
}

function setOwner(next: NowPlayingOwner | undefined): void {
  if (owner?.element !== next?.element) {
    for (const event of syncEvents) {
      owner?.element.removeEventListener(event, sync)
      next?.element.addEventListener(event, sync)
    }
  }
  owner = next
}

async function remote(event: AudioRemoteCommandEvent): Promise<void> {
  const current = owner
  if (!current || !navigator.mediaSession?.metadata) return
  try {
    if (event.type === 'play') await current.play()
    else if (event.type === 'pause') await current.pause()
    else await current.seek(event.positionMs!)
  } catch {
    // the browser callback has no error channel; failed work emits no success.
    return
  }
  if (owner !== current) return
  sync()
  const emitted = current.key === 'global' ? event : { ...event, playerId: current.key }
  for (const listener of [...listeners]) listener(emitted)
}

function install(session: MediaSession): void {
  if (installed) return
  session.setActionHandler('play', () => remote({ type: 'play' }))
  session.setActionHandler('pause', () => remote({ type: 'pause' }))
  session.setActionHandler('seekto', (event) =>
    remote({ type: 'seek', positionMs: (event.seekTime ?? 0) * 1000 })
  )
  installed = true
}

export async function claimNowPlaying(
  next: NowPlayingOwner,
  info: AudioNowPlayingInfo,
  verb: string,
  alive: () => boolean
): Promise<void> {
  if (!info.title.trim()) throw new Error(`${verb}: title must not be empty`)
  if (!navigator.mediaSession) throw new Error('Audio: Media Session is unavailable')
  const ticket = ++claim
  pendingKey = next.key
  if (info.artworkUri) {
    const artwork = new window.Image()
    artwork.src = info.artworkUri
    await artwork.decode()
    if (!alive()) throw new Error(`${verb}: playback was replaced`)
    if (ticket !== claim) throw new Error(`${verb}: now playing was claimed or cleared again`)
  }
  if (pendingKey === next.key) pendingKey = undefined
  const session = navigator.mediaSession
  setOwner(next)
  session.metadata = new MediaMetadata({
    title: info.title,
    artist: info.artist,
    album: info.albumTitle,
    artwork: info.artworkUri ? [{ src: info.artworkUri }] : [],
  })
  install(session)
  sync()
}

export function releaseNowPlaying(key: string): void {
  if (pendingKey === key) {
    claim++
    pendingKey = undefined
  }
  if (owner?.key !== key) return
  setOwner(undefined)
  if (typeof window === 'undefined' || !navigator.mediaSession) return
  const session = navigator.mediaSession
  if (installed)
    for (const action of ['play', 'pause', 'seekto'] as const)
      session.setActionHandler(action, null)
  installed = false
  session.metadata = null
  session.playbackState = 'none'
}

export function addRemoteListener(
  onEvent: (event: AudioRemoteCommandEvent) => void
): () => void {
  listeners.add(onEvent)
  return () => {
    listeners.delete(onEvent)
  }
}
