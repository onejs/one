package dev.onejs.one.sharetarget

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Patterns
import java.io.File
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive

data class OneShareIntakeLimits(
    val maxItems: Int = 10,
    val maxItemBytes: Long = 25L * 1024 * 1024,
    val maxTotalBytes: Long = 100L * 1024 * 1024,
    // null accepts any mime type; entries may end in "/*" as a prefix match
    val acceptedMimePrefixes: Set<String>? = null,
)

data class OneShareIntakeResult(
    val text: String,
    val items: List<ShareItem>,
    // true when something was dropped: over maxItems, over a byte limit,
    // an unaccepted mime type, or a read failure
    val truncated: Boolean,
)

// reads an incoming ACTION_SEND/ACTION_SEND_MULTIPLE intent into a bounded,
// private-storage-owned result. never reads a whole stream into memory and
// never decodes image bytes: every file is copied in fixed-size chunks
// straight to disk so size limits hold regardless of what the sender claims.
internal object OneShareIntake {
    private const val COPY_BUFFER_BYTES = 8192

    suspend fun intake(
        context: Context,
        intent: Intent,
        destinationDir: File,
        limits: OneShareIntakeLimits,
    ): OneShareIntakeResult {
        val resolver = context.contentResolver
        val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
        val textItems = mutableListOf<ShareItem>()
        if (text.isNotEmpty()) {
            textItems.add(if (isUrl(text)) ShareItem.Url(text) else ShareItem.Text(text))
        }

        val uris = collectUris(intent)
        var totalBytes = 0L
        var truncated = false
        val fileItems = mutableListOf<ShareItem>()

        for (uri in uris) {
            currentCoroutineContext().ensureActive()

            if (fileItems.size >= limits.maxItems) {
                truncated = true
                break
            }

            val mimeType = resolver.getType(uri) ?: "application/octet-stream"
            if (!isAccepted(mimeType, limits.acceptedMimePrefixes)) {
                truncated = true
                continue
            }

            val remainingTotal = limits.maxTotalBytes - totalBytes
            if (remainingTotal <= 0) {
                truncated = true
                break
            }

            val (displayName, declaredSize) = queryMetadata(resolver, uri)
            val cap = minOf(limits.maxItemBytes, remainingTotal)
            if (declaredSize != null && declaredSize > cap) {
                truncated = true
                continue
            }

            val copied = boundedCopy(resolver, uri, destinationDir, displayName, cap)
            if (copied == null) {
                truncated = true
                continue
            }
            if (copied.hitLimit) {
                copied.file.delete()
                truncated = true
                continue
            }

            totalBytes += copied.bytesCopied
            fileItems.add(
                ShareItem.File(
                    uri = Uri.fromFile(copied.file),
                    name = displayName ?: copied.file.name,
                    mimeType = mimeType,
                    size = copied.bytesCopied,
                )
            )
        }

        return OneShareIntakeResult(
            text = text,
            items = dedupe(textItems + fileItems),
            truncated = truncated,
        )
    }

    private fun collectUris(intent: Intent): List<Uri> {
        val collected = linkedSetOf<Uri>()
        when (intent.action) {
            Intent.ACTION_SEND -> {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)?.let { collected.add(it) }
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                @Suppress("DEPRECATION")
                intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)?.forEach {
                    collected.add(it)
                }
            }
        }
        intent.clipData?.let { clipData ->
            for (i in 0 until clipData.itemCount) {
                clipData.getItemAt(i).uri?.let { collected.add(it) }
            }
        }
        return collected.toList()
    }

    private fun isUrl(value: String): Boolean = Patterns.WEB_URL.matcher(value).matches()

    private fun isAccepted(mimeType: String, prefixes: Set<String>?): Boolean {
        if (prefixes == null) return true
        return prefixes.any { prefix ->
            if (prefix.endsWith("/*")) mimeType.startsWith(prefix.removeSuffix("*"))
            else mimeType == prefix
        }
    }

    private fun queryMetadata(resolver: ContentResolver, uri: Uri): Pair<String?, Long?> =
        try {
            resolver
                .query(uri, arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE), null, null, null)
                ?.use { cursor ->
                    if (!cursor.moveToFirst()) return@use null to null
                    val nameIdx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    val sizeIdx = cursor.getColumnIndex(OpenableColumns.SIZE)
                    val name = if (nameIdx >= 0) cursor.getString(nameIdx) else null
                    val size = if (sizeIdx >= 0 && !cursor.isNull(sizeIdx)) cursor.getLong(sizeIdx) else null
                    name to size
                } ?: (null to null)
        } catch (_: Exception) {
            null to null
        }

    private data class CopyResult(val file: File, val bytesCopied: Long, val hitLimit: Boolean)

    // streams uri -> destinationDir in COPY_BUFFER_BYTES chunks, checking
    // cancellation and the byte cap every chunk; a cancelled coroutine or a
    // cap overrun both leave the partial file for the caller to delete.
    private suspend fun boundedCopy(
        resolver: ContentResolver,
        uri: Uri,
        destinationDir: File,
        displayName: String?,
        capBytes: Long,
    ): CopyResult? {
        val input = try {
            resolver.openInputStream(uri)
        } catch (_: Exception) {
            null
        } ?: return null

        destinationDir.mkdirs()
        val file = File(destinationDir, uniqueFileName(displayName))
        return try {
            input.use { stream ->
                file.outputStream().use { out ->
                    val buffer = ByteArray(COPY_BUFFER_BYTES)
                    var total = 0L
                    while (true) {
                        currentCoroutineContext().ensureActive()
                        val read = stream.read(buffer)
                        if (read < 0) break
                        total += read
                        if (total > capBytes) {
                            return@use CopyResult(file, total, true)
                        }
                        out.write(buffer, 0, read)
                    }
                    CopyResult(file, total, false)
                }
            }
        } catch (e: Exception) {
            file.delete()
            if (e is kotlinx.coroutines.CancellationException) throw e
            null
        }
    }

    private fun uniqueFileName(displayName: String?): String {
        val sanitized = displayName
            ?.replace(Regex("[^A-Za-z0-9._-]"), "_")
            ?.trim('.', '_')
            ?.takeLast(120)
            ?.takeIf { it.isNotEmpty() }
            ?: "item"
        return "${System.nanoTime()}-$sanitized"
    }

    private fun dedupe(items: List<ShareItem>): List<ShareItem> {
        val seen = mutableSetOf<String>()
        val result = mutableListOf<ShareItem>()
        for (item in items) {
            val key =
                when (item) {
                    is ShareItem.Text -> "text:${item.value}"
                    is ShareItem.Url -> "url:${item.value}"
                    is ShareItem.File -> "file:${item.uri}"
                }
            if (seen.add(key)) result.add(item)
        }
        return result
    }
}
