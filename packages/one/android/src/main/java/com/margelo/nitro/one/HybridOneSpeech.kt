package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// dictation behind One.Speech: the system SpeechRecognizer with partial
// results, one utterance per session, ending on the recognizer's own
// end-of-speech detection or on stop. needs RECORD_AUDIO, which one prebuild
// writes from native.app speech. SpeechRecognizer must be driven from the
// main thread, so every call hops there and all session state lives on it.
// the system shares one recognition service connection per app, and
// destroying any recognizer drops it under whichever session runs next, so
// recognizers are destroyed only on dispose. a session that ends on its own
// leaves its recognizer for the next one. cancelling a live session makes the
// service report the cancellation late, through the recognizer's single
// listener binder, so a cancelled recognizer is retired and never reused.
class HybridOneSpeech : HybridOneSpeechSpec(), PermissionListener {
    private class Session(val onEvent: (SpeechEvent) -> Unit) {
        var transcript = ""
    }

    private val main = Handler(Looper.getMainLooper())
    private var recognizer: SpeechRecognizer? = null
    private val retired = mutableListOf<SpeechRecognizer>()
    private var session: Session? = null
    private var pendingPermission: Promise<SpeechPermissionResponse>? = null

    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("Speech: the react context is not ready")

    override fun isAvailable(): Boolean = SpeechRecognizer.isRecognitionAvailable(context)

    override fun getPermissions(): Promise<SpeechPermissionResponse> =
        Promise.resolved(permissionResponse())

    override fun requestPermissions(): Promise<SpeechPermissionResponse> {
        if (!isMicrophoneDeclared()) {
            return Promise.rejected(
                OneNativeError(
                    E_FAILED,
                    "Speech.requestPermissions: dictation needs the RECORD_AUDIO permission: " +
                        "set native.app speech and rerun one prebuild"
                )
            )
        }
        if (isGranted()) return Promise.resolved(permissionResponse())
        val aware = context.currentActivity as? PermissionAwareActivity
            ?: return Promise.rejected(
                OneNativeError(E_FAILED, "Speech.requestPermissions: found no activity to prompt from")
            )
        val promise = Promise<SpeechPermissionResponse>()
        synchronized(this) {
            if (pendingPermission != null) {
                return Promise.rejected(
                    OneNativeError(E_FAILED, "Speech.requestPermissions: another request is already in flight")
                )
            }
            pendingPermission = promise
        }
        context.getSharedPreferences(PREFS, Activity.MODE_PRIVATE)
            .edit()
            .putBoolean(ASKED_KEY, true)
            .apply()
        aware.requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQUEST_PERMISSION, this)
        return promise
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != REQUEST_PERMISSION) return false
        val pending = synchronized(this) {
            val pending = pendingPermission
            pendingPermission = null
            pending
        }
        pending?.resolve(permissionResponse())
        return true
    }

    override fun dispose() {
        main.post {
            session = null
            retire()
            retired.forEach { it.destroy() }
            retired.clear()
        }
        super.dispose()
    }

    override fun start(options: SpeechStartOptions, onEvent: (SpeechEvent) -> Unit) {
        main.post { begin(options, onEvent) }
    }

    override fun stop() {
        // the recognizer answers with its final result, which ends the session
        main.post { if (session != null) recognizer?.stopListening() }
    }

    override fun abort() {
        main.post {
            if (session == null) return@post
            session = null
            retire()
        }
    }

    private fun begin(options: SpeechStartOptions, onEvent: (SpeechEvent) -> Unit) {
        if (session != null) retire()
        val current = Session(onEvent)
        session = current
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            fail(SpeechErrorCode.SERVICE_NOT_ALLOWED, "Speech recognition is unavailable on this device.")
            return
        }
        if (!isGranted()) {
            fail(SpeechErrorCode.NOT_ALLOWED, "Dictation needs microphone permission.")
            return
        }
        val active = recognizer
            ?: SpeechRecognizer.createSpeechRecognizer(context).also { recognizer = it }
        active.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                if (session !== current) return
                current.onEvent(SpeechEvent(SpeechEventType.START, "", null, null))
            }

            override fun onPartialResults(partialResults: Bundle?) {
                if (session !== current) return
                val text = best(partialResults) ?: return
                if (text == current.transcript) return
                current.transcript = text
                current.onEvent(SpeechEvent(SpeechEventType.TRANSCRIPT, text, null, null))
            }

            override fun onResults(results: Bundle?) {
                if (session !== current) return
                val text = best(results)
                if (text != null && text != current.transcript) {
                    current.transcript = text
                    current.onEvent(SpeechEvent(SpeechEventType.TRANSCRIPT, text, null, null))
                }
                finish()
            }

            override fun onError(error: Int) {
                if (session !== current) return
                when (error) {
                    // nothing heard ends the session with what it has
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> finish()
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                        fail(SpeechErrorCode.NOT_ALLOWED, "Dictation needs microphone permission.")
                    SpeechRecognizer.ERROR_NETWORK,
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
                    SpeechRecognizer.ERROR_SERVER,
                    SpeechRecognizer.ERROR_SERVER_DISCONNECTED ->
                        fail(SpeechErrorCode.NETWORK, "The speech service could not be reached.")
                    SpeechRecognizer.ERROR_AUDIO ->
                        fail(SpeechErrorCode.AUDIO_CAPTURE, "Audio recording failed.")
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY, SpeechRecognizer.ERROR_TOO_MANY_REQUESTS ->
                        fail(SpeechErrorCode.BUSY, "The speech service is busy.")
                    SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE ->
                        fail(SpeechErrorCode.LANGUAGE_NOT_SUPPORTED, "Speech recognition does not support this language.")
                    else -> fail(SpeechErrorCode.UNKNOWN, "Speech recognition failed with code $error.")
                }
            }

            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
            options.lang?.let { putExtra(RecognizerIntent.EXTRA_LANGUAGE, it) }
        }
        active.startListening(intent)
    }

    private fun retire() {
        val live = recognizer ?: return
        recognizer = null
        live.cancel()
        retired += live
    }

    private fun best(results: Bundle?): String? =
        results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()

    private fun finish() {
        val current = session ?: return
        session = null
        current.onEvent(SpeechEvent(SpeechEventType.END, current.transcript, null, null))
    }

    private fun fail(code: SpeechErrorCode, message: String) {
        val current = session ?: return
        session = null
        current.onEvent(SpeechEvent(SpeechEventType.ERROR, current.transcript, code, message))
    }

    private fun isGranted(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
            PackageManager.PERMISSION_GRANTED

    // granted, or denied with rationale: both are known states. otherwise
    // the asked flag separates the undetermined first run from a permanent
    // denial, which the platform reports identically.
    private fun permissionResponse(): SpeechPermissionResponse {
        if (isGranted()) {
            return SpeechPermissionResponse(SpeechPermissionStatus.GRANTED, true, true, false)
        }
        val activity = context.currentActivity
        if (
            activity != null &&
            ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.RECORD_AUDIO)
        ) {
            return SpeechPermissionResponse(SpeechPermissionStatus.DENIED, false, true, false)
        }
        val asked = context.getSharedPreferences(PREFS, Activity.MODE_PRIVATE).getBoolean(ASKED_KEY, false)
        return if (asked) {
            SpeechPermissionResponse(SpeechPermissionStatus.DENIED, false, false, false)
        } else {
            SpeechPermissionResponse(SpeechPermissionStatus.UNDETERMINED, false, true, false)
        }
    }

    private fun isMicrophoneDeclared(): Boolean {
        val info = if (Build.VERSION.SDK_INT >= 33) {
            context.packageManager.getPackageInfo(
                context.packageName,
                PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
            )
        } else {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
        }
        return info.requestedPermissions?.contains(Manifest.permission.RECORD_AUDIO) == true
    }

    companion object {
        private const val E_FAILED = "E_SPEECH_FAILED"
        private const val PREFS = "one-native-speech"
        private const val ASKED_KEY = "microphone-asked"
        private const val REQUEST_PERMISSION = 0x1C01
    }
}
