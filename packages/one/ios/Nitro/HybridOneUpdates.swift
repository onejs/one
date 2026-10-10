import NitroModules

// the js face of One.Updates. every call delegates to the launcher, which
// selected this bundle before React Native started: the reads describe the
// running update, check and fetch talk to the update server, and reload
// restarts the host onto the newest ready update.
final class HybridOneUpdates: HybridOneUpdatesSpec {
  var isEnabled: Bool {
    OneUpdatesLauncher.isEnabled
  }

  var runtimeVersion: String? {
    OneUpdatesLauncher.runtimeVersion
  }

  var updateId: String? {
    OneUpdatesLauncher.currentUpdateId()
  }

  var isEmbeddedLaunch: Bool {
    OneUpdatesLauncher.currentManifestJson() == nil
  }

  var createdAt: String? {
    OneUpdatesLauncher.currentCreatedAt()
  }

  var manifestJson: String? {
    OneUpdatesLauncher.currentManifestJson()
  }

  func check() throws -> Promise<OneUpdatesCheckResult> {
    OneUpdatesLauncher.check()
  }

  func fetch() throws -> Promise<OneUpdatesFetchResult> {
    OneUpdatesLauncher.fetch()
  }

  func getStagedJson() throws -> String? {
    OneUpdatesLauncher.currentStagedJson()
  }

  func addStagedListener(listener: @escaping (_ stagedJson: String?) -> Void) throws -> () -> Void {
    OneUpdatesLauncher.addStagedListener(listener)
  }

  func reload() throws -> Promise<Void> {
    OneUpdatesLauncher.reload()
  }
}
