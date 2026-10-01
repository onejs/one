package dev.onejs.one.sharetarget

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.launch

// hosts the native receiving/composing ui for the one share target. a
// generated manifest entry (owned by the parent integration, not this file)
// points ACTION_SEND/ACTION_SEND_MULTIPLE at a concrete subclass of this
// activity; it never mounts react or any js runtime. the generated subclass
// supplies makeAdapter()/limits directly -- there is no global registration
// path and no app-startup ordering requirement.
abstract class OneShareTargetActivity : ComponentActivity() {
    protected abstract fun makeAdapter(context: Context): OneShareTargetAdapter

    protected abstract val limits: OneShareIntakeLimits

    private lateinit var draftStore: OneShareDraftStore

    // outlives any single draft's composable: an in-flight send must run to
    // completion even if onNewIntent swaps in a new, isolated draft while it
    // is still sending. cancelled only when the activity itself is
    // destroyed for good (not on configuration change, since onDestroy for
    // a recreation is followed immediately by a fresh instance -- a sent
    // activity never gets backgrounded past the point a real finish() is
    // reachable here, so this is fine for a single-purpose share screen).
    private val sendSupervisor = SupervisorJob()
    private val sendScope = CoroutineScope(Dispatchers.Main.immediate + sendSupervisor)

    private var session by mutableStateOf(Session(draftId = "", intent = null))

    private data class Session(val draftId: String, val intent: Intent?)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        draftStore = OneShareDraftStore(applicationContext)

        val restoredId = savedInstanceState?.getString(STATE_DRAFT_ID)
        session =
            if (restoredId != null) {
                val existing = draftStore.load(restoredId)
                if (existing == null) {
                    // intake started before the process died and never got
                    // to persist a draft; clear whatever it already copied
                    // before retrying on the same intent, so this retry
                    // never piles up alongside the orphaned partial files.
                    draftStore.clearItems(restoredId)
                    Session(restoredId, intent)
                } else {
                    Session(restoredId, null)
                }
            } else {
                Session(draftStore.newDraftId(), intent)
            }

        setContent {
            val current = session
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    key(current.draftId) {
                        OneShareTargetScreen(
                            context = applicationContext,
                            adapter = remember(current.draftId) { makeAdapter(applicationContext) },
                            draftStore = draftStore,
                            draftId = current.draftId,
                            existingDraft = draftStore.load(current.draftId),
                            intakeIntent = current.intent,
                            itemsDir = draftStore.itemsDirectory(current.draftId),
                            limits = limits,
                            sendScope = sendScope,
                            onSent = { sentId -> if (sentId == session.draftId) finish() },
                            onCancelled = { cancelledId -> if (cancelledId == session.draftId) finish() },
                        )
                    }
                }
            }
        }
    }

    // a warm reuse of this task (singleTask/singleTop launch mode, owned by
    // the generated manifest entry) always starts a fresh, isolated draft;
    // it never resumes or mutates whatever the previous draft was doing, so
    // a send still in flight for it keeps running under sendScope above.
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // a warm reuse always isolates the previous draft rather than
        // touching it; but if that previous draft never reached a persisted
        // draft.json (still mid-intake when this new intent arrived), it has
        // nothing discoverable pointing at it, so its directory -- and
        // whatever it had already copied -- would otherwise leak forever.
        // delete() on a draft that was never written is a no-op.
        val previous = session
        if (draftStore.load(previous.draftId) == null) {
            draftStore.delete(previous.draftId)
        }
        session = Session(draftStore.newDraftId(), intent)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(STATE_DRAFT_ID, session.draftId)
    }

    // only a real destroy ends the in-flight send; a destroy that is
    // immediately followed by a recreated instance (rotation) must not --
    // sendScope/sendSupervisor are meant to outlive that, per the comment on
    // their declaration, which isChangingConfigurations is what actually
    // enforces.
    override fun onDestroy() {
        super.onDestroy()
        if (!isChangingConfigurations) {
            sendSupervisor.cancel()
        }
    }

    private companion object {
        const val STATE_DRAFT_ID = "dev.onejs.one.sharetarget.draftId"
    }
}

private sealed class ScreenPhase {
    object Loading : ScreenPhase()

    data class Ready(val error: String? = null) : ScreenPhase()

    object Sending : ScreenPhase()

    object Cancelling : ScreenPhase()

    data class Failed(val message: String) : ScreenPhase()
}

@Composable
private fun OneShareTargetScreen(
    context: Context,
    adapter: OneShareTargetAdapter,
    draftStore: OneShareDraftStore,
    draftId: String,
    existingDraft: StoredShareDraft?,
    intakeIntent: Intent?,
    itemsDir: File,
    limits: OneShareIntakeLimits,
    sendScope: CoroutineScope,
    onSent: (String) -> Unit,
    onCancelled: (String) -> Unit,
) {
    var phase by remember { mutableStateOf<ScreenPhase>(ScreenPhase.Loading) }
    var retryToken by remember { mutableStateOf(0) }
    var shareItems by remember { mutableStateOf(existingDraft?.items.orEmpty()) }
    var editedText by remember { mutableStateOf(existingDraft?.editedText.orEmpty()) }
    var destinations by remember { mutableStateOf<List<ShareDestination>>(emptyList()) }
    var selectedDestinationId by remember { mutableStateOf(existingDraft?.destinationId) }
    val composeScope = rememberCoroutineScope()
    var intakeJob by remember { mutableStateOf<Job?>(null) }

    fun persist() {
        draftStore.save(
            StoredShareDraft(
                id = draftId,
                destinationId = selectedDestinationId,
                editedText = editedText,
                items = shareItems,
            )
        )
    }

    fun cancel() {
        phase = ScreenPhase.Cancelling
        composeScope.launch {
            // wait for any in-flight copy to actually stop (and delete its
            // partial file) before discarding the draft dir, so cancel never
            // races a write into a directory it is about to remove.
            intakeJob?.cancelAndJoin()
            draftStore.delete(draftId)
            onCancelled(draftId)
        }
    }

    LaunchedEffect(draftId, retryToken) {
        phase = ScreenPhase.Loading
        val job = launch {
            try {
                if (intakeIntent != null) {
                    // a retry re-runs intake on the same intent; clear
                    // whatever an earlier attempt for this draft id already
                    // copied first, so a retry's files never pile up next to
                    // a prior attempt's (intake itself also cleans up after
                    // itself on abort, but an attempt that fully succeeded
                    // before a later step -- e.g. destinations() -- failed
                    // would otherwise leave its copies behind here).
                    draftStore.clearItems(draftId)
                    val result =
                        OneShareIntake.intake(
                            context = context,
                            intent = intakeIntent,
                            destinationDir = itemsDir,
                            limits = limits,
                        )
                    if (result.issues.isNotEmpty()) {
                        // no-drop: intake itself already refused to return a
                        // partial item set, so this is never "send what
                        // fit" -- it blocks here until cancelled or retried.
                        val issue = result.issues.first()
                        phase = ScreenPhase.Failed("Couldn't include \"${issue.label}\": ${issue.reason}.")
                        return@launch
                    }
                    // never clobber text the user already has in the
                    // composer (e.g. from a draft persisted before an
                    // earlier attempt's later step failed and this is a
                    // retry) with what is otherwise the same seed text again.
                    if (editedText.isEmpty() && result.text.isNotEmpty()) editedText = result.text
                    shareItems = result.items
                    persist()
                }
                destinations = adapter.destinations()
                if (selectedDestinationId == null) {
                    selectedDestinationId = destinations.firstOrNull()?.id
                }
                phase = ScreenPhase.Ready()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                phase = ScreenPhase.Failed(e.message ?: "Couldn't load this share.")
            }
        }
        intakeJob = job
        job.join()
    }

    when (val current = phase) {
        is ScreenPhase.Loading ->
            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = { cancel() }) { Text("Cancel") }
                }
            }
        is ScreenPhase.Cancelling ->
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        is ScreenPhase.Failed ->
            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                Text(current.message, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(onClick = { cancel() }) { Text("Cancel") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(onClick = { retryToken += 1 }) { Text("Retry") }
                }
            }
        is ScreenPhase.Ready, is ScreenPhase.Sending -> {
            val sending = current is ScreenPhase.Sending
            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                Text("Share to", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                // weighted so a long destination list scrolls within its own
                // space instead of pushing the composer and send/cancel
                // buttons below it off screen.
                LazyColumn(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    items(destinations) { destination ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(
                                selected = selectedDestinationId == destination.id,
                                enabled = !sending,
                                onClick = {
                                    selectedDestinationId = destination.id
                                    persist()
                                },
                            )
                            Column {
                                Text(destination.title)
                                destination.subtitle?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = editedText,
                    onValueChange = {
                        editedText = it
                        persist()
                    },
                    enabled = !sending,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Message") },
                )
                Spacer(modifier = Modifier.height(8.dp))
                shareItems.forEach { item ->
                    Text(
                        when (item) {
                            is ShareItem.Text -> item.value
                            is ShareItem.Url -> item.value
                            is ShareItem.File -> "${item.name} (${item.mimeType}, ${item.size} bytes)"
                        },
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                if (current is ScreenPhase.Ready && current.error != null) {
                    Text(current.error, color = MaterialTheme.colorScheme.error)
                }
                Spacer(modifier = Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                    OutlinedButton(
                        enabled = !sending,
                        onClick = { cancel() },
                    ) { Text("Cancel") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        enabled = !sending && selectedDestinationId != null,
                        onClick = {
                            val destinationId = selectedDestinationId ?: return@Button
                            val submission =
                                ShareSubmission(
                                    id = draftId,
                                    destinationId = destinationId,
                                    text = editedText,
                                    items = shareItems,
                                )
                            phase = ScreenPhase.Sending
                            // runs on sendScope, not this composable's own
                            // scope: once a send starts it is uncancellable
                            // from the ui (no Cancel is wired to it above)
                            // and must finish even if this draft's screen is
                            // torn down by a warm onNewIntent in the
                            // meantime, so the submission id stays stable
                            // and completion is never left ambiguous by a
                            // ui-driven teardown.
                            sendScope.launch {
                                try {
                                    adapter.send(submission)
                                    draftStore.delete(draftId)
                                    onSent(draftId)
                                } catch (e: Exception) {
                                    // failure preserves the draft: it was
                                    // already persisted continuously above.
                                    phase = ScreenPhase.Ready(error = e.message ?: "Send failed")
                                }
                            }
                        },
                    ) { Text("Send") }
                }
            }
        }
    }
}
