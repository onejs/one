package dev.onejs.keyboard.traversal

import android.widget.EditText
import dev.onejs.keyboard.extensions.focus
import java.lang.ref.WeakReference

object FocusedInputHolder {
  private var input: WeakReference<EditText?>? = null

  fun set(textInput: EditText) {
    input = WeakReference(textInput)
  }

  fun get(): EditText? = input?.get()

  fun focus() {
    input?.get()?.focus()
  }
}
