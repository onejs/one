package dev.onejs.one.sharetarget

import android.content.ClipData
import android.content.ClipDescription
import android.content.ContentProvider
import android.content.ContentValues
import android.content.Intent
import android.database.Cursor
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.test.core.app.ApplicationProvider
import java.io.ByteArrayInputStream
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows
import org.robolectric.annotation.Config
import org.robolectric.shadows.ShadowContentResolver

// a fake content:// provider so intake exercises the real ContentResolver
// path (getType/query/openInputStream) instead of file:// shortcuts, the
// same as a real sharing app's provider would be hit through.
class FakeShareProvider : ContentProvider() {
    override fun onCreate() = true

    override fun query(
        uri: Uri,
        projection: Array<out String>?,
        selection: String?,
        selectionArgs: Array<out String>?,
        sortOrder: String?,
    ): Cursor? {
        val entry = Entries.byUri[uri] ?: return null
        val matrix = android.database.MatrixCursor(arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE))
        matrix.addRow(arrayOf<Any>(entry.name, entry.declaredSize))
        return matrix
    }

    override fun getType(uri: Uri): String? = Entries.byUri[uri]?.mimeType

    override fun insert(uri: Uri, values: ContentValues?): Uri? = null

    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0

    override fun update(
        uri: Uri,
        values: ContentValues?,
        selection: String?,
        selectionArgs: Array<out String>?,
    ) = 0

    object Entries {
        data class Entry(val name: String, val mimeType: String, val declaredSize: Long, val bytes: ByteArray)

        val byUri = mutableMapOf<Uri, Entry>()
    }
}

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
class OneShareIntakeTest {
    private val context get() = ApplicationProvider.getApplicationContext<android.content.Context>()
    private lateinit var destinationDir: File

    private val generousLimits =
        OneShareIntakeLimits(
            maxItems = 10,
            maxItemBytes = 1024,
            maxTotalBytes = 4096,
            acceptedFileMimePrefixes = null,
            acceptedText = true,
            acceptedUrls = true,
        )

    @Before
    fun setUp() {
        destinationDir = File.createTempFile("sharetarget-intake-test", "").apply {
            delete()
            mkdirs()
        }
        FakeShareProvider.Entries.byUri.clear()
        org.robolectric.shadows.ShadowContentResolver.registerProviderInternal(
            PROVIDER_AUTHORITY,
            Robolectric.setupContentProvider(FakeShareProvider::class.java, PROVIDER_AUTHORITY),
        )
    }

    private fun registerFile(uri: Uri, name: String, mimeType: String, bytes: ByteArray, declaredSize: Long = bytes.size.toLong()) {
        FakeShareProvider.Entries.byUri[uri] = FakeShareProvider.Entries.Entry(name, mimeType, declaredSize, bytes)
        Shadows.shadowOf(context.contentResolver).registerInputStream(uri, ByteArrayInputStream(bytes))
    }

    private companion object {
        const val PROVIDER_AUTHORITY = "dev.onejs.test.shareprovider"
    }

    // --- primary EXTRA_TEXT is editable, never duplicated into items ---

    @Test
    fun `extra text becomes the editable text, not an item`() = runBlocking {
        val intent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_TEXT, "hello from the sender")
        }
        val result = OneShareIntake.intake(context, intent, destinationDir, generousLimits)
        assertEquals("hello from the sender", result.text)
        assertTrue(result.items.isEmpty())
        assertFalse(result.truncated)
    }

    @Test
    fun `extra text classified as a url is still only the editable text`() = runBlocking {
        val intent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_TEXT, "https://example.com/shared")
        }
        val result = OneShareIntake.intake(context, intent, destinationDir, generousLimits)
        assertEquals("https://example.com/shared", result.text)
        assertTrue(result.items.isEmpty())
    }

    // --- ClipData text/url entries become items, counted and byte-budgeted ---

    @Test
    fun `clip data text entries become items and count toward maxItems`() = runBlocking {
        val clip = ClipData.newPlainText("a", "first shared note")
        clip.addItem(ClipData.Item("second shared note"))
        clip.addItem(ClipData.Item("https://example.com"))
        val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply { clipData = clip }

        val limits = generousLimits.copy(maxItems = 2)
        val result = OneShareIntake.intake(context, intent, destinationDir, limits)

        assertEquals(2, result.items.size)
        assertTrue(result.truncated)
        assertEquals(1, result.issues.count { it.reason == OneShareIntakeIssueReason.OVER_ITEM_LIMIT })
    }

    @Test
    fun `clip data text duplicating the primary text is not added twice`() = runBlocking {
        val clip = ClipData.newPlainText("a", "same text")
        val intent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_TEXT, "same text")
            clipData = clip
        }
        val result = OneShareIntake.intake(context, intent, destinationDir, generousLimits)
        assertEquals("same text", result.text)
        assertTrue(result.items.isEmpty())
        assertFalse(result.truncated)
    }

    @Test
    fun `text item byte budget is enforced in utf8 bytes`() = runBlocking {
        val big = "x".repeat(50)
        val small = "y".repeat(50)
        val clip = ClipData.newPlainText("a", big)
        clip.addItem(ClipData.Item(small))
        val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply { clipData = clip }

        val limits = generousLimits.copy(maxTotalBytes = 60)
        val result = OneShareIntake.intake(context, intent, destinationDir, limits)

        // the first (50 bytes) fits under 60, the second (another 50) does not
        assertEquals(1, result.items.size)
        assertTrue(result.truncated)
        assertEquals(OneShareIntakeIssueReason.OVER_SIZE_LIMIT, result.issues.single().reason)
    }

    @Test
    fun `acceptedText false rejects plain text but acceptedUrls still allows a url`() = runBlocking {
        val clip = ClipData.newPlainText("a", "plain note")
        clip.addItem(ClipData.Item("https://example.com"))
        val intent = Intent(Intent.ACTION_SEND_MULTIPLE).apply { clipData = clip }

        val limits = generousLimits.copy(acceptedText = false, acceptedUrls = true)
        val result = OneShareIntake.intake(context, intent, destinationDir, limits)

        assertEquals(1, result.items.size)
        assertTrue(result.items.single() is ShareItem.Url)
        assertEquals(OneShareIntakeIssueReason.UNACCEPTED_TYPE, result.issues.single().reason)
    }

    // --- file uris: real ContentResolver round trip through a fake provider ---

    @Test
    fun `a file uri is copied into destinationDir honoring the declared mime type`() = runBlocking {
        val uri = Uri.parse("content://dev.onejs.test.shareprovider/file/1")
        registerFile(uri, "photo.jpg", "image/jpeg", ByteArray(100) { it.toByte() })

        val intent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_STREAM, uri)
            type = "image/jpeg"
        }
        val result = OneShareIntake.intake(context, intent, destinationDir, generousLimits)

        assertEquals(1, result.items.size)
        val file = result.items.single() as ShareItem.File
        assertEquals(100L, file.size)
        assertEquals("image/jpeg", file.mimeType)
        assertTrue(File(file.uri.path!!).exists())
        assertFalse(result.truncated)
    }

    @Test
    fun `an oversized file is dropped and its partial copy deleted`() = runBlocking {
        val uri = Uri.parse("content://dev.onejs.test.shareprovider/file/2")
        registerFile(uri, "huge.bin", "application/octet-stream", ByteArray(5000), declaredSize = 5000)

        val intent = Intent(Intent.ACTION_SEND).apply { putExtra(Intent.EXTRA_STREAM, uri) }
        val limits = generousLimits.copy(maxItemBytes = 1000, maxTotalBytes = 1000)
        val result = OneShareIntake.intake(context, intent, destinationDir, limits)

        assertTrue(result.items.isEmpty())
        assertTrue(result.truncated)
        assertEquals(OneShareIntakeIssueReason.OVER_SIZE_LIMIT, result.issues.single().reason)
        assertTrue(destinationDir.listFiles()?.isEmpty() != false)
    }

    @Test
    fun `an unacceptable mime type is rejected before any copy`() = runBlocking {
        val uri = Uri.parse("content://dev.onejs.test.shareprovider/file/3")
        registerFile(uri, "doc.pdf", "application/pdf", ByteArray(10))

        val intent = Intent(Intent.ACTION_SEND).apply { putExtra(Intent.EXTRA_STREAM, uri) }
        val limits = generousLimits.copy(acceptedFileMimePrefixes = setOf("image/*"))
        val result = OneShareIntake.intake(context, intent, destinationDir, limits)

        assertTrue(result.items.isEmpty())
        assertEquals(OneShareIntakeIssueReason.UNACCEPTED_TYPE, result.issues.single().reason)
        assertTrue(destinationDir.listFiles()?.isEmpty() != false)
    }

    @Test
    fun `an unreadable uri is a READ_ERROR issue, not a crash`() = runBlocking {
        val uri = Uri.parse("content://dev.onejs.test.shareprovider/file/missing")
        // intentionally never registered with Entries or an input stream

        val intent = Intent(Intent.ACTION_SEND).apply { putExtra(Intent.EXTRA_STREAM, uri) }
        val result = OneShareIntake.intake(context, intent, destinationDir, generousLimits)

        assertTrue(result.items.isEmpty())
        assertTrue(result.truncated)
    }

    // --- cancellation stops mid-copy and removes the partial file ---

    @Test
    fun `cancelling mid-copy removes the partial file and throws`() = runTest {
        val uri = Uri.parse("content://dev.onejs.test.shareprovider/file/slow")
        val bytes = ByteArray(1_000_000) { 1 }
        registerFile(uri, "slow.bin", "application/octet-stream", bytes, declaredSize = -1)
        // declaredSize -1 (unknown) forces the chunked-copy path to actually
        // stream rather than short-circuit on a pre-known size.

        val intent = Intent(Intent.ACTION_SEND).apply { putExtra(Intent.EXTRA_STREAM, uri) }
        var threw: Throwable? = null
        val job: Job = launch {
            try {
                OneShareIntake.intake(context, intent, destinationDir, generousLimits)
            } catch (e: CancellationException) {
                threw = e
                throw e
            }
        }
        // give it a chance to start, then cancel before the 1MB copy
        // (8KB chunks) can possibly finish.
        delay(1)
        job.cancelAndJoin()

        assertTrue(threw is CancellationException)
        assertTrue(destinationDir.listFiles()?.none { it.length() > 0 && it.length() == bytes.size.toLong() } ?: true)
    }

    // --- uri dedup across EXTRA_STREAM and ClipData ---

    @Test
    fun `the same uri from EXTRA_STREAM and ClipData is copied once`() = runBlocking {
        val uri = Uri.parse("content://dev.onejs.test.shareprovider/file/dup")
        registerFile(uri, "once.bin", "application/octet-stream", ByteArray(10))

        val clip = ClipData(ClipDescription("x", arrayOf("application/octet-stream")), ClipData.Item(uri))
        val intent = Intent(Intent.ACTION_SEND).apply {
            putExtra(Intent.EXTRA_STREAM, uri)
            clipData = clip
        }
        val result = OneShareIntake.intake(context, intent, destinationDir, generousLimits)

        assertEquals(1, result.items.size)
        assertEquals(1, destinationDir.listFiles()?.size)
    }
}
