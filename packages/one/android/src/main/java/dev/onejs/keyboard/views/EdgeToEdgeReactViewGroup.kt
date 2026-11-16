package dev.onejs.keyboard.views

import android.annotation.SuppressLint
import android.content.res.Configuration
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup
import dev.onejs.keyboard.extensions.content
import dev.onejs.keyboard.extensions.isAdjustResize
import dev.onejs.keyboard.extensions.removeSelf
import dev.onejs.keyboard.extensions.requestApplyInsetsWhenAttached
import dev.onejs.keyboard.extensions.rootView
import dev.onejs.keyboard.extensions.windowSoftInputMode
import dev.onejs.keyboard.listeners.KeyboardAnimationCallback
import dev.onejs.keyboard.listeners.KeyboardAnimationCallbackConfig
import dev.onejs.keyboard.log.Logger
import dev.onejs.keyboard.modal.ModalAttachedWatcher
import kotlin.math.max

private val TAG = EdgeToEdgeReactViewGroup::class.qualifiedName

@Suppress("detekt:TooManyFunctions")
@SuppressLint("ViewConstructor")
class EdgeToEdgeReactViewGroup(
  val reactContext: ThemedReactContext,
) : ReactViewGroup(reactContext) {
  // props
  private var isStatusBarTranslucent = false
  private var isNavigationBarTranslucent = false
  private var isPreservingEdgeToEdge = false
  var active: Boolean = false
    set(value) {
      field = value
      if (value) {
        enable()
      } else {
        disable()
      }
    }

  // internal class members
  private var eventView: ReactViewGroup? = null
  private var wasMounted = false
  internal var callback: KeyboardAnimationCallback? = null
  private val config =
    KeyboardAnimationCallbackConfig(
      persistentInsetTypes = WindowInsetsCompat.Type.systemBars(),
      deferredInsetTypes = WindowInsetsCompat.Type.ime(),
      dispatchMode = WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE,
      hasTranslucentNavigationBar = isNavigationBarTranslucent,
    )

  // managers/watchers
  private val modalAttachedWatcher = ModalAttachedWatcher(this, reactContext, config, ::getKeyboardCallback)

  // region View life cycles
  override fun onAttachedToWindow() {
    super.onAttachedToWindow()

    if (!wasMounted) {
      // skip logic with callback re-creation if it was first render/mount
      wasMounted = true
      return
    }

    this.activate()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()

    this.deactivate()
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    this.reApplyWindowInsets()
  }
  // endregion

  // region State manager helpers
  private fun setupWindowInsets() {
    val rootView = reactContext.rootView
    if (rootView != null) {
      ViewCompat.setOnApplyWindowInsetsListener(rootView) { v, insets ->
        val content = reactContext.content
        val params =
          FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
          )

        val shouldApplyBottomPadding =
          !active && reactContext.windowSoftInputMode.isAdjustResize && !isPreservingEdgeToEdge
        val navBarInsets = insets.getInsets(WindowInsetsCompat.Type.navigationBars())
        val systemBarInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars())
        val keyboardInsets =
          if (!shouldApplyBottomPadding) 0 else insets.getInsets(WindowInsetsCompat.Type.ime()).bottom

        params.setMargins(
          navBarInsets.left,
          if (this.isStatusBarTranslucent) {
            0
          } else {
            systemBarInsets.top
          },
          navBarInsets.right,
          if (this.isNavigationBarTranslucent) {
            keyboardInsets
          } else {
            max(navBarInsets.bottom, keyboardInsets)
          },
        )
        content?.layoutParams = params

        ViewCompat.onApplyWindowInsets(v, insets)
      }
    }
  }

  fun setEdgeToEdge() {
    reactContext.currentActivity?.let {
      WindowCompat.setDecorFitsSystemWindows(
        it.window,
        false,
      )
    }
    // unclear legacy flag if it was set earlier
    reactContext.currentActivity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN)
  }

  private fun setupKeyboardCallbacks() {
    val activity = reactContext.currentActivity

    if (activity != null) {
      eventView = ReactViewGroup(context)
      val root = reactContext.content
      root?.addView(eventView)

      callback =
        KeyboardAnimationCallback(
          view = this,
          eventPropagationView = this,
          context = reactContext,
          config = config,
        )

      eventView?.let {
        ViewCompat.setWindowInsetsAnimationCallback(it, callback)
        ViewCompat.setOnApplyWindowInsetsListener(it, callback)
        it.requestApplyInsetsWhenAttached()
      }
    } else {
      Logger.w(TAG, "Can not setup keyboard animation listener, since `currentActivity` is null")
    }
  }

  private fun removeKeyboardCallbacks() {
    callback?.destroy()

    // capture view into closure, because if `onDetachedFromWindow` and `onAttachedToWindow`
    // dispatched synchronously after each other (open application on Fabric), then `.post`
    // will destroy just newly created view (if we have a reference via `this`)
    // and we'll have a memory leak or zombie-view
    val view = eventView
    // we need to remove view asynchronously from `onDetachedFromWindow` method
    // otherwise we may face NPE when app is getting opened via universal link
    // see https://github.com/kirillzyusko/react-native-keyboard-controller/issues/242
    // for more details
    Handler(Looper.getMainLooper()).post { view.removeSelf() }
  }

  private fun reApplyWindowInsets() {
    this.setupWindowInsets()
    this.requestApplyInsetsWhenAttached()
  }
  // endregion

  // region State managers
  private fun enable() {
    this.setupWindowInsets()
    this.activate()
  }

  private fun disable() {
    this.setupWindowInsets()
    this.deactivate()
  }

  private fun activate() {
    this.setupKeyboardCallbacks()
    modalAttachedWatcher.enable()
  }

  private fun deactivate() {
    this.removeKeyboardCallbacks()
    modalAttachedWatcher.disable()
  }
  // endregion

  // region Helpers
  private fun getKeyboardCallback(): KeyboardAnimationCallback? = this.callback
  // endregion

  // region Props setters
  fun setStatusBarTranslucent(isStatusBarTranslucent: Boolean) {
    this.isStatusBarTranslucent = isStatusBarTranslucent
  }

  fun setNavigationBarTranslucent(isNavigationBarTranslucent: Boolean) {
    this.isNavigationBarTranslucent = isNavigationBarTranslucent
    this.config.hasTranslucentNavigationBar = isNavigationBarTranslucent
  }

  fun setPreserveEdgeToEdge(isPreservingEdgeToEdge: Boolean) {
    this.isPreservingEdgeToEdge = isPreservingEdgeToEdge
  }
  // endregion
}
