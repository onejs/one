package dev.onejs.one

import androidx.compose.runtime.Composable

// generated per .kt source that declares public @Composable functions: renders
// one of them from the host's json props. a callback reports its arguments
// through emit as a json array. props arrive as full or keyed change
// documents; the glue merges changes into the host-owned state and renders
// the held props, so a disposed composition recomposes the same content.
interface OneNativeSourceViewDispatch {
    val contractHash: String

    @Composable
    fun Content(
        view: String,
        propsJson: String,
        emit: (String, String) -> Unit,
        state: OneNativeSourceKeyedState,
    )
}
