import AVFoundation
import Foundation
import MediaPlayer
import NitroModules
import UIKit

final class HybridOneAudio: HybridOneAudioSpec {
  private enum Problem: LocalizedError {
    case invalidURI
    case missingFile
    case manifest
    case permission
    case busy
    case state
    case position
    case recordingFailed
    case metadata
    case artwork

    var errorDescription: String? {
      switch self {
      case .invalidURI: return "the audio URI must use file:// or https://"
      case .missingFile: return "the audio file does not exist"
      case .manifest: return "set native.app.audio.microphone before recording"
      case .permission: return "microphone permission is required"
      case .busy: return "stop the current audio operation first"
      case .state: return "the audio operation is not ready"
      case .position: return "the seek position must be finite and nonnegative"
      case .recordingFailed: return "recording could not start or produced an empty file"
      case .metadata: return "now playing title must not be empty"
      case .artwork: return "now playing artwork must be an existing image file"
      }
    }
  }

  private var player: AVPlayer?
  private var playerURI: String?
  private var playbackPaused = false
  private var playbackEnded = false
  private var endObserver: NSObjectProtocol?
  private var playerStatusObservation: NSKeyValueObservation?
  private var itemStatusObservation: NSKeyValueObservation?
  private var recorder: AVAudioRecorder?
  private var interruptionListeners: [UUID: (AudioInterruptionEvent) -> Void] = [:]
  private var interruptionObserver: NSObjectProtocol?
  private var nowPlayingSession: MPNowPlayingSession?
  private var nowPlayingInfo: AudioNowPlayingInfo?
  private var nowPlayingArtwork: UIImage?
  private var remoteTargets: [(MPRemoteCommand, Any)] = []
  private var remoteCommandListeners: [UUID: (AudioRemoteCommandEvent) -> Void] = [:]

  override init() {
    super.init()
    interruptionObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.interruptionNotification, object: nil, queue: .main
    ) { [weak self] note in
      self?.handleInterruption(note)
    }
  }

  deinit {
    if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
    if let interruptionObserver { NotificationCenter.default.removeObserver(interruptionObserver) }
    playerStatusObservation?.invalidate()
    itemStatusObservation?.invalidate()
    let targets = remoteTargets
    let session = nowPlayingSession
    DispatchQueue.main.async {
      for (command, target) in targets { command.removeTarget(target) }
      session?.nowPlayingInfoCenter.nowPlayingInfo = nil
    }
  }

  func getRecordingPermissionStatus() throws -> Promise<AudioRecordingPermission> {
    query("getRecordingPermissionStatus") { Self.permissionStatus() }
  }

  func requestRecordingPermission() throws -> Promise<AudioRecordingPermission> {
    let promise = Promise<AudioRecordingPermission>()
    DispatchQueue.main.async {
      guard Self.hasMicrophonePurpose() else {
        promise.reject(withError: Self.failure("requestRecordingPermission", Problem.manifest))
        return
      }
      AVAudioApplication.requestRecordPermission { _ in
        DispatchQueue.main.async {
          promise.resolve(withResult: Self.permissionStatus())
        }
      }
    }
    return promise
  }

  func play(uri: String) throws -> Promise<AudioPlaybackStatus> {
    query("play") {
      guard self.recorder == nil else { throw Problem.busy }
      let url = try Self.audioURL(uri)
      if url.isFileURL && !FileManager.default.fileExists(atPath: url.path) {
        throw Problem.missingFile
      }
      let session = AVAudioSession.sharedInstance()
      try session.setCategory(.playback, mode: .default)
      try session.setActive(true)
      self.clearPlayer()
      let item = AVPlayerItem(url: url)
      let player = AVPlayer(playerItem: item)
      self.player = player
      self.playerStatusObservation = player.observe(\.timeControlStatus, options: [.new]) {
        [weak self] _, _ in
        DispatchQueue.main.async { self?.syncNowPlaying() }
      }
      self.itemStatusObservation = item.observe(\.status, options: [.new]) { [weak self] _, _ in
        DispatchQueue.main.async { self?.syncNowPlaying() }
      }
      self.playerURI = url.absoluteString
      self.playbackPaused = false
      self.playbackEnded = false
      self.endObserver = NotificationCenter.default.addObserver(
        forName: AVPlayerItem.didPlayToEndTimeNotification, object: item, queue: .main
      ) { [weak self] _ in
        self?.playbackEnded = true
        self?.syncNowPlaying()
      }
      self.player?.play()
      return self.playbackStatus()
    }
  }

  func getPlaybackStatus() throws -> Promise<AudioPlaybackStatus> {
    query("getPlaybackStatus") { self.playbackStatus() }
  }

  func pause() throws -> Promise<AudioPlaybackStatus> {
    query("pause") {
      guard let player = self.player else { throw Problem.state }
      player.pause()
      self.playbackPaused = true
      self.syncNowPlaying()
      return self.playbackStatus()
    }
  }

  func resume() throws -> Promise<AudioPlaybackStatus> {
    query("resume") {
      guard let player = self.player else { throw Problem.state }
      if self.playbackEnded {
        player.seek(to: .zero)
        self.playbackEnded = false
      }
      self.playbackPaused = false
      player.play()
      self.syncNowPlaying()
      return self.playbackStatus()
    }
  }

  func seek(positionMs: Double) throws -> Promise<AudioPlaybackStatus> {
    let promise = Promise<AudioPlaybackStatus>()
    DispatchQueue.main.async {
      guard positionMs.isFinite && positionMs >= 0 else {
        promise.reject(withError: Self.failure("seek", Problem.position))
        return
      }
      guard let player = self.player, player.currentItem?.status == .readyToPlay else {
        promise.reject(withError: Self.failure("seek", Problem.state))
        return
      }
      player.seek(to: CMTime(seconds: positionMs / 1000, preferredTimescale: 600)) { finished in
        DispatchQueue.main.async {
          guard finished, self.player === player else {
            promise.reject(withError: Self.failure("seek", Problem.state))
            return
          }
          self.playbackEnded = false
          self.syncNowPlaying()
          promise.resolve(withResult: self.playbackStatus())
        }
      }
    }
    return promise
  }

  func stop() throws -> Promise<Void> {
    perform("stop") {
      self.clearPlayer()
      Self.deactivateSession(category: .playback)
    }
  }

  func startRecording() throws -> Promise<AudioRecordingStatus> {
    query("startRecording") {
      guard Self.hasMicrophonePurpose() else { throw Problem.manifest }
      guard Self.permissionStatus() == .granted else { throw Problem.permission }
      if self.playbackEnded || self.player?.currentItem?.status == .failed {
        self.clearPlayer()
        Self.deactivateSession(category: .playback)
      }
      guard self.player == nil && self.recorder == nil else { throw Problem.busy }
      let files = FileManager.default
      let directory = files.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("one-native-audio", isDirectory: true)
      try files.createDirectory(at: directory, withIntermediateDirectories: true)
      let url = directory.appendingPathComponent(UUID().uuidString + ".m4a")
      let session = AVAudioSession.sharedInstance()
      do {
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true)
        let settings: [String: Any] = [
          AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
          AVSampleRateKey: 44_100,
          AVNumberOfChannelsKey: 1,
          AVEncoderAudioQualityKey: AVAudioQuality.high.rawValue,
        ]
        let recorder = try AVAudioRecorder(url: url, settings: settings)
        guard recorder.prepareToRecord(), recorder.record() else {
          throw Problem.recordingFailed
        }
        self.recorder = recorder
        return self.recordingStatus()
      } catch {
        Self.deactivateSession(category: .playAndRecord)
        try? files.removeItem(at: url)
        throw error
      }
    }
  }

  func getRecordingStatus() throws -> Promise<AudioRecordingStatus> {
    query("getRecordingStatus") { self.recordingStatus() }
  }

  func pauseRecording() throws -> Promise<AudioRecordingStatus> {
    query("pauseRecording") {
      guard let recorder = self.recorder else { throw Problem.state }
      recorder.pause()
      return self.recordingStatus()
    }
  }

  func resumeRecording() throws -> Promise<AudioRecordingStatus> {
    query("resumeRecording") {
      guard let recorder = self.recorder else { throw Problem.state }
      guard recorder.record() else { throw Problem.recordingFailed }
      return self.recordingStatus()
    }
  }

  func stopRecording() throws -> Promise<AudioRecordingResult> {
    query("stopRecording") {
      guard let recorder = self.recorder else { throw Problem.state }
      let uri = recorder.url.absoluteString
      let durationMs = recorder.currentTime * 1000
      recorder.stop()
      self.recorder = nil
      Self.deactivateSession(category: .playAndRecord)
      let attributes = try FileManager.default.attributesOfItem(atPath: recorder.url.path)
      let size = (attributes[.size] as? NSNumber)?.doubleValue ?? 0
      guard size > 0 else {
        try? FileManager.default.removeItem(at: recorder.url)
        throw Problem.recordingFailed
      }
      return AudioRecordingResult(uri: uri, durationMs: durationMs, size: size)
    }
  }

  func addInterruptionListener(
    onEvent: @escaping (AudioInterruptionEvent) -> Void
  ) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      self.interruptionListeners[id] = onEvent
    }
    return { [weak self] in
      DispatchQueue.main.async {
        guard let self else { return }
        self.interruptionListeners.removeValue(forKey: id)
      }
    }
  }

  func setNowPlayingInfo(info: AudioNowPlayingInfo) throws -> Promise<Void> {
    perform("setNowPlayingInfo") {
      guard let player = self.player else { throw Problem.state }
      guard !info.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
        throw Problem.metadata
      }
      var artwork: UIImage?
      if let artworkUri = info.artworkUri {
        guard let url = URL(string: artworkUri), url.isFileURL,
          FileManager.default.fileExists(atPath: url.path),
          let image = UIImage(contentsOfFile: url.path)
        else { throw Problem.artwork }
        artwork = image
      }
      if let session = self.nowPlayingSession, session.players.first === player {
        self.nowPlayingInfo = info
        self.nowPlayingArtwork = artwork
        self.syncNowPlaying()
        return
      }
      self.clearNowPlaying()
      let session = MPNowPlayingSession(players: [player])
      session.automaticallyPublishesNowPlayingInfo = false
      self.nowPlayingSession = session
      self.nowPlayingInfo = info
      self.nowPlayingArtwork = artwork
      self.installRemoteCommands(session.remoteCommandCenter)
      self.syncNowPlaying()
      session.becomeActiveIfPossible { [weak self, weak session] active in
        guard active, let session else { return }
        DispatchQueue.main.async { [weak self] in
          guard let self, self.nowPlayingSession === session else { return }
          self.syncNowPlaying()
        }
      }
    }
  }

  func clearNowPlayingInfo() throws -> Promise<Void> {
    perform("clearNowPlayingInfo") { self.clearNowPlaying() }
  }

  func addRemoteCommandListener(
    onEvent: @escaping (AudioRemoteCommandEvent) -> Void
  ) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      self.remoteCommandListeners[id] = onEvent
    }
    return { [weak self] in
      DispatchQueue.main.async {
        self?.remoteCommandListeners.removeValue(forKey: id)
      }
    }
  }

  private func handleInterruption(_ note: Notification) {
    guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
      let kind = AVAudioSession.InterruptionType(rawValue: raw)
    else { return }
    if kind == .began {
      player?.pause()
      if player != nil { playbackPaused = true }
      recorder?.pause()
      syncNowPlaying()
    }
    let options = AVAudioSession.InterruptionOptions(
      rawValue: note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0)
    let event = AudioInterruptionEvent(
      type: kind == .began ? .began : .ended,
      shouldResume: kind == .ended && options.contains(.shouldResume))
    for listener in Array(interruptionListeners.values) { listener(event) }
  }

  private func playbackStatus() -> AudioPlaybackStatus {
    guard let player, let item = player.currentItem else {
      return AudioPlaybackStatus(
        state: .idle, uri: nil, positionMs: 0, durationMs: nil, error: nil)
    }
    let position = player.currentTime().seconds
    let duration = item.duration.seconds
    let state: AudioPlaybackState
    if item.status == .failed { state = .failed }
    else if playbackEnded { state = .ended }
    else if playbackPaused { state = .paused }
    else if item.status != .readyToPlay || player.timeControlStatus == .waitingToPlayAtSpecifiedRate {
      state = .loading
    } else if player.timeControlStatus == .playing { state = .playing }
    else { state = .paused }
    return AudioPlaybackStatus(
      state: state, uri: playerURI,
      positionMs: position.isFinite ? max(0, position * 1000) : 0,
      durationMs: duration.isFinite && duration >= 0 ? duration * 1000 : nil,
      error: item.error?.localizedDescription)
  }

  private func recordingStatus() -> AudioRecordingStatus {
    guard let recorder else {
      return AudioRecordingStatus(state: .idle, uri: nil, durationMs: 0)
    }
    return AudioRecordingStatus(
      state: recorder.isRecording ? .recording : .paused,
      uri: recorder.url.absoluteString, durationMs: recorder.currentTime * 1000)
  }

  private func installRemoteCommands(_ center: MPRemoteCommandCenter) {
    center.playCommand.isEnabled = true
    center.pauseCommand.isEnabled = true
    center.togglePlayPauseCommand.isEnabled = true
    center.changePlaybackPositionCommand.isEnabled = true
    remoteTargets = [
      (center.playCommand, center.playCommand.addTarget { [weak self] _ in
        self?.handleRemoteCommand(.play) ?? .noSuchContent
      }),
      (center.pauseCommand, center.pauseCommand.addTarget { [weak self] _ in
        self?.handleRemoteCommand(.pause) ?? .noSuchContent
      }),
      (center.togglePlayPauseCommand, center.togglePlayPauseCommand.addTarget { [weak self] _ in
        self?.handleRemoteToggle() ?? .noSuchContent
      }),
      (center.changePlaybackPositionCommand,
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
          guard let event = event as? MPChangePlaybackPositionCommandEvent else {
            return .commandFailed
          }
          return self?.handleRemoteCommand(.seek, positionMs: event.positionTime * 1000)
            ?? .noSuchContent
        }),
    ]
  }

  private func handleRemoteToggle() -> MPRemoteCommandHandlerStatus {
    if !Thread.isMainThread { return DispatchQueue.main.sync { self.handleRemoteToggle() } }
    guard let player else { return .noSuchContent }
    return handleRemoteCommand(
      playbackPaused || player.timeControlStatus != .playing ? .play : .pause)
  }

  private func handleRemoteCommand(
    _ type: AudioRemoteCommandType, positionMs: Double? = nil
  ) -> MPRemoteCommandHandlerStatus {
    if !Thread.isMainThread {
      return DispatchQueue.main.sync { self.handleRemoteCommand(type, positionMs: positionMs) }
    }
    guard let player, nowPlayingSession != nil else { return .noSuchContent }
    switch type {
    case .play:
      if playbackEnded { player.seek(to: .zero); playbackEnded = false }
      playbackPaused = false
      player.play()
    case .pause:
      player.pause()
      playbackPaused = true
    case .seek:
      guard let positionMs, positionMs.isFinite, positionMs >= 0 else {
        return .commandFailed
      }
      player.seek(to: CMTime(seconds: positionMs / 1000, preferredTimescale: 600)) {
        [weak self] _ in
        DispatchQueue.main.async { self?.syncNowPlaying() }
      }
      playbackEnded = false
    }
    syncNowPlaying()
    let event = AudioRemoteCommandEvent(type: type, positionMs: positionMs)
    for listener in Array(remoteCommandListeners.values) { listener(event) }
    return .success
  }

  private func syncNowPlaying() {
    guard let session = nowPlayingSession, let info = nowPlayingInfo, let player else { return }
    let position = player.currentTime().seconds
    let duration = player.currentItem?.duration.seconds ?? .nan
    var metadata: [String: Any] = [
      MPMediaItemPropertyTitle: info.title,
      MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue,
      MPNowPlayingInfoPropertyElapsedPlaybackTime: position.isFinite ? max(0, position) : 0,
      MPNowPlayingInfoPropertyPlaybackRate:
        !playbackEnded && player.timeControlStatus == .playing ? player.rate : 0.0,
      MPNowPlayingInfoPropertyDefaultPlaybackRate: 1.0,
    ]
    if let artist = info.artist { metadata[MPMediaItemPropertyArtist] = artist }
    if let albumTitle = info.albumTitle { metadata[MPMediaItemPropertyAlbumTitle] = albumTitle }
    if duration.isFinite && duration >= 0 {
      metadata[MPMediaItemPropertyPlaybackDuration] = duration
    }
    if let image = nowPlayingArtwork {
      metadata[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
    }
    session.nowPlayingInfoCenter.nowPlayingInfo = metadata
  }

  private func clearNowPlaying() {
    for (command, target) in remoteTargets { command.removeTarget(target) }
    remoteTargets.removeAll()
    nowPlayingSession?.nowPlayingInfoCenter.nowPlayingInfo = nil
    nowPlayingSession = nil
    nowPlayingInfo = nil
    nowPlayingArtwork = nil
  }

  private func clearPlayer() {
    clearNowPlaying()
    playerStatusObservation?.invalidate()
    playerStatusObservation = nil
    itemStatusObservation?.invalidate()
    itemStatusObservation = nil
    if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
    endObserver = nil
    player?.pause()
    player?.replaceCurrentItem(with: nil)
    player = nil
    playerURI = nil
    playbackPaused = false
    playbackEnded = false
  }

  private static func audioURL(_ uri: String) throws -> URL {
    guard let url = URL(string: uri),
      (url.isFileURL || url.scheme == "https"),
      !url.path.isEmpty, url.query == nil || !url.isFileURL,
      url.fragment == nil || !url.isFileURL
    else { throw Problem.invalidURI }
    return url
  }

  private static func permissionStatus() -> AudioRecordingPermission {
    switch AVAudioApplication.shared.recordPermission {
    case .granted: return .granted
    case .denied: return .denied
    default: return .undetermined
    }
  }

  private static func hasMicrophonePurpose() -> Bool {
    guard let text = Bundle.main.object(forInfoDictionaryKey: "NSMicrophoneUsageDescription") as? String
    else { return false }
    return !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  private static func deactivateSession(category: AVAudioSession.Category) {
    let session = AVAudioSession.sharedInstance()
    if session.category == category && session.mode == .default {
      try? session.setActive(false, options: .notifyOthersOnDeactivation)
    }
  }

  private static func failure(_ verb: String, _ error: Error) -> RuntimeError {
    let code: String
    switch error {
    case Problem.invalidURI: code = "E_AUDIO_URI"
    case Problem.missingFile: code = "E_AUDIO_FILE"
    case Problem.manifest: code = "E_AUDIO_MANIFEST"
    case Problem.permission: code = "E_AUDIO_PERMISSION"
    case Problem.busy: code = "E_AUDIO_BUSY"
    case Problem.state: code = "E_AUDIO_STATE"
    case Problem.position: code = "E_AUDIO_POSITION"
    case Problem.metadata: code = "E_AUDIO_METADATA"
    case Problem.artwork: code = "E_AUDIO_ARTWORK"
    default: code = "E_AUDIO_FAILED"
    }
    return oneNativeError(code, "Audio.\(verb): \(error.localizedDescription)")
  }

  private func query<T>(_ verb: String, _ work: @escaping () throws -> T) -> Promise<T> {
    let promise = Promise<T>()
    DispatchQueue.main.async {
      do { promise.resolve(withResult: try work()) }
      catch { promise.reject(withError: Self.failure(verb, error)) }
    }
    return promise
  }

  private func perform(_ verb: String, _ work: @escaping () throws -> Void) -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        try work()
        promise.resolve()
      } catch { promise.reject(withError: Self.failure(verb, error)) }
    }
    return promise
  }
}
