package com.margelo.nitro.one

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
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

// imperative image picker: the system photo picker for the library and a
// camera capture intent for photos. the system picker needs no permission;
// the camera needs the CAMERA permission, which one prebuild writes from
// native.app imagePicker. picked assets are copied into the app cache and
// returned as file uris. backing out, a denied permission, and a missing
// camera all resolve canceled; only runtime failures reject. calls arrive on
// the js thread and results on the ui thread, so the pending slot is only
// taken or settled under the lock.
class HybridOneImagePicker : HybridOneImagePickerSpec(), ActivityEventListener, PermissionListener {
    private val lock = Any()
    private var pendingPickerPromise: Promise<ImagePickerNativeResult>? = null
    private var pendingPickerVerb: String = "launchLibrary"
    private var pendingPermissionPromise: Promise<CameraPermissionResponse>? = null
    private var pendingLimit: Int = 1
    private var pendingSingle: PickVisualMedia? = null
    private var pendingMultiple: PickMultipleVisualMedia? = null
    private var pendingUsedPicker: Boolean = false
    private var pendingCameraFile: File? = null

    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("ImagePicker: the react context is not ready")

    init {
        NitroModules.applicationContext?.addActivityEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeActivityEventListener(this)
        val picker: Promise<ImagePickerNativeResult>?
        val permission: Promise<CameraPermissionResponse>?
        val verb: String
        synchronized(lock) {
            picker = pendingPickerPromise
            permission = pendingPermissionPromise
            verb = pendingPickerVerb
            clearPickerPending()
            pendingPermissionPromise = null
        }
        picker?.reject(OneNativeError(E_FAILED, "ImagePicker.$verb: torn down mid-request"))
        permission?.reject(OneNativeError(E_FAILED, "ImagePicker.requestCameraPermissions: torn down mid-request"))
        super.dispose()
    }

    // a hybrid object has no lifecycle owner to register activity result
    // launchers against, so it launches intents the classic way and reads
    // results through the activity event listener.
    @Suppress("DEPRECATION")
    override fun launchLibrary(options: ResolvedImagePickerOptions): Promise<ImagePickerNativeResult> {
        val promise = Promise<ImagePickerNativeResult>()
        if (!takePickerPending("launchLibrary", promise)) return promise
        val activity = NitroModules.applicationContext?.currentActivity
        if (activity == null) {
            rejectPickerPending("launchLibrary", "found no activity to present from")
            return promise
        }
        val allowsImages = options.mediaTypes.contains(ImagePickerMediaType.IMAGES)
        val allowsVideos = options.mediaTypes.contains(ImagePickerMediaType.VIDEOS)
        if (!allowsImages && !allowsVideos) {
            // unreachable from the js entries, which validate first; settle
            // rather than hang a direct caller.
            rejectPickerPending("launchLibrary", "mediaTypes must list at least one media type")
            return promise
        }
        // zero is unlimited on both sides, so the value passes through.
        val selectionLimit = options.selectionLimit.toInt()
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
        return promise
    }

    override fun launchCamera(): Promise<ImagePickerNativeResult> {
        val promise = Promise<ImagePickerNativeResult>()
        if (!takePickerPending("launchCamera", promise)) return promise
        val context = context
        val activity = context.currentActivity
        if (activity == null) {
            rejectPickerPending("launchCamera", "found no activity to present from")
            return promise
        }
        // refusing and missing hardware are ordinary outcomes: both resolve
        // canceled, like backing out of the picker.
        if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            resolvePickerCanceled()
            return promise
        }
        if (!isCameraDeclared()) {
            rejectPickerPending(
                "launchCamera",
                "camera needs the CAMERA permission: set native.app imagePicker.camera " +
                    "and rerun one prebuild"
            )
            return promise
        }
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        ) {
            startCamera(activity)
            return promise
        }
        if (cameraRationale(activity) || cameraAskedBefore(activity)) {
            // denied before, askable or permanent: stay quiet and resolve
            // canceled rather than nag on every launch. the explicit
            // requestCameraPermissions call is the way back.
            resolvePickerCanceled()
            return promise
        }
        // undetermined: ask once, then capture or cancel on the answer.
        val aware = activity as? PermissionAwareActivity
        if (aware == null) {
            rejectPickerPending("launchCamera", "cannot request the camera permission here")
            return promise
        }
        markCameraAsked()
        aware.requestPermissions(
            arrayOf(Manifest.permission.CAMERA),
            REQUEST_CAMERA_PERMISSION,
            this
        )
        return promise
    }

    override fun getCameraPermissions(): Promise<CameraPermissionResponse> {
        // a read, never a prompt; outside the pending slot so it answers during a pick.
        return Promise.resolved(cameraPermissionResponse())
    }

    override fun requestCameraPermissions(): Promise<CameraPermissionResponse> {
        val context = context
        if (!isCameraDeclared()) {
            return Promise.rejected(
                OneNativeError(E_FAILED,
                    "ImagePicker.requestCameraPermissions: camera needs the CAMERA permission: " +
                        "set native.app imagePicker.camera and rerun one prebuild"
                )
            )
        }
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        ) {
            return Promise.resolved(cameraPermissionResponse())
        }
        val activity = context.currentActivity
        val aware = activity as? PermissionAwareActivity
        if (activity == null || aware == null) {
            return Promise.rejected(
                OneNativeError(E_FAILED, "ImagePicker.requestCameraPermissions: found no activity to prompt from")
            )
        }
        val promise = Promise<CameraPermissionResponse>()
        synchronized(lock) {
            if (pendingPermissionPromise != null) {
                return Promise.rejected(
                    OneNativeError(E_FAILED,
                        "ImagePicker.requestCameraPermissions: another request is already in flight"
                    )
                )
            }
            pendingPermissionPromise = promise
        }
        markCameraAsked()
        aware.requestPermissions(
            arrayOf(Manifest.permission.CAMERA),
            REQUEST_PERMISSION_CALL,
            this
        )
        return promise
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
            val pending = synchronized(lock) {
                val pending = pendingPermissionPromise
                pendingPermissionPromise = null
                pending
            }
            pending?.resolve(cameraPermissionResponse())
            return true
        }
        if (requestCode != REQUEST_CAMERA_PERMISSION) return false
        if (granted) {
            val activity = context.currentActivity
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
    private fun cameraPermissionResponse(): CameraPermissionResponse {
        val context = context
        val granted =
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        val activity = context.currentActivity
        val (status, canAskAgain) =
            when {
                granted -> Pair(CameraPermissionStatus.GRANTED, true)
                activity != null && cameraRationale(activity) ->
                    Pair(CameraPermissionStatus.DENIED, true)
                activity != null && cameraAskedBefore(activity) ->
                    Pair(CameraPermissionStatus.DENIED, false)
                activity == null && cameraAskedBefore(null) ->
                    Pair(CameraPermissionStatus.DENIED, false)
                else -> Pair(CameraPermissionStatus.UNDETERMINED, true)
            }
        return CameraPermissionResponse(status, granted, canAskAgain)
    }

    private fun cameraRationale(activity: Activity): Boolean {
        return ActivityCompat.shouldShowRequestPermissionRationale(
            activity,
            Manifest.permission.CAMERA
        )
    }

    private fun cameraAskedKey(): String = "one-native-image-picker.camera-asked"

    private fun cameraAskedBefore(activity: Activity?): Boolean {
        val context = activity ?: context
        return context
            .getSharedPreferences("one-native-image-picker", Activity.MODE_PRIVATE)
            .getBoolean(cameraAskedKey(), false)
    }

    private fun markCameraAsked() {
        context
            .getSharedPreferences("one-native-image-picker", Activity.MODE_PRIVATE)
            .edit()
            .putBoolean(cameraAskedKey(), true)
            .apply()
    }

    private fun isCameraDeclared(): Boolean {
        val context = context
        val info =
            try {
                if (Build.VERSION.SDK_INT >= 33) {
                    context.packageManager.getPackageInfo(
                        context.packageName,
                        PackageManager.PackageInfoFlags.of(
                            PackageManager.GET_PERMISSIONS.toLong()
                        )
                    )
                } else {
                    @Suppress("DEPRECATION")
                    context.packageManager.getPackageInfo(
                        context.packageName,
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
        val context = context
        try {
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
            activity.startActivityForResult(intent, REQUEST_CAMERA, null)
        } catch (e: ActivityNotFoundException) {
            pendingCameraFile = null
            resolvePickerCanceled()
        } catch (e: Exception) {
            pendingCameraFile = null
            rejectPickerPending("launchCamera", e.message ?: "could not open the camera")
        }
    }

    private fun handleLibraryResult(resultCode: Int, data: Intent?) {
        val single = pendingSingle
        val multiple = pendingMultiple
        val sourceUris =
            when {
                single != null ->
                    single.parseResult(resultCode, data)?.let { listOf(it) } ?: emptyList()
                multiple != null -> multiple.parseResult(resultCode, data)
                else -> fallbackUris(resultCode, data)
            }
        if (sourceUris.isEmpty()) {
            resolvePickerCanceled()
            return
        }
        val limited =
            if (pendingLimit > 0) sourceUris.take(pendingLimit) else sourceUris
        try {
            resolvePickerPending(limited.map { copyToCache(it) }.toTypedArray())
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
            resolvePickerPending(
                arrayOf(
                    ImagePickerAsset(
                        Uri.fromFile(file).toString(),
                        size.first.toDouble(),
                        size.second.toDouble(),
                        "image/jpeg",
                        file.name,
                        file.length().toDouble()
                    )
                )
            )
        } catch (e: Exception) {
            file.delete()
            rejectPickerPending("launchCamera", e.message ?: "could not read the photo")
        }
    }

    private fun copyToCache(source: Uri): ImagePickerAsset {
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
        return ImagePickerAsset(
            Uri.fromFile(dest).toString(),
            size.first.toDouble(),
            size.second.toDouble(),
            mimeType,
            displayName ?: dest.name,
            dest.length().toDouble()
        )
    }

    private fun queryDisplayName(source: Uri): String? {
        val cursor =
            context.contentResolver.query(
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
        val dir = File(context.cacheDir, "one-native-image-picker")
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

    // zero is unlimited on both sides; on api 33+ the real system maximum
    // applies, below that the backported picker clamps the same sentinel
    // androidx itself uses.
    private fun effectiveMax(selectionLimit: Int): Int {
        val systemMax =
            if (Build.VERSION.SDK_INT >= 33) MediaStore.getPickImagesMaxLimit()
            else Int.MAX_VALUE
        if (selectionLimit <= 0) return systemMax
        if (Build.VERSION.SDK_INT >= 33) return minOf(selectionLimit, systemMax)
        return selectionLimit
    }

    // one launch in flight: native owns the slot, so a second launch rejects
    // instead of clobbering the pending promise. permission reads never take
    // this slot.
    private fun takePickerPending(verb: String, promise: Promise<ImagePickerNativeResult>): Boolean {
        synchronized(lock) {
            if (pendingPickerPromise == null) {
                pendingPickerPromise = promise
                pendingPickerVerb = verb
                return true
            }
        }
        promise.reject(OneNativeError(E_FAILED, "ImagePicker.$verb: another request is already in flight"))
        return false
    }

    private fun takePickerPromise(): Promise<ImagePickerNativeResult>? = synchronized(lock) {
        val promise = pendingPickerPromise
        clearPickerPending()
        promise
    }

    private fun resolvePickerPending(assets: Array<ImagePickerAsset>) {
        takePickerPromise()?.resolve(ImagePickerNativeResult(false, assets))
    }

    private fun resolvePickerCanceled() {
        takePickerPromise()?.resolve(ImagePickerNativeResult(true, null))
    }

    private fun rejectPickerPending(verb: String, message: String) {
        pendingCameraFile?.delete()
        takePickerPromise()?.reject(OneNativeError(E_FAILED, "ImagePicker.$verb: $message"))
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
        private const val E_FAILED = "E_IMAGE_PICKER_FAILED"
        private const val REQUEST_LIBRARY = 0x1A01
        private const val REQUEST_CAMERA = 0x1A02
        private const val REQUEST_CAMERA_PERMISSION = 0x1A03
        private const val REQUEST_PERMISSION_CALL = 0x1A04
    }
}
