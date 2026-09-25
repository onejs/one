package com.margelo.nitro.one

import android.graphics.Typeface
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.common.assets.ReactFontManager
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.net.URL
import java.security.MessageDigest

// runtime font loading for One.UI.Fonts. one path: make the uri a local
// file, then ReactFontManager.addCustomFont. only the observed references
// ship: file:// is used as is, http(s):// is downloaded to
// cacheDir/one-fonts/<sha256 of url>.<ext>, and a bare release resource
// name (assets_foo) is copied out of res/raw to the same cache dir.
// Typeface exposes no name query, so a wrong key registers silently;
// isLoaded answers from the manager's own registry plus assets/fonts for
// embedded files.
class HybridOneFonts : HybridOneFontsSpec() {
    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("Fonts: React context is not ready")

    @Volatile private var embeddedFontNames: Set<String>? = null

    // isLoaded is synchronous and runs every render, so the asset
    // listing is read once and kept; embedded fonts never change at
    // runtime.
    private fun embeddedNames(): Set<String> {
        embeddedFontNames?.let {
            return it
        }
        val names =
            try {
                context.assets.list("fonts").orEmpty().map {
                    it.substringBeforeLast('.')
                }.toSet()
            } catch (_: Exception) {
                emptySet()
            }
        embeddedFontNames = names
        return names
    }

    override fun isLoaded(name: String): Boolean {
        if (ReactFontManager.getInstance().customFontFamilies.contains(name)) {
            return true
        }
        return embeddedNames().contains(name)
    }

    override fun load(name: String, uri: String): Promise<Unit> {
        if (isLoaded(name)) {
            return Promise.resolved(Unit)
        }
        val promise = Promise<Unit>()
        // the download and the registration run off the js thread; a
        // nitro promise settles from any thread.
        Thread {
            try {
                val file = resolveFontFile(name, uri)
                val typeface =
                    try {
                        Typeface.createFromFile(file)
                    } catch (_: Exception) {
                        null
                    }
                if (typeface == null) {
                    promise.reject(OneNativeError("E_FONTS_REGISTER", "Fonts.load: \"$name\" could not be registered"))
                    return@Thread
                }
                ReactFontManager.getInstance().addCustomFont(name, typeface)
                promise.resolve(Unit)
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (_: Exception) {
                promise.reject(OneNativeError("E_FONTS_DOWNLOAD", "Fonts.load: \"$name\" could not be downloaded"))
            }
        }.start()
        return promise
    }

    private fun uriError(message: String) = OneNativeError("E_FONTS_URI", message)

    private fun resolveFontFile(name: String, uri: String): File {
        if (!uri.contains("://")) {
            return copyResourceFontFile(name, uri)
        }
        val url =
            try {
                URL(uri)
            } catch (_: Exception) {
                throw uriError("Fonts.load: \"$name\" is not a usable uri")
            }
        return when (url.protocol.lowercase()) {
            "file" -> {
                val file = File(url.path)
                if (!file.isFile) {
                    throw uriError("Fonts.load: \"$name\" points at a missing file")
                }
                file
            }
            "http", "https" -> downloadFontFile(name, url)
            else ->
                throw uriError(
                    "Fonts.load: \"$name\" uses an unsupported uri scheme \"${url.protocol}\""
                )
        }
    }

    private fun copyResourceFontFile(name: String, resourceName: String): File {
        val resources = context.resources
        val id = resources.getIdentifier(resourceName, "raw", context.packageName)
        if (id == 0) {
            throw uriError("Fonts.load: \"$name\" is not a packaged font resource")
        }
        val bytes =
            try {
                resources.openRawResource(id).use { it.readBytes() }
            } catch (_: Exception) {
                throw uriError("Fonts.load: \"$name\" could not be read")
            }
        if (bytes.isEmpty()) {
            throw uriError("Fonts.load: \"$name\" packaged zero bytes")
        }
        // the resource name carries no extension; createFromFile sniffs
        // the content, so the suffix is only a label.
        val directory = File(context.cacheDir, "one-fonts")
        val file = File(directory, "$resourceName.ttf")
        if (!file.isFile) {
            directory.mkdirs()
            file.writeBytes(bytes)
        }
        return file
    }

    private fun downloadFontFile(name: String, url: URL): File {
        val extension = url.path.substringAfterLast('.', "ttf").lowercase()
        val digest = MessageDigest.getInstance("SHA-256").digest(url.toString().toByteArray())
        val fileName = digest.joinToString("") { "%02x".format(it) } + "." + extension
        val directory = File(context.cacheDir, "one-fonts")
        val file = File(directory, fileName)
        if (file.isFile) {
            return file
        }
        val bytes = url.openStream().use { it.readBytes() }
        if (bytes.isEmpty()) {
            throw OneNativeError("E_FONTS_DOWNLOAD", "Fonts.load: \"$name\" downloaded zero bytes")
        }
        directory.mkdirs()
        file.writeBytes(bytes)
        return file
    }
}
