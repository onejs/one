package dev.onejs.one

// held keyed-props state for one host view instance. the host owns the
// lifetime (reset on source/view/contract change and on recycle) while the
// generated glue owns the contents: the last applied seq plus one untyped
// holder per view, each read back only by the glue that created it. touched
// from the ui thread (host commits) and composition (glue reads) only.
class OneNativeSourceKeyedState {
    var seq: Int = -1
    val views = mutableMapOf<String, Any?>()

    fun reset() {
        seq = -1
        views.clear()
    }
}
