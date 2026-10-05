package com.margelo.nitro.one

import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// screen-on lock matching the ios global: the desired state is held in
// memory, readable and writable with no activity present, applied to the
// current window when one exists, and re-applied on resume so activity
// recreation never silently drops it. no rejection path.
class HybridOneKeepAwake : HybridOneKeepAwakeSpec(), LifecycleEventListener {
    @Volatile private var desired = false
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        NitroModules.applicationContext?.addLifecycleEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeLifecycleEventListener(this)
        super.dispose()
    }

    override fun isEnabled(): Promise<Boolean> {
        val promise = Promise<Boolean>()
        mainHandler.post { promise.resolve(desired) }
        return promise
    }

    override fun setEnabled(enabled: Boolean): Promise<Unit> {
        val promise = Promise<Unit>()
        mainHandler.post {
            desired = enabled
            apply(desired)
            promise.resolve(Unit)
        }
        return promise
    }

    override fun onHostResume() {
        apply(desired)
    }

    override fun onHostPause() {}

    override fun onHostDestroy() {}

    private fun apply(enabled: Boolean) {
        val window = NitroModules.applicationContext?.currentActivity?.window ?: return
        if (enabled) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }
}
