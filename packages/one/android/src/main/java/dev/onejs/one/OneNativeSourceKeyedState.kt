package dev.onejs.one

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue

// held keyed-props state for one host view instance. the host owns the
// lifetime (reset on source/view/contract change and on recycle) while the
// generated glue owns the contents: the last applied seq, one untyped holder
// per view (each read back only by the glue that created it), and the
// applied-commit revision the glue bumps and Content reads so composition
// resubscribes on every apply. touched from the ui thread (host commits)
// and composition (glue reads) only.
class OneNativeSourceKeyedState {
    var seq: Int = -1
    val views = mutableMapOf<String, Any?>()
    var revision by mutableIntStateOf(0)

    fun reset() {
        seq = -1
        views.clear()
    }
}
