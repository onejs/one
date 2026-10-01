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

    // no-drop: a single rejected/oversized/unreadable entry anywhere in the
    // intent (including EXTRA_TEXT itself) aborts the whole intake rather
    // than silently continuing without it. any files already copied in this
    // call are deleted before returning, so a caller never sees a partial
    // item set it could accidentally send -- the caller is expected to
    // surface the single issue and block sending, not offer a truncated
    // result as success.
    private suspend fun intakeOrThrow(
        context: Context,
        intent: Intent,
        destinationDir: File,
        limits: OneShareIntakeLimits,
    ): OneShareIntakeResult {
        val resolver = context.contentResolver
        // exact CharSequence bytes, never trimmed: whitespace the sender put
        // in EXTRA_TEXT is part of what the user agreed to share.
        val rawPrimaryText = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString().orEmpty()

        val seenTextValues = mutableSetOf<String>()
        val items = mutableListOf<ShareItem>()
        val copiedFiles = mutableListOf<File>()
        var itemCount = 0
        var totalBytes = 0L
        var primaryText = ""

        fun abort(issue: OneShareIntakeIssue): OneShareIntakeResult {
            copiedFiles.forEach { it.delete() }
            return OneShareIntakeResult(text = "", items = emptyList(), truncated = true, issues = listOf(issue))
        }

        if (rawPrimaryText.isNotEmpty()) {
            val isUrl = isUrl(rawPrimaryText)
            if (isUrl && !limits.acceptedUrls) {
                return abort(OneShareIntakeIssue(rawPrimaryText, OneShareIntakeIssueReason.UNACCEPTED_TYPE))
            }
            if (!isUrl && !limits.acceptedText) {
                return abort(OneShareIntakeIssue(rawPrimaryText, OneShareIntakeIssueReason.UNACCEPTED_TYPE))
            }
            val bytes = rawPrimaryText.toByteArray(Charsets.UTF_8).size.toLong()
            if (bytes > limits.maxItemBytes || bytes > limits.maxTotalBytes) {
                return abort(OneShareIntakeIssue(rawPrimaryText, OneShareIntakeIssueReason.OVER_SIZE_LIMIT))
            }
            if (limits.maxItems < 1) return abort(OneShareIntakeIssue(rawPrimaryText, OneShareIntakeIssueReason.OVER_ITEM_LIMIT))
            itemCount += 1
            primaryText = rawPrimaryText
            totalBytes += bytes
            seenTextValues.add(rawPrimaryText)
        }

        for (entry in collectEntries(intent)) {
            currentCoroutineContext().ensureActive()

            when (entry) {
                is Entry.CharSequenceEntry -> {
                    val value = entry.value
                    if (!seenTextValues.add(value)) continue

                    val isUrl = isUrl(value)
                    if (isUrl && !limits.acceptedUrls) {
                        return abort(OneShareIntakeIssue(value, OneShareIntakeIssueReason.UNACCEPTED_TYPE))
                    }
                    if (!isUrl && !limits.acceptedText) {
                        return abort(OneShareIntakeIssue(value, OneShareIntakeIssueReason.UNACCEPTED_TYPE))
                    }
                    if (itemCount >= limits.maxItems) {
                        return abort(OneShareIntakeIssue(value, OneShareIntakeIssueReason.OVER_ITEM_LIMIT))
                    }
                    val bytes = value.toByteArray(Charsets.UTF_8).size.toLong()
                    if (bytes > limits.maxItemBytes || totalBytes + bytes > limits.maxTotalBytes) {
                        return abort(OneShareIntakeIssue(value, OneShareIntakeIssueReason.OVER_SIZE_LIMIT))
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
                        return abort(OneShareIntakeIssue(label, OneShareIntakeIssueReason.UNACCEPTED_TYPE))
                    }
                    if (itemCount >= limits.maxItems) {
                        return abort(OneShareIntakeIssue(label, OneShareIntakeIssueReason.OVER_ITEM_LIMIT))
                    }
                    val remainingTotal = limits.maxTotalBytes - totalBytes
                    if (remainingTotal <= 0) {
                        return abort(OneShareIntakeIssue(label, OneShareIntakeIssueReason.OVER_SIZE_LIMIT))
                    }

                    val (displayName, declaredSize) = queryMetadata(resolver, uri)
                    val cap = minOf(limits.maxItemBytes, remainingTotal)
                    if (declaredSize != null && declaredSize > cap) {
                        return abort(OneShareIntakeIssue(displayName ?: label, OneShareIntakeIssueReason.OVER_SIZE_LIMIT))
                    }

                    val copied = boundedCopy(resolver, uri, destinationDir, displayName, cap)
                    if (copied == null) {
                        return abort(OneShareIntakeIssue(displayName ?: label, OneShareIntakeIssueReason.READ_ERROR))
                    }
                    if (copied.hitLimit) {
                        copied.file.delete()
                        return abort(OneShareIntakeIssue(displayName ?: label, OneShareIntakeIssueReason.OVER_SIZE_LIMIT))
                    }

                    copiedFiles.add(copied.file)
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
            truncated = false,
            issues = emptyList(),
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
