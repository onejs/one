import { useEffect, useRef, useState } from 'react'
import { AppState, Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { One, useAudioPlayer, useAudioPlayerStatus } from 'one'

const pause = (durationMs: number) =>
  new Promise((resolve) => setTimeout(resolve, durationMs))

function AudioHookProbe({ uri }: { uri: string }) {
  const player = useAudioPlayer(uri)
  const hookStatus = useAudioPlayerStatus(player)
  const [hookRun, setHookRun] = useState('idle')
  async function runHook() {
    setHookRun('running')
    try {
      player.play()
      const deadline = Date.now() + 5000
      while (Date.now() < deadline && !player.getStatus().playing) {
        await pause(100)
      }
      if (!player.getStatus().playing) throw new Error('hook player did not start')
      setHookRun('played')
    } catch (error) {
      setHookRun(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return (
    <>
      <Text testID="one-native-audio-hooks">
        {`Hooks: loaded:${hookStatus.isLoaded} playing:${hookStatus.playing} run:${hookRun}`}
      </Text>
      <Pressable
        testID="one-native-audio-hooks-run"
        style={styles.chip}
        onPress={runHook}
      >
        <Text>Run hook player</Text>
      </Pressable>
    </>
  )
}

export default function OneNativeAudio() {
  const [status, setStatus] = useState('idle')
  const [result, setResult] = useState('none')
  const [background, setBackground] = useState('idle')
  const [interruption, setInterruption] = useState('idle')
  const [interruptionPlayback, setInterruptionPlayback] = useState('none')
  const [remote, setRemote] = useState('idle')
  const [remotePlayback, setRemotePlayback] = useState('none')
  const [remoteEvents, setRemoteEvents] = useState('none')
  const [remoteErrors, setRemoteErrors] = useState('none')
  const [players, setPlayers] = useState('idle')
  const [hookUri, setHookUri] = useState<string | null>(null)
  const [hooks, setHooks] = useState('idle')
  const backgroundResult = useRef<{
    state: string
    start: number
    advanced: number
    elapsed: number
  } | null>(null)
  const backgroundSubscription = useRef<ReturnType<
    typeof AppState.addEventListener
  > | null>(null)
  const interruptionSubscription = useRef<(() => void) | null>(null)
  const interruptionEvents = useRef<string[]>([])
  const remoteSubscription = useRef<(() => void) | null>(null)
  const remotePlaybackChecks = useRef(0)

  useEffect(
    () => () => {
      backgroundSubscription.current?.remove()
      interruptionSubscription.current?.()
      remoteSubscription.current?.()
    },
    []
  )

  async function writeBackgroundClip() {
    const fs = One.FileSystem
    const uri = new URL('one-native-background-audio.wav', fs.getDirectories().cache).href
    // a 60 second, 8 khz mono pcm wav: 44 header bytes and zero samples.
    const wav =
      'UklGRiSmDgBXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQCmDgAA' +
      'A'.repeat(1_279_996) +
      'AAA='
    await fs.writeFile(uri, wav, 'base64')
    if ((await fs.getInfo(uri)).size !== 960_044)
      throw new Error('wav bytes did not match')
    return uri
  }

  async function prepareBackgroundPlayback() {
    backgroundSubscription.current?.remove()
    backgroundSubscription.current = null
    setBackground('preparing')
    try {
      const audio = One.Audio
      const uri = await writeBackgroundClip()
      await audio.play(uri)
      let playback = await audio.getPlaybackStatus()
      const deadline = Date.now() + 5000
      while (Date.now() < deadline && playback.state !== 'playing') {
        await pause(100)
        playback = await audio.getPlaybackStatus()
      }
      if (
        playback.state !== 'playing' ||
        !playback.durationMs ||
        Math.abs(playback.durationMs - 60_000) > 500
      ) {
        throw new Error(`clip did not start: ${playback.state}, ${playback.durationMs}`)
      }
      backgroundResult.current = null
      let backgroundTransition: {
        at: number
        status: ReturnType<typeof audio.getPlaybackStatus>
      } | null = null
      const subscription = AppState.addEventListener('change', async (state) => {
        if (state === 'background') {
          if (!backgroundTransition) {
            backgroundTransition = {
              at: Date.now(),
              status: audio.getPlaybackStatus(),
            }
          }
          return
        }
        if (state !== 'active' || !backgroundTransition) return
        const captured = backgroundTransition
        backgroundTransition = null
        subscription.remove()
        backgroundSubscription.current = null
        try {
          const positionWhenBackgrounded = (await captured.status).positionMs
          const resumed = await audio.getPlaybackStatus()
          const advanced = resumed.positionMs - positionWhenBackgrounded
          const elapsed = Date.now() - captured.at
          backgroundResult.current = {
            state: resumed.state,
            start: positionWhenBackgrounded,
            advanced,
            elapsed,
          }
          setBackground(
            `returned: ${resumed.state},${Math.round(positionWhenBackgrounded)},${Math.round(advanced)},${elapsed}`
          )
        } catch (error) {
          setBackground(
            `error: ${error instanceof Error ? error.message : String(error)}`
          )
        }
      })
      backgroundSubscription.current = subscription
      setBackground(`ready: ${Math.round(playback.positionMs)}`)
    } catch (error) {
      setBackground(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function prepareInterruptionPlayback() {
    interruptionSubscription.current?.()
    interruptionSubscription.current = null
    interruptionEvents.current = []
    setInterruption('preparing')
    setInterruptionPlayback('none')
    try {
      const audio = One.Audio
      interruptionSubscription.current = audio.watchInterruptions((event) => {
        interruptionEvents.current.push(`${event.type}:${event.shouldResume}`)
        setInterruption(interruptionEvents.current.join(','))
      })
      await audio.play(await writeBackgroundClip())
      let playback = await audio.getPlaybackStatus()
      const deadline = Date.now() + 5000
      while (Date.now() < deadline && playback.state !== 'playing') {
        await pause(100)
        playback = await audio.getPlaybackStatus()
      }
      if (playback.state !== 'playing')
        throw new Error(`clip did not start: ${playback.state}`)
      setInterruption('ready')
    } catch (error) {
      setInterruption(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function checkInterruptionPlayback() {
    try {
      const playback = await One.Audio.getPlaybackStatus()
      setInterruptionPlayback(playback.state)
    } catch (error) {
      setInterruptionPlayback(
        `error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async function prepareRemotePlayback() {
    remoteSubscription.current?.()
    remoteSubscription.current = null
    setRemote('preparing')
    setRemoteEvents('none')
    setRemoteErrors('none')
    remotePlaybackChecks.current = 0
    try {
      const audio = One.Audio
      await audio.stop()
      let stateError = ''
      try {
        await audio.setNowPlayingInfo({ title: 'No player' })
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          stateError = String(error.code)
      }
      await audio.play(await writeBackgroundClip())
      let playback = await audio.getPlaybackStatus()
      const deadline = Date.now() + 5000
      while (Date.now() < deadline && playback.state !== 'playing') {
        await pause(100)
        playback = await audio.getPlaybackStatus()
      }
      if (playback.state !== 'playing')
        throw new Error(`clip did not start: ${playback.state}`)
      await audio.setNowPlayingInfo({
        title: 'One Remote Proof',
        artist: 'Native Fixture',
      })
      await audio.setNowPlayingInfo({
        title: 'One Remote Proof Updated',
        artist: 'Native Fixture',
        albumTitle: 'Conformance',
      })
      let titleError = ''
      try {
        await audio.setNowPlayingInfo({ title: '   ' })
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          titleError = String(error.code)
      }
      let artworkError = ''
      try {
        await audio.setNowPlayingInfo({
          title: 'One Remote Proof',
          artworkUri: 'file:///missing-artwork.png',
        })
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          artworkError = String(error.code)
      }
      setRemoteErrors(`${stateError},${titleError},${artworkError}`)
      remoteSubscription.current = audio.watchRemoteCommands((event) => {
        setRemoteEvents(`${event.type}:${Math.round(event.positionMs ?? -1)}`)
      })
      setRemote('ready')
    } catch (error) {
      setRemote(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function checkRemotePlayback() {
    try {
      const playback = await One.Audio.getPlaybackStatus()
      remotePlaybackChecks.current += 1
      setRemotePlayback(`${playback.state}:${remotePlaybackChecks.current}`)
    } catch (error) {
      setRemotePlayback(
        `error: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async function clearRemotePlayback() {
    try {
      await One.Audio.clearNowPlayingInfo()
      setRemote('cleared')
    } catch (error) {
      setRemote(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function checkBackgroundPlayback() {
    try {
      const audio = One.Audio
      const result = backgroundResult.current
      try {
        if (
          !result ||
          result.state !== 'playing' ||
          result.elapsed < 30_000 ||
          result.advanced < result.elapsed - 1000
        ) {
          throw new Error(`playback stopped in background: ${JSON.stringify(result)}`)
        }
        setBackground(
          `passed: ${result.state},${Math.round(result.start)},${Math.round(result.advanced)},${result.elapsed}`
        )
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
      const audio = One.Audio
      const fs = One.FileSystem
      const permission = await audio.requestRecordingPermission()
      if (permission !== 'granted')
        throw new Error(`microphone permission was ${permission}`)

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
        throw new Error(
          `playback did not advance: ${playing.state} ${playing.positionMs}`
        )
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
        if (error && typeof error === 'object' && 'code' in error)
          uriError = String(error.code)
      }
      let stateError = ''
      try {
        await audio.pause()
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          stateError = String(error.code)
      }
      stage = 'seek while loading'
      await audio.play('https://example.invalid/one-native-audio.m4a')
      let notReadyError = ''
      try {
        await audio.seek(0)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          notReadyError = String(error.code)
      }
      await audio.stop()
      setResult(
        `permission=${permission}; recording=true; playback=true; ` +
          `paused=true; seeked=true; resumed=true; stopped=true; ` +
          `errors=${uriError},${stateError},${notReadyError}`
      )
      setStatus('passed')
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error ? String(error.code) : ''
      setStatus(
        `error at ${stage}: ${code} ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  async function runPlayers() {
    setPlayers('running')
    let stage = 'create'
    try {
      const audio = One.Audio
      const uri = await writeBackgroundClip()
      const first = audio.createPlayer(uri, { updateInterval: 100 })
      const second = audio.createPlayer(uri)
      if (first.id === second.id) throw new Error('player ids collided')

      stage = 'load'
      const loadDeadline = Date.now() + 5000
      while (Date.now() < loadDeadline && (!first.isLoaded || !second.isLoaded)) {
        await pause(100)
      }
      if (!first.isLoaded || !second.isLoaded) throw new Error('players did not load')
      const duration = Math.round(first.duration)
      if (duration !== 60) throw new Error(`player duration did not match: ${duration}`)
      if (!second.paused) throw new Error('idle player was not paused')

      stage = 'rate'
      first.setPlaybackRate(1.5)
      const rate = first.playbackRate
      if (rate !== 1.5) throw new Error('playback rate did not match')

      stage = 'play'
      const observed: boolean[] = []
      const subscription = first.addListener('playbackStatusUpdate', (status) => {
        observed.push(status.playing)
      })
      first.play()
      const playDeadline = Date.now() + 5000
      while (
        Date.now() < playDeadline &&
        !(first.playing && first.currentTime > 0.05)
      ) {
        await pause(100)
      }
      const playing = first.playing
      const pos = first.currentTime > 0.05
      const paused = second.paused
      if (!playing || !pos || !paused) {
        throw new Error('player playback did not advance independently')
      }
      const listenerDeadline = Date.now() + 2000
      while (Date.now() < listenerDeadline && !observed.includes(true)) {
        await pause(100)
      }
      subscription.remove()
      if (!observed.includes(true)) throw new Error('status listener did not fire')

      stage = 'player errors'
      let rateError = ''
      try {
        first.setPlaybackRate(3)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error)
          rateError = String(error.code)
      }
      let assetMessage = ''
      try {
        audio.createPlayer(7)
      } catch (error) {
        assetMessage = error instanceof Error ? error.message : ''
      }
      let seekMessage = ''
      try {
        await first.seekTo(-1)
      } catch (error) {
        seekMessage = error instanceof Error ? error.message : ''
      }
      if (
        rateError !== 'E_AUDIO_RATE' ||
        !assetMessage.includes('assetId') ||
        !seekMessage.includes('nonnegative')
      ) {
        throw new Error('player errors did not match')
      }

      stage = 'loop'
      second.loop = true
      await second.seekTo(59.5)
      second.play()
      let looped = false
      const loopDeadline = Date.now() + 6000
      while (Date.now() < loopDeadline) {
        const status = second.getStatus()
        if (!status.didJustFinish && status.currentTime < 5 && status.playing) {
          looped = true
          break
        }
        await pause(150)
      }
      if (!looped) throw new Error('looping player did not restart')

      stage = 'finish'
      await first.seekTo(59)
      first.play()
      let finished = false
      const finishDeadline = Date.now() + 4000
      while (Date.now() < finishDeadline) {
        if (first.getStatus().didJustFinish) {
          finished = true
          break
        }
        await pause(150)
      }
      if (!finished) throw new Error('player did not finish')

      stage = 'replace and remove'
      first.replace(null)
      if (first.isLoaded) throw new Error('replaced player stayed loaded')
      first.remove()
      second.remove()
      let removedMessage = ''
      try {
        first.play()
      } catch (error) {
        removedMessage = error instanceof Error ? error.message : ''
      }
      if (!removedMessage.includes('removed')) {
        throw new Error('removed player stayed usable')
      }

      setPlayers(
        `playing:${playing},paused:${paused},rate:${rate},pos:${pos},` +
          `duration:${duration},listener:true,looped:${looped},finish:${finished},` +
          `errors:${rateError}`
      )
    } catch (error) {
      setPlayers(
        `error at ${stage}: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text testID="one-native-audio-status">Status: {status}</Text>
      <Text testID="one-native-audio-result">Result: {result}</Text>
      <Pressable testID="one-native-audio-run" style={styles.chip} onPress={run}>
        <Text>Record and play</Text>
      </Pressable>
      <Text testID="one-native-audio-players">Players: {players}</Text>
      <Pressable
        testID="one-native-audio-players-run"
        style={styles.chip}
        onPress={runPlayers}
      >
        <Text>Run player instances</Text>
      </Pressable>
      <Text testID="one-native-audio-hooks-state">Hooks state: {hooks}</Text>
      <Pressable
        testID="one-native-audio-hooks-prepare"
        style={styles.chip}
        onPress={async () => {
          setHooks('preparing')
          try {
            setHookUri(await writeBackgroundClip())
            setHooks('ready')
          } catch (error) {
            setHooks(`error: ${error instanceof Error ? error.message : String(error)}`)
          }
        }}
      >
        <Text>Prepare hook player</Text>
      </Pressable>
      {hookUri !== null && <AudioHookProbe uri={hookUri} />}
      <Text testID="one-native-audio-background">Background: {background}</Text>
      <Pressable
        testID="one-native-audio-background-start"
        style={styles.chip}
        onPress={prepareBackgroundPlayback}
      >
        <Text>Start background playback</Text>
      </Pressable>
      <Pressable
        testID="one-native-audio-background-check"
        style={styles.chip}
        onPress={checkBackgroundPlayback}
      >
        <Text>Check background playback</Text>
      </Pressable>
      <Text testID="one-native-audio-interruption">Interruption: {interruption}</Text>
      <Pressable
        testID="one-native-audio-interruption-start"
        style={styles.chip}
        onPress={prepareInterruptionPlayback}
      >
        <Text>Start interruption playback</Text>
      </Pressable>
      <Text testID="one-native-audio-interruption-playback">
        Interruption playback: {interruptionPlayback}
      </Text>
      <Pressable
        testID="one-native-audio-interruption-check"
        style={styles.chip}
        onPress={checkInterruptionPlayback}
      >
        <Text>Check interruption playback</Text>
      </Pressable>
      <Text testID="one-native-audio-remote">Remote: {remote}</Text>
      <Pressable
        testID="one-native-audio-remote-start"
        style={styles.chip}
        onPress={prepareRemotePlayback}
      >
        <Text>Start remote playback</Text>
      </Pressable>
      <Text testID="one-native-audio-remote-events">Remote event: {remoteEvents}</Text>
      <Text testID="one-native-audio-remote-errors">Remote errors: {remoteErrors}</Text>
      <Text testID="one-native-audio-remote-playback">
        Remote playback: {remotePlayback}
      </Text>
      <Pressable
        testID="one-native-audio-remote-check"
        style={styles.chip}
        onPress={checkRemotePlayback}
      >
        <Text>Check remote playback</Text>
      </Pressable>
      <Pressable
        testID="one-native-audio-remote-clear"
        style={styles.chip}
        onPress={clearRemotePlayback}
      >
        <Text>Clear remote controls</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { padding: 16, paddingBottom: 180, gap: 12 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
