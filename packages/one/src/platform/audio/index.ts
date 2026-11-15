import { Audio as unavailable } from './unavailable'
import { validateCallback } from '../validateCallback'
import type {
  AudioPlaybackStatus,
  AudioPlayOptions,
  AudioRecordingPermission,
  AudioRecordingResult,
  AudioRecordingStatus,
  AudioNowPlayingInfo,
  AudioRemoteCommandEvent,
} from '../specs/OneAudio.nitro'
import { addRemoteListener, claimNowPlaying, releaseNowPlaying } from './nowPlaying'
import { AudioPlayer, createPlayer } from './player'
export type { PitchCorrectionQuality } from '../specs/OneAudio.nitro'
export type * from './types'
export type * from './unavailable'
let player: HTMLAudioElement | undefined
// a play with a position or paused flag, between creation and the landed
// seek. paused is the intent pause and resume update while it loads.
let pendingLoad:
  | { audio: HTMLAudioElement; paused: boolean; cancel?: () => void }
  | undefined
let playbackError: string | undefined
let permission: AudioRecordingPermission = 'undetermined'
let openingRecording = false
let recording:
  | {
      recorder: MediaRecorder
      stream: MediaStream
      chunks: Blob[]
      duration: number
      since: number
      stopping: boolean
      error?: Error
    }
  | undefined

async function getRecordingPermissionStatus(): Promise<AudioRecordingPermission> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia)
    return 'denied'
  try {
    const status = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    })
    permission = status.state === 'prompt' ? 'undetermined' : status.state
  } catch {
    /* safari may not expose microphone permission queries. */
  }
  return permission
}
async function microphone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia)
    throw new Error('Audio: microphone recording is unavailable')
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    permission = 'granted'
    return stream
  } catch (error) {
    if ((error as DOMException).name === 'NotAllowedError') permission = 'denied'
    throw error
  }
}
async function requestRecordingPermission(): Promise<AudioRecordingPermission> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia)
    return 'denied'
  try {
    const stream = await microphone()
    stream.getTracks().forEach((track) => track.stop())
  } catch (error) {
    if ((error as DOMException).name !== 'NotAllowedError') throw error
  }
  return permission
}
function playbackStatus(): AudioPlaybackStatus {
  if (!player) return { state: 'idle', positionMs: 0 }
  return {
    state:
      player.error || playbackError
        ? 'failed'
        : player.ended
          ? 'ended'
          : pendingLoad || player.readyState < 2
            ? 'loading'
            : player.paused
              ? 'paused'
              : 'playing',
    uri: player.src,
    positionMs: player.currentTime * 1000,
    ...(Number.isFinite(player.duration) && { durationMs: player.duration * 1000 }),
    ...(playbackError && { error: playbackError }),
  }
}
function requirePlayer(): HTMLAudioElement {
  if (!player) throw new Error('Audio: the playback operation is not ready')
  return player
}
function clearPlayer(): void {
  releaseNowPlaying('global')
  pendingLoad?.cancel?.()
  pendingLoad = undefined
  if (player) {
    player.pause()
    player.removeAttribute('src')
    player.load()
    player = undefined
  }
  playbackError = undefined
}
function recordingDuration(): number {
  if (!recording) return 0
  return (
    recording.duration +
    (recording.recorder.state === 'recording' ? performance.now() - recording.since : 0)
  )
}
function recordingStatus(): AudioRecordingStatus {
  if (!recording) return { state: 'idle', durationMs: 0 }
  if (recording.error) throw recording.error
  return {
    state:
      recording.recorder.state === 'paused'
        ? 'paused'
        : recording.recorder.state === 'recording'
          ? 'recording'
          : 'idle',
    durationMs: recordingDuration(),
  }
}
function requireRecorder() {
  if (!recording || recording.stopping || recording.recorder.state === 'inactive')
    throw recording?.error ?? new Error('Audio: the recording operation is not ready')
  return recording
}
function recorderChange(event: 'pause' | 'resume'): Promise<AudioRecordingStatus> {
  const session = requireRecorder()
  const target = event === 'pause' ? 'paused' : 'recording'
  if (session.recorder.state === target) return Promise.resolve(recordingStatus())
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      session.recorder.removeEventListener(event, done)
      session.recorder.removeEventListener('error', failed)
    }
    const done = () => {
      cleanup()
      resolve(recordingStatus())
    }
    const failed = () => {
      cleanup()
      reject(session.error ?? new Error('Audio: recording failed'))
    }
    session.recorder.addEventListener(event, done, { once: true })
    session.recorder.addEventListener('error', failed, { once: true })
    if (event === 'pause') {
      session.duration += performance.now() - session.since
      session.recorder.pause()
    } else {
      session.since = performance.now()
      session.recorder.resume()
    }
  })
}
// resolves once the element has metadata and sits at the position, without
// playing. replacement cancels it through the load's cancel hook.
function prepareAt(load: NonNullable<typeof pendingLoad>, positionMs: number): Promise<void> {
  const { audio } = load
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', ready)
      audio.removeEventListener('seeked', done)
      audio.removeEventListener('error', failed)
      load.cancel = undefined
    }
    let seconds = 0
    // a source without range support lands somewhere else, often 0; fail
    // rather than let a later resume play the opening.
    const done = () => {
      cleanup()
      if (Math.abs(audio.currentTime - seconds) > 0.25)
        reject(new Error('Audio.play: the source cannot seek to the position'))
      else resolve()
    }
    const failed = () => {
      cleanup()
      reject(new Error(`Audio.play: ${audio.error?.message || 'decoding failed'}`))
    }
    function ready() {
      audio.removeEventListener('loadedmetadata', ready)
      seconds = Math.min(
        positionMs / 1000,
        Number.isFinite(audio.duration) ? audio.duration : Infinity
      )
      if (audio.currentTime === seconds) return done()
      audio.addEventListener('seeked', done, { once: true })
      audio.currentTime = seconds
    }
    load.cancel = () => {
      cleanup()
      reject(new Error('Audio.play: playback was replaced'))
    }
    audio.addEventListener('error', failed, { once: true })
    if (audio.readyState >= 1) ready()
    else audio.addEventListener('loadedmetadata', ready, { once: true })
  })
}
export const Audio = Object.freeze({
  getRecordingPermissionStatus,
  requestRecordingPermission,
  play: async (uri: string, options?: AudioPlayOptions): Promise<AudioPlaybackStatus> => {
    if (typeof window === 'undefined') return unavailable.play(uri, options)
    if (openingRecording || recording)
      throw new Error('Audio.play: stop the current recording first')
    const url = new URL(uri, document.baseURI)
    if (!['https:', 'http:', 'blob:', 'data:'].includes(url.protocol))
      throw new Error('Audio.play: invalid browser audio URI')
    const prepare = options?.positionMs !== undefined || options?.paused !== undefined
    const positionMs = options?.positionMs ?? 0
    if (typeof positionMs !== 'number' || !Number.isFinite(positionMs) || positionMs < 0)
      throw new Error('Audio.play: position must be finite and nonnegative')
    clearPlayer()
    const audio = new window.Audio(url.href)
    player = audio
    audio.addEventListener('error', () => {
      if (player === audio)
        playbackError = audio.error?.message ?? 'Audio.play: decoding failed'
    })
    if (prepare) {
      const load: NonNullable<typeof pendingLoad> = { audio, paused: options?.paused ?? false }
      pendingLoad = load
      audio.preload = 'auto'
      try {
        await prepareAt(load, positionMs)
      } catch (error) {
        if (pendingLoad === load) {
          pendingLoad = undefined
          playbackError = (error as Error).message
        }
        throw error
      }
      if (player !== audio || pendingLoad !== load)
        throw new Error('Audio.play: playback was replaced')
      pendingLoad = undefined
      if (load.paused) return playbackStatus()
    }
    try {
      await audio.play()
    } catch (error) {
      if (player === audio) playbackError = String(error)
      throw error
    }
    if (player !== audio) throw new Error('Audio.play: playback was replaced')
    return playbackStatus()
  },
  getPlaybackStatus: async (): Promise<AudioPlaybackStatus> => playbackStatus(),
  pause: async (): Promise<AudioPlaybackStatus> => {
    if (typeof window === 'undefined') return unavailable.pause()
    const audio = requirePlayer()
    if (pendingLoad) {
      pendingLoad.paused = true
      return playbackStatus()
    }
    if (!audio.paused)
      await new Promise<void>((resolve) => {
        audio.addEventListener('pause', () => resolve(), { once: true })
        audio.pause()
      })
    return playbackStatus()
  },
  resume: async (): Promise<AudioPlaybackStatus> => {
    if (typeof window === 'undefined') return unavailable.resume()
    const audio = requirePlayer()
    // a prepared load plays itself once its seek lands.
    if (pendingLoad) {
      pendingLoad.paused = false
      return playbackStatus()
    }
    if (audio.ended) audio.currentTime = 0
    await audio.play()
    if (player !== audio) throw new Error('Audio.resume: playback was replaced')
    return playbackStatus()
  },
  seek: async (positionMs: number): Promise<AudioPlaybackStatus> => {
    if (typeof window === 'undefined') return unavailable.seek(positionMs)
    if (!Number.isFinite(positionMs) || positionMs < 0)
      throw new Error('Audio.seek: position must be finite and nonnegative')
    const audio = requirePlayer()
    if (audio.readyState < 1 || pendingLoad)
      throw new Error('Audio.seek: playback is not ready')
    const seconds = Math.min(
      positionMs / 1000,
      Number.isFinite(audio.duration) ? audio.duration : Infinity
    )
    if (audio.currentTime === seconds) return playbackStatus()
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        audio.removeEventListener('seeked', done)
        audio.removeEventListener('error', failed)
        audio.removeEventListener('emptied', failed)
      }
      const done = () => {
        cleanup()
        player === audio
          ? resolve()
          : reject(new Error('Audio.seek: playback was replaced'))
      }
      const failed = () => {
        cleanup()
        reject(new Error('Audio.seek: playback failed or stopped'))
      }
      audio.addEventListener('seeked', done, { once: true })
      audio.addEventListener('error', failed, { once: true })
      audio.addEventListener('emptied', failed, { once: true })
      audio.currentTime = seconds
    })
    return playbackStatus()
  },
  stop: async (): Promise<void> => {
    clearPlayer()
  },
  startRecording: async (): Promise<AudioRecordingStatus> => {
    if (typeof window === 'undefined') return unavailable.startRecording()
    if (player?.ended || player?.error || playbackError) clearPlayer()
    if (player || recording || openingRecording)
      throw new Error('Audio.startRecording: stop the current audio operation first')
    if (!window.MediaRecorder)
      throw new Error('Audio.startRecording: MediaRecorder is unavailable')
    openingRecording = true
    let stream: MediaStream | undefined
    try {
      stream = await microphone()
      const recorder = new MediaRecorder(stream)
      const session = {
        recorder,
        stream,
        chunks: [] as Blob[],
        duration: 0,
        since: performance.now(),
        stopping: false,
        error: undefined as Error | undefined,
      }
      recording = session
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size) session.chunks.push(event.data)
      })
      recorder.addEventListener('error', (event) => {
        session.error =
          (event as Event & { error?: Error }).error ??
          new Error('Audio: recording failed')
        stream!.getTracks().forEach((track) => track.stop())
      })
      recorder.start(250)
      return recordingStatus()
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop())
      recording = undefined
      throw error
    } finally {
      openingRecording = false
    }
  },
  getRecordingStatus: async (): Promise<AudioRecordingStatus> => recordingStatus(),
  pauseRecording: async (): Promise<AudioRecordingStatus> =>
    typeof window === 'undefined'
      ? unavailable.pauseRecording()
      : recorderChange('pause'),
  resumeRecording: async (): Promise<AudioRecordingStatus> =>
    typeof window === 'undefined'
      ? unavailable.resumeRecording()
      : recorderChange('resume'),
  stopRecording: async (): Promise<AudioRecordingResult> => {
    if (typeof window === 'undefined') return unavailable.stopRecording()
    if (!recording)
      throw new Error('Audio.stopRecording: the recording operation is not ready')
    const session = recording
    if (session.stopping)
      throw new Error('Audio.stopRecording: recording is already stopping')
    const durationMs = recordingDuration()
    session.stopping = true
    try {
      if (session.recorder.state !== 'inactive')
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            session.recorder.removeEventListener('stop', done)
            session.recorder.removeEventListener('error', failed)
          }
          const done = () => {
            cleanup()
            resolve()
          }
          const failed = () => {
            cleanup()
            reject(session.error ?? new Error('Audio: recording failed'))
          }
          session.recorder.addEventListener('stop', done, { once: true })
          session.recorder.addEventListener('error', failed, { once: true })
          session.recorder.stop()
        })
      if (session.error) throw session.error
      const blob = new Blob(session.chunks, { type: session.recorder.mimeType })
      if (!blob.size)
        throw new Error('Audio.stopRecording: recording produced an empty file')
      const uri = URL.createObjectURL(blob)
      const audio = new window.Audio()
      try {
        await new Promise<void>((resolve, reject) => {
          const cleanup = () => {
            clearTimeout(deadline)
            audio.onloadedmetadata = null
            audio.onerror = null
          }
          const deadline = setTimeout(() => {
            cleanup()
            reject(new Error('Audio.stopRecording: recording did not decode'))
          }, 10_000)
          audio.onloadedmetadata = () => {
            cleanup()
            resolve()
          }
          audio.onerror = () => {
            cleanup()
            reject(new Error('Audio.stopRecording: recording produced no playable audio'))
          }
          audio.src = uri
          audio.load()
        })
        return { uri, durationMs, size: blob.size }
      } catch (error) {
        URL.revokeObjectURL(uri)
        throw error
      } finally {
        audio.removeAttribute('src')
        audio.load()
      }
    } finally {
      session.stream.getTracks().forEach((track) => track.stop())
      recording = undefined
    }
  },
  watchInterruptions: unavailable.watchInterruptions,
  setNowPlayingInfo: async (info: AudioNowPlayingInfo): Promise<void> => {
    if (typeof window === 'undefined') return unavailable.setNowPlayingInfo(info)
    const audio = requirePlayer()
    await claimNowPlaying(
      {
        key: 'global',
        element: audio,
        play: Audio.resume,
        pause: Audio.pause,
        seek: Audio.seek,
      },
      info,
      'Audio.setNowPlayingInfo',
      () => player === audio
    )
  },
  clearNowPlayingInfo: async (): Promise<void> => {
    if (typeof window === 'undefined') return unavailable.clearNowPlayingInfo()
    releaseNowPlaying('global')
  },
  watchRemoteCommands: (
    onEvent: (event: AudioRemoteCommandEvent) => void
  ): (() => void) => {
    validateCallback(onEvent, 'Audio.watchRemoteCommands: onEvent must be a function')
    if (typeof window === 'undefined' || !navigator.mediaSession)
      return unavailable.watchRemoteCommands(onEvent)
    return addRemoteListener(onEvent)
  },
  AudioPlayer,
  createPlayer,
})
