import AVFoundation
import NitroModules
import Speech

// dictation behind One.Speech: SFSpeechRecognizer fed from AVAudioEngine,
// with the dictation task hint and automatic punctuation, the way keyboard
// dictation runs. the audio session activates as play-and-record so other
// audio pauses while listening and resumes on deactivation. calls arrive on
// the js thread and hop to main, where all session state lives; the
// recognizer reports on the main queue too.
final class HybridOneSpeech: HybridOneSpeechSpec {
  private static let failed = "E_SPEECH_FAILED"

  private final class Session {
    let onEvent: (SpeechEvent) -> Void
    let engine = AVAudioEngine()
    let request = SFSpeechAudioBufferRecognitionRequest()
    var task: SFSpeechRecognitionTask?
    var audioActive = false
    // text of the segments the recognizer already closed
    var committed = ""
    var transcript = ""

    init(onEvent: @escaping (SpeechEvent) -> Void) {
      self.onEvent = onEvent
    }
  }

  private var session: Session?
  private var observers: [NSObjectProtocol] = []

  override init() {
    super.init()
    let center = NotificationCenter.default
    observers = [
      center.addObserver(
        forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
      ) { [weak self] note in
        guard
          let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
          AVAudioSession.InterruptionType(rawValue: raw) == .began
        else { return }
        self?.fail(.interrupted, "Dictation stopped because the audio session was interrupted.")
      },
      // a route change (headphones, bluetooth) stops the engine under us
      center.addObserver(
        forName: .AVAudioEngineConfigurationChange, object: nil, queue: .main
      ) { [weak self] note in
        guard let self, let session = self.session, note.object as AnyObject === session.engine
        else { return }
        self.fail(.interrupted, "Dictation stopped because the audio route changed.")
      },
    ]
  }

  deinit {
    for observer in observers {
      NotificationCenter.default.removeObserver(observer)
    }
  }

  func isAvailable() throws -> Bool {
    return SFSpeechRecognizer()?.isAvailable ?? false
  }

  func getPermissions() throws -> Promise<SpeechPermissionResponse> {
    return Promise.resolved(withResult: Self.permissionResponse())
  }

  func requestPermissions() throws -> Promise<SpeechPermissionResponse> {
    for key in ["NSSpeechRecognitionUsageDescription", "NSMicrophoneUsageDescription"]
    where Bundle.main.object(forInfoDictionaryKey: key) == nil {
      return Promise.rejected(
        withError: oneNativeError(
          Self.failed,
          "Speech.requestPermissions: dictation needs \(key): set native.app speech and rerun one prebuild"
        ))
    }
    let promise = Promise<SpeechPermissionResponse>()
    AVAudioApplication.requestRecordPermission { _ in
      SFSpeechRecognizer.requestAuthorization { _ in
        DispatchQueue.main.async {
          promise.resolve(withResult: Self.permissionResponse())
        }
      }
    }
    return promise
  }

  private static func permissionResponse() -> SpeechPermissionResponse {
    let speech = SFSpeechRecognizer.authorizationStatus()
    let microphone = AVAudioApplication.shared.recordPermission
    if speech == .restricted {
      return SpeechPermissionResponse(
        status: .denied, granted: false, canAskAgain: false, restricted: true)
    }
    if speech == .denied || microphone == .denied {
      return SpeechPermissionResponse(
        status: .denied, granted: false, canAskAgain: false, restricted: false)
    }
    if speech == .authorized && microphone == .granted {
      return SpeechPermissionResponse(
        status: .granted, granted: true, canAskAgain: true, restricted: false)
    }
    return SpeechPermissionResponse(
      status: .undetermined, granted: false, canAskAgain: true, restricted: false)
  }

  func start(options: SpeechStartOptions, onEvent: @escaping (SpeechEvent) -> Void) throws {
    DispatchQueue.main.async {
      self.begin(options: options, onEvent: onEvent)
    }
  }

  func stop() throws {
    DispatchQueue.main.async {
      guard let session = self.session else { return }
      // the recognizer answers the end of audio with its final result,
      // which ends the session with everything heard
      self.stopAudio(session)
      session.request.endAudio()
    }
  }

  func abort() throws {
    DispatchQueue.main.async {
      guard let session = self.session else { return }
      self.session = nil
      self.teardown(session)
    }
  }

  private func begin(options: SpeechStartOptions, onEvent: @escaping (SpeechEvent) -> Void) {
    if let previous = session {
      teardown(previous)
    }
    let session = Session(onEvent: onEvent)
    self.session = session

    let locale = options.lang.map { Locale(identifier: $0) } ?? Locale.current
    guard let recognizer = SFSpeechRecognizer(locale: locale) else {
      fail(.languageNotSupported, "Speech recognition does not support \(locale.identifier).")
      return
    }
    guard recognizer.isAvailable else {
      fail(.serviceNotAllowed, "Speech recognition is unavailable right now.")
      return
    }
    guard Self.permissionResponse().granted else {
      fail(.notAllowed, "Dictation needs microphone and speech recognition permission.")
      return
    }

    session.request.shouldReportPartialResults = true
    session.request.taskHint = .dictation
    session.request.addsPunctuation = true

    do {
      let audio = AVAudioSession.sharedInstance()
      try audio.setCategory(
        .playAndRecord, mode: .measurement, options: [.defaultToSpeaker, .allowBluetoothHFP])
      try audio.setActive(true, options: .notifyOthersOnDeactivation)
      session.audioActive = true
    } catch {
      fail(.audioCapture, error.localizedDescription)
      return
    }
    // the input format reflects the active session, so read it after
    // activation. a zero format means no input device, and a tap on it raises
    let input = session.engine.inputNode
    let format = input.outputFormat(forBus: 0)
    guard format.sampleRate > 0, format.channelCount > 0 else {
      fail(.audioCapture, "No microphone is available.")
      return
    }
    do {
      input.installTap(onBus: 0, bufferSize: 1024, format: format) { [request = session.request]
        buffer, _ in
        request.append(buffer)
      }
      session.engine.prepare()
      try session.engine.start()
    } catch {
      fail(.audioCapture, error.localizedDescription)
      return
    }

    session.task = recognizer.recognitionTask(with: session.request) {
      [weak self, weak session] result, error in
      guard let self, let session, self.session === session else { return }
      if let result {
        self.receive(result, in: session)
      } else if let error {
        self.receive(error as NSError)
      }
    }
    onEvent(SpeechEvent(type: .start, transcript: "", error: nil, message: nil))
  }

  private func receive(_ result: SFSpeechRecognitionResult, in session: Session) {
    let segment = result.bestTranscription.formattedString
    // after a pause the recognizer closes the segment (metadata on a
    // non-final result) and starts the next one from empty
    let text =
      session.committed.isEmpty || segment.hasPrefix(session.committed)
      ? segment
      : segment.isEmpty ? session.committed : "\(session.committed) \(segment)"
    if text != session.transcript {
      session.transcript = text
      session.onEvent(SpeechEvent(type: .transcript, transcript: text, error: nil, message: nil))
    }
    if result.isFinal {
      finish()
    } else if result.speechRecognitionMetadata != nil {
      session.committed = text
    }
  }

  // codes from the speech framework's kAFAssistantErrorDomain and
  // kLSRErrorDomain, mapped the way expo-speech-recognition maps them.
  private func receive(_ error: NSError) {
    switch error.code {
    case 1110, 301:
      // no speech at all, or a request the system canceled: the session ends
      // with what it heard
      finish()
    case 102, 201, 300:
      fail(
        .serviceNotAllowed,
        "Dictation is turned off, or its speech model is missing or failed to load.")
    case 1100:
      fail(.busy, "Another speech recognition request is still running.")
    case 1101, 1107:
      fail(.network, "The connection to the speech service was interrupted.")
    case 1700:
      fail(.notAllowed, "Speech recognition is not authorized.")
    case 203:
      fail(.audioCapture, error.localizedDescription)
    default:
      fail(.unknown, "\(error.domain) \(error.code): \(error.localizedDescription)")
    }
  }

  private func finish() {
    guard let session else { return }
    self.session = nil
    teardown(session)
    session.onEvent(
      SpeechEvent(type: .end, transcript: session.transcript, error: nil, message: nil))
  }

  private func fail(_ code: SpeechErrorCode, _ message: String) {
    guard let session else { return }
    self.session = nil
    teardown(session)
    session.onEvent(
      SpeechEvent(type: .error, transcript: session.transcript, error: code, message: message))
  }

  private func stopAudio(_ session: Session) {
    if session.engine.isRunning {
      session.engine.stop()
    }
    session.engine.inputNode.removeTap(onBus: 0)
  }

  private func teardown(_ session: Session) {
    stopAudio(session)
    session.task?.cancel()
    if session.audioActive {
      session.audioActive = false
      try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
  }
}
