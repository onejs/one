package com.margelo.nitro.one

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.MimeTypeMap
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File

// system share sheet matching the ios contract: items validation with the
// same codes, a busy guard, and { completed, activityType }. completed is
// true only when a target was chosen (the chooser's chosen-component
// sender, or a RESULT_OK), false on dismiss; cancellation resolves, never
// rejects. files leave through the library FileProvider, so only files
// under the app cache can be shared.
class HybridOneShare : HybridOneShareSpec(), ActivityEventListener, LifecycleEventListener {
    private val lock = Any()
    private var pending: Promise<ShareResult>? = null
    private var chosenComponent: String? = null
    private var resultOk = false
    private var settlePosted = false
    private var receiver: BroadcastReceiver? = null
    @Volatile private var active = false
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        NitroModules.applicationContext?.let {
            it.addActivityEventListener(this)
            it.addLifecycleEventListener(this)
        }
    }

    override fun dispose() {
        NitroModules.applicationContext?.let {
            it.removeActivityEventListener(this)
            it.removeLifecycleEventListener(this)
        }
        unregisterChosenReceiver()
        takePending()?.resolve(ShareResult(completed = false, activityType = null))
        super.dispose()
    }

    override fun onHostResume() {
        active = true
        // the chooser is gone when the host resumes, so a promise still
        // pending here lost its result; settle it as dismissed.
        synchronized(lock) {
            if (pending != null && !settlePosted) {
                settlePosted = true
                mainHandler.post { settle() }
            }
        }
    }

    override fun onHostPause() {
        active = false
    }

    override fun onHostDestroy() {
        active = false
    }

    override fun onNewIntent(intent: Intent) {}

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != SHARE_REQUEST_CODE) return
        synchronized(lock) {
            if (pending == null || settlePosted) return
            settlePosted = true
            resultOk = resultCode == Activity.RESULT_OK
            @Suppress("DEPRECATION")
            val extra: ComponentName? = data?.getParcelableExtra(Intent.EXTRA_CHOSEN_COMPONENT)
            if (extra != null) chosenComponent = extra.flattenToString()
        }
        // the chosen-component broadcast races the result; a short grace
        // window lets it land before the promise settles.
        mainHandler.postDelayed({ settle() }, 800)
    }

    private fun settle() {
        val promise = synchronized(lock) {
            val found = pending
            pending = null
            settlePosted = false
            found
        } ?: return
        unregisterChosenReceiver()
        val chosen = synchronized(lock) { chosenComponent }
        promise.resolve(ShareResult(completed = resultOk || chosen != null, activityType = chosen))
    }

    private fun takePending(): Promise<ShareResult>? = synchronized(lock) {
        val found = pending
        pending = null
        chosenComponent = null
        settlePosted = false
        found
    }

    override fun share(items: Array<ShareItem>): Promise<ShareResult> {
        val promise = Promise<ShareResult>()
        val context = NitroModules.applicationContext
            ?: return Promise.rejected(
                OneNativeError("E_SHARE_PRESENTATION", "Share.share: there is no foreground activity to share from")
            )
        val prepared: PreparedShare
        try {
            prepared = validate(context, items.toList())
        } catch (error: OneNativeError) {
            return Promise.rejected(error)
        }
        synchronized(lock) {
            if (pending != null) {
                return Promise.rejected(
                    OneNativeError("E_SHARE_BUSY", "Share.share: a share sheet is already open")
                )
            }
            pending = promise
            chosenComponent = null
            resultOk = false
            settlePosted = false
        }
        mainHandler.post {
            val activity = currentActivity()
            if (activity == null) {
                takePending()?.reject(
                    OneNativeError("E_SHARE_PRESENTATION", "Share.share: there is no foreground activity to share from")
                )
                return@post
            }
            try {
                registerChosenReceiver(context)
                val send = sendIntent(context, prepared)
                val sender = PendingIntent.getBroadcast(
                    context, 0,
                    Intent(CHOSEN_ACTION).setPackage(context.packageName),
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
                ).intentSender
                activity.startActivityForResult(Intent.createChooser(send, null, sender), SHARE_REQUEST_CODE)
            } catch (error: Exception) {
                unregisterChosenReceiver()
                takePending()?.reject(OneNativeError("E_SHARE_FAILED", "Share.share: ${error.message}"))
            }
        }
        return promise
    }

    private fun currentActivity(): Activity? {
        if (!active) return null
        val activity = NitroModules.applicationContext?.currentActivity ?: return null
        if (activity.isFinishing || activity.isDestroyed) return null
        return activity
    }

    private data class PreparedShare(val texts: List<String>, val files: List<Uri>)

    private fun validate(context: Context, items: List<ShareItem>): PreparedShare {
        if (items.isEmpty()) {
            throw OneNativeError("E_SHARE_ITEMS", "Share.share: at least one item is required")
        }
        val texts = mutableListOf<String>()
        val files = mutableListOf<Uri>()
        for (item in items) {
            when (item.type) {
                ShareItemType.TEXT -> {
                    if (item.value.isBlank()) {
                        throw OneNativeError("E_SHARE_ITEMS", "Share.share: text cannot be empty")
                    }
                    texts.add(item.value)
                }
                ShareItemType.URL -> {
                    val uri = Uri.parse(item.value)
                    if (uri.scheme.isNullOrEmpty() || uri.scheme == "file") {
                        throw OneNativeError(
                            "E_SHARE_URL",
                            "Share.share: the item needs an absolute URL of its declared type"
                        )
                    }
                    texts.add(item.value)
                }
                ShareItemType.FILE -> {
                    val uri = Uri.parse(item.value)
                    val host = uri.host
                    if (uri.scheme != "file" || (host != null && host != "" && host != "localhost") ||
                        uri.encodedQuery != null || uri.fragment != null || uri.path.isNullOrEmpty()
                    ) {
                        throw OneNativeError(
                            "E_SHARE_URL",
                            "Share.share: the item needs an absolute URL of its declared type"
                        )
                    }
                    val file = File(uri.path!!)
                    if (!file.exists() || file.isDirectory) {
                        throw OneNativeError(
                            "E_SHARE_FILE",
                            "Share.share: the file does not exist or is a directory"
                        )
                    }
                    try {
                        files.add(
                            FileProvider.getUriForFile(
                                context, "${context.packageName}.one-native.fileprovider", file
                            )
                        )
                    } catch (_: IllegalArgumentException) {
                        throw OneNativeError(
                            "E_SHARE_FILE",
                            "Share.share: the file cannot be shared from outside the app cache"
                        )
                    }
                }
            }
        }
        return PreparedShare(texts, files)
    }

    private fun sendIntent(context: Context, prepared: PreparedShare): Intent {
        val intent: Intent
        if (prepared.files.isEmpty()) {
            intent = Intent(Intent.ACTION_SEND).setType("text/plain")
            intent.putExtra(Intent.EXTRA_TEXT, prepared.texts.joinToString("\n"))
        } else if (prepared.files.size == 1 && prepared.texts.isEmpty()) {
            intent = Intent(Intent.ACTION_SEND).setType(mimeFor(prepared.files[0]))
            intent.putExtra(Intent.EXTRA_STREAM, prepared.files[0])
        } else {
            intent = Intent(Intent.ACTION_SEND_MULTIPLE).setType("*/*")
            intent.putParcelableArrayListExtra(
                Intent.EXTRA_STREAM, ArrayList(prepared.files)
            )
            if (prepared.texts.isNotEmpty()) {
                intent.putExtra(Intent.EXTRA_TEXT, prepared.texts.joinToString("\n"))
            }
        }
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        return intent
    }

    private fun mimeFor(uri: Uri): String {
        val extension = MimeTypeMap.getFileExtensionFromUrl(uri.toString())?.lowercase()
        if (!extension.isNullOrEmpty()) {
            MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension)?.let { return it }
        }
        return "*/*"
    }

    private fun registerChosenReceiver(context: Context) {
        unregisterChosenReceiver()
        val created = object : BroadcastReceiver() {
            override fun onReceive(receiverContext: Context, intent: Intent) {
                if (intent.action != CHOSEN_ACTION) return
                @Suppress("DEPRECATION")
                val component: ComponentName? = intent.getParcelableExtra(Intent.EXTRA_CHOSEN_COMPONENT)
                if (component != null) {
                    synchronized(lock) { chosenComponent = component.flattenToString() }
                }
            }
        }
        receiver = created
        ContextCompat.registerReceiver(
            context, created, IntentFilter(CHOSEN_ACTION), ContextCompat.RECEIVER_NOT_EXPORTED
        )
    }

    private fun unregisterChosenReceiver() {
        val context = NitroModules.applicationContext
        val found = synchronized(lock) {
            val current = receiver
            receiver = null
            current
        }
        if (context != null && found != null) {
            try {
                context.unregisterReceiver(found)
            } catch (_: IllegalArgumentException) {
                // already unregistered.
            }
        }
    }

    companion object {
        private const val SHARE_REQUEST_CODE = 4291
        private const val CHOSEN_ACTION = "dev.onejs.one.SHARE_CHOSEN"
    }
}
