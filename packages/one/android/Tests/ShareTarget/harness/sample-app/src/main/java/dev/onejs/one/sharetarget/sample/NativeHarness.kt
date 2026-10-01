package dev.onejs.one.sharetarget.sample

import android.app.Activity
import android.content.*
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri
import android.os.Bundle
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import android.util.Log
import dev.onejs.one.sharetarget.*
import java.io.File
import kotlinx.coroutines.delay
import org.json.JSONArray
import org.json.JSONObject

// Generated subclass contract; no React runtime or real transport.
class GeneratedHarnessShareActivity : OneShareTargetActivity() {
    override fun makeAdapter(context: Context): OneShareTargetAdapter = NativeStubAdapter(context)
    override val limits = OneShareIntakeLimits(8, 1048576, 4194304, setOf("text/*", "image/*"), true, true)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        event(this, "activity_create", JSONObject().put("restored", savedInstanceState != null))
    }
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        event(this, "warm_intent", JSONObject().put("action", intent.action))
    }
}
private fun event(context: Context, kind: String, data: JSONObject = JSONObject()) {
    val row = data.put("event", kind).put("time", System.currentTimeMillis()).toString()
    synchronized(NativeStubAdapter::class.java) { File(context.filesDir, "events.jsonl").appendText(row + "\n") }
    Log.i("OneShareHarness", row)
}
class NativeStubAdapter(private val context: Context) : OneShareTargetAdapter {
    private val gates get() = context.getSharedPreferences("gates", Context.MODE_PRIVATE)
    override suspend fun destinations(): List<ShareDestination> {
        event(context, "destinations")
        while (gates.getBoolean("destinationsBlocked", false)) delay(100)
        if (gates.getBoolean("destinationsFail", false)) error("Native stub: destinations unavailable")
        return listOf(ShareDestination("inbox", "Native Inbox", "Local fixture"),
            ShareDestination("session-proof", "Android proof session", "Select this session"))
    }
    override suspend fun send(submission: ShareSubmission) {
        val payload = JSONObject().put("submissionId", submission.id).put("destinationId", submission.destinationId)
            .put("text", submission.text).put("items", JSONArray(submission.items.map {
                when (it) {
                    is ShareItem.File -> JSONObject().put("name", it.name).put("bytes", it.size)
                        .put("copiedContent", File(requireNotNull(it.uri.path)).readText())
                    is ShareItem.Text -> JSONObject().put("text", it.value)
                    is ShareItem.Url -> JSONObject().put("url", it.value)
                }
            }))
        event(context, "send_start", JSONObject(payload.toString()))
        while (gates.getBoolean("sendBlocked", false)) delay(100)
        if (gates.getBoolean("sendFail", false)) {
            event(context, "send_failure", JSONObject(payload.toString()))
            error("Native stub: transport failed; retry keeps submission id")
        }
        val marker = File(File(context.filesDir, "deliveries").apply { mkdirs() }, submission.id + ".json")
        if (!marker.exists()) marker.writeText(payload.toString(2))
        else check(JSONObject(marker.readText()).toString() == payload.toString())
        event(context, "delivered", JSONObject(payload.toString()))
    }
}
// Explicit debug-only receiver writes app-private gates. Never part of One.
class GateReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val edit = context.getSharedPreferences("gates", Context.MODE_PRIVATE).edit()
        for (key in listOf("destinationsBlocked", "destinationsFail", "sendBlocked", "sendFail")) {
            if (intent.hasExtra(key)) edit.putBoolean(key, intent.getBooleanExtra(key, false))
        }
        check(edit.commit())
        event(context, "gate", JSONObject().put("extras", intent.extras?.keySet()?.joinToString()))
    }
}
// Real Parcelable stream + ClipData, not a string EXTRA_STREAM via adb.
class FixtureSenderActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val multiple = intent.getBooleanExtra("multiple", false)
        val uris = arrayListOf(Uri.parse("content://dev.onejs.one.sharetarget.sample.files/alpha.txt"))
        if (multiple) uris.add(Uri.parse("content://dev.onejs.one.sharetarget.sample.files/beta.txt"))
        val share = Intent(if (multiple) Intent.ACTION_SEND_MULTIPLE else Intent.ACTION_SEND).apply {
            setClass(this@FixtureSenderActivity, GeneratedHarnessShareActivity::class.java)
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, intent.getStringExtra("text") ?: "Cold native share text")
            if (multiple) putParcelableArrayListExtra(Intent.EXTRA_STREAM, uris)
            else putExtra(Intent.EXTRA_STREAM, uris.first())
            clipData = ClipData.newUri(contentResolver, "native fixture", uris.first()).apply {
                uris.drop(1).forEach { addItem(ClipData.Item(it)) }
            }
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        event(this, "dispatch", JSONObject().put("action", share.action).put("uris", JSONArray(uris.map { it.toString() })))
        startActivity(share)
        finish()
    }
}
class FixtureProvider : ContentProvider() {
    override fun onCreate() = true
    override fun getType(uri: Uri) = "text/plain"
    override fun query(uri: Uri, projection: Array<out String>?, selection: String?, selectionArgs: Array<out String>?, sortOrder: String?): Cursor {
        val file = fixture(uri)
        return MatrixCursor(arrayOf(OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE)).apply { addRow(arrayOf(file.name, file.length())) }
    }
    private fun fixture(uri: Uri): File {
        val name = requireNotNull(uri.lastPathSegment)
        require(name in listOf("alpha.txt", "beta.txt"))
        return File(requireNotNull(context).cacheDir, name).apply { writeText("Native content URI fixture: $name\n") }
    }
    override fun openFile(uri: Uri, mode: String): ParcelFileDescriptor = ParcelFileDescriptor.open(fixture(uri), ParcelFileDescriptor.MODE_READ_ONLY)
    override fun insert(uri: Uri, values: ContentValues?): Uri? = error("Read only")
    override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?) = 0
    override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?) = 0
}
