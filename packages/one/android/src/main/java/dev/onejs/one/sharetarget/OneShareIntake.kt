package dev.onejs.one.sharetarget

import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Patterns
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext

// every field is required: a caller must make an explicit, bounded decision
// for each limit rather than inherit an unbounded default. acceptedFileMimePrefixes
// may still be null (any file type accepted), but that is now a choice the
// caller wrote down, not a fallback.
data class OneShareIntakeLimits(
    val maxItems: Int,
    val maxItemBytes: Long,
    val maxTotalBytes: Long,
    // null accepts any file mime type; entries may end in "/*" as a prefix match
    val acceptedFileMimePrefixes: Set<String>?,
    val acceptedText: Boolean,
    val acceptedUrls: Boolean,
)

enum class OneShareIntakeIssueReason {
    UNACCEPTED_TYPE,
    OVER_ITEM_LIMIT,
    OVER_SIZE_LIMIT,
    READ_ERROR,
}

data class OneShareIntakeIssue(val label: String, val reason: OneShareIntakeIssueReason)

data class OneShareIntakeResult(
    // EXTRA_TEXT verbatim, meant for the editable composer field; never also
    // duplicated into items.
    val text: String,
    val items: List<ShareItem>,
    val truncated: Boolean,
    val issues: List<OneShareIntakeIssue>,
)

// thrown for a failure that isn't a single rejected/oversized/unreadable
// item (those become OneShareIntakeIssue entries and the loop continues).
// callers must handle this rather than let it crash the host activity.
class OneShareIntakeException(message: String, cause: Throwable? = null) : Exception(message, cause)

// reads an incoming ACTION_SEND/ACTION_SEND_MULTIPLE intent into a bounded,
// private-storage-owned result. never reads a whole stream into memory and
// never decodes image bytes: every file is copied in fixed-size chunks
// straight to disk so size limits hold regardless of what the sender claims.
// text/url entries count against maxItems and their utf-8 byte length counts
// against maxTotalBytes exactly like files do.
internal object OneShareIntake {
    private const val COPY_BUFFER_BYTES = 8192

    // every resolver query, stream read and file write below is blocking
    // disk/binder i/o; this always runs on Dispatchers.IO regardless of
    // what dispatcher the caller is on, so a caller invoking this from a
    // Main-dispatched coroutine (as the activity's LaunchedEffect does)
    // never blocks the UI thread on it.
    suspend fun intake(
        context: Context,
        intent: Intent,
        destinationDir: File,
        limits: OneShareIntakeLimits,
    ): OneShareIntakeResult =
        withContext(Dispatchers.IO) {
            try {
                intakeOrThrow(context, intent, destinationDir, limits)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                throw OneShareIntakeException("Failed to read shared content: ${e.message}", e)
            }
        }

    private suspend fun intakeOrThrow(
        context: Context,
        intent: Intent,
        destinationDir: File,
        limits: OneShareIntakeLimits,
    ): OneShareIntakeResult {
        val resolver = context.contentResolver
        val primaryText = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()?.trim().orEmpty()

        val seenTextValues = mutableSetOf<String>()
        if (primaryText.isNotEmpty()) seenTextValues.add(primaryText)

        val issues = mutableListOf<OneShareIntakeIssue>()
        val items = mutableListOf<ShareItem>()
        var itemCount = 0
        var totalBytes = 0L

        for (entry in collectEntries(intent)) {
            currentCoroutineContext().ensureActive()

            when (entry) {
                is Entry.CharSequenceEntry -> {
                    val value = entry.value
                    if (!seenTextValues.add(value)) continue

                    val isUrl = isUrl(value)
                    if (isUrl && !limits.acceptedUrls) {
                        issues += OneShareIntakeIssue(value, OneShareIntakeIssueReason.UNACCEPTED_TYPE)
                        continue
                    }
                    if (!isUrl && !limits.acceptedText) {
                        issues += OneShareIntakeIssue(value, OneShareIntakeIssueReason.UNACCEPTED_TYPE)
                        continue
                    }
                    if (itemCount >= limits.maxItems) {
                        issues += OneShareIntakeIssue(value, OneShareIntakeIssueReason.OVER_ITEM_LIMIT)
                        continue
                    }
                    val bytes = value.toByteArray(Charsets.UTF_8).size.toLong()
                    if (totalBytes + bytes > limits.maxTotalBytes) {
                        issues += OneShareIntakeIssue(value, OneShareIntakeIssueReason.OVER_SIZE_LIMIT)
                        continue
                    }

                    items.add(if (isUrl) ShareItem.Url(value) else ShareItem.Text(value))
                    itemCount += 1
                    totalBytes += bytes
                }

                is Entry.UriEntry -> {
                    val uri = entry.uri
                    val mimeType = resolver.getType(uri) ?: "application/octet-stream"
                    val label = uri.toString()

                    if (!isAcceptedMime(mimeType, limits.acceptedFileMimePrefixes)) {
                        issues += OneShareIntakeIssue(label, OneShareIntakeIssueReason.UNACCEPTED_TYPE)
                        continue
                    }
                    if (itemCount >= limits.maxItems) {
                        issues += OneShareIntakeIssue(label, OneShareIntakeIssueReason.OVER_ITEM_LIMIT)
                        continue
                    }
                    val remainingTotal = limits.maxTotalBytes - totalBytes
                    if (remainingTotal <= 0) {
                        issues += OneShareIntakeIssue(label, OneShareIntakeIssueReason.OVER_SIZE_LIMIT)
                        continue
                    }

                    val (displayName, declaredSize) = queryMetadata(resolver, uri)
                    val cap = minOf(limits.maxItemBytes, remainingTotal)
                    if (declaredSize != null && declaredSize > cap) {
                        issues += OneShareIntakeIssue(displayName ?: label, OneShareIntakeIssueReason.OVER_SIZE_LIMIT)
                        continue
                    }

                    val copied = boundedCopy(resolver, uri, destinationDir, displayName, cap)
                    if (copied == null) {
                        issues += OneShareIntakeIssue(displayName ?: label, OneShareIntakeIssueReason.READ_ERROR)
                        continue
                    }
                    if (copied.hitLimit) {
                        copied.file.delete()
                        issues += OneShareIntakeIssue(displayName ?: label, OneShareIntakeIssueReason.OVER_SIZE_LIMIT)
                        continue
                    }

                    items.add(
                        ShareItem.File(
                            uri = Uri.fromFile(copied.file),
                            name = displayName ?: copied.file.name,
                            mimeType = mimeType,
                            size = copied.bytesCopied,
                        )
                    )
                    itemCount += 1
                    totalBytes += copied.bytesCopied
                }
            }
        }

        return OneShareIntakeResult(
            text = primaryText,
            items = items,
            truncated = issues.isNotEmpty(),
            issues = issues,
        )
    }

    private sealed class Entry {
        data class UriEntry(val uri: Uri) : Entry()

        data class CharSequenceEntry(val value: String) : Entry()
    }

    // EXTRA_STREAM (single/multiple) and every ClipData item: a ClipData
    // item carries either a content uri (file) or inline text/url, and a
    // uri already seen via EXTRA_STREAM or an earlier ClipData item is
    // never copied twice.
    private fun collectEntries(intent: Intent): List<Entry> {
        val seenUris = linkedSetOf<Uri>()
        val entries = mutableListOf<Entry>()

        fun addUri(uri: Uri) {
            if (seenUris.add(uri)) entries.add(Entry.UriEntry(uri))
        }

        when (intent.action) {
            Intent.ACTION_SEND -> {
                @Suppress("DEPRECATION")
                intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)?.let(::addUri)
            }
            Intent.ACTION_SEND_MULTIPLE -> {
                @Suppress("DEPRECATION")
                intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)?.forEach(::addUri)
            }
        }

        intent.clipData?.let { clipData ->
            for (i in 0 until clipData.itemCount) {
                val item = clipData.getItemAt(i)
                val uri = item.uri
                if (uri != null) {
                    addUri(uri)
                    continue
                }
                val text = item.text?.toString()?.trim()
                if (!text.isNullOrEmpty()) entries.add(Entry.CharSequenceEntry(text))
            }
        }

        return entries
    }

    private fun isUrl(value: String): Boolean = Patterns.WEB_URL.matcher(value).matches()

    private fun isAcceptedMime(mimeType: String, prefixes: Set<String>?): Boolean {
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
            if (e is CancellationException) throw e
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
}
