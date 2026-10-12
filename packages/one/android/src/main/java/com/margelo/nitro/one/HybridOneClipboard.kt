package com.margelo.nitro.one

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.util.Base64
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import androidx.core.content.FileProvider
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.UUID

// clipboard matching expo-clipboard: strings with an optional html format,
// images as base64 data uris, and a change listener, backed by the system
// clipboard manager. urls are ios-only in expo: those methods resolve the
// empty value on android, so shared code needs no platform check. the
// listener is one native slot fanned out by js.
class HybridOneClipboard : HybridOneClipboardSpec() {
    private var changeListener: ClipboardManager.OnPrimaryClipChangedListener? = null
    private var listenerCallback: ((Array<String>) -> Unit)? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private fun context(): Context =
        NitroModules.applicationContext
            ?: throw IllegalStateException("Clipboard: React context is not ready")

    private fun clipboard(): ClipboardManager =
        context().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

    private fun primaryItem(): ClipData.Item? {
        val clip = clipboard().primaryClip
        if (clip == null || clip.itemCount == 0) return null
        return clip.getItemAt(0)
    }

    private fun primaryText(): String {
        return primaryItem()?.coerceToText(context())?.toString() ?: ""
    }

    // any platform failure rejects with the stable code for its verb.
    private fun <T> guarded(code: String, verb: String, body: () -> T): Promise<T> =
        Promise.async {
            try {
                body()
            } catch (e: Exception) {
                throw OneNativeError(code, "Clipboard.$verb: ${e.message}")
            }
        }

    override fun getString(options: ClipboardGetStringOptions): Promise<String> =
        guarded("E_CLIPBOARD_GET", "getString") {
            if (options.preferredFormat == "html") {
                primaryItem()?.htmlText?.toString() ?: primaryText()
            } else {
                primaryText()
            }
        }

    override fun setString(text: String, options: ClipboardSetStringOptions): Promise<Boolean> =
        guarded("E_CLIPBOARD_SET", "setString") {
            val clip =
                if (options.inputFormat == "html") {
                    ClipData.newHtmlText("text", text, text)
                } else {
                    ClipData.newPlainText("text", text)
                }
            clipboard().setPrimaryClip(clip)
            true
        }

    override fun hasString(): Promise<Boolean> =
        guarded("E_CLIPBOARD_HAS", "hasString") { primaryText().isNotEmpty() }

    private fun imageUri(): Uri? {
        val item = primaryItem() ?: return null
        val uri = item.uri ?: return null
        val type = context().contentResolver.getType(uri) ?: return null
        return if (type.startsWith("image/")) uri else null
    }

    private fun decodeUri(uri: Uri): Bitmap? {
        return try {
            context().contentResolver.openInputStream(uri)?.use { input ->
                BitmapFactory.decodeStream(input)
            }
        } catch (e: Exception) {
            null
        }
    }

    override fun getImage(options: ClipboardGetImageOptions): Promise<ClipboardImageResult?> =
        guarded("E_CLIPBOARD_IMAGE_GET", "getImage") {
            val uri = imageUri() ?: return@guarded null
            val bitmap = decodeUri(uri) ?: return@guarded null
            val format = options.format
            val quality =
                if (format == "jpeg") {
                    (((options.jpegQuality ?: 1.0) * 100).toInt()).coerceIn(0, 100)
                } else {
                    100
                }
            val output = ByteArrayOutputStream()
            val compressFormat =
                if (format == "jpeg") Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
            if (!bitmap.compress(compressFormat, quality, output)) return@guarded null
            val mime = if (format == "jpeg") "image/jpeg" else "image/png"
            ClipboardImageResult(
                "data:$mime;base64," + Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP),
                bitmap.width.toDouble(),
                bitmap.height.toDouble()
            )
        }

    override fun setImage(base64Image: String): Promise<Unit> =
        guarded("E_CLIPBOARD_SET", "setImage") {
            val payload =
                if (base64Image.startsWith("data:")) {
                    base64Image.substringAfter(",", base64Image)
                } else {
                    base64Image
                }
            val bytes =
                try {
                    Base64.decode(payload, Base64.DEFAULT)
                } catch (e: IllegalArgumentException) {
                    throw IllegalArgumentException("not decodable image data")
                }
            val bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                ?: throw IllegalArgumentException("not decodable image data")
            val context = context()
            val dir = File(context.cacheDir, "one-native-clipboard")
            dir.mkdirs()
            val file = File(dir, "IMG_${UUID.randomUUID()}.png")
            file.outputStream().use { output ->
                if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
                    throw IllegalStateException("could not encode the image")
                }
            }
            val uri =
                FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.one-native.fileprovider",
                    file
                )
            val clip = ClipData.newUri(context.contentResolver, "image", uri)
            clipboard().setPrimaryClip(clip)
        }

    override fun hasImage(): Promise<Boolean> =
        guarded("E_CLIPBOARD_HAS", "hasImage") { imageUri() != null }

    override fun getUrl(): Promise<String?> =
        guarded("E_CLIPBOARD_GET", "getUrl") { null }

    override fun setUrl(url: String): Promise<Unit> =
        guarded("E_CLIPBOARD_SET", "setUrl") { }

    override fun hasUrl(): Promise<Boolean> =
        guarded("E_CLIPBOARD_HAS", "hasUrl") { false }

    override fun setClipboardListener(listener: (contentTypes: Array<String>) -> Unit) {
        clearClipboardListener()
        listenerCallback = listener
        val changed =
            ClipboardManager.OnPrimaryClipChangedListener {
                val callback = listenerCallback ?: return@OnPrimaryClipChangedListener
                val types = contentTypes()
                mainHandler.post { callback(types) }
            }
        changeListener = changed
        clipboard().addPrimaryClipChangedListener(changed)
    }

    override fun clearClipboardListener() {
        listenerCallback = null
        try {
            changeListener?.let { clipboard().removePrimaryClipChangedListener(it) }
        } catch (ignored: Exception) {
        }
        changeListener = null
    }

    private fun contentTypes(): Array<String> {
        val types = mutableListOf<String>()
        if (primaryText().isNotEmpty()) types.add("plain-text")
        if (primaryItem()?.htmlText != null) types.add("html")
        if (imageUri() != null) types.add("image")
        return types.toTypedArray()
    }
}
