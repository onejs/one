package com.margelo.nitro.one

import com.facebook.react.bridge.ReadableMap
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import dev.onejs.keyboard.OneKeyboardBridge
import dev.onejs.keyboard.modules.KeyboardControllerModuleImpl
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

// the module half of one/keyboard. the views and observers it reads live in
// dev.onejs.keyboard, folded in from react-native-keyboard-controller.
class HybridOneKeyboard : HybridOneKeyboardSpec() {
  private val keyboardListeners = ConcurrentHashMap<Int, (OneKeyboardEventName, OneKeyboardEvent) -> Unit>()
  private val focusListeners = ConcurrentHashMap<Int, (OneKeyboardFocus) -> Unit>()
  private val layoutSyncListeners = ConcurrentHashMap<Int, () -> Unit>()
  private val windowListeners = ConcurrentHashMap<Int, (Double, Double) -> Unit>()
  private val animationEndListeners = ConcurrentHashMap<Int, (Double) -> Unit>()
  private val nextListenerId = AtomicInteger()

  private val module by lazy {
    KeyboardControllerModuleImpl(
      NitroModules.applicationContext
        ?: throw IllegalStateException("OneKeyboard: React context is not ready"),
    )
  }

  init {
    OneKeyboardBridge.onEvent = ::onEvent
  }

  private fun onEvent(name: String, body: ReadableMap) {
    when (name) {
      "keyboardWillShow", "keyboardDidShow", "keyboardWillHide", "keyboardDidHide" -> {
        val event =
          OneKeyboardEvent(
            height = body.getDouble("height"),
            duration = body.getDouble("duration"),
            timestamp = body.getDouble("timestamp"),
            target = body.getDouble("target"),
            type = body.getString("type") ?: "default",
            appearance = body.getString("appearance") ?: "light",
          )
        val eventName = OneKeyboardEventName.valueOf(name.uppercase())
        keyboardListeners.values.forEach { it(eventName, event) }
      }
      "focusDidSet" -> {
        val event = OneKeyboardFocus(body.getDouble("current"), body.getDouble("count"))
        focusListeners.values.forEach { it(event) }
      }
      "layoutDidSynchronize" -> layoutSyncListeners.values.forEach { it() }
      "windowDidResize" -> {
        val width = body.getDouble("width")
        val height = body.getDouble("height")
        windowListeners.values.forEach { it(width, height) }
      }
      "onUserDrivenAnimationEnded" -> {
        val tags = body.getArray("tags") ?: return
        for (index in 0 until tags.size()) {
          val tag = tags.getInt(index).toDouble()
          animationEndListeners.values.forEach { it(tag) }
        }
      }
    }
  }

  override val keyboardBorderRadius: Double = 0.0

  override fun preload() {}

  override fun setInputMode(mode: Double) = module.setInputMode(mode.toInt())

  override fun setDefaultMode() = module.setDefaultMode()

  override fun dismiss(keepFocus: Boolean, animated: Boolean) = module.dismiss(keepFocus, animated)

  override fun setFocusTo(direction: String) = module.setFocusTo(direction)

  override fun setTranslucent(translucent: Boolean) {}

  override fun viewPositionInWindow(viewTag: Double): Promise<OneKeyboardFrame> {
    val promise = Promise<OneKeyboardFrame>()
    module.viewPositionInWindow(viewTag.toInt()) { frame ->
      if (frame == null) {
        promise.reject(IllegalStateException("Could not find view for tag ${viewTag.toInt()}"))
      } else {
        promise.resolve(OneKeyboardFrame(frame[0], frame[1], frame[2], frame[3]))
      }
    }
    return promise
  }

  override fun addKeyboardListener(listener: (name: OneKeyboardEventName, event: OneKeyboardEvent) -> Unit) =
    add(keyboardListeners, listener)

  override fun addFocusListener(listener: (event: OneKeyboardFocus) -> Unit) = add(focusListeners, listener)

  override fun addLayoutSyncListener(listener: () -> Unit) = add(layoutSyncListeners, listener)

  override fun addWindowResizeListener(listener: (width: Double, height: Double) -> Unit) =
    add(windowListeners, listener)

  override fun addAnimationEndListener(listener: (viewTag: Double) -> Unit) = add(animationEndListeners, listener)

  private fun <Listener> add(listeners: ConcurrentHashMap<Int, Listener>, listener: Listener): () -> Unit {
    val id = nextListenerId.getAndIncrement()
    listeners[id] = listener
    return { listeners.remove(id) }
  }
}
