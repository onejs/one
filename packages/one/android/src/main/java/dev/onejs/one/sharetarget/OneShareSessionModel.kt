package dev.onejs.one.sharetarget

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

internal enum class SharePhase { LOADING, READY, FAILED, SENDING, CANCELLING, DELIVERED, CANCELLED }

internal data class ShareSessionState(
    val id: String = "",
    val phase: SharePhase = SharePhase.LOADING,
    val text: String = "",
    val items: List<ShareItem> = emptyList(),
    val destinations: List<ShareDestination> = emptyList(),
    val destinationId: String? = null,
    val error: String? = null,
    val pendingDelivery: Boolean = false,
)

// the activity only renders this retained owner. rotation never creates a
// second sender or loses the phase of a submission already in flight.
internal class OneShareSessionModel(
    private val context: Context,
    private val adapter: OneShareTargetAdapter,
    private val limits: OneShareIntakeLimits,
) : ViewModel() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val store = OneShareDraftStore(context)
    private val writes = Mutex()
    private val mutableState = MutableStateFlow(ShareSessionState())
    val state: StateFlow<ShareSessionState> = mutableState
    private var loading: Job? = null
    private val transitions = Mutex()
    private var incoming: Intent? = null

    fun open(intent: Intent, restoredId: String? = null) {
        if (state.value.id.isNotEmpty()) return
        start(intent, restoredId ?: UUID.randomUUID().toString())
    }

    fun receive(intent: Intent) {
        scope.launch { transitions.withLock {
            val previous = state.value
            if (previous.phase == SharePhase.LOADING || previous.phase == SharePhase.FAILED) {
                loading?.cancelAndJoin()
                // persist a completed intake; remove only an incomplete one.
                writes.withLock {
                    withContext(Dispatchers.IO) {
                        if (store.load(previous.id) == null) store.delete(previous.id)
                    }
                }
            }
            start(intent, UUID.randomUUID().toString())
        } }
    }

    private fun start(intent: Intent, id: String) {
        incoming = intent
        mutableState.value = ShareSessionState(id = id)
        load()
    }

    fun retry() {
        if (state.value.phase != SharePhase.FAILED) return
        mutableState.value = state.value.copy(phase = SharePhase.LOADING, error = null)
        load()
    }

    private fun load() {
        val id = state.value.id
        val intent = incoming
        loading = scope.launch {
            try {
                val restored = withContext(Dispatchers.IO) { store.load(id) }
                if (restored != null) {
                    mutableState.value = state.value.copy(text = restored.editedText, items = restored.items,
                        destinationId = restored.destinationId, pendingDelivery = restored.pendingDelivery)
                } else {
                    val directory = withContext(Dispatchers.IO) {
                        store.clearItems(id)
                        store.itemsDirectory(id)
                    }
                    val result = OneShareIntake.intake(context, requireNotNull(intent), directory, limits)
                    require(result.issues.isEmpty()) { result.issues.joinToString { "${it.label}: ${it.reason}" } }
                    mutableState.value = state.value.copy(text = result.text, items = result.items)
                    persist(state.value)
                }
                val destinations = adapter.destinations()
                val current = state.value
                if (current.id != id) return@launch
                require(!current.pendingDelivery || destinations.any { it.id == current.destinationId }) {
                    "The original destination is unavailable. Retry when it reconnects."
                }
                mutableState.value = current.copy(phase = SharePhase.READY, destinations = destinations,
                    destinationId = current.destinationId?.takeIf { selected -> destinations.any { it.id == selected } }
                        ?: destinations.firstOrNull()?.id, error = if (current.pendingDelivery) "Earlier delivery may have been accepted. Retry sends the same submission." else null)
                persist(state.value)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (state.value.id == id) mutableState.value = state.value.copy(phase = SharePhase.FAILED, error = error.message)
            }
        }
    }

    fun edit(text: String) {
        if (state.value.phase != SharePhase.READY || state.value.pendingDelivery) return
        mutableState.value = state.value.copy(text = text)
        saveEdit()
    }

    fun select(id: String) {
        if (state.value.phase != SharePhase.READY || state.value.pendingDelivery || state.value.destinations.none { it.id == id }) return
        mutableState.value = state.value.copy(destinationId = id)
        saveEdit()
    }

    private fun saveEdit() {
        val snapshot = state.value
        scope.launch {
            try { persist(snapshot) }
            catch (error: Exception) {
                if (state.value.id == snapshot.id && state.value.phase == SharePhase.READY)
                    mutableState.value = state.value.copy(phase = SharePhase.FAILED, error = error.message)
            }
        }
    }

    private suspend fun persist(snapshot: ShareSessionState, sending: Boolean = false) = writes.withLock {
        // a queued edit cannot write after the send or cancellation barrier.
        val current = state.value
        if (!sending && (current.id != snapshot.id || current.phase == SharePhase.SENDING ||
                current.phase == SharePhase.CANCELLING || current.phase == SharePhase.DELIVERED || current.phase == SharePhase.CANCELLED)) return@withLock
        withContext(Dispatchers.IO) {
            store.save(StoredShareDraft(snapshot.id, snapshot.destinationId, snapshot.text, snapshot.items, sending))
        }
    }

    fun canSend(snapshot: ShareSessionState = state.value): Boolean {
        val bytes = snapshot.text.toByteArray(Charsets.UTF_8).size.toLong()
        val itemBytes = snapshot.items.sumOf { when (it) {
            is ShareItem.File -> it.size
            is ShareItem.Text -> it.value.toByteArray(Charsets.UTF_8).size.toLong()
            is ShareItem.Url -> it.value.toByteArray(Charsets.UTF_8).size.toLong()
        } }
        return snapshot.phase == SharePhase.READY && snapshot.destinationId != null &&
            snapshot.destinations.any { it.id == snapshot.destinationId } &&
            bytes <= limits.maxItemBytes && bytes + itemBytes <= limits.maxTotalBytes &&
            snapshot.items.size + (if (snapshot.text.isEmpty()) 0 else 1) <= limits.maxItems &&
            (snapshot.text.isNotEmpty() || snapshot.items.isNotEmpty())
    }

    fun send() {
        val snapshot = state.value
        if (!canSend(snapshot)) return
        mutableState.value = snapshot.copy(phase = SharePhase.SENDING, error = null)
        scope.launch {
            try {
                // mark the attempt durably before transport; process recovery
                // keeps this id so a retry uses the adapter's idempotency key.
                persist(snapshot, sending = true)
                if (state.value.id == snapshot.id) mutableState.value = state.value.copy(pendingDelivery = true)
                adapter.send(ShareSubmission(snapshot.id, requireNotNull(snapshot.destinationId), snapshot.text, snapshot.items))
                writes.withLock { withContext(Dispatchers.IO) { store.delete(snapshot.id) } }
                if (state.value.id == snapshot.id) mutableState.value = state.value.copy(phase = SharePhase.DELIVERED)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (state.value.id == snapshot.id) mutableState.value = state.value.copy(phase = SharePhase.READY, error = error.message)
            }
        }
    }

    fun discard() {
        val snapshot = state.value
        if (snapshot.pendingDelivery || snapshot.phase == SharePhase.SENDING || snapshot.phase == SharePhase.CANCELLING ||
            snapshot.phase == SharePhase.DELIVERED || snapshot.phase == SharePhase.CANCELLED) return
        mutableState.value = snapshot.copy(phase = SharePhase.CANCELLING)
        scope.launch {
            try {
                loading?.cancelAndJoin()
                writes.withLock { withContext(Dispatchers.IO) { store.delete(snapshot.id) } }
                if (state.value.id == snapshot.id) mutableState.value = state.value.copy(phase = SharePhase.CANCELLED)
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                if (state.value.id == snapshot.id) mutableState.value = state.value.copy(phase = SharePhase.FAILED, error = error.message)
            }
        }
    }

    override fun onCleared() { scope.cancel() }
}
