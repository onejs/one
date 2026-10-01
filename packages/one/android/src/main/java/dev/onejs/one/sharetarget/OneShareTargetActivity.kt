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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import java.io.File
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

// hosts the native receiving/composing ui for the one share target. a
// generated manifest entry (owned by the parent integration, not this file)
// points ACTION_SEND/ACTION_SEND_MULTIPLE at this activity; it never mounts
// react or any js runtime.
class OneShareTargetActivity : ComponentActivity() {
    private lateinit var draftStore: OneShareDraftStore
    private val limits = OneShareIntakeLimits()

    private var draftId: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        draftStore = OneShareDraftStore(applicationContext)
        val restoredId = savedInstanceState?.getString(STATE_DRAFT_ID)
        draftId = restoredId ?: draftStore.newDraftId()
        val existing = restoredId?.let { draftStore.load(it) }
        val adapter = OneShareTargetAdapterFactory.current().makeAdapter(applicationContext)

        setContent {
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    OneShareTargetScreen(
                        context = applicationContext,
                        adapter = adapter,
                        draftStore = draftStore,
                        draftId = draftId,
                        existingDraft = existing,
                        // a restored draft already finished intake; a fresh
                        // cold/warm start intakes this launch intent.
                        intakeIntent = if (existing == null) intent else null,
                        itemsDir = draftStore.itemsDirectory(draftId),
                        limits = limits,
                        onSent = {
                            draftStore.delete(draftId)
                            finish()
                        },
                        onCancel = { finish() },
                    )
                }
            }
        }
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(STATE_DRAFT_ID, draftId)
    }

    private companion object {
        const val STATE_DRAFT_ID = "dev.onejs.one.sharetarget.draftId"
    }
}

private sealed class ScreenPhase {
    object Loading : ScreenPhase()
    data class Ready(val error: String? = null) : ScreenPhase()
    object Sending : ScreenPhase()
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
    onSent: () -> Unit,
    onCancel: () -> Unit,
) {
    var phase by remember { mutableStateOf<ScreenPhase>(ScreenPhase.Loading) }
    var shareItems by remember { mutableStateOf(existingDraft?.items.orEmpty()) }
    var editedText by remember { mutableStateOf(existingDraft?.editedText.orEmpty()) }
    var destinations by remember { mutableStateOf<List<ShareDestination>>(emptyList()) }
    var selectedDestinationId by remember { mutableStateOf(existingDraft?.destinationId) }
    val scope = rememberCoroutineScope()
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

    LaunchedEffect(draftId) {
        val job = launch {
            if (intakeIntent != null) {
                val result =
                    OneShareIntake.intake(
                        context = context,
                        intent = intakeIntent,
                        destinationDir = itemsDir,
                        limits = limits,
                    )
                shareItems = result.items
                persist()
            }
            destinations = adapter.destinations()
            if (selectedDestinationId == null) {
                selectedDestinationId = destinations.firstOrNull()?.id
            }
            phase = ScreenPhase.Ready()
        }
        intakeJob = job
        job.join()
    }

    when (val current = phase) {
        is ScreenPhase.Loading ->
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        is ScreenPhase.Ready, is ScreenPhase.Sending -> {
            val sending = current is ScreenPhase.Sending
            Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                Text("Share to", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
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
                        onClick = {
                            intakeJob?.cancel()
                            onCancel()
                        },
                    ) { Text("Cancel") }
                    Spacer(modifier = Modifier.width(8.dp))
                    Button(
                        enabled = !sending && selectedDestinationId != null,
                        onClick = {
                            val destinationId = selectedDestinationId ?: return@Button
                            phase = ScreenPhase.Sending
                            scope.launch {
                                try {
                                    adapter.send(
                                        ShareSubmission(
                                            id = draftId,
                                            destinationId = destinationId,
                                            text = editedText,
                                            items = shareItems,
                                        )
                                    )
                                    onSent()
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
