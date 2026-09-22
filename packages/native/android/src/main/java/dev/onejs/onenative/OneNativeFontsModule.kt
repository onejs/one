package dev.onejs.onenative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import android.graphics.Typeface
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.common.assets.ReactFontManager
import java.io.File
import java.net.URL
import java.security.MessageDigest

// runtime font loading for One.UI.Fonts. one path: make the uri a local
// file, then ReactFontManager.addCustomFont. only the observed schemes ship:
// file:// is used as is, http(s):// is downloaded to
// cacheDir/one-fonts/<sha256 of url>.<ext>. Typeface exposes no name query,
// so a wrong key registers silently; isLoaded answers from the manager's
// own registry plus assets/fonts for embedded files.
class OneNativeFontsModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = NAME

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isLoaded(name: String): Boolean {
        if (ReactFontManager.getInstance().customFontFamilies.contains(name)) {
            return true
        }
        return try {
            reactApplicationContext.assets.list("fonts").orEmpty().any {
                it.substringBeforeLast('.') == name
            }
        } catch (_: Exception) {
            false
        }
    }

    @ReactMethod
    fun load(name: String, uri: String, promise: Promise) {
        if (isLoaded(name)) {
            promise.resolve(null)
            return
        }
        try {
            val file = resolveFontFile(name, uri)
            val typeface =
                try {
                    Typeface.createFromFile(file)
                } catch (_: Exception) {
                    null
                }
            if (typeface == null) {
                promise.reject("E_FONTS_REGISTER", "Fonts.load: \"$name\" could not be registered")
                return
            }
            ReactFontManager.getInstance().addCustomFont(name, typeface)
            promise.resolve(null)
        } catch (e: FontsUriException) {
            promise.reject("E_FONTS_URI", e.message)
        } catch (e: FontsDownloadException) {
            promise.reject("E_FONTS_DOWNLOAD", e.message)
        } catch (e: Exception) {
            promise.reject("E_FONTS_DOWNLOAD", "Fonts.load: \"$name\" could not be downloaded", e)
        }
    }

    private fun resolveFontFile(name: String, uri: String): File {
        val url =
            try {
                URL(uri)
            } catch (_: Exception) {
                throw FontsUriException("Fonts.load: \"$name\" is not a usable uri")
            }
        return when (url.protocol.lowercase()) {
            "file" -> {
                val file = File(url.path)
                if (!file.isFile) {
                    throw FontsUriException("Fonts.load: \"$name\" points at a missing file")
                }
                file
            }
            "http", "https" -> downloadFontFile(name, url)
            else ->
                throw FontsUriException(
                    "Fonts.load: \"$name\" uses an unsupported uri scheme \"${url.protocol}\""
                )
        }
    }

    private fun downloadFontFile(name: String, url: URL): File {
        val extension = url.path.substringAfterLast('.', "ttf").lowercase()
        val digest = MessageDigest.getInstance("SHA-256").digest(url.toString().toByteArray())
        val fileName = digest.joinToString("") { "%02x".format(it) } + "." + extension
        val directory = File(reactApplicationContext.cacheDir, "one-fonts")
        val file = File(directory, fileName)
        if (file.isFile) {
            return file
        }
        val bytes = url.openStream().use { it.readBytes() }
        if (bytes.isEmpty()) {
            throw FontsDownloadException("Fonts.load: \"$name\" downloaded zero bytes")
        }
        directory.mkdirs()
        file.writeBytes(bytes)
        return file
    }

    private class FontsUriException(message: String) : Exception(message)

    private class FontsDownloadException(message: String) : Exception(message)

    companion object {
        const val NAME = "OneNativeFonts"
    }
}
