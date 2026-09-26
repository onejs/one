package com.margelo.nitro.one

import android.app.Activity
import android.app.Application
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Base64
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.bridge.ReactMarker
import com.facebook.react.bridge.ReactMarkerConstants
import com.facebook.react.common.LifecycleState
import com.facebook.react.common.build.ReactBuildConfig
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.lang.ref.WeakReference
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest
import kotlin.concurrent.thread
import org.json.JSONArray
import org.json.JSONObject

// launch selection, download, rollback, and reaping for One.Updates. the
// prebuild patch builds the app's ReactHost on OneUpdatesReactHostDelegate,
// whose jsBundleLoader asks this launcher on every access, before React
// Native starts and on every reload. there is no network on the launch path:
// selection reads one json state file plus the embedded manifest the release
// bundle phase wrote into assets.
//
// layout under the app files dir:
//   one-updates/state.json          every downloaded update plus launching
//   one-updates/<id>/main.jsbundle  the hermes bundle react native loads
//   one-updates/<id>/<path>         each asset where the resolver looks
//   one-updates/.tmp-<id>/          a fetch in progress, renamed on success
object OneUpdatesLauncher {
    const val BUNDLE_FILE_NAME = "main.jsbundle"
    private const val EMBEDDED_MANIFEST_NAME = "one-updates-embedded.json"
    private const val STATE_FILE_NAME = "state.json"
    private const val DIRECTORY_NAME = "one-updates"
    private const val URL_META_DATA = "dev.onejs.updates.url"
    private const val RUNTIME_VERSION_META_DATA = "dev.onejs.updates.runtimeVersion"
    const val EMBEDDED_BUNDLE_ASSET = "index.android.bundle"

    private val lock = Any()
    private var appContext: Context? = null
    private var installed = false
    private var runningId: String? = null
    private var runningEmbedded = true
    private var contentAppeared = false
    // the just-failed update the next selection skips once, so an in-session
    // rollback lands on the next candidate instead of reselecting a proven
    // update that stays a candidate.
    private var skipOnce: String? = null
    // the stale-launching recovery below runs once per process: reload()
    // records launching and the host delegate re-selects in the same
    // process, and that fresh launching is the reload target, not a crash.
    private var consumedLaunching = false
    private var pendingReload: Promise<Unit>? = null
    private val stagedListeners = mutableMapOf<Int, (String?) -> Unit>()
    private var nextListenerId = 0
    private var currentActivity: WeakReference<Activity>? = null

    data class ManifestAsset(val hash: String, val url: String, val path: String)

    data class Manifest(
        val id: String,
        val createdAt: String,
        val createdAtMillis: Long,
        val runtimeVersion: String,
        val launchAsset: ManifestAsset,
        val assets: List<ManifestAsset>
    )

    data class Embedded(
        val id: String,
        val createdAt: String,
        val createdAtMillis: Long,
        val runtimeVersion: String
    )

    data class StoredUpdate(
        val id: String,
        val createdAt: String,
        val createdAtMillis: Long,
        val runtimeVersion: String,
        val successes: Int,
        val failed: Boolean,
        val manifestJson: String
    )

    private data class LauncherState(
        val updates: MutableMap<String, StoredUpdate>,
        var launching: String?
    )

    // MARK: - config and paths

    private fun context(): Context =
        appContext
            ?: NitroModules.applicationContext
            ?: throw IllegalStateException("Updates: React context is not ready")

    private fun metaData(name: String): String? {
        val context = context()
        val info =
            context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
        return info.metaData?.getString(name)?.takeIf { it.isNotEmpty() }
    }

    fun updatesUrl(): String? = metaData(URL_META_DATA)

    fun runtimeVersion(): String? = metaData(RUNTIME_VERSION_META_DATA)

    fun isEnabled(): Boolean {
        // build type, not the debuggable flag: a debuggable release build
        // still takes updates, which is how the suite reaches its files.
        if (ReactBuildConfig.DEBUG) return false
        return updatesUrl() != null && runtimeVersion() != null
    }

    fun directory(): File = File(context().filesDir, DIRECTORY_NAME)

    private fun stateFile(): File = File(directory(), STATE_FILE_NAME)

    fun updateDirectory(id: String): File = File(directory(), id)

    private fun manifestUrl(): URL? {
        val base = updatesUrl() ?: return null
        val version = runtimeVersion() ?: return null
        val root = if (base.endsWith("/")) base.dropLast(1) else base
        return URL("$root/android/$version/manifest.json")
    }

    // MARK: - install

    // runs from the patched MainApplication's host factory, before the first
    // content can appear. the content marker and the activity tracker install
    // once; without an updates url nothing installs and behavior is stock.
    fun install(context: Context) {
        synchronized(lock) {
            if (appContext == null) appContext = context.applicationContext
            if (installed) return
            installed = true
            if (!isEnabled()) return
            ReactMarker.addListener(markerListener)
            val app = context.applicationContext as? Application ?: return
            app.registerActivityLifecycleCallbacks(activityCallbacks)
        }
    }

    private val markerListener = ReactMarker.MarkerListener { name, _, _ ->
        if (name == ReactMarkerConstants.CONTENT_APPEARED) handleContentAppeared()
    }

    private val activityCallbacks =
        object : Application.ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                synchronized(lock) { currentActivity = WeakReference(activity) }
            }

            override fun onActivityPaused(activity: Activity) {
                synchronized(lock) {
                    if (currentActivity?.get() === activity) currentActivity = null
                }
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit

            override fun onActivityStarted(activity: Activity) = Unit

            override fun onActivityStopped(activity: Activity) = Unit

            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit

            override fun onActivityDestroyed(activity: Activity) = Unit
        }

    // MARK: - embedded update

    fun embedded(): Embedded {
        try {
            context().assets.open(EMBEDDED_MANIFEST_NAME).use { stream ->
                val json = JSONObject(stream.readBytes().toString(Charsets.UTF_8))
                val createdAt = json.getString("createdAt")
                val millis = createdAtMillis(createdAt) ?: return degenerateEmbedded()
                return Embedded(
                    json.getString("id"), createdAt, millis, json.getString("runtimeVersion"))
            }
        } catch (_: Exception) {
            return degenerateEmbedded()
        }
    }

    // a configured build always carries the phase-written manifest; without
    // it the embedded bundle still launches, ordered below every download.
    private fun degenerateEmbedded(): Embedded =
        Embedded("embedded", "1970-01-01T00:00:00Z", 0L, runtimeVersion() ?: "")

    private fun hasEmbeddedManifest(): Boolean {
        return try {
            context().assets.open(EMBEDDED_MANIFEST_NAME).close()
            true
        } catch (_: Exception) {
            false
        }
    }

    // MARK: - time

    // iso 8601 utc only, the one shape the publisher writes. parsed by hand
    // so release builds need no desugaring below api 26.
    private val createdAtPattern =
        Regex("""^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?Z$""")

    fun createdAtMillis(createdAt: String): Long? {
        val match = createdAtPattern.matchEntire(createdAt) ?: return null
        val fields = match.groupValues.drop(1)
        val numbers = fields.take(6).map { it.toIntOrNull() ?: return null }
        val year = numbers[0]
        val month = numbers[1]
        val day = numbers[2]
        val hour = numbers[3]
        val minute = numbers[4]
        val second = numbers[5]
        if (month !in 1..12 || day !in 1..31 || hour > 23 || minute > 59 || second > 59) return null
        // days from civil, howard hinnant's algorithm.
        val shiftedMonth = if (month <= 2) month + 9 else month - 3
        val shiftedYear = if (month <= 2) year - 1 else year
        val era = Math.floorDiv(shiftedYear, 400)
        val yearOfEra = shiftedYear - era * 400
        val dayOfYear = (153 * shiftedMonth + 2) / 5 + day - 1
        val dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear
        val days = era * 146097 + dayOfEra - 719468
        val fraction = fields.getOrNull(6).orEmpty()
        val millis = fraction.take(3).padEnd(3, '0').toLongOrNull() ?: 0L
        return days * 86_400_000L + hour * 3_600_000L + minute * 60_000L + second * 1_000L + millis
    }

    // MARK: - state

    private fun loadState(): LauncherState {
        val file = stateFile()
        if (!file.exists()) return LauncherState(mutableMapOf(), null)
        return try {
            val json = JSONObject(file.readText())
            val updates = json.optJSONObject("updates") ?: JSONObject()
            val state = mutableMapOf<String, StoredUpdate>()
            for (id in updates.keys()) {
                val entry = updates.getJSONObject(id)
                val createdAt = entry.getString("createdAt")
                val millis = createdAtMillis(createdAt) ?: continue
                state[id] =
                    StoredUpdate(
                        id = id,
                        createdAt = createdAt,
                        createdAtMillis = millis,
                        runtimeVersion = entry.getString("runtimeVersion"),
                        successes = entry.optInt("successes", 0),
                        failed = entry.optBoolean("failed", false),
                        manifestJson = entry.getString("manifestJson")
                    )
            }
            val launching = json.optString("launching", "").takeIf { it.isNotEmpty() }
            LauncherState(state, launching)
        } catch (_: Exception) {
            LauncherState(mutableMapOf(), null)
        }
    }

    private fun saveState(state: LauncherState) {
        val updates = JSONObject()
        for ((id, entry) in state.updates) {
            updates.put(
                id,
                JSONObject()
                    .put("createdAt", entry.createdAt)
                    .put("runtimeVersion", entry.runtimeVersion)
                    .put("successes", entry.successes)
                    .put("failed", entry.failed)
                    .put("manifestJson", entry.manifestJson)
            )
        }
        val json = JSONObject().put("updates", updates)
        val launching = state.launching
        if (launching != null) json.put("launching", launching)
        else json.put("launching", JSONObject.NULL)
        val dir = directory()
        dir.mkdirs()
        val tmp = File(dir, "$STATE_FILE_NAME.tmp")
        tmp.writeText(json.toString())
        if (!tmp.renameTo(stateFile())) {
            tmp.copyTo(stateFile(), overwrite = true)
            tmp.delete()
        }
    }

    // MARK: - shared helpers

    fun sha256Base64Url(file: File): String? {
        if (!file.isFile) return null
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            file.inputStream().use { stream ->
                val buffer = ByteArray(8192)
                while (true) {
                    val read = stream.read(buffer)
                    if (read < 0) break
                    digest.update(buffer, 0, read)
                }
            }
            Base64.encodeToString(
                digest.digest(), Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)
        } catch (_: Exception) {
            null
        }
    }

    fun parseManifest(json: String): Manifest? {
        return try {
            val root = JSONObject(json)
            val createdAt = root.getString("createdAt")
            val millis = createdAtMillis(createdAt) ?: return null
            fun asset(value: JSONObject) =
                ManifestAsset(
                    hash = value.getString("hash"),
                    url = value.getString("url"),
                    path = value.getString("path")
                )
            val assets = mutableListOf<ManifestAsset>()
            val raw: JSONArray = root.getJSONArray("assets")
            for (index in 0 until raw.length()) assets.add(asset(raw.getJSONObject(index)))
            Manifest(
                id = root.getString("id"),
                createdAt = createdAt,
                createdAtMillis = millis,
                runtimeVersion = root.getString("runtimeVersion"),
                launchAsset = asset(root.getJSONObject("launchAsset")),
                assets = assets
            )
        } catch (_: Exception) {
            null
        }
    }

    // the bundle re-hashes and every asset exists, like selection checks.
    private fun updateIsComplete(id: String, manifest: Manifest): Boolean {
        val dir = updateDirectory(id)
        if (sha256Base64Url(File(dir, BUNDLE_FILE_NAME)) != manifest.launchAsset.hash) return false
        for (asset in manifest.assets) {
            if (!File(dir, asset.path).isFile) return false
        }
        return true
    }

    private fun runningCreatedAtMillis(state: LauncherState): Long {
        val id = runningId
        if (id != null) {
            val entry = state.updates[id]
            if (entry != null) return entry.createdAtMillis
        }
        return embedded().createdAtMillis
    }

    // MARK: - selection

    // picks the bundle before React Native starts and records launching for a
    // downloaded winner. damaged candidates are marked failed and selection
    // falls through in the same launch; downloads for another runtime or
    // older than the embedded update are deleted. returns the downloaded
    // bundle file, or null for the embedded asset.
    fun select(): File? {
        synchronized(lock) {
            val state = loadState()
            var dirty = false
            val embeddedUpdate = embedded()

            // a crashed fetch leaves its temp directory behind; no fetch runs
            // during selection, so every temp directory is stale.
            directory().listFiles()?.forEach { entry ->
                if (entry.name.startsWith(".tmp-")) entry.deleteRecursively()
            }

            // a cold launch that finds launching set covers a native crash, a
            // hang, or a kill before content appeared. a proven update is
            // selected again; an unproven one never is.
            if (!consumedLaunching) {
                consumedLaunching = true
                val launching = state.launching
                if (launching != null) {
                    val entry = state.updates[launching]
                    if (entry != null && entry.successes == 0) {
                        state.updates[launching] = entry.copy(failed = true)
                    }
                    state.launching = null
                    dirty = true
                }
            }

            for ((id, entry) in state.updates.toMap()) {
                if (entry.runtimeVersion != embeddedUpdate.runtimeVersion ||
                    entry.createdAtMillis < embeddedUpdate.createdAtMillis
                ) {
                    updateDirectory(id).deleteRecursively()
                    state.updates.remove(id)
                    dirty = true
                }
            }

            val skip = skipOnce
            skipOnce = null
            // the embedded update is always a candidate; the newest by
            // createdAt wins, with the id breaking ties deterministically.
            var winner: String? = null
            var winnerMillis = embeddedUpdate.createdAtMillis
            var winnerId = embeddedUpdate.id
            for ((id, entry) in state.updates) {
                if (id == skip) continue
                if (entry.failed && entry.successes == 0) continue
                val manifest = parseManifest(entry.manifestJson)
                if (manifest == null) {
                    state.updates[id] = entry.copy(failed = true)
                    dirty = true
                    continue
                }
                if (!updateIsComplete(id, manifest)) {
                    state.updates[id] = entry.copy(failed = true)
                    dirty = true
                    continue
                }
                if (entry.createdAtMillis > winnerMillis ||
                    (entry.createdAtMillis == winnerMillis && id > winnerId)
                ) {
                    winner = id
                    winnerMillis = entry.createdAtMillis
                    winnerId = id
                }
            }

            contentAppeared = false
            if (winner != null) {
                runningId = winner
                runningEmbedded = false
                state.launching = winner
                dirty = true
            } else {
                runningId = null
                runningEmbedded = true
            }
            if (dirty) saveState(state)
            return winner?.let { File(updateDirectory(it), BUNDLE_FILE_NAME) }
        }
    }

    // MARK: - launch hooks

    fun handleContentAppeared() {
        val pending =
            synchronized(lock) {
                val pending = pendingReload
                pendingReload = null
                contentAppeared = true
                val state = loadState()
                val launching = state.launching
                if (launching != null) {
                    val entry = state.updates[launching]
                    if (entry != null) {
                        state.updates[launching] = entry.copy(successes = entry.successes + 1)
                    }
                    state.launching = null
                    saveState(state)
                }
                reapLocked()
                pending
            }
        // the staged listener fires only when fetch stages; after a reload
        // the js context is fresh and reads getStaged directly.
        pending?.let {
            try {
                it.resolve(Unit)
            } catch (_: Exception) {
            }
        }
    }

    // returns true when the error was consumed by a rollback; false chains to
    // the stock behavior of rethrowing.
    fun handleInstanceException(error: Exception): Boolean {
        val pending =
            synchronized(lock) {
                val state = loadState()
                val launching = state.launching
                if (contentAppeared || launching == null) return false
                Log.e(
                    "OneUpdates",
                    "update $launching failed before first render, rolling back: ${error.message}"
                )
                val entry = state.updates[launching]
                if (entry != null) state.updates[launching] = entry.copy(failed = true)
                state.launching = null
                saveState(state)
                skipOnce = launching
                contentAppeared = false
                val pending = pendingReload
                pendingReload = null
                // the rollback starts a new js context; its listeners
                // register fresh.
                stagedListeners.clear()
                pending
            }
        pending?.let {
            try {
                it.reject(
                    OneNativeError(
                        "E_UPDATES_RELOAD",
                        "Updates.reload: the reloaded update failed before first render."
                    )
                )
            } catch (_: Exception) {
            }
        }
        restartHost("One.Updates.rollback")
        return true
    }

    // MARK: - reaper

    // after a launch succeeds, keep the running update and the newest older
    // update as the rollback spare, plus the newest update newer than the
    // running one as the staged update. delete every other downloaded update.
    // a failed update that never launched is garbage, never a spare; a failed
    // proven update stays a candidate and keeps its slot. the embedded update
    // lives in the apk and is never touched.
    private fun reapLocked() {
        val state = loadState()
        val runningMillis = runningCreatedAtMillis(state)
        val running = runningId
        var spare: String? = null
        var spareMillis = Long.MIN_VALUE
        var spareId = ""
        var staged: String? = null
        var stagedMillis = Long.MIN_VALUE
        var stagedId = ""
        for ((id, entry) in state.updates) {
            if (id == running) continue
            if (entry.failed && entry.successes == 0) continue
            if (entry.createdAtMillis < runningMillis &&
                (entry.createdAtMillis > spareMillis ||
                    (entry.createdAtMillis == spareMillis && id > spareId))
            ) {
                spare = id
                spareMillis = entry.createdAtMillis
                spareId = id
            } else if (entry.createdAtMillis > runningMillis &&
                (entry.createdAtMillis > stagedMillis ||
                    (entry.createdAtMillis == stagedMillis && id > stagedId))
            ) {
                staged = id
                stagedMillis = entry.createdAtMillis
                stagedId = id
            }
        }
        val keep = setOfNotNull(running, spare, staged)
        for (id in state.updates.keys.toList()) {
            if (id !in keep) {
                updateDirectory(id).deleteRecursively()
                state.updates.remove(id)
            }
        }
        // orphan directories without a state entry are never selected; drop
        // them.
        directory().listFiles()?.forEach { entry ->
            if (entry.isDirectory &&
                entry.name != STATE_FILE_NAME &&
                !entry.name.startsWith(".tmp-") &&
                entry.name !in keep &&
                entry.name !in state.updates
            ) {
                entry.deleteRecursively()
            }
        }
        saveState(state)
    }

    // MARK: - reads

    fun currentUpdateId(): String? {
        synchronized(lock) {
            if (!runningEmbedded) return runningId
            // an unconfigured build carries no embedded manifest; its launch
            // is still embedded, with no id to report.
            return embedded().id.takeIf { hasEmbeddedManifest() }
        }
    }

    fun currentCreatedAt(): String? {
        synchronized(lock) {
            if (!runningEmbedded) {
                val id = runningId ?: return null
                return loadState().updates[id]?.createdAt
            }
            return embedded().createdAt.takeIf { hasEmbeddedManifest() }
        }
    }

    fun currentManifestJson(): String? {
        synchronized(lock) {
            if (runningEmbedded) return null
            val id = runningId ?: return null
            return loadState().updates[id]?.manifestJson
        }
    }

    fun currentStagedJson(): String? {
        synchronized(lock) {
            val state = loadState()
            val runningMillis = runningCreatedAtMillis(state)
            var staged: StoredUpdate? = null
            var stagedMillis = Long.MIN_VALUE
            var stagedId = ""
            for (entry in state.updates.values) {
                if (entry.failed) continue
                val manifest = parseManifest(entry.manifestJson) ?: continue
                if (entry.createdAtMillis > runningMillis &&
                    (entry.createdAtMillis > stagedMillis ||
                        (entry.createdAtMillis == stagedMillis && entry.id > stagedId)) &&
                    updateIsComplete(entry.id, manifest)
                ) {
                    staged = entry
                    stagedMillis = entry.createdAtMillis
                    stagedId = entry.id
                }
            }
            return staged?.manifestJson
        }
    }

    // an id counts as staged when its entry is intact on disk; a damaged
    // entry refetches instead of short-circuiting.
    private fun stagedIsComplete(id: String, state: LauncherState): Boolean {
        val entry = state.updates[id] ?: return false
        if (entry.failed) return false
        val manifest = parseManifest(entry.manifestJson) ?: return false
        return updateIsComplete(id, manifest)
    }

    private fun emitStaged() {
        val staged = currentStagedJson()
        val listeners =
            synchronized(lock) {
                stagedListeners.values.toList()
            }
        listeners.forEach { it(staged) }
    }

    fun addStagedListener(listener: (String?) -> Unit): () -> Unit {
        synchronized(lock) {
            val id = nextListenerId++
            stagedListeners[id] = listener
            return { synchronized(lock) { stagedListeners.remove(id) } }
        }
    }

    // MARK: - network

    private sealed interface FetchResult {
        data class Downloaded(val bytes: ByteArray) : FetchResult

        data object NotFound : FetchResult

        data object Failed : FetchResult
    }

    private fun openConnection(url: URL): HttpURLConnection? {
        val connection = url.openConnection() as? HttpURLConnection ?: return null
        connection.connectTimeout = 30_000
        connection.readTimeout = 120_000
        connection.instanceFollowRedirects = true
        connection.requestMethod = "GET"
        return connection
    }

    private fun getBytes(url: URL): FetchResult {
        return try {
            val connection = openConnection(url) ?: return FetchResult.Failed
            connection.connect()
            when (connection.responseCode) {
                404 -> {
                    connection.disconnect()
                    FetchResult.NotFound
                }
                in 200..299 -> {
                    val bytes = connection.inputStream.use { it.readBytes() }
                    connection.disconnect()
                    FetchResult.Downloaded(bytes)
                }
                else -> {
                    connection.disconnect()
                    FetchResult.Failed
                }
            }
        } catch (_: Exception) {
            FetchResult.Failed
        }
    }

    // downloads to a file without holding the bytes in memory.
    private fun downloadFile(url: URL, destination: File): FetchResult {
        return try {
            val connection = openConnection(url) ?: return FetchResult.Failed
            connection.connect()
            when (connection.responseCode) {
                404 -> {
                    connection.disconnect()
                    FetchResult.NotFound
                }
                in 200..299 -> {
                    destination.parentFile?.mkdirs()
                    if (destination.exists()) destination.delete()
                    connection.inputStream.use { input ->
                        destination.outputStream().use { output -> input.copyTo(output) }
                    }
                    connection.disconnect()
                    FetchResult.Downloaded(ByteArray(0))
                }
                else -> {
                    connection.disconnect()
                    FetchResult.Failed
                }
            }
        } catch (_: Exception) {
            FetchResult.Failed
        }
    }

    // MARK: - check and fetch

    fun check(): Promise<OneUpdatesCheckResult> {
        val promise = Promise<OneUpdatesCheckResult>()
        val url = if (isEnabled()) manifestUrl() else null
        if (url == null) {
            promise.reject(
                OneNativeError(
                    "E_UPDATES_DISABLED", "Updates.check: updates are disabled in this build."))
            return promise
        }
        thread(name = "one-updates-check") {
            when (val result = getBytes(url)) {
                is FetchResult.NotFound ->
                    promise.resolve(OneUpdatesCheckResult(OneUpdatesCheckType.NONE, null))
                is FetchResult.Failed ->
                    promise.reject(
                        OneNativeError(
                            "E_UPDATES_CHECK", "Updates.check: the update server could not be reached."))
                is FetchResult.Downloaded -> {
                    val json = result.bytes.toString(Charsets.UTF_8)
                    val manifest = parseManifest(json)
                    if (manifest == null) {
                        promise.reject(
                            OneNativeError(
                                "E_UPDATES_CHECK",
                                "Updates.check: the server returned an unusable manifest."))
                        return@thread
                    }
                    if (manifest.runtimeVersion != runtimeVersion()) {
                        promise.resolve(OneUpdatesCheckResult(OneUpdatesCheckType.NONE, null))
                        return@thread
                    }
                    val (runningMillis, staged) =
                        synchronized(lock) {
                            val state = loadState()
                            Pair(runningCreatedAtMillis(state), stagedIsComplete(manifest.id, state))
                        }
                    if (manifest.createdAtMillis > runningMillis && !staged) {
                        promise.resolve(OneUpdatesCheckResult(OneUpdatesCheckType.AVAILABLE, json))
                    } else {
                        promise.resolve(OneUpdatesCheckResult(OneUpdatesCheckType.NONE, null))
                    }
                }
            }
        }
        return promise
    }

    fun fetch(): Promise<OneUpdatesFetchResult> {
        val promise = Promise<OneUpdatesFetchResult>()
        val url = if (isEnabled()) manifestUrl() else null
        if (url == null) {
            promise.reject(
                OneNativeError(
                    "E_UPDATES_DISABLED", "Updates.fetch: updates are disabled in this build."))
            return promise
        }
        thread(name = "one-updates-fetch") {
            when (val result = getBytes(url)) {
                is FetchResult.NotFound ->
                    promise.resolve(OneUpdatesFetchResult(OneUpdatesFetchType.NONE, null))
                // network failures reject check; fetch is reserved for files
                // that arrived but failed their integrity check.
                is FetchResult.Failed ->
                    promise.reject(
                        OneNativeError(
                            "E_UPDATES_CHECK", "Updates.fetch: the update server could not be reached."))
                is FetchResult.Downloaded -> {
                    val json = result.bytes.toString(Charsets.UTF_8)
                    val manifest = parseManifest(json)
                    if (manifest == null) {
                        promise.reject(
                            OneNativeError(
                                "E_UPDATES_FETCH",
                                "Updates.fetch: the server returned an unusable manifest."))
                        return@thread
                    }
                    if (manifest.runtimeVersion != runtimeVersion()) {
                        promise.resolve(OneUpdatesFetchResult(OneUpdatesFetchType.NONE, null))
                        return@thread
                    }
                    val (runningMillis, staged) =
                        synchronized(lock) {
                            val state = loadState()
                            Pair(runningCreatedAtMillis(state), stagedIsComplete(manifest.id, state))
                        }
                    if (manifest.createdAtMillis <= runningMillis || staged) {
                        promise.resolve(OneUpdatesFetchResult(OneUpdatesFetchType.NONE, null))
                        return@thread
                    }
                    stage(manifest, json, url, promise)
                }
            }
        }
        return promise
    }

    // downloads every file into a temp directory, hard-linking bytes already
    // on disk, verifies every hash, then renames into place and records the
    // update atomically. any failure stages nothing.
    private fun stage(
        manifest: Manifest,
        manifestJson: String,
        manifestUrl: URL,
        promise: Promise<OneUpdatesFetchResult>
    ) {
        // content-addressed sources: every intact file a downloaded update
        // already carries. the apk's resources are not files, so the first
        // update downloads its drawables once.
        val sources = mutableMapOf<String, File>()
        synchronized(lock) {
            val state = loadState()
            for (entry in state.updates.values) {
                val known = parseManifest(entry.manifestJson) ?: continue
                val dir = updateDirectory(entry.id)
                val launchFile = File(dir, BUNDLE_FILE_NAME)
                if (launchFile.isFile) sources.putIfAbsent(known.launchAsset.hash, launchFile)
                for (asset in known.assets) {
                    val file = File(dir, asset.path)
                    if (file.isFile) sources.putIfAbsent(asset.hash, file)
                }
            }
        }

        val tmp = File(directory(), ".tmp-${manifest.id}")
        tmp.deleteRecursively()
        val files = mutableListOf<Pair<ManifestAsset, String>>()
        files.add(Pair(manifest.launchAsset, BUNDLE_FILE_NAME))
        manifest.assets.forEach { files.add(Pair(it, it.path)) }
        for ((asset, relative) in files) {
            val destination = File(tmp, relative)
            val source = sources[asset.hash]
            if (source != null) {
                try {
                    destination.parentFile?.mkdirs()
                    // a link shares the bytes; a copy is the same file when
                    // the system refuses the link.
                    try {
                        android.system.Os.link(source.absolutePath, destination.absolutePath)
                    } catch (_: Exception) {
                        source.copyTo(destination, overwrite = true)
                    }
                    continue
                } catch (_: Exception) {
                    tmp.deleteRecursively()
                    promise.reject(
                        OneNativeError(
                            "E_UPDATES_FETCH",
                            "Updates.fetch: a downloaded file failed its hash check."))
                    return
                }
            }
            val assetUrl =
                try {
                    URL(manifestUrl, asset.url)
                } catch (_: Exception) {
                    tmp.deleteRecursively()
                    promise.reject(
                        OneNativeError(
                            "E_UPDATES_FETCH",
                            "Updates.fetch: a downloaded file failed its hash check."))
                    return
                }
            when (downloadFile(assetUrl, destination)) {
                is FetchResult.Downloaded -> {
                    if (sha256Base64Url(destination) != asset.hash) {
                        tmp.deleteRecursively()
                        promise.reject(
                            OneNativeError(
                                "E_UPDATES_FETCH",
                                "Updates.fetch: a downloaded file failed its hash check."))
                        return
                    }
                }
                FetchResult.NotFound, FetchResult.Failed -> {
                    tmp.deleteRecursively()
                    promise.reject(
                        OneNativeError(
                            "E_UPDATES_CHECK",
                            "Updates.fetch: the update server could not be reached."))
                    return
                }
            }
        }

        synchronized(lock) {
            // verify every hash once more over the staged tree, then rename
            // into place and record the update. no partial state survives a
            // failure.
            var intact = sha256Base64Url(File(tmp, BUNDLE_FILE_NAME)) == manifest.launchAsset.hash
            for (asset in manifest.assets) {
                if (sha256Base64Url(File(tmp, asset.path)) != asset.hash) {
                    intact = false
                    break
                }
            }
            if (!intact) {
                tmp.deleteRecursively()
                promise.reject(
                    OneNativeError(
                        "E_UPDATES_FETCH",
                        "Updates.fetch: a downloaded file failed its hash check."))
                return
            }
            try {
                val final = updateDirectory(manifest.id)
                final.deleteRecursively()
                if (!tmp.renameTo(final)) {
                    tmp.copyRecursively(final, overwrite = true)
                    tmp.deleteRecursively()
                }
                val state = loadState()
                state.updates[manifest.id] =
                    StoredUpdate(
                        id = manifest.id,
                        createdAt = manifest.createdAt,
                        createdAtMillis = manifest.createdAtMillis,
                        runtimeVersion = manifest.runtimeVersion,
                        successes = 0,
                        failed = false,
                        manifestJson = manifestJson
                    )
                saveState(state)
            } catch (_: Exception) {
                tmp.deleteRecursively()
                promise.reject(
                    OneNativeError(
                        "E_UPDATES_FETCH",
                        "Updates.fetch: the staged update could not be recorded."))
                return
            }
        }
        promise.resolve(OneUpdatesFetchResult(OneUpdatesFetchType.FETCHED, manifestJson))
        thread(name = "one-updates-emit") { emitStaged() }
    }

    // MARK: - reload

    fun reload(): Promise<Unit> {
        val promise = Promise<Unit>()
        synchronized(lock) {
            if (!isEnabled()) {
                promise.reject(
                    OneNativeError(
                        "E_UPDATES_DISABLED", "Updates.reload: updates are disabled in this build."))
                return promise
            }
            if (pendingReload != null) {
                promise.reject(
                    OneNativeError(
                        "E_UPDATES_RELOAD", "Updates.reload: a reload is already in progress."))
                return promise
            }
            select()
            contentAppeared = false
            pendingReload = promise
            // the reload starts a new js context; its listeners register
            // fresh.
            stagedListeners.clear()
        }
        if (!restartHost("One.Updates.reload")) {
            synchronized(lock) {
                if (pendingReload === promise) pendingReload = null
            }
            promise.reject(
                OneNativeError(
                    "E_UPDATES_RELOAD", "Updates.reload: the react host could not be reached."))
        }
        return promise
    }

    // restarts the host the way expo's restart helper does: resume first when
    // the host is not resumed, then reload.
    private fun restartHost(reason: String): Boolean {
        val host: ReactHost =
            (context().applicationContext as? ReactApplication)?.reactHost ?: return false
        val activity = synchronized(lock) { currentActivity?.get() }
        Handler(Looper.getMainLooper()).post {
            if (host.lifecycleState != LifecycleState.RESUMED && activity != null) {
                host.onHostResume(activity)
            }
            host.reload(reason)
        }
        return true
    }
}
