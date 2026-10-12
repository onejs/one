package com.margelo.nitro.one

import android.app.Activity
import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import com.facebook.react.bridge.ActivityEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.FileOutputStream
import java.util.UUID

// imperative document picker: ACTION_OPEN_DOCUMENT filtered by mime type.
// each picked file is copied into the app cache under its display name and
// returned as a file uri, so no provider grant outlives the pick. backing out
// resolves canceled; only runtime failures reject. calls arrive on the js
// thread and results on the ui thread, so the pending slot is only taken or
// settled under the lock.
class HybridOneDocumentPicker : HybridOneDocumentPickerSpec(), ActivityEventListener {
    private val lock = Any()
    private var pending: Promise<DocumentPickerNativeResult>? = null

    init {
        NitroModules.applicationContext?.addActivityEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeActivityEventListener(this)
        takePending()?.reject(OneNativeError(E_FAILED, "DocumentPicker.getDocument: torn down mid-request"))
        super.dispose()
    }

    // a hybrid object has no lifecycle owner to register activity result
    // launchers against, so it launches the intent the classic way and reads
    // the result through the activity event listener.
    @Suppress("DEPRECATION")
    override fun getDocument(options: ResolvedDocumentPickerOptions): Promise<DocumentPickerNativeResult> {
        val promise = Promise<DocumentPickerNativeResult>()
        // one pick in flight: native owns the slot, so a second pick rejects
        // instead of clobbering the pending promise.
        synchronized(lock) {
            if (pending != null) {
                promise.reject(OneNativeError(E_FAILED, "DocumentPicker.getDocument: another request is already in flight"))
                return promise
            }
            pending = promise
        }
        val activity = NitroModules.applicationContext?.currentActivity
        if (activity == null) {
            rejectPending("found no activity to present from")
            return promise
        }
        val intent =
            Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                if (options.types.size == 1) {
                    type = options.types[0]
                } else {
                    type = "*/*"
                    putExtra(Intent.EXTRA_MIME_TYPES, options.types)
                }
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, options.multiple)
            }
        try {
            activity.startActivityForResult(intent, REQUEST_DOCUMENT, null)
        } catch (e: ActivityNotFoundException) {
            rejectPending("found no document picker on this device")
        } catch (e: Exception) {
            rejectPending(e.message ?: "could not open the document picker")
        }
        return promise
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_DOCUMENT) return
        val uris = pickedUris(resultCode, data)
        if (uris.isEmpty()) {
            takePending()?.resolve(DocumentPickerNativeResult(true, null))
            return
        }
        // copying can take a while for large files; keep it off the ui thread.
        Thread {
            try {
                val assets = uris.map { copyToCache(it) }.toTypedArray()
                takePending()?.resolve(DocumentPickerNativeResult(false, assets))
            } catch (e: Exception) {
                rejectPending(e.message ?: "could not copy a picked file")
            }
        }.start()
    }

    override fun onNewIntent(intent: Intent) {}

    private fun pickedUris(resultCode: Int, data: Intent?): List<Uri> {
        if (resultCode != Activity.RESULT_OK || data == null) return emptyList()
        val clip = data.clipData
        if (clip != null) {
            return (0 until clip.itemCount).mapNotNull { clip.getItemAt(it).uri }
        }
        return listOfNotNull(data.data)
    }

    // each pick gets its own directory so the display name survives as the
    // file name without colliding with an earlier pick of the same name.
    private fun copyToCache(source: Uri): DocumentPickerAsset {
        val context =
            NitroModules.applicationContext
                ?: throw IllegalStateException("the react context is not ready")
        val resolver = context.contentResolver
        var name: String? = null
        resolver.query(source, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use {
            val index = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (it.moveToFirst() && index >= 0) name = it.getString(index)
        }
        // a display name is the provider's word, so strip any path from it.
        val fileName = name?.substringAfterLast('/')?.takeIf { it.isNotBlank() } ?: "document"
        val dir = File(File(context.cacheDir, "one-native-document-picker"), UUID.randomUUID().toString())
        dir.mkdirs()
        val dest = File(dir, fileName)
        (resolver.openInputStream(source) ?: throw IllegalStateException("cannot open $source")).use { input ->
            FileOutputStream(dest).use { output -> input.copyTo(output) }
        }
        return DocumentPickerAsset(
            Uri.fromFile(dest).toString(),
            fileName,
            resolver.getType(source),
            dest.length().toDouble()
        )
    }

    private fun takePending(): Promise<DocumentPickerNativeResult>? = synchronized(lock) {
        val promise = pending
        pending = null
        promise
    }

    private fun rejectPending(message: String) {
        takePending()?.reject(OneNativeError(E_FAILED, "DocumentPicker.getDocument: $message"))
    }

    companion object {
        private const val E_FAILED = "E_DOCUMENT_PICKER_FAILED"
        private const val REQUEST_DOCUMENT = 0x1B01
    }
}
