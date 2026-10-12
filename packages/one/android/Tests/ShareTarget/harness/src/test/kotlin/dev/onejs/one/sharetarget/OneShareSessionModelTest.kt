package dev.onejs.one.sharetarget

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withTimeout
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(manifest = Config.NONE)
@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
class OneShareSessionModelTest {
    private lateinit var context: Context
    private val models = mutableListOf<ViewModelStore>()
    private val limits = OneShareIntakeLimits(5, 100, 150, emptySet(), true, true)

    @Before fun prepare() {
        Dispatchers.setMain(Dispatchers.Unconfined)
        context = ApplicationProvider.getApplicationContext()
        java.io.File(context.filesDir, "one-sharetarget").deleteRecursively()
    }
    @After fun cleanup() { models.forEach { it.clear() }; Dispatchers.resetMain() }

    private fun intent(text: String) = Intent(Intent.ACTION_SEND).putExtra(Intent.EXTRA_TEXT, text)
    private fun model(adapter: Adapter, store: ViewModelStore = ViewModelStore()): OneShareSessionModel {
        if (!models.contains(store)) models.add(store)
        val owner = object : ViewModelStoreOwner { override val viewModelStore = store }
        val factory = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = OneShareSessionModel(context, adapter, limits) as T
        }
        return ViewModelProvider(owner, factory)[OneShareSessionModel::class.java]
    }
    private suspend fun OneShareSessionModel.await(phase: SharePhase) =
        withTimeout(10_000) { state.first { it.phase == phase } }

    private class Adapter : OneShareTargetAdapter {
        var destinationCalls = 0
        var failDestinations = false
        var available = listOf(ShareDestination("session", "Session"))
        var destinationsGate: CompletableDeferred<Unit>? = null
        val loadingEntered = CompletableDeferred<Unit>()
        val entered = CompletableDeferred<ShareSubmission>()
        val release = CompletableDeferred<Unit>()
        val submissions = mutableListOf<ShareSubmission>()
        override suspend fun destinations(): List<ShareDestination> {
            destinationCalls++
            loadingEntered.complete(Unit)
            destinationsGate?.await()
            if (failDestinations) error("offline")
            return available
        }
        override suspend fun send(submission: ShareSubmission) {
            submissions.add(submission)
            entered.complete(submission)
            release.await()
        }
    }

    @Test fun retainedOwnerKeepsSendingAndRefusesSecondSend() = runBlocking<Unit> {
        val adapter = Adapter()
        val store = ViewModelStore()
        val first = model(adapter, store)
        first.open(intent("hello"))
        first.await(SharePhase.READY)
        first.send()
        val submission = withTimeout(10_000) { adapter.entered.await() }
        val recreated = model(adapter, store)
        recreated.open(intent("hello"), submission.id)
        assertSame(first, recreated)
        assertEquals(SharePhase.SENDING, recreated.state.value.phase)
        recreated.send()
        recreated.discard()
        recreated.edit("changed")
        assertEquals(1, adapter.submissions.size)
        assertEquals("hello", recreated.state.value.text)
        adapter.release.complete(Unit)
        recreated.await(SharePhase.DELIVERED)
        assertNull(OneShareDraftStore(context).load(submission.id))
    }

    @Test fun processRecoveryRetriesExactSubmissionId() = runBlocking<Unit> {
        val firstAdapter = Adapter()
        val firstStore = ViewModelStore()
        val original = model(firstAdapter, firstStore)
        original.open(intent("hello"))
        original.await(SharePhase.READY)
        original.send()
        val sent = withTimeout(10_000) { firstAdapter.entered.await() }
        assertTrue(OneShareDraftStore(context).load(sent.id)!!.pendingDelivery)
        firstStore.clear()
        val recoveredAdapter = Adapter()
        val recovered = model(recoveredAdapter)
        recovered.open(intent("ignored replacement"), sent.id)
        recovered.await(SharePhase.READY)
        assertTrue(recovered.state.value.pendingDelivery)
        recovered.edit("changed")
        recovered.discard()
        assertEquals("hello", recovered.state.value.text)
        recovered.send()
        assertEquals(sent, withTimeout(10_000) { recoveredAdapter.entered.await() })
        recoveredAdapter.release.complete(Unit)
        recovered.await(SharePhase.DELIVERED)
    }

    @Test fun retryDestinationsLoadsOwnedDraftWithoutReintake() = runBlocking<Unit> {
        val adapter = Adapter().apply { failDestinations = true }
        val model = model(adapter)
        model.open(intent("original"))
        val failed = model.await(SharePhase.FAILED)
        val stored = OneShareDraftStore(context).load(failed.id)!!
        OneShareDraftStore(context).save(stored.copy(editedText = "durable edit"))
        adapter.failDestinations = false
        model.retry()
        val ready = model.await(SharePhase.READY)
        assertEquals(failed.id, ready.id)
        assertEquals("durable edit", ready.text)
        assertEquals(2, adapter.destinationCalls)
        model.discard()
        model.await(SharePhase.CANCELLED)
        assertNull(OneShareDraftStore(context).load(ready.id))
    }

    @Test fun warmShareDoesNotCompleteNewDraftWhenOldSendFinishes() = runBlocking<Unit> {
        val adapter = Adapter()
        val model = model(adapter)
        model.open(intent("first"))
        model.await(SharePhase.READY)
        model.send()
        val old = withTimeout(10_000) { adapter.entered.await() }
        model.receive(intent("second"))
        val next = withTimeout(10_000) { model.state.first { it.id != old.id && it.phase == SharePhase.READY } }
        adapter.release.complete(Unit)
        // a subsequent destinations query is unnecessary; retained state is
        // already independent of the completed submission's callback.
        assertNotEquals(old.id, next.id)
        assertEquals("second", next.text)
        model.discard()
        model.await(SharePhase.CANCELLED)
        assertNull(OneShareDraftStore(context).load(next.id))
    }

    @Test fun editOverBudgetCannotReachAdapter() = runBlocking<Unit> {
        val adapter = Adapter()
        val model = model(adapter)
        model.open(intent("hello"))
        model.await(SharePhase.READY)
        model.edit("x".repeat(101))
        assertFalse(model.canSend())
        model.send()
        assertEquals(SharePhase.READY, model.state.value.phase)
        assertTrue(adapter.submissions.isEmpty())
        model.discard()
        model.await(SharePhase.CANCELLED)
    }

    @Test fun cancelAwaitsLoadingAndDeletesPersistedIntake() = runBlocking<Unit> {
        val adapter = Adapter().apply { destinationsGate = CompletableDeferred() }
        val model = model(adapter)
        model.open(intent("hello"))
        withTimeout(10_000) { adapter.loadingEntered.await() }
        val id = model.state.value.id
        assertNotNull(OneShareDraftStore(context).load(id))
        model.discard()
        model.await(SharePhase.CANCELLED)
        assertNull(OneShareDraftStore(context).load(id))
        assertTrue(adapter.submissions.isEmpty())
    }

    @Test fun primaryTextCountsAgainstItemLimit() = runBlocking<Unit> {
        val intent = intent("caption").apply {
            clipData = android.content.ClipData.newPlainText("extra", "other")
        }
        val result = OneShareIntake.intake(context, intent, context.cacheDir,
            limits.copy(maxItems = 1))
        assertEquals(OneShareIntakeIssueReason.OVER_ITEM_LIMIT, result.issues.single().reason)
        assertTrue(result.items.isEmpty())
        assertEquals("", result.text)
    }

    @Test fun recoveredSendCannotSwitchToDifferentDestination() = runBlocking<Unit> {
        OneShareDraftStore(context).save(StoredShareDraft("pending", "original", "hello", emptyList(), true))
        val adapter = Adapter().apply { available = listOf(ShareDestination("other", "Other")) }
        val model = model(adapter)
        model.open(intent("ignored"), "pending")
        val failed = model.await(SharePhase.FAILED)
        assertEquals("original", failed.destinationId)
        model.send()
        model.discard()
        assertTrue(adapter.submissions.isEmpty())
        assertNotNull(OneShareDraftStore(context).load("pending"))
    }

    @Test fun interruptedAtomicWriteRecoversDraftBackup() {
        val draft = StoredShareDraft("backup", "session", "hello", emptyList(), true)
        val store = OneShareDraftStore(context)
        store.save(draft)
        val manifest = java.io.File(context.filesDir, "one-sharetarget/backup/draft.json")
        assertTrue(manifest.renameTo(java.io.File(manifest.path + ".bak")))
        assertEquals(draft, store.load("backup"))
    }

    @Test fun corruptManifestFailsRatherThanReintakingAsNewShare() = runBlocking<Unit> {
        val store = OneShareDraftStore(context)
        store.save(StoredShareDraft("corrupt", "session", "hello", emptyList(), true))
        java.io.File(context.filesDir, "one-sharetarget/corrupt/draft.json").writeText("{")
        val adapter = Adapter()
        val model = model(adapter)
        model.open(intent("replacement"), "corrupt")
        val failed = model.await(SharePhase.FAILED)
        assertTrue(failed.error!!.contains("Could not read share draft"))
        assertEquals(0, adapter.destinationCalls)
        assertTrue(adapter.submissions.isEmpty())
    }
}
