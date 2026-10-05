package com.margelo.nitro.one

import android.content.Context
import android.content.Intent
import android.content.pm.ShortcutInfo
import android.content.pm.ShortcutManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.UUID
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

// home-screen quick actions matching the ios contract: unique non-empty
// id/title validation, a coordinator fed by launch intents, cold start in
// the initial slot and warm taps on listeners. harvest runs on three legs:
// the launch intent read once, onNewIntent, and an onHostResume re-read
// for standard launchMode warm taps. below api 25 dynamic shortcuts do
// not exist, so set resolves without effect and reads return empty,
// exactly the unavailable contract.
class HybridOneQuickActions :
    HybridOneQuickActionsSpec(),
    LifecycleEventListener {
    private val mainHandler = Handler(Looper.getMainLooper())

    private val activityListener =
        object : BaseActivityEventListener() {
            override fun onNewIntent(intent: Intent) {
                val activity = NitroModules.applicationContext?.currentActivity
                activity?.intent = intent
                onMain { Coordinator.harvestWarm(intent) }
            }
        }

    init {
        NitroModules.applicationContext?.let {
            it.addActivityEventListener(activityListener)
            it.addLifecycleEventListener(this)
        }
        onMain { Coordinator.harvestCold(currentLaunchIntent()) }
    }

    override fun dispose() {
        NitroModules.applicationContext?.let {
            it.removeActivityEventListener(activityListener)
            it.removeLifecycleEventListener(this)
        }
        super.dispose()
    }

    override fun onHostResume() {
        Coordinator.harvestWarm(currentLaunchIntent())
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {}

    private fun currentLaunchIntent(): Intent? =
        NitroModules.applicationContext?.currentActivity?.intent

    override fun setItems(items: Array<QuickActionItem>): Promise<Unit> {
        val promise = Promise<Unit>()
        mainHandler.post {
            val seen = mutableSetOf<String>()
            for (item in items) {
                if (item.id.isBlank() || item.title.isBlank() || !seen.add(item.id)) {
                    promise.reject(
                        OneNativeError(
                            "E_QUICK_ACTIONS_INPUT",
                            "QuickActions.setItems: items require unique non-empty id and title"
                        )
                    )
                    return@post
                }
            }
            val context = NitroModules.applicationContext
            if (context == null || Build.VERSION.SDK_INT < 25) {
                promise.resolve(Unit)
                return@post
            }
            val manager = context.getSystemService(ShortcutManager::class.java)
            if (items.size > manager.maxShortcutCountPerActivity) {
                promise.reject(
                    OneNativeError(
                        "E_QUICK_ACTIONS_INPUT",
                        "QuickActions.setItems: items exceed the system maximum of " +
                            "${manager.maxShortcutCountPerActivity}"
                    )
                )
                return@post
            }
            try {
                manager.dynamicShortcuts = items.map { item -> shortcut(context, item) }
                promise.resolve(Unit)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError("E_QUICK_ACTIONS_INPUT", "QuickActions.setItems: ${e.message}")
                )
            }
        }
        return promise
    }

    override fun getItems(): Promise<Array<QuickActionItem>> {
        val promise = Promise<Array<QuickActionItem>>()
        mainHandler.post {
            val context = NitroModules.applicationContext
            if (context == null || Build.VERSION.SDK_INT < 25) {
                promise.resolve(emptyArray())
                return@post
            }
            val manager = context.getSystemService(ShortcutManager::class.java)
            promise.resolve(
                manager.dynamicShortcuts.map { shortcut ->
                    QuickActionItem(
                        id = shortcut.id,
                        title = shortcut.shortLabel?.toString() ?: "",
                        subtitle = shortcut.longLabel?.toString()
                    )
                }.toTypedArray()
            )
        }
        return promise
    }

    override fun getInitialAction(): String? {
        if (onMainThread()) return Coordinator.initialAction
        return mainSync { Coordinator.initialAction }
    }

    override fun clearInitialAction() {
        if (onMainThread()) {
            Coordinator.initialAction = null
            return
        }
        mainSyncVoid { Coordinator.initialAction = null }
    }

    override fun addListener(listener: (value: String) -> Unit): () -> Unit {
        val id = UUID.randomUUID()
        if (onMainThread()) {
            Coordinator.listeners[id] = listener
        } else {
            mainSyncVoid { Coordinator.listeners[id] = listener }
        }
        return {
            mainHandler.post { Coordinator.listeners.remove(id) }
        }
    }

    private fun shortcut(context: Context, item: QuickActionItem): ShortcutInfo {
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: throw IllegalStateException("no launcher activity")
        val target = Intent(QUICK_ACTION)
            .setComponent(launch.component)
            .putExtra(EXTRA_ID, item.id)
        val builder = ShortcutInfo.Builder(context, item.id)
            .setShortLabel(item.title)
            .setIntent(target)
        if (item.subtitle != null) builder.setLongLabel(item.subtitle)
        return builder.build()
    }

    private fun onMainThread(): Boolean = Looper.myLooper() == Looper.getMainLooper()

    private fun onMain(body: () -> Unit) {
        if (onMainThread()) body() else mainHandler.post { body() }
    }

    private fun mainSyncVoid(body: () -> Unit) {
        val latch = CountDownLatch(1)
        mainHandler.post {
            body()
            latch.countDown()
        }
        latch.await(5, TimeUnit.SECONDS)
    }

    private fun mainSync(body: () -> String?): String? {
        var result: String? = null
        val latch = CountDownLatch(1)
        mainHandler.post {
            result = body()
            latch.countDown()
        }
        latch.await(5, TimeUnit.SECONDS)
        return result
    }

    private object Coordinator {
        var initialAction: String? = null
        val listeners = mutableMapOf<UUID, (String) -> Unit>()
        private var coldHarvested = false
        private var consumed: Intent? = null

        fun harvestCold(intent: Intent?) {
            if (coldHarvested) return
            coldHarvested = true
            val id = actionId(intent) ?: return
            consumed = intent
            initialAction = id
        }

        fun harvestWarm(intent: Intent?) {
            if (intent == null || intent === consumed) return
            val id = actionId(intent) ?: return
            consumed = intent
            for (listener in listeners.values.toList()) {
                try {
                    listener(id)
                } catch (_: Exception) {
                    // a dead js runtime must not break the rest.
                }
            }
        }

        private fun actionId(intent: Intent?): String? {
            if (intent?.action != QUICK_ACTION) return null
            return intent.getStringExtra(EXTRA_ID)
        }
    }

    companion object {
        private const val QUICK_ACTION = "dev.onejs.one.QUICK_ACTION"
        private const val EXTRA_ID = "dev.onejs.one.QUICK_ACTION_ID"
    }
}
