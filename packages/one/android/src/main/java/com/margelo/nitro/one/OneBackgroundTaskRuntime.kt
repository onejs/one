package com.margelo.nitro.one

import android.content.Context
import android.os.Handler
import android.os.Looper
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import java.util.concurrent.CountDownLatch
import java.util.concurrent.CancellationException
import java.util.concurrent.TimeUnit

// workmanager keeps the process awake; HeadlessJsTaskContext keeps React's
// background execution lifecycle active until completion or expiration.
internal object OneBackgroundTaskRuntime {
    private val main = Handler(Looper.getMainLooper())

    internal class Execution(private val tasks: HeadlessJsTaskContext, private val id: Int) {
        fun finish() { main.post { tasks.finishTask(id) } }
    }

    fun start(context: Context, record: OneBackgroundTasksCoordinator.RunningTask): Execution {
        val deadline = android.os.SystemClock.elapsedRealtime() + 20_000
        fun remaining() = (deadline - android.os.SystemClock.elapsedRealtime()).coerceAtLeast(0)
        val application = context.applicationContext as? ReactApplication
            ?: error("BackgroundTasks requires a ReactApplication")
        val host = application.reactHost ?: error("BackgroundTasks requires a ReactHost")
        val startup = host.start()
        check(startup.waitForCompletion(remaining(), TimeUnit.MILLISECONDS)) { "BackgroundTasks React startup timed out" }
        startup.getError()?.let { throw it }
        check(!startup.isCancelled()) { "BackgroundTasks React startup cancelled" }
        val reactContext = host.currentReactContext ?: error("BackgroundTasks React context is unavailable")
        val ready = CountDownLatch(1)
        val gate = Any()
        var abandoned = false
        var execution: Execution? = null
        var failure: Exception? = null
        main.post {
            synchronized(gate) {
                if (abandoned) return@post
                try {
                    // a stop during startup must not create orphan JS work.
                    if (record.completion.count == 0L) throw CancellationException("BackgroundTasks stopped during startup")
                    val tasks = HeadlessJsTaskContext.getInstance(reactContext)
                    val data = Arguments.createMap().apply {
                        putString("executionId", record.executionId)
                        putString("identifier", record.identifier)
                        putString("kind", if (record.kind == BackgroundTaskKind.PROCESSING) "processing" else "refresh")
                    }
                    val id = tasks.startTask(HeadlessJsTaskConfig("OneBackgroundTasks", data, TimeUnit.MINUTES.toMillis(9), true))
                    execution = Execution(tasks, id)
                } catch (error: Exception) {
                    failure = error
                } finally {
                    ready.countDown()
                }
            }
        }
        try {
            check(ready.await(remaining(), TimeUnit.MILLISECONDS)) { "BackgroundTasks headless startup timed out" }
            synchronized(gate) {
                failure?.let { throw it }
                return checkNotNull(execution)
            }
        } catch (error: Exception) {
            synchronized(gate) {
                abandoned = true
                execution?.finish()
            }
            throw error
        }
    }
}
