package com.margelo.nitro.one

import com.margelo.nitro.core.Promise

// the js face of One.Updates. every call delegates to the launcher, which
// selected this bundle before React Native started: the reads describe the
// running update, check and fetch talk to the update server, and reload
// restarts the host onto the newest ready update.
class HybridOneUpdates : HybridOneUpdatesSpec() {
    override val isEnabled: Boolean
        get() = OneUpdatesLauncher.isEnabled()

    override val runtimeVersion: String?
        get() = OneUpdatesLauncher.runtimeVersion()

    override val updateId: String?
        get() = OneUpdatesLauncher.currentUpdateId()

    override val isEmbeddedLaunch: Boolean
        get() = OneUpdatesLauncher.currentManifestJson() == null

    override val createdAt: String?
        get() = OneUpdatesLauncher.currentCreatedAt()

    override val manifestJson: String?
        get() = OneUpdatesLauncher.currentManifestJson()

    override fun check(): Promise<OneUpdatesCheckResult> = OneUpdatesLauncher.check()

    override fun fetch(): Promise<OneUpdatesFetchResult> = OneUpdatesLauncher.fetch()

    override fun getStagedJson(): String? = OneUpdatesLauncher.currentStagedJson()

    override fun addStagedListener(listener: (stagedJson: String?) -> Unit): () -> Unit =
        OneUpdatesLauncher.addStagedListener(listener)

    override fun reload(): Promise<Unit> = OneUpdatesLauncher.reload()
}
