package dev.onejs.onenative

import android.content.Context
import android.net.Uri
import android.webkit.WebResourceResponse
import com.margelo.nitro.one.OneUpdatesLauncher
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.InputStream

// one build's one-dom directory, served at https://appassets.androidplatform.net/<selection>/...
// with no network fallback. the host is the reserved android asset domain, so the
// origin stays fixed and secure across updates; the selection in the path keeps
// bytes from different builds apart.
internal class OneDOMResources private constructor(
    private val context: Context,
    val selection: String,
    private val root: File?,
    private val assetPrefix: String,
) {
    companion object {
        const val HOST = "appassets.androidplatform.net"
        private val manifests = mutableMapOf<String, Map<String, String>>()

        fun current(context: Context): OneDOMResources? {
            val location = OneUpdatesLauncher.currentDOMAssetLocation() ?: return null
            return OneDOMResources(context.applicationContext, location.selection, location.root, location.assetPrefix)
        }

        fun valid(segment: String) =
            segment.isNotEmpty() && segment != "." && segment != ".." &&
                !segment.contains('/') && !segment.contains('\\') && !segment.contains('\u0000')

        fun mime(name: String): String = when (name.substringAfterLast('.', "").lowercase()) {
            "html" -> "text/html"
            "js", "mjs" -> "text/javascript"
            "css" -> "text/css"
            "json", "map" -> "application/json"
            "txt" -> "text/plain"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "gif" -> "image/gif"
            "webp" -> "image/webp"
            "avif" -> "image/avif"
            "ico" -> "image/x-icon"
            "woff" -> "font/woff"
            "woff2" -> "font/woff2"
            "ttf" -> "font/ttf"
            "otf" -> "font/otf"
            "wasm" -> "application/wasm"
            "mp4" -> "video/mp4"
            "webm" -> "video/webm"
            "mp3" -> "audio/mpeg"
            "wav" -> "audio/wav"
            else -> "application/octet-stream"
        }

        fun response(status: Int, mime: String, body: InputStream, cache: String): WebResourceResponse {
            val reason = when (status) { 200 -> "OK"; 204 -> "No Content"; else -> "Not Found" }
            val charset = if (mime.startsWith("text/") || mime == "application/json") "utf-8" else null
            return WebResourceResponse(mime, charset, status, reason, mapOf("Cache-Control" to cache), body)
        }

        fun missing() = response(404, "text/plain", ByteArrayInputStream(ByteArray(0)), "no-store")
    }

    private val key = (root?.path ?: "assets:$assetPrefix") + "|" + selection

    // the built page for an entry, from this build's manifest.
    fun page(entryId: String): List<String>? {
        val entries = synchronized(manifests) {
            manifests[key] ?: run {
                val manifest = try {
                    JSONObject(open(listOf("manifest.json"))?.use { it.readBytes().toString(Charsets.UTF_8) } ?: return null)
                } catch (_: Exception) {
                    return null
                }
                if (manifest.optInt("protocolVersion") != 1 || manifest.opt("buildId") !is String) return null
                val table = manifest.optJSONObject("entries") ?: return null
                val parsed = mutableMapOf<String, String>()
                for (name in table.keys()) parsed[name] = table.opt(name) as? String ?: return null
                parsed.also { manifests[key] = it }
            }
        }
        val segments = (entries[entryId] ?: return null).split('/')
        return if (segments.all(::valid)) segments else null
    }

    fun url(segments: List<String>): String =
        Uri.Builder().scheme("https").authority(HOST).appendPath(selection)
            .apply { segments.forEach { appendPath(it) } }.build().toString()

    // decode each segment on its own so an encoded slash or dot segment never
    // becomes a separator, then keep file reads inside the build directory.
    fun resolve(url: Uri): List<String>? {
        if (url.scheme != "https" || url.authority != HOST) return null
        val encoded = (url.encodedPath ?: return null).split('/').drop(1)
        if (encoded.firstOrNull() != selection) return null
        val segments = encoded.drop(1).map { Uri.decode(it) }
        return if (segments.isNotEmpty() && segments.all(::valid)) segments else null
    }

    fun open(segments: List<String>): InputStream? {
        if (root == null) {
            return try {
                context.assets.open(assetPrefix + "one-dom/" + segments.joinToString("/"))
            } catch (_: Exception) {
                null
            }
        }
        val base = File(root, "one-dom").canonicalFile
        val file = File(base, segments.joinToString(File.separator)).canonicalFile
        if (!file.path.startsWith(base.path + File.separator) || !file.isFile) return null
        return file.inputStream()
    }

    fun serve(url: Uri): WebResourceResponse {
        val segments = resolve(url) ?: return missing()
        val name = segments.last()
        val body = open(segments) ?: return missing()
        val cache = if (name.endsWith(".html")) "no-cache" else "public, max-age=31536000, immutable"
        return response(200, mime(name), body, cache)
    }
}
