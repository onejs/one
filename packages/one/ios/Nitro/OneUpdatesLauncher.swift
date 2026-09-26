import CryptoKit
import Foundation
import NitroModules
import React

// launch selection, download, rollback, and reaping for One.Updates. the
// prebuild patch points the release bundleURL at this class, which answers
// before React Native starts and is re-read on every reload. there is no
// network on the launch path: selection reads one json state file plus the
// embedded manifest the release bundle phase wrote beside the bundle.
//
// layout under application support:
//   one-updates/state.json          every downloaded update plus launching
//   one-updates/<id>/main.jsbundle  the hermes bundle react native loads
//   one-updates/<id>/<path>         each asset where the resolver looks
//   one-updates/.tmp-<id>/          a fetch in progress, renamed on success

// the static manifest shape, shared with the publish command and the js api.
struct OneUpdatesAsset: Codable {
  var hash: String
  var url: String
  var path: String
}

enum OneUpdatesMetadataValue: Codable {
  case string(String)
  case number(Double)
  case bool(Bool)

  init(from decoder: Decoder) throws {
    let container = try decoder.singleValueContainer()
    if let value = try? container.decode(Bool.self) {
      self = .bool(value)
    } else if let value = try? container.decode(Double.self) {
      self = .number(value)
    } else {
      self = .string(try container.decode(String.self))
    }
  }

  func encode(to encoder: Encoder) throws {
    var container = encoder.singleValueContainer()
    switch self {
    case .string(let value): try container.encode(value)
    case .number(let value): try container.encode(value)
    case .bool(let value): try container.encode(value)
    }
  }
}

struct OneUpdatesManifest: Codable {
  var id: String
  var createdAt: String
  var runtimeVersion: String
  var launchAsset: OneUpdatesAsset
  var assets: [OneUpdatesAsset]
  var metadata: [String: OneUpdatesMetadataValue]
}

struct OneUpdatesEmbedded: Codable {
  var id: String
  var createdAt: String
  var runtimeVersion: String
}

struct OneUpdatesStoredUpdate: Codable {
  var id: String
  var createdAt: String
  var runtimeVersion: String
  var successes: Int
  var failed: Bool
  var manifestJson: String
}

struct OneUpdatesStateFile: Codable {
  var updates: [String: OneUpdatesStoredUpdate]
  var launching: String?
}

@objc public final class OneUpdatesLauncher: NSObject {
  static let bundleFileName = "main.jsbundle"
  static let embeddedManifestName = "one-updates-embedded"
  static let stateFileName = "state.json"
  static let directoryName = "one-updates"

  private static let lock = NSRecursiveLock()
  private static var installed = false
  private static var runningId: String?
  private static var runningEmbedded = true
  private static var contentAppeared = false
  // the just-failed update the next selection skips once, so an in-session
  // rollback lands on the next candidate instead of reselecting a proven
  // update that stays a candidate.
  private static var skipOnce: String?
  // the stale-launching recovery below runs once per process: reload()
  // records launching and the bundle url re-selects in the same process,
  // and that fresh launching is the reload target, not a crash.
  private static var consumedLaunching = false
  private static var pendingReload: Promise<Void>?
  private static var stagedListeners: [Int: (String?) -> Void] = [:]
  private static var nextListenerId = 0
  private static var previousFatalHandler: RCTFatalHandler?
  private static var previousFatalExceptionHandler: RCTFatalExceptionHandler?
  private static var session: URLSession?

  // MARK: - config and paths

  static var updatesURL: String? {
    Bundle.main.object(forInfoDictionaryKey: "OneUpdatesURL") as? String
  }

  static var runtimeVersion: String? {
    Bundle.main.object(forInfoDictionaryKey: "OneUpdatesRuntimeVersion") as? String
  }

  static var isEnabled: Bool {
    #if DEBUG
    return false
    #else
    guard let url = updatesURL, !url.isEmpty else { return false }
    guard let version = runtimeVersion, !version.isEmpty else { return false }
    return true
    #endif
  }

  static func directory() -> URL {
    let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    return base.appendingPathComponent(directoryName, isDirectory: true)
  }

  static func stateURL() -> URL {
    directory().appendingPathComponent(stateFileName)
  }

  static func updateDirectory(id: String) -> URL {
    directory().appendingPathComponent(id, isDirectory: true)
  }

  static func manifestURL() -> URL? {
    guard
      let base = updatesURL,
      let version = runtimeVersion,
      let root = URL(string: base.hasSuffix("/") ? String(base.dropLast()) : base)
    else { return nil }
    return root
      .appendingPathComponent("ios")
      .appendingPathComponent(version)
      .appendingPathComponent("manifest.json")
  }

  // MARK: - embedded update

  static func embedded() -> OneUpdatesEmbedded {
    if
      let url = Bundle.main.url(forResource: embeddedManifestName, withExtension: "json"),
      let data = try? Data(contentsOf: url),
      let manifest = try? JSONDecoder().decode(OneUpdatesEmbedded.self, from: data)
    {
      return manifest
    }
    // a configured build always carries the phase-written manifest; without
    // it the embedded bundle still launches, ordered below every download.
    return OneUpdatesEmbedded(
      id: "embedded", createdAt: "1970-01-01T00:00:00Z", runtimeVersion: runtimeVersion ?? "")
  }

  static func embeddedBundleURL() -> URL? {
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
  }

  // MARK: - state

  static func loadState() -> OneUpdatesStateFile {
    guard
      let data = try? Data(contentsOf: stateURL()),
      let state = try? JSONDecoder().decode(OneUpdatesStateFile.self, from: data)
    else {
      return OneUpdatesStateFile(updates: [:], launching: nil)
    }
    return state
  }

  static func saveState(_ state: OneUpdatesStateFile) {
    guard let data = try? JSONEncoder().encode(state) else { return }
    try? FileManager.default.createDirectory(
      at: directory(), withIntermediateDirectories: true)
    try? data.write(to: stateURL(), options: .atomic)
  }

  // MARK: - shared helpers

  static func dateOf(createdAt: String) -> Date? {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = formatter.date(from: createdAt) { return date }
    formatter.formatOptions = [.withInternetDateTime]
    return formatter.date(from: createdAt)
  }

  static func sha256Base64URL(of url: URL) -> String? {
    guard let data = try? Data(contentsOf: url) else { return nil }
    let digest = SHA256.hash(data: data)
    return Data(digest)
      .base64EncodedString()
      .replacingOccurrences(of: "+", with: "-")
      .replacingOccurrences(of: "/", with: "_")
      .replacingOccurrences(of: "=", with: "")
  }

  static func parseManifest(json: String) -> OneUpdatesManifest? {
    guard let data = json.data(using: .utf8) else { return nil }
    guard let manifest = try? JSONDecoder().decode(OneUpdatesManifest.self, from: data) else {
      return nil
    }
    guard dateOf(createdAt: manifest.createdAt) != nil else { return nil }
    guard isPlainName(manifest.id), manifest.assets.allSatisfy({ isRelativePath($0.path) })
    else { return nil }
    return manifest
  }

  // an id names a directory and each asset path a file under it, so a
  // manifest may only name plain relative paths inside the updates directory.
  static func isPlainName(_ name: String) -> Bool {
    !name.isEmpty && !name.hasPrefix(".") && !name.contains("/")
  }

  static func isRelativePath(_ path: String) -> Bool {
    path.split(separator: "/", omittingEmptySubsequences: false)
      .allSatisfy { !$0.isEmpty && $0 != "." && $0 != ".." }
  }

  static func parseManifest(data: Data) -> (OneUpdatesManifest, String)? {
    guard let json = String(data: data, encoding: .utf8) else { return nil }
    guard let manifest = parseManifest(json: json) else { return nil }
    return (manifest, json)
  }

  // the bundle re-hashes and every asset exists, like selection checks.
  static func updateIsComplete(id: String, manifest: OneUpdatesManifest) -> Bool {
    let dir = updateDirectory(id: id)
    let bundle = dir.appendingPathComponent(bundleFileName)
    guard sha256Base64URL(of: bundle) == manifest.launchAsset.hash else { return false }
    for asset in manifest.assets {
      if !FileManager.default.fileExists(atPath: dir.appendingPathComponent(asset.path).path) {
        return false
      }
    }
    return true
  }

  static func runningCreatedAt(state: OneUpdatesStateFile) -> Date {
    if let id = runningId, let entry = state.updates[id],
      let date = dateOf(createdAt: entry.createdAt)
    {
      return date
    }
    return dateOf(createdAt: embedded().createdAt) ?? .distantPast
  }

  // MARK: - selection

  // picks the bundle before React Native starts and records launching for a
  // downloaded winner. damaged candidates are marked failed and selection
  // falls through in the same launch; downloads for another runtime or
  // older than the embedded update are deleted.
  static func select() -> URL? {
    lock.lock()
    defer { lock.unlock() }
    var state = loadState()
    var dirty = false
    let embeddedUpdate = embedded()
    let embeddedDate = dateOf(createdAt: embeddedUpdate.createdAt) ?? .distantPast

    // a crashed fetch leaves its temp directory behind; no fetch runs during
    // selection, so every temp directory is stale.
    if let entries = try? FileManager.default.contentsOfDirectory(
      at: directory(), includingPropertiesForKeys: nil)
    {
      for entry in entries where entry.lastPathComponent.hasPrefix(".tmp-") {
        try? FileManager.default.removeItem(at: entry)
      }
    }

    // a cold launch that finds launching set covers a native crash, a hang,
    // or a kill before content appeared. a proven update is selected again;
    // an unproven one never is.
    if !consumedLaunching {
      consumedLaunching = true
      if let launching = state.launching {
        if let entry = state.updates[launching], entry.successes == 0 {
          state.updates[launching]?.failed = true
        }
        state.launching = nil
        dirty = true
      }
    }

    for (id, entry) in state.updates {
      let entryDate = dateOf(createdAt: entry.createdAt) ?? .distantPast
      if entry.runtimeVersion != embeddedUpdate.runtimeVersion || entryDate < embeddedDate {
        try? FileManager.default.removeItem(at: updateDirectory(id: id))
        state.updates[id] = nil
        dirty = true
      }
    }

    let skip = skipOnce
    skipOnce = nil
    // the embedded update is always a candidate; the newest by createdAt
    // wins, with the id breaking ties deterministically.
    var winner: String?
    var winnerDate = embeddedDate
    var winnerId = embeddedUpdate.id
    for (id, entry) in state.updates {
      if id == skip { continue }
      if entry.failed && entry.successes == 0 { continue }
      guard let manifest = parseManifest(json: entry.manifestJson) else {
        state.updates[id]?.failed = true
        dirty = true
        continue
      }
      if !updateIsComplete(id: id, manifest: manifest) {
        state.updates[id]?.failed = true
        dirty = true
        continue
      }
      guard let entryDate = dateOf(createdAt: entry.createdAt) else { continue }
      if entryDate > winnerDate || (entryDate == winnerDate && id > winnerId) {
        winner = id
        winnerDate = entryDate
        winnerId = id
      }
    }

    if let winner {
      runningId = winner
      runningEmbedded = false
      state.launching = winner
      dirty = true
    } else {
      runningId = nil
      runningEmbedded = true
    }
    if dirty { saveState(state) }

    if let winner {
      return updateDirectory(id: winner).appendingPathComponent(bundleFileName)
    }
    return embeddedBundleURL()
  }

  // MARK: - launch hooks

  // the prebuild patch points the release bundleURL at this, through the
  // OneUpdatesBundleURL c entry point (app targets cannot import the One
  // module: its c++ umbrella does not rebuild under their flags). installing
  // here covers every launch: nothing js can fail before the bundle url is
  // read, and content appears strictly later. without an updates url the
  // embedded bundle launches and the launcher never touches state.
  @objc public static func bundleURL() -> URL? {
    ensureInstalled()
    guard isEnabled else { return embeddedBundleURL() }
    return select()
  }

  static func ensureInstalled() {
    lock.lock()
    defer { lock.unlock() }
    #if DEBUG
    return
    #else
    if installed { return }
    installed = true
    guard isEnabled else { return }
    previousFatalHandler = RCTGetFatalHandler()
    previousFatalExceptionHandler = RCTGetFatalExceptionHandler()
    RCTSetFatalHandler { error in
      if let error {
        OneUpdatesLauncher.handleFatal(error: error as NSError)
      }
    }
    RCTSetFatalExceptionHandler { exception in
      if let exception {
        OneUpdatesLauncher.handleFatalException(exception: exception)
      }
    }
    NotificationCenter.default.addObserver(
      forName: NSNotification.Name.RCTContentDidAppear,
      object: nil,
      queue: .main
    ) { _ in
      OneUpdatesLauncher.handleContentAppeared()
    }
    #endif
  }

  static func handleContentAppeared() {
    lock.lock()
    let pending = pendingReload
    pendingReload = nil
    contentAppeared = true
    var state = loadState()
    if let launching = state.launching {
      state.updates[launching]?.successes += 1
      state.launching = nil
      saveState(state)
    }
    reap()
    lock.unlock()
    // the staged listener fires only when fetch stages; after a reload the
    // js context is fresh and reads getStaged directly.
    pending?.resolve()
  }

  static func handleFatal(error: NSError) {
    lock.lock()
    let armed = !contentAppeared
    let launching = loadState().launching
    guard armed, let launching else {
      let previous = previousFatalHandler
      lock.unlock()
      if let previous {
        previous(error)
      } else {
        NSException(
          name: NSExceptionName("RCTFatalException: \(error.localizedDescription)"),
          reason: error.localizedDescription,
          userInfo: error.userInfo
        ).raise()
      }
      return
    }
    rollBack(launching: launching, reason: error.localizedDescription)
  }

  static func handleFatalException(exception: NSException) {
    lock.lock()
    let armed = !contentAppeared
    let launching = loadState().launching
    guard armed, let launching else {
      let previous = previousFatalExceptionHandler
      lock.unlock()
      if let previous {
        previous(exception)
      } else {
        exception.raise()
      }
      return
    }
    rollBack(launching: launching, reason: exception.reason ?? exception.name.rawValue)
  }

  // takes the held lock and releases it: marks the booted update failed and
  // reloads onto the previous one, skipping the failed update once.
  private static func rollBack(launching: String, reason: String) {
    NSLog("[OneUpdates] update %@ failed before first render, rolling back: %@", launching, reason)
    var state = loadState()
    state.updates[launching]?.failed = true
    state.launching = nil
    saveState(state)
    skipOnce = launching
    contentAppeared = false
    let pending = pendingReload
    pendingReload = nil
    // the rollback starts a new js context; its listeners register fresh.
    stagedListeners = [:]
    lock.unlock()
    pending?.reject(
      withError: oneNativeError(
        "E_UPDATES_RELOAD", "Updates.reload: the reloaded update failed before first render."))
    DispatchQueue.main.async {
      RCTTriggerReloadCommandListeners("One.Updates.rollback")
    }
  }

  // MARK: - reaper

  // after a launch succeeds, keep the running update and the newest older
  // update as the rollback spare, plus the newest update newer than the
  // running one as the staged update. delete every other downloaded update.
  // a failed update that never launched is garbage, never a spare; a failed
  // proven update stays a candidate and keeps its slot. the embedded update
  // lives in the app bundle and is never touched.
  static func reap() {
    var state = loadState()
    let runningDate = runningCreatedAt(state: state)
    let running = runningId
    var spare: String?
    var spareDate = Date.distantPast
    var spareId = ""
    var staged: String?
    var stagedDate = Date.distantPast
    var stagedId = ""
    for (id, entry) in state.updates {
      if id == running { continue }
      if entry.failed && entry.successes == 0 { continue }
      guard let entryDate = dateOf(createdAt: entry.createdAt) else { continue }
      if entryDate < runningDate
        && (entryDate > spareDate || (entryDate == spareDate && id > spareId))
      {
        spare = id
        spareDate = entryDate
        spareId = id
      } else if entryDate > runningDate
        && (entryDate > stagedDate || (entryDate == stagedDate && id > stagedId))
      {
        staged = id
        stagedDate = entryDate
        stagedId = id
      }
    }
    let keep: Set<String> = Set([running, spare, staged].compactMap { $0 })
    for id in state.updates.keys where !keep.contains(id) {
      try? FileManager.default.removeItem(at: updateDirectory(id: id))
      state.updates[id] = nil
    }
    // orphan directories without a state entry are never selected; drop them.
    if let entries = try? FileManager.default.contentsOfDirectory(
      at: directory(), includingPropertiesForKeys: nil)
    {
      for entry in entries {
        let name = entry.lastPathComponent
        if name == stateFileName || name.hasPrefix(".tmp-") { continue }
        var isDir: ObjCBool = false
        if FileManager.default.fileExists(atPath: entry.path, isDirectory: &isDir),
          isDir.boolValue, !keep.contains(name), state.updates[name] == nil
        {
          try? FileManager.default.removeItem(at: entry)
        }
      }
    }
    saveState(state)
  }

  // MARK: - reads

  // the running update: the selected download, or the embedded update with
  // no manifest. updateId is the embedded id on an embedded launch.
  static func currentUpdateId() -> String? {
    lock.lock()
    defer { lock.unlock() }
    if runningEmbedded { return embedded().id }
    return runningId
  }

  static func currentCreatedAt() -> String? {
    lock.lock()
    defer { lock.unlock() }
    if runningEmbedded { return embedded().createdAt }
    guard let id = runningId else { return nil }
    return loadState().updates[id]?.createdAt
  }

  static func currentManifestJson() -> String? {
    lock.lock()
    defer { lock.unlock() }
    if runningEmbedded { return nil }
    guard let id = runningId else { return nil }
    return loadState().updates[id]?.manifestJson
  }

  static func currentStagedJson() -> String? {
    lock.lock()
    defer { lock.unlock() }
    let state = loadState()
    let runningDate = runningCreatedAt(state: state)
    var staged: OneUpdatesStoredUpdate?
    var stagedDate = Date.distantPast
    var stagedId = ""
    for entry in state.updates.values {
      if entry.failed { continue }
      guard let manifest = parseManifest(json: entry.manifestJson) else { continue }
      guard let entryDate = dateOf(createdAt: entry.createdAt) else { continue }
      if entryDate > runningDate
        && (entryDate > stagedDate || (entryDate == stagedDate && entry.id > stagedId))
        && updateIsComplete(id: entry.id, manifest: manifest)
      {
        staged = entry
        stagedDate = entryDate
        stagedId = entry.id
      }
    }
    return staged?.manifestJson
  }

  // an id counts as staged when its entry is intact on disk; a damaged
  // entry refetches instead of short-circuiting.
  static func stagedIsComplete(id: String, state: OneUpdatesStateFile) -> Bool {
    guard let entry = state.updates[id], !entry.failed else { return false }
    guard let manifest = parseManifest(json: entry.manifestJson) else { return false }
    return updateIsComplete(id: id, manifest: manifest)
  }

  static func emitStaged() {
    let staged = currentStagedJson()
    lock.lock()
    let listeners = Array(stagedListeners.values)
    lock.unlock()
    for listener in listeners { listener(staged) }
  }

  static func addStagedListener(_ listener: @escaping (String?) -> Void) -> () -> Void {
    lock.lock()
    defer { lock.unlock() }
    let id = nextListenerId
    nextListenerId += 1
    stagedListeners[id] = listener
    return { [id] in
      OneUpdatesLauncher.lock.lock()
      OneUpdatesLauncher.stagedListeners[id] = nil
      OneUpdatesLauncher.lock.unlock()
    }
  }

  // MARK: - network

  static func urlSession() -> URLSession {
    lock.lock()
    defer { lock.unlock() }
    if let session { return session }
    let config = URLSessionConfiguration.ephemeral
    config.timeoutIntervalForRequest = 30
    config.timeoutIntervalForResource = 120
    let next = URLSession(configuration: config)
    session = next
    return next
  }

  enum DownloadResult {
    case downloaded
    case notFound
    case failed
  }

  // downloads to a file without holding the bytes in memory. 404 resolves
  // notFound so check and fetch map "nothing published" to none.
  static func downloadFile(
    from url: URL, to destination: URL, completion: @escaping (DownloadResult) -> Void
  ) {
    let task = urlSession().downloadTask(with: url) { tempURL, response, error in
      if error != nil {
        completion(.failed)
        return
      }
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      if status == 404 {
        completion(.notFound)
        return
      }
      guard status >= 200 && status < 300, let tempURL else {
        completion(.failed)
        return
      }
      do {
        try? FileManager.default.removeItem(at: destination)
        try FileManager.default.createDirectory(
          at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
        try FileManager.default.moveItem(at: tempURL, to: destination)
        completion(.downloaded)
      } catch {
        completion(.failed)
      }
    }
    task.resume()
  }

  // MARK: - check and fetch

  static func check() -> Promise<OneUpdatesCheckResult> {
    guard isEnabled, let url = manifestURL() else {
      return Promise.rejected(
        withError: oneNativeError(
          "E_UPDATES_DISABLED", "Updates.check: updates are disabled in this build."))
    }
    let promise = Promise<OneUpdatesCheckResult>()
    let task = urlSession().dataTask(with: url) { data, response, error in
      if error != nil {
        promise.reject(
          withError: oneNativeError(
            "E_UPDATES_CHECK", "Updates.check: the update server could not be reached."))
        return
      }
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      if status == 404 {
        promise.resolve(withResult: OneUpdatesCheckResult(type: .none, manifestJson: nil))
        return
      }
      guard status >= 200 && status < 300, let data,
        let (manifest, json) = parseManifest(data: data)
      else {
        promise.reject(
          withError: oneNativeError(
            "E_UPDATES_CHECK", "Updates.check: the server returned an unusable manifest."))
        return
      }
      guard manifest.runtimeVersion == runtimeVersion else {
        promise.resolve(withResult: OneUpdatesCheckResult(type: .none, manifestJson: nil))
        return
      }
      lock.lock()
      let state = loadState()
      let runningDate = runningCreatedAt(state: state)
      let staged = stagedIsComplete(id: manifest.id, state: state)
      lock.unlock()
      guard let servedDate = dateOf(createdAt: manifest.createdAt) else {
        promise.reject(
          withError: oneNativeError(
            "E_UPDATES_CHECK", "Updates.check: the server returned an unusable manifest."))
        return
      }
      if servedDate > runningDate && !staged {
        promise.resolve(withResult: OneUpdatesCheckResult(type: .available, manifestJson: json))
      } else {
        promise.resolve(withResult: OneUpdatesCheckResult(type: .none, manifestJson: nil))
      }
    }
    task.resume()
    return promise
  }

  static func fetch() -> Promise<OneUpdatesFetchResult> {
    guard isEnabled, let url = manifestURL() else {
      return Promise.rejected(
        withError: oneNativeError(
          "E_UPDATES_DISABLED", "Updates.fetch: updates are disabled in this build."))
    }
    let promise = Promise<OneUpdatesFetchResult>()
    let task = urlSession().dataTask(with: url) { data, response, error in
      // network failures reject check, here and for assets below; fetch is
      // reserved for files that arrived but failed their integrity check.
      if error != nil {
        promise.reject(
          withError: oneNativeError(
            "E_UPDATES_CHECK", "Updates.fetch: the update server could not be reached."))
        return
      }
      let status = (response as? HTTPURLResponse)?.statusCode ?? 0
      if status == 404 {
        promise.resolve(withResult: OneUpdatesFetchResult(type: .none, manifestJson: nil))
        return
      }
      guard status >= 200 && status < 300, let data else {
        promise.reject(
          withError: oneNativeError(
            "E_UPDATES_CHECK", "Updates.fetch: the update server could not be reached."))
        return
      }
      guard let (manifest, json) = parseManifest(data: data) else {
        promise.reject(
          withError: oneNativeError(
            "E_UPDATES_FETCH", "Updates.fetch: the server returned an unusable manifest."))
        return
      }
      guard manifest.runtimeVersion == runtimeVersion else {
        promise.resolve(withResult: OneUpdatesFetchResult(type: .none, manifestJson: nil))
        return
      }
      lock.lock()
      let state = loadState()
      let runningDate = runningCreatedAt(state: state)
      let staged = stagedIsComplete(id: manifest.id, state: state)
      lock.unlock()
      guard let servedDate = dateOf(createdAt: manifest.createdAt), servedDate > runningDate,
        !staged
      else {
        promise.resolve(withResult: OneUpdatesFetchResult(type: .none, manifestJson: nil))
        return
      }
      stage(manifest: manifest, manifestJson: json, manifestURL: url, promise: promise)
    }
    task.resume()
    return promise
  }

  // downloads every file into a temp directory, hard-linking bytes already
  // on disk, verifies every hash, then renames into place and records the
  // update atomically. any failure stages nothing.
  static func stage(
    manifest: OneUpdatesManifest,
    manifestJson: String,
    manifestURL: URL,
    promise: Promise<OneUpdatesFetchResult>
  ) {
    lock.lock()
    let state = loadState()
    // content-addressed sources: every intact file a downloaded update or
    // the embedded app bundle already carries.
    var sources: [String: URL] = [:]
    let linkable: (OneUpdatesAsset, URL) -> Void = { asset, file in
      if sources[asset.hash] == nil
        && FileManager.default.fileExists(atPath: file.path)
      {
        sources[asset.hash] = file
      }
    }
    for entry in state.updates.values {
      guard let known = parseManifest(json: entry.manifestJson) else { continue }
      let dir = updateDirectory(id: entry.id)
      linkable(known.launchAsset, dir.appendingPathComponent(bundleFileName))
      for asset in known.assets {
        linkable(asset, dir.appendingPathComponent(asset.path))
      }
    }
    if let resources = Bundle.main.resourceURL {
      for asset in [manifest.launchAsset] + manifest.assets {
        if sources[asset.hash] != nil { continue }
        let file = resources.appendingPathComponent(asset.path)
        if FileManager.default.fileExists(atPath: file.path),
          sha256Base64URL(of: file) == asset.hash
        {
          sources[asset.hash] = file
        }
      }
    }
    lock.unlock()

    let tmp = directory().appendingPathComponent(".tmp-\(manifest.id)", isDirectory: true)
    try? FileManager.default.removeItem(at: tmp)
    // the bundle lands at the fixed name; assets land at their paths.
    var files: [(asset: OneUpdatesAsset, relative: String)] = [
      (manifest.launchAsset, bundleFileName)
    ]
    for asset in manifest.assets {
      files.append((asset, asset.path))
    }
    stageNext(
      files: files, index: 0, manifest: manifest, manifestJson: manifestJson,
      manifestURL: manifestURL, tmp: tmp, sources: sources, promise: promise)
  }

  static func stageNext(
    files: [(asset: OneUpdatesAsset, relative: String)],
    index: Int,
    manifest: OneUpdatesManifest,
    manifestJson: String,
    manifestURL: URL,
    tmp: URL,
    sources: [String: URL],
    promise: Promise<OneUpdatesFetchResult>
  ) {
    if index >= files.count {
      finishStaging(
        manifest: manifest, manifestJson: manifestJson, tmp: tmp, promise: promise)
      return
    }
    let (asset, relative) = files[index]
    let destination = tmp.appendingPathComponent(relative)
    let next = {
      stageNext(
        files: files, index: index + 1, manifest: manifest, manifestJson: manifestJson,
        manifestURL: manifestURL, tmp: tmp, sources: sources, promise: promise)
    }
    if let source = sources[asset.hash] {
      do {
        try FileManager.default.createDirectory(
          at: destination.deletingLastPathComponent(), withIntermediateDirectories: true)
        // a link shares the bytes; a copy is the same file when the volume
        // refuses the link.
        do {
          try FileManager.default.linkItem(at: source, to: destination)
        } catch {
          try FileManager.default.copyItem(at: source, to: destination)
        }
        next()
      } catch {
        failStagingFetch(tmp: tmp, promise: promise)
      }
      return
    }
    guard let url = URL(string: asset.url, relativeTo: manifestURL)?.absoluteURL else {
      failStagingFetch(tmp: tmp, promise: promise)
      return
    }
    downloadFile(from: url, to: destination) { result in
      switch result {
      case .downloaded:
        guard sha256Base64URL(of: destination) == asset.hash else {
          failStagingFetch(tmp: tmp, promise: promise)
          return
        }
        next()
      case .notFound, .failed:
        failStagingCheck(tmp: tmp, promise: promise)
      }
    }
  }

  static func finishStaging(
    manifest: OneUpdatesManifest,
    manifestJson: String,
    tmp: URL,
    promise: Promise<OneUpdatesFetchResult>
  ) {
    lock.lock()
    defer { lock.unlock() }
    // verify every hash once more over the staged tree, then rename into
    // place and record the update. no partial state survives a failure.
    let bundle = tmp.appendingPathComponent(bundleFileName)
    var intact = sha256Base64URL(of: bundle) == manifest.launchAsset.hash
    for asset in manifest.assets {
      if sha256Base64URL(of: tmp.appendingPathComponent(asset.path)) != asset.hash {
        intact = false
        break
      }
    }
    guard intact else {
      try? FileManager.default.removeItem(at: tmp)
      promise.reject(
        withError: oneNativeError(
          "E_UPDATES_FETCH", "Updates.fetch: a downloaded file failed its hash check."))
      return
    }
    do {
      let final = updateDirectory(id: manifest.id)
      try? FileManager.default.removeItem(at: final)
      try FileManager.default.moveItem(at: tmp, to: final)
      var state = loadState()
      state.updates[manifest.id] = OneUpdatesStoredUpdate(
        id: manifest.id,
        createdAt: manifest.createdAt,
        runtimeVersion: manifest.runtimeVersion,
        successes: 0,
        failed: false,
        manifestJson: manifestJson
      )
      saveState(state)
    } catch {
      try? FileManager.default.removeItem(at: tmp)
      promise.reject(
        withError: oneNativeError(
          "E_UPDATES_FETCH", "Updates.fetch: the staged update could not be recorded."))
      return
    }
    promise.resolve(withResult: OneUpdatesFetchResult(type: .fetched, manifestJson: manifestJson))
    // listeners fire outside the lock through the emitter's own locking.
    DispatchQueue.global(qos: .utility).async {
      emitStaged()
    }
  }

  static func failStagingCheck(tmp: URL, promise: Promise<OneUpdatesFetchResult>) {
    try? FileManager.default.removeItem(at: tmp)
    promise.reject(
      withError: oneNativeError(
        "E_UPDATES_CHECK", "Updates.fetch: the update server could not be reached."))
  }

  static func failStagingFetch(tmp: URL, promise: Promise<OneUpdatesFetchResult>) {
    try? FileManager.default.removeItem(at: tmp)
    promise.reject(
      withError: oneNativeError(
        "E_UPDATES_FETCH", "Updates.fetch: a downloaded file failed its hash check."))
  }

  // MARK: - reload

  static func reload() -> Promise<Void> {
    lock.lock()
    defer { lock.unlock() }
    guard isEnabled else {
      return Promise.rejected(
        withError: oneNativeError(
          "E_UPDATES_DISABLED", "Updates.reload: updates are disabled in this build."))
    }
    if pendingReload != nil {
      return Promise.rejected(
        withError: oneNativeError(
          "E_UPDATES_RELOAD", "Updates.reload: a reload is already in progress."))
    }
    _ = select()
    contentAppeared = false
    let promise = Promise<Void>()
    pendingReload = promise
    // the reload starts a new js context; its listeners register fresh.
    stagedListeners = [:]
    DispatchQueue.main.async {
      RCTTriggerReloadCommandListeners("One.Updates.reload")
    }
    return promise
  }
}
