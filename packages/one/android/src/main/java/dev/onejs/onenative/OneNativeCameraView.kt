package dev.onejs.onenative

import android.Manifest
import android.content.pm.PackageManager
import android.util.Size
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

// Embedded camera preview with barcode events, the Android half of
// CameraView: CameraX PreviewView for capture plus ML Kit for scanning,
// mirroring the iOS AVFoundation view's props (active, facing, codeTypes)
// and states (inactive, permission-required, unavailable, ready,
// unsupported, failed). capture follows the hosting activity lifecycle;
// leaving the window or deactivating releases the session. consecutive
// duplicate codes are delivered once, since analysis observes every frame
// while the iOS metadata output reports per-frame observations.
//
// PreviewView is final, so the view owns one instead of extending it.
class OneNativeCameraView(private val reactContext: ThemedReactContext) :
    android.widget.FrameLayout(reactContext) {
    private val previewView = PreviewView(reactContext).apply {
        scaleType = PreviewView.ScaleType.FILL_CENTER
        layoutParams = LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT)
    }

    private var active = false
    private var facing = "back"
    private var codeTypes: List<String> = emptyList()
    private var generation = 0
    private var lastState = ""
    private var lastCode: String? = null
    private var provider: ProcessCameraProvider? = null

    init {
        addView(previewView)
        contentDescription = "Camera preview"
    }

    fun configure(active: Boolean, facing: String, codeTypes: List<String>) {
        if (this.active == active && this.facing == facing && this.codeTypes == codeTypes) return
        this.active = active
        this.facing = facing
        this.codeTypes = codeTypes
        refresh()
    }

    // Fabric sets each prop separately; batch them so one update transaction
    // rebinds capture at most once.
    private var pendingActive = false
    private var pendingFacing = "back"
    private var pendingCodeTypes: List<String> = emptyList()

    fun setPendingActive(value: Boolean) {
        pendingActive = value
    }

    fun setPendingFacing(value: String) {
        pendingFacing = value
    }

    fun setPendingCodeTypes(value: List<String>) {
        pendingCodeTypes = value
    }

    fun applyPending() {
        configure(pendingActive, pendingFacing, pendingCodeTypes)
    }

    fun reset() {
        active = false
        facing = "back"
        codeTypes = emptyList()
        lastCode = null
        refresh()
    }

    fun replayState() {
        if (lastState.isNotEmpty()) dispatchState(lastState)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        refresh()
    }

    override fun onDetachedFromWindow() {
        generation += 1
        // reattaching starts a new scanning run, which delivers a code seen in
        // the previous one again.
        lastCode = null
        releaseSession()
        super.onDetachedFromWindow()
    }

    private fun emitState(state: String) {
        if (lastState == state) return
        lastState = state
        dispatchState(state)
    }

    private fun dispatchState(state: String) {
        if (id == NO_ID) return
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
        dispatcher.dispatchEvent(OneNativeCameraStateEvent(UIManagerHelper.getSurfaceId(this), id, state))
    }

    private fun emitCode(type: String, data: String) {
        if (id == NO_ID) return
        val key = "$type:$data"
        if (lastCode == key) return
        lastCode = key
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
        dispatcher.dispatchEvent(OneNativeCameraCodeEvent(UIManagerHelper.getSurfaceId(this), id, type, data))
    }

    private fun releaseSession() {
        try {
            provider?.unbindAll()
        } catch (e: Exception) {
            // unbinding a torn-down provider is a no-op for state purposes.
        }
        provider = null
    }

    private fun refresh() {
        if (!active || windowToken == null) {
            generation += 1
            releaseSession()
            // a new scanning run delivers a code seen in the previous one again.
            lastCode = null
            // stay silent until the first determined state so a mount with
            // active=false keeps the JS 'waiting' state like the iOS view.
            if (lastState.isNotEmpty()) emitState("inactive")
            return
        }
        if (ContextCompat.checkSelfPermission(reactContext, Manifest.permission.CAMERA) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            generation += 1
            releaseSession()
            emitState("permission-required")
            return
        }
        generation += 1
        val current = generation
        releaseSession()
        val selector = if (facing == "front") {
            CameraSelector.DEFAULT_FRONT_CAMERA
        } else {
            CameraSelector.DEFAULT_BACK_CAMERA
        }
        val formats = codeTypes.mapNotNull { FORMAT_BY_NAME[it] }.toSet()
        val unsupported = codeTypes.isNotEmpty() && formats.isEmpty()
        val future = try {
            ProcessCameraProvider.getInstance(reactContext)
        } catch (e: Exception) {
            post { if (generation == current) emitState("failed") }
            return
        }
        future.addListener(
            {
                if (generation != current) return@addListener
                val cameraProvider = try {
                    future.get()
                } catch (e: Exception) {
                    emitState("failed")
                    return@addListener
                }
                if (!cameraProvider.hasCamera(selector)) {
                    emitState("unavailable")
                    return@addListener
                }
                val owner = reactContext.currentActivity as? LifecycleOwner
                if (owner == null) {
                    emitState("failed")
                    return@addListener
                }
                try {
                    val preview = Preview.Builder().build()
                    preview.setSurfaceProvider(previewView.surfaceProvider)
                    cameraProvider.unbindAll()
                    if (!unsupported && formats.isNotEmpty()) {
                        val options = BarcodeScannerOptions.Builder()
                            .setBarcodeFormats(formats.first(), *formats.drop(1).toIntArray())
                            .build()
                        val scanner = BarcodeScanning.getClient(options)
                        val analysis = ImageAnalysis.Builder()
                            .setTargetResolution(Size(1280, 720))
                            .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                            .build()
                        analysis.setAnalyzer(sharedAnalyzerExecutor, createAnalyzer(scanner, current))
                        cameraProvider.bindToLifecycle(owner, selector, preview, analysis)
                    } else {
                        cameraProvider.bindToLifecycle(owner, selector, preview)
                    }
                    provider = cameraProvider
                    emitState(if (unsupported) "unsupported" else "ready")
                } catch (e: Exception) {
                    try {
                        cameraProvider.unbindAll()
                    } catch (ignored: Exception) {
                    }
                    emitState("failed")
                }
            },
            ContextCompat.getMainExecutor(reactContext)
        )
    }

    @ExperimentalGetImage
    private fun createAnalyzer(
        scanner: com.google.mlkit.vision.barcode.BarcodeScanner,
        current: Int,
    ): ImageAnalysis.Analyzer = ImageAnalysis.Analyzer { proxy ->
        if (generation != current) {
            proxy.close()
            return@Analyzer
        }
        val mediaImage = proxy.image
        if (mediaImage == null) {
            proxy.close()
            return@Analyzer
        }
        val image = InputImage.fromMediaImage(mediaImage, proxy.imageInfo.rotationDegrees)
        scanner.process(image)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    val raw = barcode.rawValue ?: continue
                    val name = NAME_BY_FORMAT[barcode.format] ?: continue
                    post { if (generation == current) emitCode(name, raw) }
                }
            }
            .addOnCompleteListener { proxy.close() }
    }

    companion object {
        private val sharedAnalyzerExecutor = Executors.newSingleThreadExecutor()

        private val FORMAT_BY_NAME: Map<String, Int> = mapOf(
            "qr" to Barcode.FORMAT_QR_CODE,
            "ean13" to Barcode.FORMAT_EAN_13,
            "ean8" to Barcode.FORMAT_EAN_8,
            "upce" to Barcode.FORMAT_UPC_E,
            "code128" to Barcode.FORMAT_CODE_128,
            "code39" to Barcode.FORMAT_CODE_39,
            "code93" to Barcode.FORMAT_CODE_93,
            "pdf417" to Barcode.FORMAT_PDF417,
            "aztec" to Barcode.FORMAT_AZTEC,
            "dataMatrix" to Barcode.FORMAT_DATA_MATRIX,
        )
        private val NAME_BY_FORMAT: Map<Int, String> =
            FORMAT_BY_NAME.entries.associate { (name, format) -> format to name }
    }
}

private class OneNativeCameraStateEvent(
    surfaceId: Int,
    viewTag: Int,
    private val state: String,
) : Event<OneNativeCameraStateEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeCameraState"
    override fun canCoalesce(): Boolean = false
    override fun getEventData() = Arguments.createMap().apply { putString("state", state) }
}

private class OneNativeCameraCodeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val type: String,
    private val data: String,
) : Event<OneNativeCameraCodeEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeCameraCode"
    override fun canCoalesce(): Boolean = false
    override fun getEventData() =
        Arguments.createMap().apply {
            putString("type", type)
            putString("data", data)
        }
}
