package dev.onejs.keyboard.modal

import android.view.ViewGroup
import android.view.WindowManager
import androidx.core.view.ViewCompat
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcherListener
import com.facebook.react.views.modal.ReactModalHostView
import com.facebook.react.views.view.ReactViewGroup
import dev.onejs.keyboard.constants.Keyboard
import dev.onejs.keyboard.extensions.eventDispatcher
import dev.onejs.keyboard.extensions.removeSelf
import dev.onejs.keyboard.extensions.uiManager
import dev.onejs.keyboard.listeners.KeyboardAnimationCallback
import dev.onejs.keyboard.listeners.KeyboardAnimationCallbackConfig
import dev.onejs.keyboard.log.Logger

private val TAG = ModalAttachedWatcher::class.qualifiedName
private val areEventsComingFromOwnWindow = !Keyboard.IS_ANIMATION_EMULATED

class ModalAttachedWatcher(
  private val view: ReactViewGroup,
  private val reactContext: ThemedReactContext,
  private val config: KeyboardAnimationCallbackConfig,
  private var callback: () -> KeyboardAnimationCallback?,
) : EventDispatcherListener {
  private val uiManager = reactContext.uiManager
  private val eventDispatcher = reactContext.eventDispatcher

  override fun onEventDispatch(event: Event<*>) {
    if (event.eventName != MODAL_SHOW_EVENT) {
      return
    }

    val modal =
      try {
        uiManager?.resolveView(event.viewTag) as? ReactModalHostView
      } catch (ignore: Exception) {
        Logger.w(TAG, "Can not resolve view for Modal#${event.viewTag}", ignore)
        null
      }

    if (modal == null) {
      return
    }

    val dialog = modal.dialog
    val window = dialog?.window
    val rootView = window?.decorView?.rootView as ViewGroup?

    if (rootView != null) {
      val eventView =
        ReactViewGroup(reactContext).apply {
          layoutParams = ViewGroup.LayoutParams(0, 0)
        }
      val callback =
        KeyboardAnimationCallback(
          view = rootView,
          eventPropagationView = view,
          context = reactContext,
          config = config,
        )

      rootView.addView(eventView)

      if (areEventsComingFromOwnWindow) {
        // on Android < 12 all events for `WindowInsetsAnimationCallback`
        // go through main `rootView`, so we don't need to stop main
        // callback - otherwise keyboard transitions will not be animated
        this.callback()?.suspend(true)
        // attaching callback to Modal on Android < 12 can cause ghost animations, see: https://github.com/kirillzyusko/react-native-keyboard-controller/pull/718
        // and overall attaching additional callbacks (if animation events go through the main window) is not necessary
        ViewCompat.setWindowInsetsAnimationCallback(rootView, callback)
        ViewCompat.setOnApplyWindowInsetsListener(eventView, callback)

        // when modal is shown then keyboard will be hidden by default
        //
        // - if events are coming from main window - then keyboard position
        //   will be synchronized from main window callback
        // - if events are coming from modal window - then we need to update
        //   position ourself, because callback can be attached after keyboard
        //   auto-dismissal and we may miss some events and keyboard position
        //   will be outdated
        view.post {
          callback.syncKeyboardPosition(0.0, false)
        }
      }

      dialog?.setOnDismissListener {
        callback.syncKeyboardPosition()
        callback.destroy()
        eventView.removeSelf()
        // un-pause it in next frame because straight away `onApplyWindowInsets` will be called
        view.post {
          this.callback()?.suspend(false)
        }
      }

      // imitating edge-to-edge mode behavior
      window?.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_NOTHING)
    }
  }

  fun enable() {
    eventDispatcher?.addListener(this)
  }

  fun disable() {
    eventDispatcher?.removeListener(this)
  }

  companion object {
    private const val MODAL_SHOW_EVENT = "topShow"
  }
}
