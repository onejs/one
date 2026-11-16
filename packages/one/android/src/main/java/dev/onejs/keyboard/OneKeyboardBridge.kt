package dev.onejs.keyboard

import com.facebook.react.bridge.ReadableMap

// the views and observers report lifecycle events here, where
// HybridOneKeyboard, the module half of one/keyboard, forwards them to js.
object OneKeyboardBridge {
  @Volatile var onEvent: ((String, ReadableMap) -> Unit)? = null
}
