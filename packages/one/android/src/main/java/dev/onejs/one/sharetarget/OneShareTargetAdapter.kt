package dev.onejs.one.sharetarget

import android.content.Context

// implemented by generated code, never by hand in this package: this
// package only defines the contract and the native receiving/composing UI
// that calls it.
interface OneShareTargetAdapter {
    suspend fun destinations(): List<ShareDestination>

    suspend fun send(submission: ShareSubmission)
}

// overridable entry point a generated subclass registers at app startup.
// the app Context is handed to makeAdapter at call time rather than
// captured in the factory, so the adapter can read whatever the app's
// context provides (resources, app-level singletons) without this package
// holding a reference to it.
abstract class OneShareTargetAdapterFactory {
    abstract fun makeAdapter(context: Context): OneShareTargetAdapter

    companion object {
        @Volatile private var instance: OneShareTargetAdapterFactory? = null

        fun register(factory: OneShareTargetAdapterFactory) {
            instance = factory
        }

        fun current(): OneShareTargetAdapterFactory =
            instance
                ?: error(
                    "OneShareTargetAdapterFactory.register(...) was never called. " +
                        "The generated adapter subclass must call register() " +
                        "(e.g. from Application.onCreate) before OneShareTargetActivity launches."
                )
    }
}
