package com.margelo.nitro.one

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

// runs One.BackgroundTasks work when WorkManager dispatches it. delivery
// goes through the shared coordinator so foreground JS observes the same
// launch/expire/complete contract as iOS: the worker blocks until JS
// completes the execution, the stop signal expires it, and a launch with
// no JS listener fails after the same 20s startup grace iOS applies to
// jobs whose handler never registers.
class OneBackgroundWorker(
    appContext: Context,
    params: WorkerParameters,
) : Worker(appContext, params) {
    @Volatile private var executionId: String? = null
    @Volatile private var finished = false

    override fun doWork(): Result {
        val identifier = inputData.getString(OneBackgroundTasksCoordinator.KEY_IDENTIFIER)
            ?: return Result.failure()
        val kindValue = inputData.getInt(OneBackgroundTasksCoordinator.KEY_KIND, 0)
        val kind = if (kindValue == BackgroundTaskKind.PROCESSING.value) {
            BackgroundTaskKind.PROCESSING
        } else {
            BackgroundTaskKind.REFRESH
        }
        // JS may be starting alongside the worker; give it the iOS startup
        // grace before failing a listener-less launch.
        val graceDeadline = System.currentTimeMillis() + TimeUnit.SECONDS.toMillis(20)
        while (!OneBackgroundTasksCoordinator.hasListener() &&
            System.currentTimeMillis() < graceDeadline &&
            !isStopped
        ) {
            try {
                Thread.sleep(250)
            } catch (e: InterruptedException) {
                Thread.currentThread().interrupt()
                return Result.failure()
            }
        }
        if (isStopped) return Result.failure()
        if (!OneBackgroundTasksCoordinator.hasListener()) return Result.failure()
        val record = OneBackgroundTasksCoordinator.launch(identifier, kind)
        executionId = record.executionId
        try {
            // WorkManager stops workers past ~10 minutes; cap the wait below
            // it so expiration still reports through the coordinator.
            val completed = record.completion.await(9, TimeUnit.MINUTES)
            finished = true
            return if (completed && record.success) Result.success() else Result.failure()
        } catch (e: InterruptedException) {
            Thread.currentThread().interrupt()
            finished = true
            return Result.failure()
        }
    }

    override fun onStopped() {
        executionId?.let { id ->
            if (!finished) {
                finished = true
                OneBackgroundTasksCoordinator.expire(id)
            }
        }
        super.onStopped()
    }
}
