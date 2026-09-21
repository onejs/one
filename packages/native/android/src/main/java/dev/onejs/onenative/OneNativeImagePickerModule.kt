package dev.onejs.onenative

import android.Manifest
import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.webkit.MimeTypeMap
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts.PickMultipleVisualMedia
import androidx.activity.result.contract.ActivityResultContracts.PickVisualMedia
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

// imperative image picker: the system photo picker for the library and a
// camera capture intent for photos. the system picker needs no permission;
// the camera needs the CAMERA permission, which one prebuild writes from
// native.app imagePicker. picked assets are copied into the app cache and
// returned as file uris. backing out, a denied permission, and a missing
// camera all resolve { canceled: true, assets: null }; only runtime failures
// reject, with E_IMAGE_PICKER_FAILED.
class OneNativeImagePickerModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext),
    ActivityEventListener,
    PermissionListener {
    private var pendingPickerPromise: Promise? = null
    private var pendingPermissionPromise: Promise? = null
    private var pendingLimit: Int = 1
    private var pendingSingle: PickVisualMedia? = null
    private var pendingMultiple: PickMultipleVisualMedia? = null
    private var pendingUsedPicker: Boolean = false
    private var pendingCameraFile: File? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    override fun onCatalystInstanceDestroy() {
        reactApplicationContext.removeActivityEventListener(this)
        pendingPickerPromise?.reject(
            E_FAILED,
            "ImagePicker: torn down mid-request"
        )
        pendingPermissionPromise?.reject(
            E_FAILED,
            "ImagePicker: torn down mid-request"
        )
        clearPickerPending()
        pendingPermissionPromise = null
    }

    // a legacy module has no lifecycle owner to register activity result
    // launchers against, so it launches intents the classic way and reads
    // results through the activity event listener.
    @Suppress("DEPRECATION")
    @ReactMethod
    fun launchLibrary(mediaTypes: ReadableArray, selectionLimit: Int, promise: Promise) {
        if (!takePickerPending("launchLibrary", promise)) return
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            rejectPickerPending("launchLibrary", "found no activity to present from")
            return
        }
        val kinds = mediaTypes.toArrayList().mapNotNull { it as? String }
        val allowsImages = kinds.contains("images")
        val allowsVideos = kinds.contains("videos")
        if (!allowsImages && !allowsVideos) {
            // unreachable from the js entries, which validate first; settle
            // rather than hang a direct caller.
            rejectPickerPending("launchLibrary", "mediaTypes must list at least one media type")
            return
        }
        pendingLimit = selectionLimit
        val mediaType =
            when {
                allowsImages && allowsVideos -> PickVisualMedia.ImageAndVideo
                allowsVideos -> PickVisualMedia.VideoOnly
                else -> PickVisualMedia.ImageOnly
            }
        try {
            if (PickVisualMedia.isPhotoPickerAvailable(activity)) {
                pendingUsedPicker = true
                val request =
                    PickVisualMediaRequest.Builder().setMediaType(mediaType).build()
                val intent =
                    if (selectionLimit == 1) {
                        val contract = PickVisualMedia()
                        pendingSingle = contract
                        contract.createIntent(activity, request)
                    } else {
                        val contract = PickMultipleVisualMedia(effectiveMax(selectionLimit))
                        pendingMultiple = contract
                        contract.createIntent(activity, request)
                    }
                activity.startActivityForResult(intent, REQUEST_LIBRARY, null)
            } else {
                pendingUsedPicker = false
                activity.startActivityForResult(
                    documentIntent(allowsImages, allowsVideos, selectionLimit),
                    REQUEST_LIBRARY,
                    null
                )
            }
        } catch (e: ActivityNotFoundException) {
            // the availability check passed but nothing handles the intent
            // (or the documents app is missing): one fallback attempt, then out.
            if (pendingUsedPicker) {
                try {
                    pendingUsedPicker = false
                    pendingSingle = null
                    pendingMultiple = null
                    activity.startActivityForResult(
                        documentIntent(allowsImages, allowsVideos, selectionLimit),
                        REQUEST_LIBRARY,
                        null
                    )
                } catch (fallback: ActivityNotFoundException) {
                    rejectPickerPending("launchLibrary", "found no picker on this device")
                }
            } else {
                rejectPickerPending("launchLibrary", "found no picker on this device")
            }
        } catch (e: Exception) {
            rejectPickerPending("launchLibrary", e.message ?: "could not open the picker")
        }
    }

    @ReactMethod
    fun launchCamera(promise: Promise) {
        if (!takePickerPending("launchCamera", promise)) return
        val context = reactApplicationContext
        val activity = context.currentActivity
        if (activity == null) {
            rejectPickerPending("launchCamera", "found no activity to present from")
            return
        }
        // refusing and missing hardware are ordinary outcomes: both resolve
        // canceled, like backing out of the picker.
        if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            resolvePickerCanceled()
            return
        }
        if (!isCameraDeclared()) {
            rejectPickerPending(
                "launchCamera",
                "camera needs the CAMERA permission: set native.app imagePicker.camera " +
                    "and rerun one prebuild"
            )
            return
        }
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        ) {
            startCamera(activity)
            return
        }
        if (cameraRationale(activity) || cameraAskedBefore(activity)) {
            // denied before, askable or permanent: stay quiet and resolve
            // canceled rather than nag on every launch. the explicit
            // requestCameraPermissions call is the way back.
            resolvePickerCanceled()
            return
        }
        // undetermined: ask once, then capture or cancel on the answer.
        val aware = activity as? PermissionAwareActivity
        if (aware == null) {
            rejectPickerPending("launchCamera", "cannot request the camera permission here")
            return
        }
        markCameraAsked()
        aware.requestPermissions(
            arrayOf(Manifest.permission.CAMERA),
            REQUEST_CAMERA_PERMISSION,
            this
        )
    }

    @ReactMethod
    fun getCameraPermissions(promise: Promise) {
        promise.resolve(cameraPermissionResponse())
    }

    @ReactMethod
    fun requestCameraPermissions(promise: Promise) {
        if (pendingPermissionPromise != null) {
            promise.reject(
                E_FAILED,
                "ImagePicker.requestCameraPermissions: another request is already in flight"
            )
            return
        }
        val context = reactApplicationContext
        if (!isCameraDeclared()) {
            promise.reject(
                E_FAILED,
                "ImagePicker.requestCameraPermissions: camera needs the CAMERA permission: " +
                    "set native.app imagePicker.camera and rerun one prebuild"
            )
            return
        }
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        ) {
            promise.resolve(cameraPermissionResponse())
            return
        }
        val activity = context.currentActivity
        val aware = activity as? PermissionAwareActivity
        if (activity == null || aware == null) {
            promise.reject(
                E_FAILED,
                "ImagePicker.requestCameraPermissions: found no activity to prompt from"
            )
            return
        }
        pendingPermissionPromise = promise
        markCameraAsked()
        aware.requestPermissions(
            arrayOf(Manifest.permission.CAMERA),
            REQUEST_PERMISSION_CALL,
            this
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        val granted =
            grantResults.isNotEmpty() &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED
        if (requestCode == REQUEST_PERMISSION_CALL) {
            pendingPermissionPromise?.resolve(cameraPermissionResponse())
            pendingPermissionPromise = null
            return true
        }
        if (requestCode != REQUEST_CAMERA_PERMISSION) return false
        if (granted) {
            val activity = reactApplicationContext.currentActivity
            if (activity == null) {
                rejectPickerPending("launchCamera", "found no activity to present from")
            } else {
                startCamera(activity)
            }
        } else {
            resolvePickerCanceled()
        }
        return true
    }

    override fun onActivityResult(
        activity: Activity,
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        if (requestCode == REQUEST_LIBRARY) {
            handleLibraryResult(resultCode, data)
        } else if (requestCode == REQUEST_CAMERA) {
            handleCameraResult(resultCode)
        }
    }

    override fun onNewIntent(intent: Intent) {}

    // granted, or denied with rationale: both are known states. otherwise
    // the asked flag separates the undetermined first run from a permanent
    // denial, which the platform reports identically.
    private fun cameraPermissionResponse(): WritableMap {
        val context = reactApplicationContext
        val granted =
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        val activity = context.currentActivity
        val (status, canAskAgain) =
            when {
                granted -> Pair("granted", true)
                activity != null && cameraRationale(activity) -> Pair("denied", true)
                activity != null && cameraAskedBefore(activity) -> Pair("denied", false)
                activity == null && cameraAskedBefore(null) -> Pair("denied", false)
                else -> Pair("undetermined", true)
            }
        val response = Arguments.createMap()
        response.putString("status", status)
        response.putBoolean("granted", granted)
        response.putBoolean("canAskAgain", canAskAgain)
        return response
    }

    private fun cameraRationale(activity: Activity): Boolean {
        return ActivityCompat.shouldShowRequestPermissionRationale(
            activity,
            Manifest.permission.CAMERA
        )
    }

    private fun cameraAskedKey(): String = "one-native-image-picker.camera-asked"

    private fun cameraAskedBefore(activity: Activity?): Boolean {
        val context = activity ?: reactApplicationContext
        return context
            .getSharedPreferences("one-native-image-picker", Activity.MODE_PRIVATE)
            .getBoolean(cameraAskedKey(), false)
    }

    private fun markCameraAsked() {
        reactApplicationContext
            .getSharedPreferences("one-native-image-picker", Activity.MODE_PRIVATE)
            .edit()
            .putBoolean(cameraAskedKey(), true)
            .apply()
    }

    private fun isCameraDeclared(): Boolean {
        val info =
            try {
                if (Build.VERSION.SDK_INT >= 33) {
                    reactApplicationContext.packageManager.getPackageInfo(
                        reactApplicationContext.packageName,
                        PackageManager.PackageInfoFlags.of(
                            PackageManager.GET_PERMISSIONS.toLong()
                        )
                    )
                } else {
                    @Suppress("DEPRECATION")
                    reactApplicationContext.packageManager.getPackageInfo(
                        reactApplicationContext.packageName,
                        PackageManager.GET_PERMISSIONS
                    )
                }
            } catch (e: Exception) {
                return false
            }
        return info.requestedPermissions?.contains(Manifest.permission.CAMERA) == true
    }

    @Suppress("DEPRECATION")
    private fun startCamera(activity: Activity) {
        val context = reactApplicationContext
        val file = cacheFile("IMG", "jpg")
        val uri =
            FileProvider.getUriForFile(
                context,
                "${context.packageName}.one-native.fileprovider",
                file
            )
        val intent =
            Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                putExtra(MediaStore.EXTRA_OUTPUT, uri)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            }
        for (resolved in
            context.packageManager.queryIntentActivities(
                intent,
                PackageManager.MATCH_DEFAULT_ONLY
            )) {
            context.grantUriPermission(
                resolved.activityInfo.packageName,
                uri,
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        }
        pendingCameraFile = file
        try {
            activity.startActivityForResult(intent, REQUEST_CAMERA, null)
        } catch (e: ActivityNotFoundException) {
            pendingCameraFile = null
            file.delete()
            resolvePickerCanceled()
        } catch (e: Exception) {
            pendingCameraFile = null
            file.delete()
            rejectPickerPending("launchCamera", e.message ?: "could not open the camera")
        }
    }

    private fun handleLibraryResult(resultCode: Int, data: Intent?) {
        val sourceUris =
            when {
                pendingSingle != null ->
                    pendingSingle!!.parseResult(resultCode, data)?.let { listOf(it) }
                        ?: emptyList()
                pendingMultiple != null ->
                    pendingMultiple!!.parseResult(resultCode, data) ?: emptyList()
                else -> fallbackUris(resultCode, data)
            }
        if (sourceUris.isEmpty()) {
            resolvePickerCanceled()
            return
        }
        val limited =
            if (pendingLimit > 0) sourceUris.take(pendingLimit) else sourceUris
        try {
            val assets = Arguments.createArray()
            for (uri in limited) {
                assets.pushMap(copyToCache(uri))
            }
            val result = Arguments.createMap()
            result.putBoolean("canceled", false)
            result.putArray("assets", assets)
            resolvePickerPending(result)
        } catch (e: Exception) {
            rejectPickerPending("launchLibrary", e.message ?: "could not copy a picked item")
        }
    }

    private fun fallbackUris(resultCode: Int, data: Intent?): List<Uri> {
        if (resultCode != Activity.RESULT_OK || data == null) return emptyList()
        val clip = data.clipData
        if (clip != null) {
            val uris = mutableListOf<Uri>()
            for (index in 0 until clip.itemCount) {
                clip.getItemAt(index).uri?.let { uris.add(it) }
            }
            return uris
        }
        return data.data?.let { listOf(it) } ?: emptyList()
    }

    private fun handleCameraResult(resultCode: Int) {
        val file = pendingCameraFile
        pendingCameraFile = null
        if (resultCode != Activity.RESULT_OK || file == null || !file.exists() || file.length() == 0L) {
            file?.delete()
            resolvePickerCanceled()
            return
        }
        try {
            val size = imageSize(file)
            val assets = Arguments.createArray()
            val asset = Arguments.createMap()
            asset.putString("uri", Uri.fromFile(file).toString())
            asset.putInt("width", size.first)
            asset.putInt("height", size.second)
            asset.putString("mimeType", "image/jpeg")
            asset.putString("fileName", file.name)
            asset.putDouble("fileSize", file.length().toDouble())
            assets.pushMap(asset)
            val result = Arguments.createMap()
            result.putBoolean("canceled", false)
            result.putArray("assets", assets)
            resolvePickerPending(result)
        } catch (e: Exception) {
            file.delete()
            rejectPickerPending("launchCamera", e.message ?: "could not read the photo")
        }
    }

    private fun copyToCache(source: Uri): WritableMap {
        val context = reactApplicationContext
        val resolver = context.contentResolver
        val mimeType = resolver.getType(source)
        val isVideo = mimeType?.startsWith("video/") == true
        val displayName = queryDisplayName(source)
        val extension =
            MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType)
                ?: displayName?.substringAfterLast('.', "")?.takeIf {
                    it.isNotEmpty() && it.length <= 5 && !it.contains('/')
                }
                ?: "dat"
        val dest = cacheFile(if (isVideo) "VID" else "IMG", extension)
        (resolver.openInputStream(source) ?: throw IllegalStateException("cannot open $source")).use { input ->
            FileOutputStream(dest).use { output -> input.copyTo(output) }
        }
        val size = if (isVideo) videoSize(dest) else imageSize(dest)
        val asset = Arguments.createMap()
        asset.putString("uri", Uri.fromFile(dest).toString())
        asset.putInt("width", size.first)
        asset.putInt("height", size.second)
        if (mimeType != null) asset.putString("mimeType", mimeType)
        asset.putString("fileName", displayName ?: dest.name)
        asset.putDouble("fileSize", dest.length().toDouble())
        return asset
    }

    private fun queryDisplayName(source: Uri): String? {
        val cursor =
            reactApplicationContext.contentResolver.query(
                source,
                arrayOf(OpenableColumns.DISPLAY_NAME),
                null,
                null,
                null
            ) ?: return null
        cursor.use {
            if (!it.moveToFirst()) return null
            val index = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (index < 0) return null
            return it.getString(index)
        }
    }

    private fun imageSize(file: File): Pair<Int, Int> {
        val options = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        file.inputStream().use { BitmapFactory.decodeStream(it, null, options) }
        if (options.outWidth <= 0 || options.outHeight <= 0) return Pair(0, 0)
        return Pair(options.outWidth, options.outHeight)
    }

    private fun videoSize(file: File): Pair<Int, Int> {
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(file.absolutePath)
            val width =
                retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)
                    ?.toIntOrNull() ?: 0
            val height =
                retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)
                    ?.toIntOrNull() ?: 0
            return Pair(width, height)
        } catch (e: Exception) {
            return Pair(0, 0)
        } finally {
            try {
                retriever.release()
            } catch (ignored: Exception) {
            }
        }
    }

    private fun cacheFile(prefix: String, extension: String): File {
        val dir = File(reactApplicationContext.cacheDir, "one-native-image-picker")
        dir.mkdirs()
        return File(dir, "${prefix}_${UUID.randomUUID()}.$extension")
    }

    private fun documentIntent(
        allowsImages: Boolean,
        allowsVideos: Boolean,
        selectionLimit: Int
    ): Intent {
        return Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            when {
                allowsImages && allowsVideos -> {
                    type = "*/*"
                    putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
                }
                allowsVideos -> type = "video/*"
                else -> type = "image/*"
            }
            putExtra(Intent.EXTRA_ALLOW_MULTIPLE, selectionLimit != 1)
        }
    }

    // zero is unlimited on both sides of the bridge; on api 33+ the real
    // system maximum applies, below that the backported picker clamps the
    // same sentinel androidx itself uses.
    private fun effectiveMax(selectionLimit: Int): Int {
        val systemMax =
            if (Build.VERSION.SDK_INT >= 33) MediaStore.getPickImagesMaxLimit()
            else Int.MAX_VALUE
        if (selectionLimit <= 0) return systemMax
        if (Build.VERSION.SDK_INT >= 33) return minOf(selectionLimit, systemMax)
        return selectionLimit
    }

    // one launch in flight: the js entries throw before a second launch, so
    // this only settles direct callers instead of clobbering the pending
    // promise. permission reads never take this slot.
    private fun takePickerPending(verb: String, promise: Promise): Boolean {
        if (pendingPickerPromise != null) {
            promise.reject(
                E_FAILED,
                "ImagePicker.$verb: another request is already in flight"
            )
            return false
        }
        pendingPickerPromise = promise
        return true
    }

    private fun resolvePickerPending(result: WritableMap) {
        val promise = pendingPickerPromise
        clearPickerPending()
        promise?.resolve(result)
    }

    private fun resolvePickerCanceled() {
        val result = Arguments.createMap()
        result.putBoolean("canceled", true)
        result.putNull("assets")
        resolvePickerPending(result)
    }

    private fun rejectPickerPending(verb: String, message: String) {
        val promise = pendingPickerPromise
        pendingCameraFile?.delete()
        clearPickerPending()
        promise?.reject(E_FAILED, "ImagePicker.$verb: $message")
    }

    private fun clearPickerPending() {
        pendingPickerPromise = null
        pendingLimit = 1
        pendingSingle = null
        pendingMultiple = null
        pendingUsedPicker = false
        pendingCameraFile = null
    }

    companion object {
        const val NAME = "OneNativeImagePicker"
        const val E_FAILED = "E_IMAGE_PICKER_FAILED"
        private const val REQUEST_LIBRARY = 0x1A01
        private const val REQUEST_CAMERA = 0x1A02
        private const val REQUEST_CAMERA_PERMISSION = 0x1A03
        private const val REQUEST_PERMISSION_CALL = 0x1A04
    }
}
