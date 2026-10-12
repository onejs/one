import AVFoundation
import NitroModules

// text-to-speech behind One.SpeechSynthesis, matching expo-speech:
// AVSpeechSynthesizer queues utterances, stop clears the queue, pause and
// resume hold and continue it. each utterance carries its own event
// callback; the queue position, not a handle, orders them, so callbacks
// stay with their utterance. calls arrive on the js thread and hop to main,
// where the synthesizer and all state lives. the synthesizer delegate
// protocol needs an NSObject, which a hybrid object cannot subclass, so it
// lives in a separate object with a weak owner.
final class HybridOneSpeechSynthesis: HybridOneSpeechSynthesisSpec {
  final class Utterance {
    let onEvent: (SpeechSynthesisEvent) -> Void
    let avUtterance: AVSpeechUtterance

    init(onEvent: @escaping (SpeechSynthesisEvent) -> Void, avUtterance: AVSpeechUtterance) {
      self.onEvent = onEvent
      self.avUtterance = avUtterance
    }
  }

  fileprivate let synthesizer = AVSpeechSynthesizer()
  fileprivate var pending: [Utterance] = []
  fileprivate var current: Utterance?

  override init() {
    super.init()
    let delegate = HybridOneSpeechSynthesisDelegate(owner: self)
    retainedDelegate = delegate
    synthesizer.delegate = delegate
  }

  // the delegate must outlive the call that installs it.
  private var retainedDelegate: HybridOneSpeechSynthesisDelegate?

  var maxInputLength: Double {
    return Double.greatestFiniteMagnitude
  }

  func speak(
    utterance: SpeechSynthesisUtterance,
    onEvent: @escaping (SpeechSynthesisEvent) -> Void
  ) throws {
    DispatchQueue.main.async {
      let avUtterance = AVSpeechUtterance(string: utterance.text)
      if let language = utterance.language {
        avUtterance.voice =
          AVSpeechSynthesisVoice(language: language)
          ?? AVSpeechSynthesisVoice.speechVoices().first(where: { $0.language == language })
      }
      if let identifier = utterance.voice {
        avUtterance.voice =
          AVSpeechSynthesisVoice.speechVoices().first(where: { $0.identifier == identifier })
          ?? avUtterance.voice
      }
      if let pitch = utterance.pitch {
        avUtterance.pitchMultiplier = Float(pitch)
      }
      if let rate = utterance.rate {
        avUtterance.rate = min(
          max(
            AVSpeechUtteranceMinimumSpeechRate,
            AVSpeechUtteranceDefaultSpeechRate * Float(rate)),
          AVSpeechUtteranceMaximumSpeechRate)
      }
      if let volume = utterance.volume {
        avUtterance.volume = Float(volume)
      }
      let next = Utterance(onEvent: onEvent, avUtterance: avUtterance)
      self.pending.append(next)
      self.synthesizer.speak(next.avUtterance)
    }
  }

  func stop() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      // utterances that never started get no delegate callback, so they
      // settle here; the running one settles in didCancel below.
      let dropped = self.pending
      self.pending.removeAll()
      self.synthesizer.stopSpeaking(at: .immediate)
      for utterance in dropped {
        utterance.onEvent(SpeechSynthesisEvent(type: .stopped, message: nil))
      }
      promise.resolve(withResult: ())
    }
    return promise
  }

  func pause() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      self.synthesizer.pauseSpeaking(at: .immediate)
      promise.resolve(withResult: ())
    }
    return promise
  }

  func resume() throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      self.synthesizer.continueSpeaking()
      promise.resolve(withResult: ())
    }
    return promise
  }

  func isSpeaking() throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    DispatchQueue.main.async {
      promise.resolve(withResult: self.synthesizer.isSpeaking)
    }
    return promise
  }

  func getAvailableVoices() throws -> Promise<[SpeechSynthesisVoice]> {
    let promise = Promise<[SpeechSynthesisVoice]>()
    DispatchQueue.main.async {
      promise.resolve(withResult: AVSpeechSynthesisVoice.speechVoices().map(Self.mapVoice))
    }
    return promise
  }

  private static func mapVoice(_ voice: AVSpeechSynthesisVoice) -> SpeechSynthesisVoice {
    let quality: SpeechSynthesisVoiceQuality
    switch voice.quality {
    case .enhanced, .premium:
      quality = .enhanced
    case .default:
      quality = .default
    @unknown default:
      quality = .default
    }
    return SpeechSynthesisVoice(
      identifier: voice.identifier, language: voice.language, name: voice.name, quality: quality)
  }

  fileprivate func didStart(_ utterance: AVSpeechUtterance) {
    let next = pending.first(where: { $0.avUtterance === utterance })
    if let next {
      pending.removeAll(where: { $0.avUtterance === utterance })
      current = next
      next.onEvent(SpeechSynthesisEvent(type: .start, message: nil))
    }
  }

  fileprivate func finish(
    _ utterance: AVSpeechUtterance, type: SpeechSynthesisEventType, message: String?
  ) {
    pending.removeAll(where: { $0.avUtterance === utterance })
    if current?.avUtterance === utterance {
      let done = current
      current = nil
      done?.onEvent(SpeechSynthesisEvent(type: type, message: message))
    }
  }
}

final class HybridOneSpeechSynthesisDelegate: NSObject, AVSpeechSynthesizerDelegate {
  weak var owner: HybridOneSpeechSynthesis?

  init(owner: HybridOneSpeechSynthesis) {
    self.owner = owner
  }

  func speechSynthesizer(
    _ synthesizer: AVSpeechSynthesizer, didStart utterance: AVSpeechUtterance
  ) {
    owner?.didStart(utterance)
  }

  func speechSynthesizer(
    _ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance
  ) {
    owner?.finish(utterance, type: .done, message: nil)
  }

  func speechSynthesizer(
    _ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance
  ) {
    owner?.finish(utterance, type: .stopped, message: nil)
  }
}
