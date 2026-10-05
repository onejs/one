package com.margelo.nitro.one

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.Rect
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
import android.view.View
import android.view.Window
import android.view.WindowManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.IllegalViewOperationException
import com.facebook.react.uimanager.UIManagerHelper
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import java.util.function.Consumer

// screen capture matching the ios contract, split across the two channels
// the platform offers. the api 34 activity callback reports screenshot
// notifications only (onScreenCaptured carries no value), never ongoing
// recording state; recording state comes only from the api 35 window
// manager callback, which reports this app's recording visibility and
// returns the current state at registration. both detect permissions are
// normal install-time, so both ride the library manifest. capture stays
// PixelCopy (api 26+) through the app cache, with the same E_* codes as
// swift: sub-26 capture rejects E_SCREEN_CAPTURE_RENDER with an explicit
// unsupported-platform message, never a new error code.
class HybridOneScreenCapture : HybridOneScreenCaptureSpec(), LifecycleEventListener {
    @Volatile private var active = false
    private val mainHandler = Handler(Looper.getMainLooper())
    private val stateListeners = mutableMapOf<UUID, (ScreenCaptureState) -> Unit>()
    private val screenshotListeners = mutableMapOf<UUID, (Double) -> Unit>()
    private var lastState: ScreenCaptureState? = null
    private var recordingConsumer: Consumer<Int>? = null
    private var screenshotCallback: Activity.ScreenCaptureCallback? = null
    private var screenshotActivity: Activity? = null

    init {
        NitroModules.applicationContext?.addLifecycleEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeLifecycleEventListener(this)
        mainHandler.post {
            unregisterRecording()
            unregisterScreenshot()
            stateListeners.clear()
            screenshotListeners.clear()
        }
        super.dispose()
    }

    override fun onHostResume() {
        active = true
        // the screenshot callback is owned by the live activity, following
        // the guide's onStart/onStop shape; re-register on whatever activity
        // is current after pause, dialogs, or recreation.
        mainHandler.post { ensureScreenshot() }
    }

    override fun onHostPause() {
        active = false
        mainHandler.post { unregisterScreenshot() }
    }

    override fun onHostDestroy() {
        active = false
        mainHandler.post { unregisterScreenshot() }
    }

    override fun getState(): Promise<ScreenCaptureState> {
        val promise = Promise<ScreenCaptureState>()
        if (Build.VERSION.SDK_INT < 35) {
            promise.resolve(ScreenCaptureState.UNSPECIFIED)
            return promise
        }
        mainHandler.post {
            ensureRecording()
            promise.resolve(lastState ?: ScreenCaptureState.UNSPECIFIED)
        }
        return promise
    }

    override fun captureWindow(): Promise<ScreenCaptureResult> {
        val promise = Promise<ScreenCaptureResult>()
        if (Build.VERSION.SDK_INT < 26) {
            promise.reject(
                OneNativeError(
                    "E_SCREEN_CAPTURE_RENDER",
                    "ScreenCapture.captureWindow: capture requires Android 8.0 (API 26) or newer"
                )
            )
            return promise
        }
        mainHandler.post {
            val window = currentActivity()?.window
            if (window == null) {
                promise.reject(
                    OneNativeError(
                        "E_SCREEN_CAPTURE_SCENE",
                        "ScreenCapture.captureWindow: no active app window"
                    )
                )
                return@post
            }
            val decor = window.decorView
            if (decor.width <= 0 || decor.height <= 0) {
                promise.reject(
                    OneNativeError(
                        "E_SCREEN_CAPTURE_RENDER",
                        "ScreenCapture.captureWindow: view has no drawable area"
                    )
                )
                return@post
            }
            pixelCopy(window, null, "captureWindow", promise)
        }
        return promise
    }

    override fun captureView(viewTag: Double): Promise<ScreenCaptureResult> {
        val promise = Promise<ScreenCaptureResult>()
        if (!viewTag.isFinite() || viewTag < 1 || viewTag > Int.MAX_VALUE.toDouble() ||
            viewTag != kotlin.math.floor(viewTag)
        ) {
            promise.reject(
                OneNativeError(
                    "E_SCREEN_CAPTURE_INPUT",
                    "ScreenCapture.captureView: view tag must be a positive 32-bit integer"
                )
            )
            return promise
        }
        if (Build.VERSION.SDK_INT < 26) {
            promise.reject(
                OneNativeError(
                    "E_SCREEN_CAPTURE_RENDER",
                    "ScreenCapture.captureView: capture requires Android 8.0 (API 26) or newer"
                )
            )
            return promise
        }
        mainHandler.post {
            val window = currentActivity()?.window
            val reactContext = NitroModules.applicationContext
            if (window == null || reactContext == null) {
                promise.reject(
                    OneNativeError(
                        "E_SCREEN_CAPTURE_SCENE",
                        "ScreenCapture.captureView: no active app window"
                    )
                )
                return@post
            }
            val view = resolveView(reactContext, viewTag.toInt())
            if (view == null || !view.isAttachedToWindow || view.rootView !== window.decorView) {
                promise.reject(
                    OneNativeError(
                        "E_SCREEN_CAPTURE_VIEW",
                        "ScreenCapture.captureView: mounted view tag was not found in the app window"
                    )
                )
                return@post
            }
            val origin = IntArray(2)
            view.getLocationInWindow(origin)
            val rect = Rect(
                origin[0], origin[1], origin[0] + view.width, origin[1] + view.height
            )
            rect.intersect(0, 0, window.decorView.width, window.decorView.height)
            if (rect.isEmpty) {
                promise.reject(
                    OneNativeError(
                        "E_SCREEN_CAPTURE_RENDER",
                        "ScreenCapture.captureView: view has no drawable area"
                    )
                )
                return@post
            }
            pixelCopy(window, rect, "captureView", promise)
        }
        return promise
    }

    override fun addStateListener(onChange: (state: ScreenCaptureState) -> Unit): () -> Unit {
        val id = UUID.randomUUID()
        mainHandler.post {
            // below 35 the listener stays registered but silent, matching
            // the unspecified getState; the api level cannot change under us.
            stateListeners[id] = onChange
            ensureRecording()
        }
        return {
            mainHandler.post {
                stateListeners.remove(id)
                if (stateListeners.isEmpty()) unregisterRecording()
            }
        }
    }

    override fun addScreenshotListener(onScreenshot: (timestampMs: Double) -> Unit): () -> Unit {
        val id = UUID.randomUUID()
        mainHandler.post {
            screenshotListeners[id] = onScreenshot
            ensureScreenshot()
        }
        return {
            mainHandler.post {
                screenshotListeners.remove(id)
                if (screenshotListeners.isEmpty()) unregisterScreenshot()
            }
        }
    }

    private fun ensureRecording() {
        if (Build.VERSION.SDK_INT < 35) return
        if (recordingConsumer != null) return
        val context = NitroModules.applicationContext ?: return
        // the registration return is the current recording state; it seeds
        // lastState without delivering, so listeners only see real changes.
        val consumer = Consumer<Int> { value -> deliverRecording(value) }
        val initial = context.getSystemService(WindowManager::class.java)
            .addScreenRecordingCallback(ContextCompat.getMainExecutor(context), consumer)
        recordingConsumer = consumer
        lastState = mapState(initial)
    }

    private fun unregisterRecording() {
        if (Build.VERSION.SDK_INT < 35) return
        val consumer = recordingConsumer ?: return
        recordingConsumer = null
        NitroModules.applicationContext?.getSystemService(WindowManager::class.java)
            ?.removeScreenRecordingCallback(consumer)
    }

    private fun deliverRecording(value: Int) {
        val state = mapState(value)
        if (state == lastState) return
        lastState = state
        for (listener in stateListeners.values) listener(state)
    }

    private fun mapState(value: Int): ScreenCaptureState {
        if (Build.VERSION.SDK_INT < 35) return ScreenCaptureState.UNSPECIFIED
        return when (value) {
            WindowManager.SCREEN_RECORDING_STATE_VISIBLE -> ScreenCaptureState.ACTIVE
            WindowManager.SCREEN_RECORDING_STATE_NOT_VISIBLE -> ScreenCaptureState.INACTIVE
            else -> ScreenCaptureState.UNSPECIFIED
        }
    }

    private fun ensureScreenshot() {
        if (Build.VERSION.SDK_INT < 34) return
        if (screenshotListeners.isEmpty()) return
        val activity = currentActivity()
        if (activity == null || activity == screenshotActivity) return
        unregisterScreenshot()
        val context = NitroModules.applicationContext ?: return
        val callback = Activity.ScreenCaptureCallback {
            // the callback carries no value, so stamp receipt time in unix
            // epoch milliseconds like swift's Date at notification arrival.
            val timestampMs = System.currentTimeMillis().toDouble()
            for (listener in screenshotListeners.values) listener(timestampMs)
        }
        activity.registerScreenCaptureCallback(ContextCompat.getMainExecutor(context), callback)
        screenshotCallback = callback
        screenshotActivity = activity
    }

    private fun unregisterScreenshot() {
        if (Build.VERSION.SDK_INT < 34) return
        val callback = screenshotCallback ?: return
        val activity = screenshotActivity
        screenshotCallback = null
        screenshotActivity = null
        if (activity == null || activity.isDestroyed) return
        try {
            activity.unregisterScreenCaptureCallback(callback)
        } catch (_: RuntimeException) {
            // the activity died mid-teardown; nothing left to unregister.
        }
    }

    private fun resolveView(reactContext: ReactContext, reactTag: Int): View? {
        val uiManager = UIManagerHelper.getUIManagerForReactTag(reactContext, reactTag) ?: return null
        return try {
            uiManager.resolveView(reactTag)
        } catch (_: IllegalViewOperationException) {
            null
        }
    }

    private fun pixelCopy(
        window: Window,
        rect: Rect?,
        operation: String,
        promise: Promise<ScreenCaptureResult>
    ) {
        val width = rect?.width() ?: window.decorView.width
        val height = rect?.height() ?: window.decorView.height
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val listener = PixelCopy.OnPixelCopyFinishedListener { result ->
            if (result != PixelCopy.SUCCESS) {
                promise.reject(
                    OneNativeError(
                        "E_SCREEN_CAPTURE_RENDER",
                        "ScreenCapture.$operation: view could not be rendered"
                    )
                )
                return@OnPixelCopyFinishedListener
            }
            try {
                promise.resolve(savePng(bitmap, operation))
            } catch (error: OneNativeError) {
                promise.reject(error)
            }
        }
        try {
            if (rect == null) PixelCopy.request(window, bitmap, listener, mainHandler)
            else PixelCopy.request(window, rect, bitmap, listener, mainHandler)
        } catch (_: IllegalArgumentException) {
            promise.reject(
                OneNativeError(
                    "E_SCREEN_CAPTURE_RENDER",
                    "ScreenCapture.$operation: view could not be rendered"
                )
            )
        }
    }

    private fun savePng(bitmap: Bitmap, operation: String): ScreenCaptureResult {
        val context = NitroModules.applicationContext
            ?: throw OneNativeError(
                "E_SCREEN_CAPTURE_FILE",
                "ScreenCapture.$operation: PNG file could not be saved"
            )
        val folder = File(context.cacheDir, "OneScreenCapture")
        if (!folder.isDirectory && !folder.mkdirs()) {
            throw OneNativeError(
                "E_SCREEN_CAPTURE_FILE",
                "ScreenCapture.$operation: PNG file could not be saved"
            )
        }
        val file = File(folder, "${UUID.randomUUID()}.png")
        try {
            FileOutputStream(file).use { out ->
                if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)) {
                    throw OneNativeError(
                        "E_SCREEN_CAPTURE_ENCODE",
                        "ScreenCapture.$operation: PNG encoding failed"
                    )
                }
            }
        } catch (error: OneNativeError) {
            file.delete()
            throw error
        } catch (_: Exception) {
            file.delete()
            throw OneNativeError(
                "E_SCREEN_CAPTURE_FILE",
                "ScreenCapture.$operation: PNG file could not be saved"
            )
        }
        return ScreenCaptureResult(
            uri = Uri.fromFile(file).toString(),
            width = bitmap.width.toDouble(),
            height = bitmap.height.toDouble(),
            size = file.length().toDouble()
        )
    }

    private fun currentActivity(): Activity? {
        if (!active) return null
        val activity = NitroModules.applicationContext?.currentActivity ?: return null
        if (activity.isFinishing || activity.isDestroyed) return null
        return activity
    }
}
