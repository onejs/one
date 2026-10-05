package com.margelo.nitro.one

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.media.session.MediaSession
import android.media.session.PlaybackState
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.util.UUID

// audio playback and recording over MediaPlayer, MediaRecorder,
// AudioManager and MediaSession. everything runs on the main thread
// like the Swift hybrid; focus loss pauses playback and (api 24+) recording and
// emits began, focus gain emits ended. background playback starts the
// prebuild-stamped foreground service only under
// native.app.audio.background; recording never starts a service.
class HybridOneAudio : HybridOneAudioSpec(), PermissionListener {
    private val lock = Any()
    private val main = Handler(Looper.getMainLooper())
    private var pendingPermission: Promise<AudioRecordingPermission>? = null

    private var player: MediaPlayer? = null
    private var playerUri: String? = null
    private var playerPrepared = false
    private var playbackPaused = false
    private var playbackEnded = false
    private var playbackError: String? = null
    private class PendingSeek(
        val player: MediaPlayer,
        val positionMs: Int,
        var promise: Promise<AudioPlaybackStatus>?
    )
    private var activeSeek: PendingSeek? = null
    private var queuedSeek: PendingSeek? = null

    private var recorder: MediaRecorder? = null
    private var recordFile: File? = null
    private var recordBeginElapsed = 0L
    private var recordPausedTotal = 0L
    private var recordPauseBegin = 0L
    private var recordPaused = false

    private var transientLoss = false
    private var focusRequest: AudioFocusRequest? = null
    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        handleFocusChange(change)
    }

    private var mediaSession: MediaSession? = null
    private var nowPlayingInfo: AudioNowPlayingInfo? = null
    private var nowPlayingArtworkPath: String? = null
    private val interruptionListeners = mutableMapOf<String, (AudioInterruptionEvent) -> Unit>()
    private val remoteCommandListeners = mutableMapOf<String, (AudioRemoteCommandEvent) -> Unit>()

    private val context: ReactApplicationContext
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("Audio: the react context is not ready")

    private fun audioManager(): AudioManager =
        context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    override fun dispose() {
        val permission: Promise<AudioRecordingPermission>?
        synchronized(lock) {
            permission = pendingPermission
            pendingPermission = null
            interruptionListeners.clear()
            remoteCommandListeners.clear()
        }
        permission?.reject(OneNativeError(E_PERMISSION, "Audio.requestRecordingPermission: torn down mid-request"))
        main.post {
            clearPlayer()
            teardownRecorder(deleteFile = true)
            abandonFocus()
        }
        super.dispose()
    }

    override fun getRecordingPermissionStatus(): Promise<AudioRecordingPermission> {
        val promise = Promise<AudioRecordingPermission>()
        main.post { promise.resolve(permissionStatus()) }
        return promise
    }

    override fun requestRecordingPermission(): Promise<AudioRecordingPermission> {
        val promise = Promise<AudioRecordingPermission>()
        main.post {
            if (!isMicrophoneDeclared()) {
                promise.reject(
                    OneNativeError(E_MANIFEST, "Audio.requestRecordingPermission: set native.app.audio.microphone")
                )
                return@post
            }
            if (permissionStatus() == AudioRecordingPermission.GRANTED) {
                promise.resolve(AudioRecordingPermission.GRANTED)
                return@post
            }
            val activity = context.currentActivity
            val aware = activity as? PermissionAwareActivity
            if (activity == null || aware == null) {
                promise.reject(
                    OneNativeError(E_PERMISSION, "Audio.requestRecordingPermission: found no activity to prompt from")
                )
                return@post
            }
            synchronized(lock) {
                if (pendingPermission != null) {
                    promise.reject(
                        OneNativeError(E_PERMISSION, "Audio.requestRecordingPermission: another request is already in flight")
                    )
                    return@post
                }
                pendingPermission = promise
            }
            markAsked()
            aware.requestPermissions(
                arrayOf(Manifest.permission.RECORD_AUDIO),
                REQUEST_PERMISSION,
                this
            )
        }
        return promise
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ): Boolean {
        if (requestCode != REQUEST_PERMISSION) return false
        val pending = synchronized(lock) {
            val pending = pendingPermission
            pendingPermission = null
            pending
        }
        main.post { pending?.resolve(permissionStatus()) }
        return true
    }

    override fun play(uri: String): Promise<AudioPlaybackStatus> {
        val promise = Promise<AudioPlaybackStatus>()
        main.post {
            if (recorder != null) {
                promise.reject(OneNativeError(E_BUSY, "Audio.play: stop the current audio operation first"))
                return@post
            }
            val parsed = try {
                Uri.parse(uri)
            } catch (e: Exception) {
                null
            }
            if (parsed == null || (parsed.scheme != "file" && parsed.scheme != "https") ||
                parsed.path.isNullOrEmpty() ||
                (parsed.scheme == "file" && (!parsed.query.isNullOrEmpty() || !parsed.fragment.isNullOrEmpty()))
            ) {
                promise.reject(OneNativeError(E_URI, "Audio.play: the audio URI must use file:// or https://"))
                return@post
            }
            if (parsed.scheme == "file" && !File(parsed.path!!).exists()) {
                promise.reject(OneNativeError(E_FILE, "Audio.play: the audio file does not exist"))
                return@post
            }
            try {
                requestFocus()
                clearPlayer()
                val fresh = MediaPlayer()
                fresh.setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                if (parsed.scheme == "file") {
                    fresh.setDataSource(parsed.path!!)
                } else {
                    fresh.setDataSource(context, parsed)
                }
                player = fresh
                playerUri = parsed.toString()
                playerPrepared = false
                playbackPaused = false
                playbackEnded = false
                playbackError = null
                fresh.setOnPreparedListener { mp ->
                    if (player !== mp) return@setOnPreparedListener
                    playerPrepared = true
                    mp.start()
                    startServiceIfBackground()
                    syncNowPlaying()
                }
                fresh.setOnCompletionListener { mp ->
                    if (player !== mp) return@setOnCompletionListener
                    playbackEnded = true
                    stopService()
                    syncNowPlaying()
                }
                fresh.setOnErrorListener { mp, what, extra ->
                    if (player !== mp) return@setOnErrorListener true
                    playbackError = "playback failed ($what/$extra)"
                    cancelSeeks()
                    stopService()
                    syncNowPlaying()
                    true
                }
                fresh.prepareAsync()
                promise.resolve(playbackStatus())
            } catch (e: Exception) {
                clearPlayer()
                abandonFocus()
                promise.reject(OneNativeError(E_FAILED, "Audio.play: ${e.message ?: "playback could not start"}"))
            }
        }
        return promise
    }

    override fun getPlaybackStatus(): Promise<AudioPlaybackStatus> {
        val promise = Promise<AudioPlaybackStatus>()
        main.post { promise.resolve(playbackStatus()) }
        return promise
    }

    override fun pause(): Promise<AudioPlaybackStatus> {
        val promise = Promise<AudioPlaybackStatus>()
        main.post {
            val current = player
            if (current == null) {
                promise.reject(OneNativeError(E_STATE, "Audio.pause: the audio operation is not ready"))
                return@post
            }
            try {
                if (current.isPlaying) current.pause()
            } catch (e: Exception) {
            }
            playbackPaused = true
            stopService()
            syncNowPlaying()
            promise.resolve(playbackStatus())
        }
        return promise
    }

    override fun resume(): Promise<AudioPlaybackStatus> {
        val promise = Promise<AudioPlaybackStatus>()
        main.post {
            val current = player
            if (current == null) {
                promise.reject(OneNativeError(E_STATE, "Audio.resume: the audio operation is not ready"))
                return@post
            }
            try {
                if (playbackEnded) {
                    if (!enqueueSeek(current, 0, null)) {
                        throw IllegalStateException("seek failed")
                    }
                    playbackEnded = false
                }
                playbackPaused = false
                if (playerPrepared) current.start()
                startServiceIfBackground()
                syncNowPlaying()
                promise.resolve(playbackStatus())
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_STATE, "Audio.resume: the audio operation is not ready"))
            }
        }
        return promise
    }

    override fun seek(positionMs: Double): Promise<AudioPlaybackStatus> {
        val promise = Promise<AudioPlaybackStatus>()
        main.post {
            if (!positionMs.isFinite() || positionMs < 0) {
                promise.reject(OneNativeError(E_POSITION, "Audio.seek: the seek position must be finite and nonnegative"))
                return@post
            }
            val current = player
            if (current == null || !playerPrepared) {
                promise.reject(OneNativeError(E_STATE, "Audio.seek: the audio operation is not ready"))
                return@post
            }
            enqueueSeek(current, positionMs.toLong().coerceAtMost(Int.MAX_VALUE.toLong()).toInt(), promise)
        }
        return promise
    }

    override fun stop(): Promise<Unit> {
        val promise = Promise<Unit>()
        main.post {
            clearPlayer()
            abandonFocus()
            promise.resolve(Unit)
        }
        return promise
    }

    private fun rejectSeek(seek: PendingSeek?) {
        val promise = seek?.promise
        seek?.promise = null
        promise?.reject(OneNativeError(E_STATE, "Audio.seek: the audio operation is not ready"))
    }

    private fun clearSeekListener(current: MediaPlayer) {
        try {
            current.setOnSeekCompleteListener(null)
        } catch (e: Exception) {
        }
    }

    private fun cancelSeeks() {
        val active = activeSeek
        val queued = queuedSeek
        activeSeek = null
        queuedSeek = null
        active?.let { clearSeekListener(it.player) }
        rejectSeek(active)
        rejectSeek(queued)
    }

    private fun enqueueSeek(
        current: MediaPlayer,
        positionMs: Int,
        promise: Promise<AudioPlaybackStatus>?
    ): Boolean {
        // one physical seek owns the listener until its callback retires.
        // superseded public promises settle now, before queuing the latest target.
        rejectSeek(activeSeek)
        rejectSeek(queuedSeek)
        val seek = PendingSeek(current, positionMs, promise)
        if (activeSeek != null) {
            queuedSeek = seek
            return true
        }
        return startSeek(seek)
    }

    private fun startSeek(seek: PendingSeek): Boolean {
        activeSeek = seek
        try {
            seek.player.setOnSeekCompleteListener { mp ->
                if (activeSeek !== seek) return@setOnSeekCompleteListener
                if (player !== mp || playbackError != null) {
                    cancelSeeks()
                    return@setOnSeekCompleteListener
                }
                activeSeek = null
                clearSeekListener(mp)
                val next = queuedSeek
                queuedSeek = null
                if (next != null) {
                    startSeek(next)
                    return@setOnSeekCompleteListener
                }
                val promise = seek.promise
                seek.promise = null
                val status = try {
                    playbackEnded = false
                    syncNowPlaying()
                    if (promise != null) playbackStatus() else null
                } catch (e: Exception) {
                    promise?.reject(OneNativeError(E_STATE, "Audio.seek: the audio operation is not ready"))
                    return@setOnSeekCompleteListener
                }
                if (status != null) promise?.resolve(status)
            }
            seek.player.seekTo(seek.positionMs)
            return true
        } catch (e: Exception) {
            cancelSeeks()
            return false
        }
    }

    override fun startRecording(): Promise<AudioRecordingStatus> {
        val promise = Promise<AudioRecordingStatus>()
        main.post {
            if (!isMicrophoneDeclared()) {
                promise.reject(OneNativeError(E_MANIFEST, "Audio.startRecording: set native.app.audio.microphone"))
                return@post
            }
            if (permissionStatus() != AudioRecordingPermission.GRANTED) {
                promise.reject(OneNativeError(E_PERMISSION, "Audio.startRecording: microphone permission is required"))
                return@post
            }
            if (playbackEnded || playbackError != null) {
                clearPlayer()
                abandonFocus()
            }
            if (player != null || recorder != null) {
                promise.reject(OneNativeError(E_BUSY, "Audio.startRecording: stop the current audio operation first"))
                return@post
            }
            try {
                val directory = File(context.cacheDir, "one-native-audio").apply { mkdirs() }
                val file = File(directory, "${UUID.randomUUID()}.m4a")
                requestTransientFocus()
                val fresh = if (Build.VERSION.SDK_INT >= 31) {
                    MediaRecorder(context)
                } else {
                    @Suppress("DEPRECATION")
                    MediaRecorder()
                }
                fresh.setAudioSource(MediaRecorder.AudioSource.MIC)
                fresh.setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                fresh.setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                fresh.setAudioSamplingRate(44_100)
                fresh.setAudioChannels(1)
                fresh.setOutputFile(file.absolutePath)
                try {
                    fresh.prepare()
                    fresh.start()
                } catch (e: Exception) {
                    try {
                        fresh.release()
                    } catch (ignored: Exception) {
                    }
                    abandonFocus()
                    file.delete()
                    throw e
                }
                recorder = fresh
                recordFile = file
                recordBeginElapsed = SystemClock.elapsedRealtime()
                recordPausedTotal = 0
                recordPauseBegin = 0
                recordPaused = false
                promise.resolve(recordingStatus())
            } catch (e: Exception) {
                abandonFocus()
                promise.reject(
                    OneNativeError(E_FAILED, "Audio.startRecording: recording could not start or produced an empty file")
                )
            }
        }
        return promise
    }

    override fun getRecordingStatus(): Promise<AudioRecordingStatus> {
        val promise = Promise<AudioRecordingStatus>()
        main.post { promise.resolve(recordingStatus()) }
        return promise
    }

    override fun pauseRecording(): Promise<AudioRecordingStatus> {
        val promise = Promise<AudioRecordingStatus>()
        main.post {
            val current = recorder
            if (current == null) {
                promise.reject(OneNativeError(E_STATE, "Audio.pauseRecording: the audio operation is not ready"))
                return@post
            }
            if (Build.VERSION.SDK_INT < 24) {
                promise.reject(OneNativeError(E_STATE, "Audio.pauseRecording: recording pause requires Android API 24 or later"))
                return@post
            }
            try {
                if (!recordPaused) {
                    current.pause()
                    recordPauseBegin = SystemClock.elapsedRealtime()
                    recordPaused = true
                }
                promise.resolve(recordingStatus())
            } catch (e: Exception) {
                promise.reject(OneNativeError(E_STATE, "Audio.pauseRecording: the audio operation is not ready"))
            }
        }
        return promise
    }

    override fun resumeRecording(): Promise<AudioRecordingStatus> {
        val promise = Promise<AudioRecordingStatus>()
        main.post {
            val current = recorder
            if (current == null) {
                promise.reject(OneNativeError(E_STATE, "Audio.resumeRecording: the audio operation is not ready"))
                return@post
            }
            if (Build.VERSION.SDK_INT < 24) {
                promise.reject(OneNativeError(E_FAILED, "Audio.resumeRecording: recording resume requires Android API 24 or later"))
                return@post
            }
            try {
                if (recordPaused) {
                    current.resume()
                    recordPausedTotal += SystemClock.elapsedRealtime() - recordPauseBegin
                    recordPauseBegin = 0
                    recordPaused = false
                    promise.resolve(recordingStatus())
                } else {
                    promise.reject(
                        OneNativeError(E_FAILED, "Audio.resumeRecording: recording could not start or produced an empty file")
                    )
                }
            } catch (e: OneNativeError) {
                promise.reject(e)
            } catch (e: Exception) {
                promise.reject(
                    OneNativeError(E_FAILED, "Audio.resumeRecording: recording could not start or produced an empty file")
                )
            }
        }
        return promise
    }

    override fun stopRecording(): Promise<AudioRecordingResult> {
        val promise = Promise<AudioRecordingResult>()
        main.post {
            val current = recorder
            val file = recordFile
            if (current == null || file == null) {
                promise.reject(OneNativeError(E_STATE, "Audio.stopRecording: the audio operation is not ready"))
                return@post
            }
            val durationMs = recordingDurationMs()
            val uri = Uri.fromFile(file).toString()
            try {
                current.stop()
            } catch (e: Exception) {
            }
            try {
                current.release()
            } catch (e: Exception) {
            }
            recorder = null
            recordFile = null
            abandonFocus()
            val size = if (file.exists()) file.length().toDouble() else 0.0
            if (size <= 0) {
                file.delete()
                promise.reject(
                    OneNativeError(E_FAILED, "Audio.stopRecording: recording could not start or produced an empty file")
                )
                return@post
            }
            promise.resolve(AudioRecordingResult(uri, durationMs, size))
        }
        return promise
    }

    override fun addInterruptionListener(onEvent: (event: AudioInterruptionEvent) -> Unit): () -> Unit {
        val id = UUID.randomUUID().toString()
        main.post {
            synchronized(lock) { interruptionListeners[id] = onEvent }
        }
        return {
            main.post {
                synchronized(lock) { interruptionListeners.remove(id) }
            }
        }
    }

    override fun setNowPlayingInfo(info: AudioNowPlayingInfo): Promise<Unit> {
        val promise = Promise<Unit>()
        main.post {
            val current = player
            if (current == null) {
                promise.reject(OneNativeError(E_STATE, "Audio.setNowPlayingInfo: the audio operation is not ready"))
                return@post
            }
            if (info.title.trim().isEmpty()) {
                promise.reject(OneNativeError(E_METADATA, "Audio.setNowPlayingInfo: now playing title must not be empty"))
                return@post
            }
            var artworkPath: String? = null
            info.artworkUri?.let { artworkUri ->
                val parsed = try {
                    Uri.parse(artworkUri)
                } catch (e: Exception) {
                    null
                }
                val file = if (parsed?.scheme == "file") parsed.path?.let { File(it) } else null
                if (file == null || !file.exists() || file.isDirectory ||
                    BitmapFactory.decodeFile(file.absolutePath) == null
                ) {
                    promise.reject(
                        OneNativeError(E_ARTWORK, "Audio.setNowPlayingInfo: now playing artwork must be an existing image file")
                    )
                    return@post
                }
                artworkPath = file.absolutePath
            }
            if (mediaSession == null) {
                val session = MediaSession(context, "OneAudio")
                session.setCallback(
                    object : MediaSession.Callback() {
                        override fun onPlay() {
                            handleRemoteCommand(AudioRemoteCommandType.PLAY, null)
                        }

                        override fun onPause() {
                            handleRemoteCommand(AudioRemoteCommandType.PAUSE, null)
                        }

                        override fun onSeekTo(pos: Long) {
                            handleRemoteCommand(AudioRemoteCommandType.SEEK, pos.toDouble())
                        }
                    }
                )
                mediaSession = session
            }
            nowPlayingInfo = info
            nowPlayingArtworkPath = artworkPath
            mediaSession?.isActive = true
            syncNowPlaying()
            promise.resolve(Unit)
        }
        return promise
    }

    override fun clearNowPlayingInfo(): Promise<Unit> {
        val promise = Promise<Unit>()
        main.post {
            clearNowPlaying()
            promise.resolve(Unit)
        }
        return promise
    }

    override fun addRemoteCommandListener(onEvent: (event: AudioRemoteCommandEvent) -> Unit): () -> Unit {
        val id = UUID.randomUUID().toString()
        main.post {
            synchronized(lock) { remoteCommandListeners[id] = onEvent }
        }
        return {
            main.post {
                synchronized(lock) { remoteCommandListeners.remove(id) }
            }
        }
    }

    private fun handleFocusChange(change: Int) {
        main.post {
            when (change) {
                AudioManager.AUDIOFOCUS_LOSS,
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                    transientLoss = change != AudioManager.AUDIOFOCUS_LOSS
                    try {
                        if (player?.isPlaying == true) player?.pause()
                    } catch (e: Exception) {
                    }
                    if (player != null) playbackPaused = true
                    if (Build.VERSION.SDK_INT >= 24 && recorder != null && !recordPaused) {
                        try {
                            recorder?.pause()
                            recordPauseBegin = SystemClock.elapsedRealtime()
                            recordPaused = true
                        } catch (e: Exception) {
                        }
                    }
                    stopService()
                    syncNowPlaying()
                    emitInterruption(AudioInterruptionEvent(AudioInterruptionType.BEGAN, false))
                }
                AudioManager.AUDIOFOCUS_GAIN -> {
                    val resume = transientLoss
                    transientLoss = false
                    syncNowPlaying()
                    emitInterruption(AudioInterruptionEvent(AudioInterruptionType.ENDED, resume))
                }
            }
        }
    }

    private fun emitInterruption(event: AudioInterruptionEvent) {
        val listeners = synchronized(lock) { interruptionListeners.values.toList() }
        for (listener in listeners) {
            try {
                listener(event)
            } catch (e: Exception) {
            }
        }
    }

    private fun handleRemoteCommand(type: AudioRemoteCommandType, positionMs: Double?) {
        main.post {
            val current = player
            if (current == null || mediaSession == null) return@post
            when (type) {
                AudioRemoteCommandType.PLAY -> {
                    try {
                        if (playbackEnded) {
                            if (!enqueueSeek(current, 0, null)) return@post
                            playbackEnded = false
                        }
                        playbackPaused = false
                        if (playerPrepared) current.start()
                        startServiceIfBackground()
                    } catch (e: Exception) {
                        return@post
                    }
                }
                AudioRemoteCommandType.PAUSE -> {
                    try {
                        if (current.isPlaying) current.pause()
                    } catch (e: Exception) {
                    }
                    playbackPaused = true
                    stopService()
                }
                AudioRemoteCommandType.SEEK -> {
                    if (positionMs == null || !positionMs.isFinite() || positionMs < 0) return@post
                    if (!enqueueSeek(current, positionMs.toLong().coerceAtMost(Int.MAX_VALUE.toLong()).toInt(), null))
                        return@post
                    playbackEnded = false
                }
            }
            syncNowPlaying()
            val event = AudioRemoteCommandEvent(type, positionMs)
            val listeners = synchronized(lock) { remoteCommandListeners.values.toList() }
            for (listener in listeners) {
                try {
                    listener(event)
                } catch (e: Exception) {
                }
            }
        }
    }

    private fun playbackStatus(): AudioPlaybackStatus {
        val current = player
        if (current == null) {
            return AudioPlaybackStatus(AudioPlaybackState.IDLE, null, 0.0, null, null)
        }
        val state = when {
            playbackError != null -> AudioPlaybackState.FAILED
            playbackEnded -> AudioPlaybackState.ENDED
            playbackPaused -> AudioPlaybackState.PAUSED
            !playerPrepared -> AudioPlaybackState.LOADING
            else -> try {
                if (current.isPlaying) AudioPlaybackState.PLAYING else AudioPlaybackState.PAUSED
            } catch (e: Exception) {
                AudioPlaybackState.PAUSED
            }
        }
        val position = try {
            current.currentPosition.toDouble()
        } catch (e: Exception) {
            0.0
        }
        val duration = try {
            current.duration
        } catch (e: Exception) {
            -1
        }
        return AudioPlaybackStatus(
            state,
            playerUri,
            if (position.isFinite()) maxOf(0.0, position) else 0.0,
            if (duration >= 0) duration.toDouble() else null,
            playbackError
        )
    }

    private fun recordingStatus(): AudioRecordingStatus {
        val current = recorder
        val file = recordFile
        if (current == null || file == null) {
            return AudioRecordingStatus(AudioRecordingState.IDLE, null, 0.0)
        }
        return AudioRecordingStatus(
            if (recordPaused) AudioRecordingState.PAUSED else AudioRecordingState.RECORDING,
            Uri.fromFile(file).toString(),
            recordingDurationMs()
        )
    }

    private fun recordingDurationMs(): Double {
        if (recorder == null) return 0.0
        val now = SystemClock.elapsedRealtime()
        var paused = recordPausedTotal
        if (recordPaused) paused += now - recordPauseBegin
        return maxOf(0L, now - recordBeginElapsed - paused).toDouble()
    }

    private fun syncNowPlaying() {
        val session = mediaSession
        val info = nowPlayingInfo
        val current = player
        if (session == null || info == null || current == null) return
        val metadata = MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, info.title)
        info.artist?.let { metadata.putString(MediaMetadata.METADATA_KEY_ARTIST, it) }
        info.albumTitle?.let { metadata.putString(MediaMetadata.METADATA_KEY_ALBUM, it) }
        nowPlayingArtworkPath?.let { path ->
            try {
                BitmapFactory.decodeFile(path)?.let { bitmap ->
                    metadata.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, bitmap)
                }
            } catch (e: Exception) {
            }
        }
        val duration = try {
            current.duration.toLong()
        } catch (e: Exception) {
            -1L
        }
        if (duration >= 0) metadata.putLong(MediaMetadata.METADATA_KEY_DURATION, duration)
        session.setMetadata(metadata.build())
        val position = try {
            current.currentPosition.toLong()
        } catch (e: Exception) {
            0L
        }
        val playing = !playbackEnded && !playbackPaused && try {
            current.isPlaying
        } catch (e: Exception) {
            false
        }
        session.setPlaybackState(
            PlaybackState.Builder()
                .setActions(
                    PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or
                        PlaybackState.ACTION_SEEK_TO or PlaybackState.ACTION_PLAY_PAUSE
                )
                .setState(
                    if (playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
                    position,
                    if (playing) 1.0f else 0.0f
                )
                .build()
        )
    }

    private fun clearNowPlaying() {
        mediaSession?.isActive = false
        try {
            mediaSession?.release()
        } catch (e: Exception) {
        }
        mediaSession = null
        nowPlayingInfo = null
        nowPlayingArtworkPath = null
    }

    private fun clearPlayer() {
        cancelSeeks()
        clearNowPlaying()
        try {
            player?.stop()
        } catch (e: Exception) {
        }
        try {
            player?.release()
        } catch (e: Exception) {
        }
        player = null
        playerUri = null
        playerPrepared = false
        playbackPaused = false
        playbackEnded = false
        playbackError = null
        stopService()
    }

    private fun teardownRecorder(deleteFile: Boolean) {
        val current = recorder
        val file = recordFile
        if (current != null) {
            try {
                current.stop()
            } catch (e: Exception) {
            }
            try {
                current.release()
            } catch (e: Exception) {
            }
        }
        recorder = null
        recordFile = null
        recordPaused = false
        if (deleteFile) file?.delete()
    }

    private fun requestFocus() {
        val manager = audioManager()
        if (Build.VERSION.SDK_INT >= 26) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                .setOnAudioFocusChangeListener(focusListener, main)
                .build()
            focusRequest = request
            manager.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            manager.requestAudioFocus(
                focusListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            )
        }
    }

    private fun requestTransientFocus() {
        val manager = audioManager()
        if (Build.VERSION.SDK_INT >= 26) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build()
                )
                .setOnAudioFocusChangeListener(focusListener, main)
                .build()
            focusRequest = request
            manager.requestAudioFocus(request)
        } else {
            @Suppress("DEPRECATION")
            manager.requestAudioFocus(
                focusListener,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN_TRANSIENT
            )
        }
    }

    private fun abandonFocus() {
        transientLoss = false
        val manager = audioManager()
        val request = focusRequest
        focusRequest = null
        if (Build.VERSION.SDK_INT >= 26 && request != null) {
            manager.abandonAudioFocusRequest(request)
        } else {
            @Suppress("DEPRECATION")
            manager.abandonAudioFocus(focusListener)
        }
    }

    private fun backgroundEnabled(): Boolean {
        return try {
            val info = if (Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getApplicationInfo(
                    context.packageName,
                    PackageManager.ApplicationInfoFlags.of(PackageManager.GET_META_DATA.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getApplicationInfo(context.packageName, PackageManager.GET_META_DATA)
            }
            info.metaData?.getBoolean("one.audio.background", false) == true
        } catch (e: Exception) {
            false
        }
    }

    private fun startServiceIfBackground() {
        if (!backgroundEnabled()) return
        OneAudioService.start(context, nowPlayingInfo?.title ?: "Audio playing")
    }

    private fun stopService() {
        if (!backgroundEnabled()) return
        OneAudioService.stop(context)
    }

    private fun permissionStatus(): AudioRecordingPermission {
        if (
            ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) ==
                PackageManager.PERMISSION_GRANTED
        ) {
            return AudioRecordingPermission.GRANTED
        }
        val activity = context.currentActivity
        if (activity != null &&
            ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.RECORD_AUDIO)
        ) {
            return AudioRecordingPermission.DENIED
        }
        return if (wasAsked()) AudioRecordingPermission.DENIED else AudioRecordingPermission.UNDETERMINED
    }

    private fun isMicrophoneDeclared(): Boolean {
        val info = try {
            if (Build.VERSION.SDK_INT >= 33) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(PackageManager.GET_PERMISSIONS.toLong())
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, PackageManager.GET_PERMISSIONS)
            }
        } catch (e: Exception) {
            return false
        }
        return info.requestedPermissions?.contains(Manifest.permission.RECORD_AUDIO) == true
    }

    private fun askedKey(): String = "one-native-audio.asked"

    private fun wasAsked(): Boolean =
        context.getSharedPreferences("one-native-audio", Activity.MODE_PRIVATE)
            .getBoolean(askedKey(), false)

    private fun markAsked() {
        context.getSharedPreferences("one-native-audio", Activity.MODE_PRIVATE)
            .edit().putBoolean(askedKey(), true).apply()
    }

    companion object {
        private const val E_MANIFEST = "E_AUDIO_MANIFEST"
        private const val E_PERMISSION = "E_AUDIO_PERMISSION"
        private const val E_URI = "E_AUDIO_URI"
        private const val E_FILE = "E_AUDIO_FILE"
        private const val E_BUSY = "E_AUDIO_BUSY"
        private const val E_STATE = "E_AUDIO_STATE"
        private const val E_POSITION = "E_AUDIO_POSITION"
        private const val E_METADATA = "E_AUDIO_METADATA"
        private const val E_ARTWORK = "E_AUDIO_ARTWORK"
        private const val E_FAILED = "E_AUDIO_FAILED"
        private const val REQUEST_PERMISSION = 0x2F01
    }
}
