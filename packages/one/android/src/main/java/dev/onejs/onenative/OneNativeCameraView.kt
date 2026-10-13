package dev.onejs.onenative

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.util.Base64
import android.util.Size
import androidx.camera.core.Camera
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.ImageProxy
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
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.UUID
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
    private var flash = "off"
    private var torch = false
    private var zoom = 0.0
    private var generation = 0
    private var lastState = ""
    private var lastCode: String? = null
    private var provider: ProcessCameraProvider? = null
    private var camera: Camera? = null
    private var imageCapture: ImageCapture? = null

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

    // flash, torch and zoom change the bound camera without rebinding.
    fun configureCapture(flash: String, torch: Boolean, zoom: Double) {
        this.flash = flash
        this.torch = torch
        this.zoom = zoom
        applyCaptureSettings()
    }

    private fun applyCaptureSettings() {
        imageCapture?.flashMode = when (flash) {
            "on" -> ImageCapture.FLASH_MODE_ON
            "auto" -> ImageCapture.FLASH_MODE_AUTO
            else -> ImageCapture.FLASH_MODE_OFF
        }
        val bound = camera ?: return
        if (bound.cameraInfo.hasFlashUnit()) bound.cameraControl.enableTorch(torch)
        bound.cameraControl.setLinearZoom(zoom.toFloat())
    }

    // Fabric sets each prop separately; batch them so one update transaction
    // rebinds capture at most once.
    private var pendingActive = false
    private var pendingFacing = "back"
    private var pendingCodeTypes: List<String> = emptyList()
    private var pendingFlash = "off"
    private var pendingTorch = false
    private var pendingZoom = 0.0

    fun setPendingActive(value: Boolean) {
        pendingActive = value
    }

    fun setPendingFacing(value: String) {
        pendingFacing = value
    }

    fun setPendingCodeTypes(value: List<String>) {
        pendingCodeTypes = value
    }

    fun setPendingFlash(value: String) {
        pendingFlash = value
    }

    fun setPendingTorch(value: Boolean) {
        pendingTorch = value
    }

    fun setPendingZoom(value: Double) {
        pendingZoom = value
    }

    fun applyPending() {
        configureCapture(pendingFlash, pendingTorch, pendingZoom)
        configure(pendingActive, pendingFacing, pendingCodeTypes)
    }

    fun reset() {
        active = false
        facing = "back"
        codeTypes = emptyList()
        flash = "off"
        torch = false
        zoom = 0.0
        lastCode = null
        refresh()
    }

    fun takePicture(requestId: Int, quality: Double, base64: Boolean) {
        val capture = imageCapture
        if (capture == null || lastState != "ready" && lastState != "unsupported") {
            val state = lastState.ifEmpty { "waiting" }
            emitPictureError(requestId, "E_CAMERA_NOT_READY", "CameraView is not ready to take a picture (state: $state)")
            return
        }
        val current = generation
        capture.takePicture(
            sharedCaptureExecutor,
            object : ImageCapture.OnImageCapturedCallback() {
                override fun onCaptureSuccess(image: ImageProxy) {
                    val result = try {
                        savePicture(image, quality, base64)
                    } catch (e: Exception) {
                        null
                    } finally {
                        image.close()
                    }
                    post {
                        when {
                            generation != current ->
                                emitPictureError(requestId, "E_CAMERA_INACTIVE", "CameraView stopped before the picture was taken")
                            result == null ->
                                emitPictureError(requestId, "E_CAMERA_CAPTURE", "The camera returned no image data")
                            else -> dispatchPicture(requestId, result, "")
                        }
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    post {
                        if (generation != current) {
                            emitPictureError(requestId, "E_CAMERA_INACTIVE", "CameraView stopped before the picture was taken")
                        } else {
                            emitPictureError(requestId, "E_CAMERA_CAPTURE", exception.message ?: "The capture failed")
                        }
                    }
                }
            },
        )
    }

    private class SavedPicture(val uri: String, val width: Int, val height: Int, val base64: String)

    // decodes the captured jpeg, turns it upright and re-encodes it at the
    // requested quality into cache/Camera, as Expo's camera does.
    private fun savePicture(image: ImageProxy, quality: Double, base64: Boolean): SavedPicture? {
        val buffer = image.planes.firstOrNull()?.buffer ?: return null
        val bytes = ByteArray(buffer.remaining())
        buffer.get(bytes)
        val decoded = BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return null
        val rotation = image.imageInfo.rotationDegrees
        val upright = if (rotation == 0) {
            decoded
        } else {
            Bitmap.createBitmap(
                decoded, 0, 0, decoded.width, decoded.height,
                Matrix().apply { postRotate(rotation.toFloat()) }, true,
            )
        }
        val encoded = ByteArrayOutputStream().use { stream ->
            upright.compress(Bitmap.CompressFormat.JPEG, (quality * 100).toInt(), stream)
            stream.toByteArray()
        }
        val directory = File(reactContext.cacheDir, "Camera").apply { mkdirs() }
        val file = File(directory, "${UUID.randomUUID()}.jpg")
        file.writeBytes(encoded)
        return SavedPicture(
            uri = android.net.Uri.fromFile(file).toString(),
            width = upright.width,
            height = upright.height,
            base64 = if (base64) Base64.encodeToString(encoded, Base64.NO_WRAP) else "",
        )
    }

    private fun emitPictureError(requestId: Int, code: String, message: String) {
        dispatchPicture(requestId, null, "$code: $message")
    }

    private fun dispatchPicture(requestId: Int, picture: SavedPicture?, error: String) {
        if (id == NO_ID) return
        val dispatcher = UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
        dispatcher.dispatchEvent(
            OneNativeCameraPictureEvent(UIManagerHelper.getSurfaceId(this), id, requestId, picture?.uri ?: "",
                picture?.width ?: 0, picture?.height ?: 0, picture?.base64 ?: "", error)
        )
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
        camera = null
        imageCapture = null
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
                    val capture = ImageCapture.Builder()
                        .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                        .build()
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
                        camera = cameraProvider.bindToLifecycle(owner, selector, preview, capture, analysis)
                    } else {
                        camera = cameraProvider.bindToLifecycle(owner, selector, preview, capture)
                    }
                    provider = cameraProvider
                    imageCapture = capture
                    applyCaptureSettings()
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
        private val sharedCaptureExecutor = Executors.newSingleThreadExecutor()

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

private class OneNativeCameraPictureEvent(
    surfaceId: Int,
    viewTag: Int,
    private val requestId: Int,
    private val uri: String,
    private val width: Int,
    private val height: Int,
    private val base64: String,
    private val error: String,
) : Event<OneNativeCameraPictureEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = "topNativeCameraPicture"
    override fun canCoalesce(): Boolean = false
    override fun getEventData() =
        Arguments.createMap().apply {
            putInt("requestId", requestId)
            putString("uri", uri)
            putInt("width", width)
            putInt("height", height)
            putString("base64", base64)
            putString("error", error)
        }
}
