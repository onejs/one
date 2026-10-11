import { afterEach, describe, expect, it, vi } from 'vitest'
import { SpeechSynthesis } from '../src/platform/speech-synthesis/index'
import type { SpeechSynthesisEvent } from '../src/platform/speech-synthesis/types'

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: vi.fn(), hasHybridObject: vi.fn() },
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

async function loadNativeEntry(hybrid: unknown) {
  vi.resetModules()
  const { NitroModules } = await import('react-native-nitro-modules')
  vi.mocked(NitroModules.createHybridObject).mockReturnValue(hybrid as never)
  vi.mocked(NitroModules.hasHybridObject).mockReturnValue(true)
  return import('../src/platform/speech-synthesis/index.native')
}

function stubVoices() {
  return [
    { identifier: 'voice-1', language: 'en-US', name: 'Voice One', quality: 'default' },
    { identifier: 'voice-2', language: 'en-GB', name: 'Voice Two', quality: 'enhanced' },
  ]
}

function stubSpeechSynthesis(overrides: Record<string, unknown> = {}) {
  const utterances: {
    text: string
    onend?: () => void
    onerror?: (event: { error: string }) => void
    onstart?: () => void
  }[] = []
  const synth = {
    speakCount: 0,
    cancelled: 0,
    paused: 0,
    resumed: 0,
    speaking: false,
    voices: stubVoices(),
    speak: (utterance: (typeof utterances)[number]) => {
      synth.speakCount++
      utterances.push(utterance)
    },
    cancel: () => {
      synth.cancelled++
    },
    pause: () => {
      synth.paused++
    },
    resume: () => {
      synth.resumed++
    },
    getVoices: () =>
      synth.voices.map((voice) => ({
        voiceURI: voice.identifier,
        lang: voice.language,
        name: voice.name,
      })),
    ...overrides,
  }
  vi.stubGlobal('window', {
    speechSynthesis: synth,
    SpeechSynthesisUtterance: undefined,
  })
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string
      lang = ''
      pitch = 1
      rate = 1
      volume = 1
      voice: unknown = undefined
      onstart: (() => void) | undefined = undefined
      onend: (() => void) | undefined = undefined
      onerror: ((event: { error: string }) => void) | undefined = undefined
      constructor(text: string) {
        this.text = text
      }
    }
  )
  return { synth, utterances }
}

describe('speech synthesis web', () => {
  it('speaks through the browser synthesizer with options', () => {
    const { synth, utterances } = stubSpeechSynthesis()
    const events: string[] = []
    SpeechSynthesis.speak('hello', {
      language: 'en-US',
      pitch: 1.2,
      rate: 0.9,
      volume: 0.5,
      onStart: () => events.push('start'),
      onDone: () => events.push('done'),
    })
    expect(synth.speakCount).toBe(1)
    expect(utterances[0].text).toBe('hello')
    utterances[0].onstart?.()
    utterances[0].onend?.()
    expect(events).toEqual(['start', 'done'])
    expect(SpeechSynthesis.maxInputLength).toBe(32767)
  })

  it('maps cancellation to onStopped and failures to onError', () => {
    stubSpeechSynthesis()
    const { utterances } = stubSpeechSynthesis()
    const events: string[] = []
    SpeechSynthesis.speak('hello', {
      onStopped: () => events.push('stopped'),
      onError: (error) => events.push(`error:${error.message}`),
    })
    utterances[0].onerror?.({ error: 'canceled' })
    expect(events).toEqual(['stopped'])
  })

  it('stops, pauses, resumes and lists voices', async () => {
    const { synth } = stubSpeechSynthesis()
    await SpeechSynthesis.stop()
    expect(synth.cancelled).toBe(1)
    await SpeechSynthesis.pause()
    expect(synth.paused).toBe(1)
    await SpeechSynthesis.resume()
    expect(synth.resumed).toBe(1)
    expect(await SpeechSynthesis.isSpeaking()).toBe(false)
    expect(await SpeechSynthesis.getAvailableVoices()).toEqual(
      stubVoices().map((voice) => ({ ...voice, quality: 'default' }))
    )
  })

  it('does nothing without a synthesizer', async () => {
    vi.stubGlobal('window', {})
    SpeechSynthesis.speak('hello', {
      onDone: () => {
        throw new Error('must not fire')
      },
    })
    await SpeechSynthesis.stop()
    await SpeechSynthesis.pause()
    await SpeechSynthesis.resume()
    expect(await SpeechSynthesis.isSpeaking()).toBe(false)
    expect(await SpeechSynthesis.getAvailableVoices()).toEqual([])
    expect(SpeechSynthesis.maxInputLength).toBe(0)
  })

  it('throws synchronously for bad text and options', () => {
    stubSpeechSynthesis()
    expect(() => SpeechSynthesis.speak('')).toThrow(
      'SpeechSynthesis.speak: text must be a non-empty string'
    )
    expect(() => SpeechSynthesis.speak('hi', 'loud' as never)).toThrow(
      'SpeechSynthesis.speak: options must be an object'
    )
    expect(() => SpeechSynthesis.speak('hi', { volume: 2 })).toThrow(
      'SpeechSynthesis.speak: volume must be a number between 0 and 1'
    )
    expect(() => SpeechSynthesis.speak('hi', { onDone: 'yes' as never })).toThrow(
      'SpeechSynthesis.speak: onDone must be a function'
    )
  })

  it('exposes the namespace object', () => {
    expect(Object.keys(SpeechSynthesis).sort()).toEqual([
      'getAvailableVoices',
      'isSpeaking',
      'maxInputLength',
      'pause',
      'resume',
      'speak',
      'stop',
    ])
    expect(Object.isFrozen(SpeechSynthesis)).toBe(true)
  })
})

describe('speech synthesis native entry', () => {
  function stubHybrid(overrides: Record<string, unknown> = {}) {
    return {
      maxInputLength: 4000,
      speak: () => {},
      stop: async () => {},
      pause: async () => {},
      resume: async () => {},
      isSpeaking: async () => false,
      getAvailableVoices: async () => stubVoices(),
      ...overrides,
    }
  }

  it('reads the input limit once at import', async () => {
    const { SpeechSynthesis: NativeSynthesis } = await loadNativeEntry(stubHybrid())
    expect(NativeSynthesis.maxInputLength).toBe(4000)
  })

  it('reports zero without a native module', async () => {
    vi.resetModules()
    const { NitroModules } = await import('react-native-nitro-modules')
    vi.mocked(NitroModules.hasHybridObject).mockReturnValue(false)
    const { SpeechSynthesis: NativeSynthesis } =
      await import('../src/platform/speech-synthesis/index.native')
    expect(NativeSynthesis.maxInputLength).toBe(0)
  })

  it('fans utterance events out to the matching callbacks', async () => {
    let captured: ((event: SpeechSynthesisEvent) => void) | undefined
    let capturedUtterance: unknown
    const { SpeechSynthesis: NativeSynthesis } = await loadNativeEntry(
      stubHybrid({
        speak: (utterance: unknown, onEvent: (event: SpeechSynthesisEvent) => void) => {
          capturedUtterance = utterance
          captured = onEvent
        },
      })
    )
    const events: string[] = []
    NativeSynthesis.speak('hello', {
      language: 'en-US',
      onStart: () => events.push('start'),
      onDone: () => events.push('done'),
      onStopped: () => events.push('stopped'),
      onError: (error) => events.push(`error:${error.message}`),
    })
    expect(capturedUtterance).toEqual({ text: 'hello', language: 'en-US' })
    captured?.({ type: 'start' })
    captured?.({ type: 'done' })
    expect(events).toEqual(['start', 'done'])
    captured?.({ type: 'stopped' })
    captured?.({ type: 'error', message: 'boom' })
    expect(events).toEqual(['start', 'done', 'stopped', 'error:boom'])
  })

  it('reads transport state through the hybrid object', async () => {
    const { SpeechSynthesis: NativeSynthesis } = await loadNativeEntry(
      stubHybrid({ isSpeaking: async () => true })
    )
    await NativeSynthesis.stop()
    await NativeSynthesis.pause()
    await NativeSynthesis.resume()
    expect(await NativeSynthesis.isSpeaking()).toBe(true)
    expect(await NativeSynthesis.getAvailableVoices()).toEqual(stubVoices())
  })

  it('validates before touching native', async () => {
    const speak = vi.fn()
    const { SpeechSynthesis: NativeSynthesis } = await loadNativeEntry(
      stubHybrid({ speak })
    )
    expect(() => NativeSynthesis.speak('')).toThrow(
      'SpeechSynthesis.speak: text must be a non-empty string'
    )
    expect(speak).not.toHaveBeenCalled()
  })
})
