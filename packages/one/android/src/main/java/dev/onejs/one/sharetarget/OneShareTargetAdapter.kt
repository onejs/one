package dev.onejs.one.sharetarget

// implemented by generated code, never by hand in this package: this
// package only defines the contract and the native receiving/composing ui
// that calls it. the generated OneShareTargetActivity subclass constructs
// (or looks up) its adapter directly in makeAdapter() -- there is no global
// registration path and no app-startup ordering requirement.
interface OneShareTargetAdapter {
    suspend fun destinations(): List<ShareDestination>

    suspend fun send(submission: ShareSubmission)
}
