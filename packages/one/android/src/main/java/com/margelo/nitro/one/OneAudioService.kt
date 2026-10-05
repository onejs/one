package com.margelo.nitro.one

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

// foreground holder for background audio playback. prebuild stamps this
// service with the mediaPlayback type plus the foreground-service
// permissions only when native.app.audio.background is true; without
// that config playback pauses when backgrounded and this never starts.
class OneAudioService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        val title = intent?.getStringExtra(EXTRA_TITLE) ?: "Audio playing"
        startForegroundNow(title)
        return START_STICKY
    }

    private fun startForegroundNow(title: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Audio playback", NotificationManager.IMPORTANCE_LOW)
            )
        }
        val notification = if (Build.VERSION.SDK_INT >= 26) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
            .setContentTitle(title)
            .setContentText(applicationInfo.loadLabel(packageManager))
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            @Suppress("DEPRECATION")
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    companion object {
        private const val CHANNEL_ID = "one-native-audio"
        private const val NOTIFICATION_ID = 0x0A01
        private const val ACTION_STOP = "one.audio.STOP"
        private const val EXTRA_TITLE = "one.audio.TITLE"

        fun start(context: Context, title: String) {
            val intent = Intent(context, OneAudioService::class.java).apply {
                putExtra(EXTRA_TITLE, title)
            }
            try {
                if (Build.VERSION.SDK_INT >= 26) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            } catch (e: Exception) {
                // background starts are refused on newer releases; playback
                // continues without the service.
            }
        }

        fun stop(context: Context) {
            try {
                context.startService(
                    Intent(context, OneAudioService::class.java).apply { action = ACTION_STOP }
                )
            } catch (e: Exception) {
            }
        }
    }
}
