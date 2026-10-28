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
    case unknownPlayer
    case rate
    case replaced

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
      case .unknownPlayer: return "the audio player id is not active"
      case .rate: return "the playback rate must be within 0 to 2"
      case .replaced: return "playback was replaced before it was ready"
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
  // one now playing session at a time, owned by the singleton or by one
  // managed player. owners clear only their own claim, so an old owner's
  // cleanup never clears a newer one.
  private var nowPlayingOwner: NowPlayingOwner?
  private var ownerObservations: [NSKeyValueObservation] = []
  private var pendingLoad: PendingLoad?
  private var remoteCommandListeners: [UUID: (AudioRemoteCommandEvent) -> Void] = [:]

  private final class ManagedAudioPlayer {
    let player: AVPlayer
    var item: AVPlayerItem?
    var paused = true
    var ended = false
    var loop = false
    var muted = false
    var volume = 1.0
    var rate = 1.0
    var pitchCorrection = true
    var pitchQuality: PitchCorrectionQuality = .medium
    var endObserver: NSObjectProtocol?

    init(player: AVPlayer) {
      self.player = player
    }
  }

  private var managedPlayers: [String: ManagedAudioPlayer] = [:]

  private enum NowPlayingOwner: Equatable {
    case global
    case managed(String)
  }

  // a singleton play with a position or paused flag: it resolves after the
  // item is ready and the seek lands, before any sound.
  private final class PendingLoad {
    let promise: Promise<AudioPlaybackStatus>
    let positionMs: Double
    var seeking = false

    init(promise: Promise<AudioPlaybackStatus>, positionMs: Double) {
      self.promise = promise
      self.positionMs = positionMs
    }
  }

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
    for managed in managedPlayers.values {
      if let observer = managed.endObserver {
        NotificationCenter.default.removeObserver(observer)
      }
      managed.player.pause()
    }
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

  func play(uri: String, options: AudioPlayOptions) throws -> Promise<AudioPlaybackStatus> {
    let promise = Promise<AudioPlaybackStatus>()
    DispatchQueue.main.async {
      do {
        if let status = try self.startPlayback(uri: uri, options: options, promise: promise) {
          promise.resolve(withResult: status)
        }
      } catch {
        promise.reject(withError: Self.failure("play", error))
      }
    }
    return promise
  }

  // returns the status to resolve now, or nil when a prepared load resolves
  // the promise later.
  private func startPlayback(
    uri: String, options: AudioPlayOptions, promise: Promise<AudioPlaybackStatus>
  ) throws -> AudioPlaybackStatus? {
    guard self.recorder == nil else { throw Problem.busy }
    let url = try Self.audioURL(uri)
    if url.isFileURL && !FileManager.default.fileExists(atPath: url.path) {
      throw Problem.missingFile
    }
    let prepare = options.positionMs != nil || options.paused != nil
    let positionMs = options.positionMs ?? 0
    guard positionMs.isFinite && positionMs >= 0 else { throw Problem.position }
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
      DispatchQueue.main.async {
        self?.advanceLoad()
        self?.syncNowPlaying()
      }
    }
    self.playerURI = url.absoluteString
    self.playbackPaused = options.paused ?? false
    self.playbackEnded = false
    self.endObserver = NotificationCenter.default.addObserver(
      forName: AVPlayerItem.didPlayToEndTimeNotification, object: item, queue: .main
    ) { [weak self] _ in
      self?.playbackEnded = true
      self?.syncNowPlaying()
    }
    if prepare {
      self.pendingLoad = PendingLoad(promise: promise, positionMs: positionMs)
      self.advanceLoad()
      return nil
    }
    player.play()
    return self.playbackStatus()
  }

  // moves a prepared load forward once its item settles: seek exactly to
  // the position, then play unless paused. replacement or stop rejects the
  // load in clearPlayer, so a late completion finds a different load and
  // does nothing.
  private func advanceLoad() {
    guard let load = pendingLoad, !load.seeking, let player, let item = player.currentItem
    else { return }
    switch item.status {
    case .failed:
      pendingLoad = nil
      load.promise.reject(withError: Self.failure("play", item.error ?? Problem.state))
    case .readyToPlay:
      load.seeking = true
      var seconds = load.positionMs / 1000
      let duration = item.duration.seconds
      if duration.isFinite && duration >= 0 { seconds = min(seconds, duration) }
      player.seek(
        to: CMTime(seconds: seconds, preferredTimescale: 600),
        toleranceBefore: .zero, toleranceAfter: .zero
      ) { [weak self] finished in
        DispatchQueue.main.async {
          guard let self, self.pendingLoad === load else { return }
          self.pendingLoad = nil
          guard finished, self.player === player else {
            load.promise.reject(withError: Self.failure("play", Problem.state))
            return
          }
          if !self.playbackPaused { player.play() }
          self.syncNowPlaying()
          load.promise.resolve(withResult: self.playbackStatus())
        }
      }
    default:
      return
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
      // a prepared load plays itself once its seek lands.
      if self.pendingLoad == nil { player.play() }
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
      guard let player = self.player, player.currentItem?.status == .readyToPlay,
        self.pendingLoad == nil
      else {
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
      let artwork = try Self.nowPlayingArtwork(info)
      self.claimNowPlaying(.global, player: player, info: info, artwork: artwork)
    }
  }

  func clearNowPlayingInfo() throws -> Promise<Void> {
    perform("clearNowPlayingInfo") {
      if self.nowPlayingOwner == .global { self.clearNowPlaying() }
    }
  }

  func setPlayerNowPlayingInfo(playerId: String, info: AudioNowPlayingInfo) throws -> Promise<Void> {
    perform("setPlayerNowPlayingInfo") {
      let managed = try self.managedPlayer(playerId)
      let artwork = try Self.nowPlayingArtwork(info)
      self.claimNowPlaying(.managed(playerId), player: managed.player, info: info, artwork: artwork)
    }
  }

  func clearPlayerNowPlayingInfo(playerId: String) throws -> Promise<Void> {
    perform("clearPlayerNowPlayingInfo") {
      if self.nowPlayingOwner == .managed(playerId) { self.clearNowPlaying() }
    }
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

  func createPlayer(sourceUri: String?, headers: Dictionary<String, String>?) throws -> String {
    try mainSync("createPlayer") {
      let managed = ManagedAudioPlayer(player: AVPlayer())
      if let sourceUri {
        managed.item = try Self.playerItem(uri: sourceUri, headers: headers)
        managed.player.replaceCurrentItem(with: managed.item)
        Self.applyPitch(managed)
      }
      let id = UUID().uuidString
      self.installPlayerEndObserver(id: id, managed: managed)
      self.managedPlayers[id] = managed
      return id
    }
  }

  func playerPlay(playerId: String) throws -> Void {
    try mainSync("playerPlay") {
      try self.startManaged(try self.managedPlayer(playerId))
    }
  }

  func playerPause(playerId: String) throws -> Void {
    try mainSync("playerPause") {
      let managed = try self.managedPlayer(playerId)
      managed.player.pause()
      managed.paused = true
      self.syncOwner(playerId)
    }
  }

  func playerSeek(
    playerId: String, seconds: Double, toleranceBeforeMs: Double?, toleranceAfterMs: Double?
  ) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        let managed = try self.managedPlayer(playerId)
        guard seconds.isFinite && seconds >= 0 else { throw Problem.position }
        let player = managed.player
        guard player.currentItem?.status == .readyToPlay else { throw Problem.state }
        let before = toleranceBeforeMs.map { CMTime(seconds: $0 / 1000, preferredTimescale: 600) }
          ?? .zero
        let after = toleranceAfterMs.map { CMTime(seconds: $0 / 1000, preferredTimescale: 600) }
          ?? .zero
        player.seek(
          to: CMTime(seconds: seconds, preferredTimescale: 600),
          toleranceBefore: before, toleranceAfter: after
        ) { finished in
          DispatchQueue.main.async {
            guard finished, self.managedPlayers[playerId] === managed else {
              promise.reject(withError: Self.failure("playerSeek", Problem.state))
              return
            }
            managed.ended = false
            self.syncOwner(playerId)
            promise.resolve()
          }
        }
      } catch {
        promise.reject(withError: Self.failure("playerSeek", error))
      }
    }
    return promise
  }

  func playerReplace(playerId: String, sourceUri: String?, headers: Dictionary<String, String>?) throws -> Void {
    try mainSync("playerReplace") {
      let managed = try self.managedPlayer(playerId)
      self.clearPlayerEndObserver(managed)
      if let sourceUri {
        managed.item = try Self.playerItem(uri: sourceUri, headers: headers)
        Self.applyPitch(managed)
      } else {
        managed.item = nil
      }
      managed.player.replaceCurrentItem(with: managed.item)
      managed.paused = true
      managed.ended = false
      self.installPlayerEndObserver(id: playerId, managed: managed)
      if self.nowPlayingOwner == .managed(playerId) {
        self.observeOwner()
        self.syncNowPlaying()
      }
    }
  }

  func removePlayer(playerId: String) throws -> Void {
    if !Thread.isMainThread {
      try DispatchQueue.main.sync { try self.removePlayer(playerId: playerId) }
      return
    }
    guard let managed = managedPlayers.removeValue(forKey: playerId) else { return }
    if nowPlayingOwner == .managed(playerId) { clearNowPlaying() }
    clearPlayerEndObserver(managed)
    managed.player.pause()
    managed.player.replaceCurrentItem(with: nil)
  }

  func getPlayerStatus(playerId: String) throws -> AudioPlayerStatus {
    try mainSync("getPlayerStatus") {
      let managed = try self.managedPlayer(playerId)
      return self.playerStatus(managed)
    }
  }

  func setPlayerRate(playerId: String, rate: Double, pitchQuality: PitchCorrectionQuality?) throws -> Void {
    try mainSync("setPlayerRate") {
      let managed = try self.managedPlayer(playerId)
      guard rate.isFinite && rate >= 0 && rate <= 2 else { throw Problem.rate }
      managed.rate = rate
      if let pitchQuality {
        managed.pitchQuality = pitchQuality
        Self.applyPitch(managed)
      }
      if !managed.paused && !managed.ended {
        managed.player.rate = Float(rate)
      }
    }
  }

  func setPlayerVolume(playerId: String, volume: Double) throws -> Void {
    try mainSync("setPlayerVolume") {
      let managed = try self.managedPlayer(playerId)
      let clamped = min(1, max(0, volume))
      managed.volume = clamped
      managed.player.volume = Float(clamped)
    }
  }

  func setPlayerMuted(playerId: String, muted: Bool) throws -> Void {
    try mainSync("setPlayerMuted") {
      let managed = try self.managedPlayer(playerId)
      managed.muted = muted
      managed.player.isMuted = muted
    }
  }

  func setPlayerLoop(playerId: String, loop: Bool) throws -> Void {
    try mainSync("setPlayerLoop") {
      let managed = try self.managedPlayer(playerId)
      managed.loop = loop
    }
  }

  func setPlayerPitchCorrection(playerId: String, enabled: Bool) throws -> Void {
    try mainSync("setPlayerPitchCorrection") {
      let managed = try self.managedPlayer(playerId)
      managed.pitchCorrection = enabled
      Self.applyPitch(managed)
    }
  }

  private func startManaged(_ managed: ManagedAudioPlayer) throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playback, mode: .default)
    try session.setActive(true)
    if managed.ended {
      managed.player.seek(to: .zero)
      managed.ended = false
    }
    managed.paused = false
    managed.player.rate = Float(managed.rate)
  }

  private func syncOwner(_ playerId: String) {
    if nowPlayingOwner == .managed(playerId) { syncNowPlaying() }
  }

  private func managedPlayer(_ id: String) throws -> ManagedAudioPlayer {
    guard let managed = managedPlayers[id] else { throw Problem.unknownPlayer }
    return managed
  }

  private func playerStatus(_ managed: ManagedAudioPlayer) -> AudioPlayerStatus {
    let player = managed.player
    let item = managed.item
    let position = player.currentTime().seconds
    let duration = item?.duration.seconds ?? .nan
    let playing = player.timeControlStatus == .playing
    return AudioPlayerStatus(
      currentTime: position.isFinite ? max(0, position) : 0,
      duration: duration.isFinite && duration >= 0 ? duration : 0,
      playing: playing,
      paused: managed.paused,
      isLoaded: item?.status == .readyToPlay,
      isBuffering: player.timeControlStatus == .waitingToPlayAtSpecifiedRate,
      loop: managed.loop,
      muted: managed.muted,
      volume: managed.volume,
      playbackRate: managed.rate,
      shouldCorrectPitch: managed.pitchCorrection,
      error: item?.error?.localizedDescription,
      didJustFinish: managed.ended)
  }

  private static func playerItem(
    uri: String, headers: Dictionary<String, String>?
  ) throws -> AVPlayerItem {
    let url = try Self.audioURL(uri)
    if url.isFileURL && !FileManager.default.fileExists(atPath: url.path) {
      throw Problem.missingFile
    }
    if url.isFileURL || headers?.isEmpty ?? true {
      return AVPlayerItem(url: url)
    }
    let asset = AVURLAsset(url: url, options: ["AVURLAssetHTTPHeaderFieldsKey": headers!])
    return AVPlayerItem(asset: asset)
  }

  private static func applyPitch(_ managed: ManagedAudioPlayer) {
    guard let item = managed.item else { return }
    if !managed.pitchCorrection {
      item.audioTimePitchAlgorithm = .varispeed
      return
    }
    switch managed.pitchQuality {
    case .low: item.audioTimePitchAlgorithm = .lowQualityZeroLatency
    case .medium: item.audioTimePitchAlgorithm = .timeDomain
    case .high: item.audioTimePitchAlgorithm = .spectral
    }
  }

  private func installPlayerEndObserver(id: String, managed: ManagedAudioPlayer) {
    guard let item = managed.item else { return }
    managed.endObserver = NotificationCenter.default.addObserver(
      forName: AVPlayerItem.didPlayToEndTimeNotification, object: item, queue: .main
    ) { [weak self, weak managed] _ in
      guard let self, let managed, self.managedPlayers[id] === managed else { return }
      if managed.loop {
        managed.player.seek(to: .zero) { _ in
          DispatchQueue.main.async { [weak managed] in
            guard let managed, !managed.paused else { return }
            managed.player.rate = Float(managed.rate)
          }
        }
      } else {
        managed.ended = true
        self.syncOwner(id)
      }
    }
  }

  private func clearPlayerEndObserver(_ managed: ManagedAudioPlayer) {
    if let endObserver = managed.endObserver {
      NotificationCenter.default.removeObserver(endObserver)
    }
    managed.endObserver = nil
  }

  private func mainSync<T>(_ verb: String, _ work: () throws -> T) throws -> T {
    if Thread.isMainThread {
      do { return try work() }
      catch { throw Self.failure(verb, error) }
    }
    return try DispatchQueue.main.sync {
      do { return try work() }
      catch { throw Self.failure(verb, error) }
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
      for managed in managedPlayers.values {
        managed.player.pause()
        managed.paused = true
      }
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
    else if pendingLoad != nil { state = .loading }
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
    guard let player = ownerPlayer() else { return .noSuchContent }
    return handleRemoteCommand(
      ownerPaused() || player.timeControlStatus != .playing ? .play : .pause)
  }

  private func handleRemoteCommand(
    _ type: AudioRemoteCommandType, positionMs: Double? = nil
  ) -> MPRemoteCommandHandlerStatus {
    if !Thread.isMainThread {
      return DispatchQueue.main.sync { self.handleRemoteCommand(type, positionMs: positionMs) }
    }
    guard nowPlayingSession != nil, let owner = nowPlayingOwner else { return .noSuchContent }
    if type == .seek {
      guard let positionMs, positionMs.isFinite, positionMs >= 0 else { return .commandFailed }
    }
    var playerId: String?
    switch owner {
    case .global:
      guard let player else { return .noSuchContent }
      switch type {
      case .play:
        if playbackEnded { player.seek(to: .zero); playbackEnded = false }
        playbackPaused = false
        if pendingLoad == nil { player.play() }
      case .pause:
        player.pause()
        playbackPaused = true
      case .seek:
        guard pendingLoad == nil else { return .commandFailed }
        seekOwner(player, positionMs: positionMs!)
        playbackEnded = false
      }
    case .managed(let id):
      guard let managed = managedPlayers[id] else { return .noSuchContent }
      playerId = id
      switch type {
      case .play:
        do { try startManaged(managed) } catch { return .commandFailed }
      case .pause:
        managed.player.pause()
        managed.paused = true
      case .seek:
        guard managed.player.currentItem?.status == .readyToPlay else { return .commandFailed }
        seekOwner(managed.player, positionMs: positionMs!)
        managed.ended = false
      }
    }
    syncNowPlaying()
    let event = AudioRemoteCommandEvent(type: type, positionMs: positionMs, playerId: playerId)
    for listener in Array(remoteCommandListeners.values) { listener(event) }
    return .success
  }

  private func seekOwner(_ player: AVPlayer, positionMs: Double) {
    player.seek(to: CMTime(seconds: positionMs / 1000, preferredTimescale: 600)) {
      [weak self] _ in
      DispatchQueue.main.async { self?.syncNowPlaying() }
    }
  }

  private func ownerPlayer() -> AVPlayer? {
    switch nowPlayingOwner {
    case .global: return player
    case .managed(let id): return managedPlayers[id]?.player
    case nil: return nil
    }
  }

  private func ownerPaused() -> Bool {
    switch nowPlayingOwner {
    case .global: return playbackPaused
    case .managed(let id): return managedPlayers[id]?.paused ?? true
    case nil: return true
    }
  }

  private func ownerEnded() -> Bool {
    switch nowPlayingOwner {
    case .global: return playbackEnded
    case .managed(let id): return managedPlayers[id]?.ended ?? false
    case nil: return false
    }
  }

  private static func nowPlayingArtwork(_ info: AudioNowPlayingInfo) throws -> UIImage? {
    guard !info.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw Problem.metadata
    }
    guard let artworkUri = info.artworkUri else { return nil }
    guard let url = URL(string: artworkUri), url.isFileURL,
      FileManager.default.fileExists(atPath: url.path),
      let image = UIImage(contentsOfFile: url.path)
    else { throw Problem.artwork }
    return image
  }

  // a claim for the session's own player keeps it. a transfer to another
  // player starts a session for that player and publishes the new card in
  // the same pass, without clearing the old one first. swapping players on
  // one session raised an objective-c exception on the ios 27 simulator.
  private func claimNowPlaying(
    _ owner: NowPlayingOwner, player: AVPlayer, info: AudioNowPlayingInfo, artwork: UIImage?
  ) {
    nowPlayingInfo = info
    nowPlayingArtwork = artwork
    nowPlayingOwner = owner
    let session: MPNowPlayingSession
    if let current = nowPlayingSession, current.players.count == 1,
      current.players[0] === player
    {
      session = current
    } else {
      for (command, target) in remoteTargets { command.removeTarget(target) }
      session = MPNowPlayingSession(players: [player])
      session.automaticallyPublishesNowPlayingInfo = false
      nowPlayingSession = session
      installRemoteCommands(session.remoteCommandCenter)
    }
    observeOwner()
    syncNowPlaying()
    session.becomeActiveIfPossible { [weak self, weak session] active in
      guard active, let session else { return }
      DispatchQueue.main.async { [weak self] in
        guard let self, self.nowPlayingSession === session else { return }
        self.syncNowPlaying()
      }
    }
  }

  private func observeOwner() {
    ownerObservations.forEach { $0.invalidate() }
    ownerObservations.removeAll()
    guard let player = ownerPlayer() else { return }
    ownerObservations.append(
      player.observe(\.timeControlStatus, options: [.new]) { [weak self] _, _ in
        DispatchQueue.main.async { self?.syncNowPlaying() }
      })
    if let item = player.currentItem {
      ownerObservations.append(
        item.observe(\.status, options: [.new]) { [weak self] _, _ in
          DispatchQueue.main.async { self?.syncNowPlaying() }
        })
    }
  }

  private func syncNowPlaying() {
    guard let session = nowPlayingSession, let info = nowPlayingInfo, let player = ownerPlayer()
    else { return }
    let position = player.currentTime().seconds
    let duration = player.currentItem?.duration.seconds ?? .nan
    var metadata: [String: Any] = [
      MPMediaItemPropertyTitle: info.title,
      MPNowPlayingInfoPropertyMediaType: MPNowPlayingInfoMediaType.audio.rawValue,
      MPNowPlayingInfoPropertyElapsedPlaybackTime: position.isFinite ? max(0, position) : 0,
      MPNowPlayingInfoPropertyPlaybackRate:
        !ownerEnded() && player.timeControlStatus == .playing ? player.rate : 0.0,
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
    nowPlayingOwner = nil
    ownerObservations.forEach { $0.invalidate() }
    ownerObservations.removeAll()
  }

  private func clearPlayer() {
    if nowPlayingOwner == .global { clearNowPlaying() }
    if let load = pendingLoad {
      pendingLoad = nil
      load.promise.reject(withError: Self.failure("play", Problem.replaced))
    }
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
    case Problem.unknownPlayer: code = "E_AUDIO_STATE"
    case Problem.rate: code = "E_AUDIO_RATE"
    case Problem.replaced: code = "E_AUDIO_STATE"
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
