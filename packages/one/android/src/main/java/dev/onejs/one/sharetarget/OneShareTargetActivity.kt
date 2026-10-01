package dev.onejs.one.sharetarget

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.BackHandler
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

import androidx.compose.runtime.collectAsState
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider

// generated concrete subclasses supply the adapter and limits directly.
abstract class OneShareTargetActivity : ComponentActivity() {
    protected abstract fun makeAdapter(context: Context): OneShareTargetAdapter
    protected abstract val limits: OneShareIntakeLimits
    private lateinit var model: OneShareSessionModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        model = ViewModelProvider(this, object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                OneShareSessionModel(applicationContext, makeAdapter(applicationContext), limits) as T
        })[OneShareSessionModel::class.java]
        model.open(intent, savedInstanceState?.getString(STATE_DRAFT_ID))
        setContent {
            val state by model.state.collectAsState()
            BackHandler { model.discard() }
            LaunchedEffect(state.phase) {
                if (state.phase == SharePhase.DELIVERED || state.phase == SharePhase.CANCELLED) finish()
            }
            MaterialTheme {
                Surface(modifier = Modifier.fillMaxSize()) { ShareScreen(state, model) }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        model.receive(intent)
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(STATE_DRAFT_ID, model.state.value.id)
    }

    private companion object { const val STATE_DRAFT_ID = "dev.onejs.one.sharetarget.draftId" }
}

@Composable
private fun ShareScreen(state: ShareSessionState, model: OneShareSessionModel) {
    val sending = state.phase == SharePhase.SENDING
    when (state.phase) {
        SharePhase.LOADING, SharePhase.CANCELLING -> Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Box(modifier = Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            OutlinedButton(enabled = state.phase == SharePhase.LOADING, onClick = { model.discard() }) { Text("Cancel") }
        }
        SharePhase.FAILED -> Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
            Text(state.error ?: "Couldn't prepare this share", color = MaterialTheme.colorScheme.error)
            OutlinedButton(enabled = !state.pendingDelivery, onClick = { model.discard() }) { Text("Cancel") }
            Button(onClick = { model.retry() }) { Text("Retry") }
        }
        SharePhase.READY, SharePhase.SENDING -> Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
                Text("Share to", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                // weighted so a long destination list scrolls within its own
                // space instead of pushing the composer and send/cancel
                // buttons below it off screen.
                LazyColumn(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    items(state.destinations) { destination ->
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            RadioButton(
                                selected = state.destinationId == destination.id,
                                enabled = !sending && !state.pendingDelivery,
                                onClick = {
                                    model.select(destination.id)
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
                    value = state.text,
                    onValueChange = {
                        model.edit(it)
                    },
                    enabled = !sending && !state.pendingDelivery,
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Message") },
                )
                Spacer(modifier = Modifier.height(8.dp))
                state.items.forEach { item ->
                    Text(
                        when (item) {
                            is ShareItem.Text -> item.value
                            is ShareItem.Url -> item.value
                            is ShareItem.File -> "${item.name} (${item.mimeType}, ${item.size} bytes)"
                        },
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Row(horizontalArrangement = Arrangement.End, modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(enabled = !sending && !state.pendingDelivery, onClick = { model.discard() }) { Text("Cancel") }
                Spacer(modifier = Modifier.width(8.dp))
                Button(enabled = model.canSend(state), onClick = { model.send() }) { Text(if (state.pendingDelivery) "Retry send" else "Send") }
            }
        }
        SharePhase.DELIVERED, SharePhase.CANCELLED -> Unit
    }
}
