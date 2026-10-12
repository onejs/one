package com.margelo.nitro.one

import android.content.Context
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkInfo
import androidx.work.WorkManager
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

// WorkManager-backed Android half of One.BackgroundTasks, keeping the same
// JS task registration and status contract as the iOS BGTaskScheduler half:
// submit schedules uniquely-named one-time work per identifier, getPending
// reads the enqueued requests back, cancel drops them, and the coordinator
// delivers launches and expirations to the single JS listener. identifiers
// and their refresh/processing kinds come from the prebuild-stamped
// manifest meta-data (one.backgroundTasks.refresh/processing), so unknown
// identifiers reject with E_BACKGROUND_TASK_INPUT exactly like iOS. the
// options a submit carried are tracked in preferences beside the schedule,
// because WorkInfo reports state but not the request that produced it.
object OneBackgroundTasksCoordinator {
    private const val META_REFRESH = "one.backgroundTasks.refresh"
    private const val META_PROCESSING = "one.backgroundTasks.processing"
    private const val PREFS = "one-native-background-tasks"

    internal const val KEY_IDENTIFIER = "one.bg.identifier"
    internal const val KEY_KIND = "one.bg.kind"
    internal const val KEY_EARLIEST_MS = "one.bg.earliestMs"
    internal const val KEY_NETWORK = "one.bg.network"
    internal const val KEY_POWER = "one.bg.power"

    private val mainHandler = Handler(Looper.getMainLooper())

    internal data class RunningTask(
        val executionId: String,
        val identifier: String,
        val kind: BackgroundTaskKind,
        val completion: CountDownLatch = CountDownLatch(1),
        @Volatile var success: Boolean = false,
        val headless: Boolean = false,
    )

    private val running = ConcurrentHashMap<String, RunningTask>()

    @Volatile private var onLaunch: ((BackgroundTaskInvocation) -> Unit)? = null
    @Volatile private var onExpire: ((String) -> Unit)? = null
    @Volatile private var listenerToken: Long = 0

    private fun appContext(): Context =
        NitroModules.applicationContext
            ?: throw IllegalStateException("BackgroundTasks: the react context is not ready")

    internal fun tagFor(identifier: String): String = "one-bg-$identifier"

    internal fun uniqueNameFor(identifier: String): String = "one-background-$identifier"

    private fun metaDataString(name: String): String? {
        val context = try {
            appContext()
        } catch (e: IllegalStateException) {
            return null
        }
        return try {
            val info = if (Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getApplicationInfo(
                    context.packageName,
                    PackageManager.ApplicationInfoFlags.of(PackageManager.GET_META_DATA.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
            }
            info.metaData?.getString(name)?.takeIf { it.isNotEmpty() }
        } catch (e: Exception) {
            null
        }
    }

    private fun configuredIds(name: String): Set<String> =
        metaDataString(name)?.split(",")?.map { it.trim() }?.filter { it.isNotEmpty() }?.toSet()
            ?: emptySet()

    internal fun refreshIds(): Set<String> = configuredIds(META_REFRESH)

    internal fun processingIds(): Set<String> = configuredIds(META_PROCESSING)

    internal fun kindFor(identifier: String): BackgroundTaskKind? {
        if (refreshIds().contains(identifier)) return BackgroundTaskKind.REFRESH
        if (processingIds().contains(identifier)) return BackgroundTaskKind.PROCESSING
        return null
    }

    internal fun inputData(
        identifier: String,
        kind: BackgroundTaskKind,
        earliestBeginDateMs: Double?,
        requiresNetworkConnectivity: Boolean,
        requiresExternalPower: Boolean,
    ): Data =
        Data.Builder()
            .putString(KEY_IDENTIFIER, identifier)
            .putInt(KEY_KIND, kind.value)
            .putLong(KEY_EARLIEST_MS, earliestBeginDateMs?.toLong() ?: -1L)
            .putBoolean(KEY_NETWORK, requiresNetworkConnectivity)
            .putBoolean(KEY_POWER, requiresExternalPower)
            .build()

    internal fun constraintsFor(
        requiresNetworkConnectivity: Boolean,
        requiresExternalPower: Boolean,
    ): Constraints =
        Constraints.Builder()
            .setRequiredNetworkType(
                if (requiresNetworkConnectivity) NetworkType.CONNECTED else NetworkType.NOT_REQUIRED
            )
            .setRequiresCharging(requiresExternalPower)
            .build()

    internal fun trackSubmission(
        context: Context,
        identifier: String,
        earliestBeginDateMs: Double?,
        requiresNetworkConnectivity: Boolean,
        requiresExternalPower: Boolean,
    ) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putLong("$identifier.earliestMs", earliestBeginDateMs?.toLong() ?: -1L)
            .putBoolean("$identifier.network", requiresNetworkConnectivity)
            .putBoolean("$identifier.power", requiresExternalPower)
            .apply()
    }

    internal fun untrack(context: Context, identifier: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove("$identifier.earliestMs")
            .remove("$identifier.network")
            .remove("$identifier.power")
            .apply()
    }

    internal data class TrackedOptions(
        val earliestBeginDateMs: Double?,
        val requiresNetworkConnectivity: Boolean,
        val requiresExternalPower: Boolean,
    )

    internal fun trackedOptions(context: Context, identifier: String): TrackedOptions {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val earliest = prefs.getLong("$identifier.earliestMs", -1L).takeIf { it >= 0 }?.toDouble()
        return TrackedOptions(
            earliest,
            prefs.getBoolean("$identifier.network", false),
            prefs.getBoolean("$identifier.power", false)
        )
    }

    fun listen(
        onLaunch: (BackgroundTaskInvocation) -> Unit,
        onExpire: (String) -> Unit,
    ): () -> Unit {
        val token = ++listenerToken
        this.onLaunch = onLaunch
        this.onExpire = onExpire
        // a listener that arrives after launches replays them, mirroring the
        // iOS coordinator: late JS registration still observes running tasks.
        for ((executionId, record) in running) {
            if (record.headless) continue
            val invocation = BackgroundTaskInvocation(executionId, record.identifier, record.kind)
            mainHandler.post { this.onLaunch?.invoke(invocation) }
        }
        return {
            mainHandler.post {
                if (listenerToken == token) {
                    listenerToken = -1
                    this.onLaunch = null
                    this.onExpire = null
                }
            }
        }
    }

    // called by the worker on its background thread when real scheduled work
    // runs, and by the DEBUG deep-link hook for injected proof launches.
    internal fun launch(identifier: String, kind: BackgroundTaskKind, headless: Boolean = false): RunningTask {
        val executionId = UUID.randomUUID().toString()
        val record = RunningTask(executionId, identifier, kind, headless = headless)
        running[executionId] = record
        val invocation = BackgroundTaskInvocation(executionId, identifier, kind)
        if (!headless) mainHandler.post { onLaunch?.invoke(invocation) }
        return record
    }

    internal fun expire(executionId: String) {
        val record = running.remove(executionId) ?: return
        record.success = false
        mainHandler.post { onExpire?.invoke(executionId) }
        record.completion.countDown()
    }

    internal fun complete(executionId: String, success: Boolean) {
        val record = running.remove(executionId) ?: return
        record.success = success
        record.completion.countDown()
    }

    private fun isDebuggableApp(): Boolean {
        val context = try {
            appContext()
        } catch (e: IllegalStateException) {
            return false
        }
        return context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
    }

    // DEBUG-only injected launches for the emulator proof, mirroring the iOS
    // simulateLaunch/simulateExpiration hooks. release builds ignore them.
    fun simulateLaunch(identifier: String) {
        if (!isDebuggableApp()) return
        val kind = kindFor(identifier) ?: return
        launch(identifier, kind)
    }

    fun simulateExpiration() {
        if (!isDebuggableApp()) return
        val executionId = running.keys.firstOrNull() ?: return
        expire(executionId)
    }
}

class HybridOneBackgroundTasks : HybridOneBackgroundTasksSpec() {
    private val worker = Executors.newSingleThreadExecutor()

    private val context: Context
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("BackgroundTasks: the react context is not ready")

    override fun dispose() {
        worker.shutdownNow()
        super.dispose()
    }

    override fun submit(
        identifier: String,
        earliestBeginDateMs: Double?,
        requiresNetworkConnectivity: Boolean?,
        requiresExternalPower: Boolean?,
    ): Promise<Unit> {
        val promise = Promise<Unit>()
        worker.execute {
            val kind = OneBackgroundTasksCoordinator.kindFor(identifier)
            if (kind == null) {
                promise.reject(
                    OneNativeError(
                        "E_BACKGROUND_TASK_INPUT",
                        "BackgroundTasks.submit: identifier is not configured"
                    )
                )
                return@execute
            }
            if (earliestBeginDateMs != null &&
                (!earliestBeginDateMs.isFinite() || earliestBeginDateMs < 0)
            ) {
                promise.reject(
                    OneNativeError(
                        "E_BACKGROUND_TASK_INPUT",
                        "BackgroundTasks.submit: invalid earliestBeginDateMs"
                    )
                )
                return@execute
            }
            val needsNetwork = requiresNetworkConnectivity == true
            val needsPower = requiresExternalPower == true
            if (kind == BackgroundTaskKind.REFRESH && (needsNetwork || needsPower)) {
                promise.reject(
                    OneNativeError(
                        "E_BACKGROUND_TASK_INPUT",
                        "BackgroundTasks.submit: refresh does not support processing requirements"
                    )
                )
                return@execute
            }
            try {
                val delayMs = if (earliestBeginDateMs != null) {
                    (earliestBeginDateMs.toLong() - System.currentTimeMillis()).coerceAtLeast(0L)
                } else {
                    0L
                }
                val request = OneTimeWorkRequestBuilder<OneBackgroundWorker>()
                    .setInputData(
                        OneBackgroundTasksCoordinator.inputData(
                            identifier, kind, earliestBeginDateMs, needsNetwork, needsPower
                        )
                    )
                    .setConstraints(OneBackgroundTasksCoordinator.constraintsFor(needsNetwork, needsPower))
                    .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
                    .addTag(OneBackgroundTasksCoordinator.tagFor(identifier))
                    .build()
                val operation = WorkManager.getInstance(context).enqueueUniqueWork(
                    OneBackgroundTasksCoordinator.uniqueNameFor(identifier),
                    ExistingWorkPolicy.REPLACE,
                    request
                )
                operation.result.get(15, TimeUnit.SECONDS)
                OneBackgroundTasksCoordinator.trackSubmission(
                    context, identifier, earliestBeginDateMs, needsNetwork, needsPower
                )
                promise.resolve(Unit)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError(
                        "E_BACKGROUND_TASK_SUBMIT",
                        "BackgroundTasks.submit: ${e.message ?: "could not schedule work"}"
                    )
                )
            }
        }
        return promise
    }

    override fun getPending(): Promise<Array<PendingBackgroundTask>> {
        val promise = Promise<Array<PendingBackgroundTask>>()
        worker.execute {
            try {
                val manager = WorkManager.getInstance(context)
                val pending = mutableListOf<PendingBackgroundTask>()
                val known = OneBackgroundTasksCoordinator.refreshIds()
                    .map { it to BackgroundTaskKind.REFRESH } +
                    OneBackgroundTasksCoordinator.processingIds()
                        .map { it to BackgroundTaskKind.PROCESSING }
                for ((identifier, kind) in known) {
                    val infos = manager.getWorkInfosByTag(
                        OneBackgroundTasksCoordinator.tagFor(identifier)
                    ).get(15, TimeUnit.SECONDS)
                    val active = infos.any {
                        it.state == WorkInfo.State.ENQUEUED || it.state == WorkInfo.State.BLOCKED
                    }
                    if (!active) {
                        OneBackgroundTasksCoordinator.untrack(context, identifier)
                        continue
                    }
                    val options = OneBackgroundTasksCoordinator.trackedOptions(context, identifier)
                    pending.add(
                        PendingBackgroundTask(
                            identifier,
                            kind,
                            options.earliestBeginDateMs,
                            options.requiresNetworkConnectivity,
                            options.requiresExternalPower
                        )
                    )
                }
                promise.resolve(pending.toTypedArray())
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError(
                        "E_BACKGROUND_TASK_SUBMIT",
                        "BackgroundTasks.getPending: ${e.message ?: "could not list work"}"
                    )
                )
            }
        }
        return promise
    }

    override fun cancel(identifier: String) {
        if (OneBackgroundTasksCoordinator.kindFor(identifier) == null) {
            throw OneNativeError(
                "E_BACKGROUND_TASK_INPUT",
                "BackgroundTasks.cancel: identifier is not configured"
            )
        }
        WorkManager.getInstance(context)
            .cancelUniqueWork(OneBackgroundTasksCoordinator.uniqueNameFor(identifier))
        OneBackgroundTasksCoordinator.untrack(context, identifier)
    }

    override fun addTaskListener(
        onLaunch: (invocation: BackgroundTaskInvocation) -> Unit,
        onExpire: (executionId: String) -> Unit,
    ): () -> Unit = OneBackgroundTasksCoordinator.listen(onLaunch, onExpire)

    override fun complete(executionId: String, success: Boolean) {
        OneBackgroundTasksCoordinator.complete(executionId, success)
    }
}
