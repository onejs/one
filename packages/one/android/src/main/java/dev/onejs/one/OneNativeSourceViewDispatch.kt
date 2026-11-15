package dev.onejs.one

import androidx.compose.runtime.Composable

// generated per .kt source that declares public @Composable functions. apply
// decodes one props document and merges it into the host-owned state on the
// ui thread at prop commit: full documents always apply, a change applies
// onto the held seq and refuses otherwise (the host answers $resync).
// Content only renders the held props; a callback reports its arguments
// through emit as a json array.
interface OneNativeSourceViewDispatch {
    val contractHash: String

    fun apply(
        view: String,
        propsJson: String,
        state: OneNativeSourceKeyedState,
    ): Boolean

    @Composable
    fun Content(
        view: String,
        state: OneNativeSourceKeyedState,
        emit: (String, String) -> Unit,
    )
}
