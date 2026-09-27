import { useEffect, useRef, useState } from 'react'
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const pause = (durationMs: number) => new Promise((resolve) => setTimeout(resolve, durationMs))

export default function OneNativeAudio() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('none')
  const [background, setBackground] = useState('idle')
  const backgroundResult = useRef<{
    state: string; start: number; advanced: number; elapsed: number
  } | null>(null)
  const backgroundSubscription = useRef<ReturnType<typeof AppState.addEventListener> | null>(null)

  useEffect(() => () => backgroundSubscription.current?.remove(), [])

  async function prepareBackgroundPlayback() {
    backgroundSubscription.current?.remove()
    backgroundSubscription.current = null
    setBackground('preparing')
    try {
      const audio = One.iOS.Audio
      const fs = One.iOS.FileSystem
      const uri = new URL('one-native-background-audio.wav', fs.getDirectories().cache).href
      // a 60 second, 8 khz mono pcm wav: 44 header bytes and zero samples.
      const wav = 'UklGRiSmDgBXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQCmDgAA' +
        'A'.repeat(1_279_996) + 'AAA='
      await fs.writeFile(uri, wav, 'base64')
      if ((await fs.getInfo(uri)).size !== 960_044) throw new Error('wav bytes did not match')
      await audio.play(uri)
      let playback = await audio.getPlaybackStatus()
      const deadline = Date.now() + 5000
      while (Date.now() < deadline && playback.state !== 'playing') {
        await pause(100)
        playback = await audio.getPlaybackStatus()
      }
      if (playback.state !== 'playing' || !playback.durationMs ||
        Math.abs(playback.durationMs - 60_000) > 500) {
        throw new Error(`clip did not start: ${playback.state}, ${playback.durationMs}`)
      }
      backgroundResult.current = null
      let backgroundAt = 0
      let backgroundStatus: ReturnType<typeof audio.getPlaybackStatus> | null = null
      const subscription = AppState.addEventListener('change', async (state) => {
        if (state === 'background') {
          backgroundAt = Date.now()
          backgroundStatus = audio.getPlaybackStatus()
          return
        }
        if (state !== 'active') return
        subscription.remove()
        backgroundSubscription.current = null
        try {
          if (!backgroundAt || !backgroundStatus) {
            throw new Error('background transition did not capture playback position')
          }
          const positionWhenBackgrounded = (await backgroundStatus).positionMs
          const resumed = await audio.getPlaybackStatus()
          const advanced = resumed.positionMs - positionWhenBackgrounded
          const elapsed = Date.now() - backgroundAt
          backgroundResult.current = {
            state: resumed.state, start: positionWhenBackgrounded, advanced, elapsed,
          }
          setBackground(`returned: ${resumed.state},${Math.round(positionWhenBackgrounded)},${Math.round(advanced)},${elapsed}`)
        } catch (error) {
          setBackground(`error: ${error instanceof Error ? error.message : String(error)}`)
        }
      })
      backgroundSubscription.current = subscription
      setBackground(`ready: ${Math.round(playback.positionMs)}`)
    } catch (error) {
      setBackground(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function checkBackgroundPlayback() {
    try {
      const audio = One.iOS.Audio
      const result = backgroundResult.current
      try {
        if (!result || result.state !== 'playing' || result.elapsed < 30_000 ||
          result.advanced < result.elapsed - 1000) {
          throw new Error(`playback stopped in background: ${JSON.stringify(result)}`)
        }
        setBackground(`passed: ${result.state},${Math.round(result.start)},${Math.round(result.advanced)},${result.elapsed}`)
      } finally {
        await audio.stop()
      }
    } catch (error) {
      setBackground(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function run() {
    setStatus('running')
    let stage = 'permission'
    try {
      const audio = One.iOS.Audio
      const fs = One.iOS.FileSystem
      const permission = await audio.requestRecordingPermission()
      if (permission !== 'granted') throw new Error(`microphone permission was ${permission}`)

      stage = 'record'
      const started = await audio.startRecording()
      if (started.state !== 'recording' || !started.uri) {
        throw new Error('recording did not start')
      }
      await pause(850)
      const paused = await audio.pauseRecording()
      if (paused.state !== 'paused') throw new Error('recording did not pause')
      const resumed = await audio.resumeRecording()
      if (resumed.state !== 'recording') throw new Error('recording did not resume')
      await pause(850)
      const recorded = await audio.stopRecording()
      const file = await fs.getInfo(recorded.uri)
      if (
        recorded.uri !== started.uri ||
        recorded.durationMs < 500 ||
        recorded.size < 500 ||
        !file.exists ||
        file.size !== recorded.size ||
        (await audio.getRecordingStatus()).state !== 'idle'
      ) {
        throw new Error('recorded file or metadata did not match')
      }

      stage = 'play'
      await audio.play(recorded.uri)
      let playing = await audio.getPlaybackStatus()
      const deadline = Date.now() + 5000
      while (
        Date.now() < deadline &&
        !(playing.state === 'playing' && playing.positionMs > 50)
      ) {
        await pause(100)
        playing = await audio.getPlaybackStatus()
      }
      if (playing.state !== 'playing' || playing.positionMs <= 50) {
        throw new Error(`playback did not advance: ${playing.state} ${playing.positionMs}`)
      }
      const playbackPaused = await audio.pause()
      if (playbackPaused.state !== 'paused') throw new Error('playback did not pause')
      const seeked = await audio.seek(0)
      if (seeked.positionMs > 100) throw new Error('playback seek did not reset position')
      await audio.resume()
      let resumedPlayback = await audio.getPlaybackStatus()
      const resumeDeadline = Date.now() + 5000
      while (
        Date.now() < resumeDeadline &&
        !(resumedPlayback.state === 'playing' && resumedPlayback.positionMs > 50)
      ) {
        await pause(100)
        resumedPlayback = await audio.getPlaybackStatus()
      }
      if (resumedPlayback.state !== 'playing' || resumedPlayback.positionMs <= 50) {
        throw new Error('playback did not resume')
      }
      await audio.stop()
      if ((await audio.getPlaybackStatus()).state !== 'idle') {
        throw new Error('playback did not stop')
      }

      stage = 'errors'
      let uriError = ''
      try {
        await audio.play('relative.m4a')
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) uriError = String(error.code)
      }
      let stateError = ''
      try {
        await audio.pause()
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) stateError = String(error.code)
      }
      stage = 'seek while loading'
      await audio.play('https://example.invalid/one-native-audio.m4a')
      let notReadyError = ''
      try {
        await audio.seek(0)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) notReadyError = String(error.code)
      }
      await audio.stop()
      setResult(
        `permission=${permission}; recording=true; playback=true; ` +
          `paused=true; seeked=true; resumed=true; stopped=true; ` +
          `errors=${uriError},${stateError},${notReadyError}`
      )
      setStatus('passed')
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      setStatus(`error at ${stage}: ${code} ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <View style={styles.screen}>
      <Text testID="one-native-audio-status">Status: {status}</Text>
      <Text testID="one-native-audio-result">Result: {result}</Text>
      <Pressable testID="one-native-audio-run" style={styles.chip} onPress={run}>
        <Text>Record and play</Text>
      </Pressable>
      <Text testID="one-native-audio-background">Background: {background}</Text>
      <Pressable testID="one-native-audio-background-start" style={styles.chip} onPress={prepareBackgroundPlayback}>
        <Text>Start background playback</Text>
      </Pressable>
      <Pressable testID="one-native-audio-background-check" style={styles.chip} onPress={checkBackgroundPlayback}>
        <Text>Check background playback</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
