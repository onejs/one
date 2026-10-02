package dev.onejs.one

import androidx.compose.runtime.Composable

// generated per .kt source that declares public @Composable functions: renders
// one of them from the host's json props. a callback reports its arguments
// through emit as a json array.
interface OneNativeSourceViewDispatch {
    val contractHash: String

    @Composable
    fun Content(view: String, propsJson: String, emit: (String, String) -> Unit)
}
