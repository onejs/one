package dev.onejs.keyboard.listeners

import android.view.View
import android.view.ViewTreeObserver.OnGlobalFocusChangeListener
import android.widget.EditText
import androidx.core.graphics.Insets
import androidx.core.view.OnApplyWindowInsetsListener
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup
import dev.onejs.keyboard.constants.Keyboard
import dev.onejs.keyboard.constants.UIThread
import dev.onejs.keyboard.events.KeyboardTransitionEvent
import dev.onejs.keyboard.extensions.appearance
import dev.onejs.keyboard.extensions.dispatchEvent
import dev.onejs.keyboard.extensions.dp
import dev.onejs.keyboard.extensions.emitEvent
import dev.onejs.keyboard.extensions.isKeyboardAnimation
import dev.onejs.keyboard.extensions.keepShadowNodesInSync
import dev.onejs.keyboard.extensions.keyboardType
import dev.onejs.keyboard.interactive.InteractiveKeyboardProvider
import dev.onejs.keyboard.log.Logger
import dev.onejs.keyboard.traversal.FocusedInputHolder
import kotlin.math.abs

private val TAG = KeyboardAnimationCallback::class.qualifiedName
private val isResizeHandledInCallbackMethods = Keyboard.IS_ANIMATION_EMULATED

private data class PendingKeyboardStartEvent(
  val keyboardHeight: Double,
  val progress: Double,
  val duration: Int,
  val target: Int,
)

data class KeyboardAnimationCallbackConfig(
  val persistentInsetTypes: Int,
  val deferredInsetTypes: Int,
  val dispatchMode: Int = WindowInsetsAnimationCompat.Callback.DISPATCH_MODE_STOP,
  var hasTranslucentNavigationBar: Boolean,
)

interface Suspendable {
  var isSuspended: Boolean

  fun suspend(suspended: Boolean) {
    isSuspended = suspended
  }
}

class KeyboardAnimationCallback(
  val eventPropagationView: ReactViewGroup,
  val view: View,
  val context: ThemedReactContext?,
  private val config: KeyboardAnimationCallbackConfig,
) : WindowInsetsAnimationCompat.Callback(config.dispatchMode),
  OnApplyWindowInsetsListener,
  Suspendable {
  private val surfaceId = UIManagerHelper.getSurfaceId(eventPropagationView)

  // state variables
  private var persistentKeyboardHeight = getCurrentKeyboardHeight()
  private var prevKeyboardHeight = getCurrentKeyboardHeight()
  private var isKeyboardVisible = false
  private var isTransitioning = false
  private var duration = 0
  private var viewTagFocused = -1
  private var pendingStartEvent: PendingKeyboardStartEvent? = null
  private var animationsToSkip = hashSetOf<WindowInsetsAnimationCompat>()
  private val isKeyboardInteractive: Boolean
    get() = duration == -1
  override var isSuspended: Boolean = false

  // listeners
  private val focusListener =
    OnGlobalFocusChangeListener { oldFocus, newFocus ->
      if (newFocus is EditText) {
        viewTagFocused = newFocus.id

        // keyboard is visible and focus has been changed
        if (this.isKeyboardVisible && oldFocus !== null) {
          // imitate iOS behavior and send two instant start/end events containing an info about new tag
          // 1. onStart/onMove/onEnd can be still dispatched after, if keyboard change size (numeric -> alphabetic type)
          // 2. event should be send only when keyboard is visible, since this event arrives earlier -> `tag` will be
          // 100% included in onStart/onMove/onEnd life cycles, but triggering onStart/onEnd several time
          // can bring breaking changes
          context.dispatchEvent(
            eventPropagationView.id,
            KeyboardTransitionEvent(
              surfaceId,
              eventPropagationView.id,
              KeyboardTransitionEvent.Start,
              this.persistentKeyboardHeight,
              1.0,
              0,
              viewTagFocused,
            ),
          )
          context.dispatchEvent(
            eventPropagationView.id,
            KeyboardTransitionEvent(
              surfaceId,
              eventPropagationView.id,
              KeyboardTransitionEvent.End,
              this.persistentKeyboardHeight,
              1.0,
              0,
              viewTagFocused,
            ),
          )
          context.emitEvent("keyboardWillShow", getEventParams(this.persistentKeyboardHeight))
          context.emitEvent("keyboardDidShow", getEventParams(this.persistentKeyboardHeight))
        }
      }
    }
  internal var layoutObserver: FocusedInputObserver? = null

  init {
    require(config.persistentInsetTypes and config.deferredInsetTypes == 0) {
      "persistentInsetTypes and deferredInsetTypes can not contain any of " +
        " same WindowInsetsCompat.Type values"
    }

    layoutObserver = FocusedInputObserver(view = view, eventPropagationView = eventPropagationView, context = context)
    view.viewTreeObserver.addOnGlobalFocusChangeListener(focusListener)
  }

  /**
   * When keyboard changes its size we have different behavior per APIs.
   * On 21<=API<30 - WindowInsetsAnimationCompat dispatches onStart/onProgress/onEnd events.
   * On API>=30 - WindowInsetsAnimationCompat doesn't dispatch anything. As a result behavior
   * between different Android versions is not consistent. On old Android versions we have a
   * reaction, on newer versions - not. In my understanding it's a bug in core library and the
   * behavior should be consistent across all versions of platform. To level the difference we
   * have to implement `onApplyWindowInsets` listener and simulate onStart/onProgress/onEnd
   * events when keyboard changes its size.
   */
  override fun onApplyWindowInsets(
    v: View,
    insets: WindowInsetsCompat,
  ): WindowInsetsCompat {
    val keyboardHeight = getCurrentKeyboardHeight()
    // when keyboard appears values will be (false && true)
    // when keyboard disappears values will be (true && false)
    val isKeyboardShown = isKeyboardVisible && isKeyboardVisible()
    // `isTransitioning` check is needed to avoid calls of `onApplyWindowInsets` during keyboard animation
    // having such check allows us not to dispatch unnecessary incorrect events
    // the condition will be executed only when keyboard is opened and changes its size
    // (for example it happens when user changes keyboard type from 'text' to 'emoji' input
    //
    // `InteractiveKeyboardProvider.isInteractive` detect case when keyboard moves
    // because of the gesture
    val isMoving = isTransitioning || InteractiveKeyboardProvider.isInteractive
    val isKeyboardFullyVisible = isKeyboardShown && !isMoving
    // when keyboard is opened and we trigger a transition from screen A to screen B,
    // then this method is getting called and we start dispatching events, and later original
    // `onStart`/`onProgress`/`onEnd` emitting their events (since keyboard is closing) and we
    // are getting race conditions.
    //
    // but in general this check is a must because we are detecting keyboard size changes
    // in this method
    val isKeyboardSizeEqual = this.persistentKeyboardHeight == keyboardHeight

    if (isKeyboardFullyVisible && !isKeyboardSizeEqual && !isResizeHandledInCallbackMethods) {
      Logger.i(TAG, "onApplyWindowInsets: ${this.persistentKeyboardHeight} -> $keyboardHeight")
      this.onKeyboardResized(keyboardHeight)

      return insets
    }

    // always verify insets, because sometimes default lifecycle methods may not be invoked
    // (when we press "Share" on Android 16, when Modal closes keyboard, when permission Alert presented etc.)
    val newHeight = getCurrentKeyboardHeight(insets)
    if (prevKeyboardHeight != newHeight && !isMoving && !isSuspended) {
      Logger.w(
        TAG,
        "detected desynchronized state - force updating it: $newHeight",
      )
      this.syncKeyboardPosition(newHeight, newHeight > 0)
    }

    return insets
  }

  override fun onPrepare(animation: WindowInsetsAnimationCompat) {
    super.onPrepare(animation)

    if (!animation.isKeyboardAnimation || isSuspended) {
      return
    }

    isTransitioning = true
  }

  @Suppress("detekt:ReturnCount")
  override fun onStart(
    animation: WindowInsetsAnimationCompat,
    bounds: WindowInsetsAnimationCompat.BoundsCompat,
  ): WindowInsetsAnimationCompat.BoundsCompat {
    if (!animation.isKeyboardAnimation || isSuspended) {
      return bounds
    }

    pendingStartEvent = null
    isKeyboardVisible = isKeyboardVisible()
    duration = animation.durationMillis.toInt()
    val keyboardHeight = getCurrentKeyboardHeight()

    if (isKeyboardVisible) {
      // do not update it on hide, since back progress will be invalid
      this.persistentKeyboardHeight = keyboardHeight
    }

    // keyboard gets resized - we do not want to have a default animated transition
    // so we skip these animations
    val isKeyboardResized = keyboardHeight != 0.0 && prevKeyboardHeight != keyboardHeight
    val isKeyboardShown = isKeyboardVisible && prevKeyboardHeight != 0.0
    if (isKeyboardResized && isKeyboardShown && isResizeHandledInCallbackMethods) {
      onKeyboardResized(keyboardHeight)
      animationsToSkip.add(animation)

      return bounds
    }

    context.emitEvent(
      if (!isKeyboardVisible) "keyboardWillHide" else "keyboardWillShow",
      getEventParams(keyboardHeight),
    )

    Logger.i(TAG, "HEIGHT:: $keyboardHeight TAG:: $viewTagFocused")
    // AOSP calls app onStart before its internal listener.onReady. Dispatching
    // a RN event here lets Reanimated synchronously mutate Fabric and can
    // cancel the pending IME controller before Android starts its animator.
    pendingStartEvent =
      PendingKeyboardStartEvent(
        keyboardHeight,
        if (!isKeyboardVisible) 0.0 else 1.0,
        duration,
        viewTagFocused,
      )

    return super.onStart(animation, bounds)
  }

  override fun onProgress(
    insets: WindowInsetsCompat,
    runningAnimations: List<WindowInsetsAnimationCompat>,
  ): WindowInsetsCompat {
    // onProgress() is called when any of the running animations progress...

    // ignore non-keyboard animation or animation that we intentionally want to skip
    val shouldSkipAnimation =
      runningAnimations.find {
        it.isKeyboardAnimation && !animationsToSkip.contains(it)
      } == null
    if (isSuspended || shouldSkipAnimation) {
      return insets
    }

    // First we get the insets which are potentially deferred
    val typesInset = insets.getInsets(config.deferredInsetTypes)
    // Then we get the persistent inset types which are applied as padding during layout
    var otherInset = insets.getInsets(config.persistentInsetTypes)

    // Now that we subtract the two insets, to calculate the difference. We also coerce
    // the insets to be >= 0, to make sure we don't use negative insets.
    if (config.hasTranslucentNavigationBar) {
      otherInset = Insets.NONE
    }
    val diff =
      Insets.subtract(typesInset, otherInset).let {
        Insets.max(it, Insets.NONE)
      }
    val diffY = (diff.bottom - diff.top).toFloat()
    val height = diffY.dp

    var progress = 0.0
    try {
      progress = abs((height / persistentKeyboardHeight)).let { if (it.isNaN() || it.isInfinite()) 0.0 else it }
    } catch (e: ArithmeticException) {
      // do nothing, just log an exception send progress as 0
      Logger.w(TAG, "Caught arithmetic exception during `progress` calculation: $e")
    }
    Logger.i(
      TAG,
      "DiffY: $diffY $height $progress ${InteractiveKeyboardProvider.isInteractive} $viewTagFocused",
    )

    flushPendingStartEvent()
    if (isTransitioning) {
      val event =
        if (InteractiveKeyboardProvider.isInteractive) {
          KeyboardTransitionEvent.Interactive
        } else {
          KeyboardTransitionEvent.Move
        }
      context.dispatchEvent(
        eventPropagationView.id,
        KeyboardTransitionEvent(
          surfaceId,
          eventPropagationView.id,
          event,
          height,
          progress,
          duration,
          viewTagFocused,
        ),
      )
    }

    return insets
  }

  override fun onEnd(animation: WindowInsetsAnimationCompat) {
    super.onEnd(animation)

    if (!animation.isKeyboardAnimation || isSuspended) {
      return
    }

    isTransitioning = false
    duration = animation.durationMillis.toInt()

    val runnable =
      Runnable {
        val keyboardHeight = getCurrentKeyboardHeight()

        isKeyboardVisible = isKeyboardVisible()
        prevKeyboardHeight = keyboardHeight

        if (animation in animationsToSkip) {
          duration = 0
          pendingStartEvent = null
          animationsToSkip.remove(animation)
          return@Runnable
        }

        flushPendingStartEvent()

        context.emitEvent(
          if (!isKeyboardVisible) "keyboardDidHide" else "keyboardDidShow",
          getEventParams(keyboardHeight),
        )
        context.dispatchEvent(
          eventPropagationView.id,
          KeyboardTransitionEvent(
            surfaceId,
            eventPropagationView.id,
            KeyboardTransitionEvent.End,
            keyboardHeight,
            if (!isKeyboardVisible) 0.0 else 1.0,
            duration,
            viewTagFocused,
          ),
        )

        // reset to initial state
        duration = 0

        context.keepShadowNodesInSync(eventPropagationView.id)
      }

    if (isKeyboardInteractive) {
      // in case of interactive keyboard we can not read keyboard frame straight away
      // (because we'll always read `0`), so we are posting runnable to the next frame on the main thread
      view.postDelayed(runnable, UIThread.NEXT_FRAME)
    } else {
      runnable.run()
    }
  }

  fun syncKeyboardPosition(
    height: Double? = null,
    isVisible: Boolean? = null,
  ) {
    val keyboardHeight = height ?: getCurrentKeyboardHeight()
    // update internal state
    isKeyboardVisible = isVisible ?: isKeyboardVisible()
    prevKeyboardHeight = keyboardHeight
    isTransitioning = false
    duration = 0
    pendingStartEvent = null

    context.emitEvent(
      if (!isKeyboardVisible) "keyboardDidHide" else "keyboardDidShow",
      getEventParams(keyboardHeight),
    )
    // dispatch full lifecycle of onStart/onMove/onEnd events to update RN animated value and
    // keep imperative hooks like `useKeyboardHandler` in sync
    listOf(
      KeyboardTransitionEvent.Start,
      KeyboardTransitionEvent.Move,
      KeyboardTransitionEvent.End,
    ).forEach { eventName ->
      context.dispatchEvent(
        eventPropagationView.id,
        KeyboardTransitionEvent(
          surfaceId,
          eventPropagationView.id,
          eventName,
          keyboardHeight,
          if (!isKeyboardVisible) 0.0 else 1.0,
          duration,
          viewTagFocused,
        ),
      )
    }
  }

  fun destroy() {
    pendingStartEvent = null
    view.viewTreeObserver.removeOnGlobalFocusChangeListener(focusListener)
    layoutObserver?.destroy()
  }

  /*
   * Method that dispatches necessary events when keyboard gets resized
   */
  private fun onKeyboardResized(keyboardHeight: Double) {
    duration = 0

    layoutObserver?.syncUpLayout()

    context.emitEvent("keyboardWillShow", getEventParams(keyboardHeight))
    listOf(
      KeyboardTransitionEvent.Start,
      KeyboardTransitionEvent.Move,
      KeyboardTransitionEvent.End,
    ).forEach { eventName ->
      context.dispatchEvent(
        eventPropagationView.id,
        KeyboardTransitionEvent(
          surfaceId,
          eventPropagationView.id,
          eventName,
          keyboardHeight,
          1.0,
          0,
          viewTagFocused,
        ),
      )
    }
    context.emitEvent("keyboardDidShow", getEventParams(keyboardHeight))
    context.keepShadowNodesInSync(eventPropagationView.id)

    this.persistentKeyboardHeight = keyboardHeight
  }

  private fun isKeyboardVisible(): Boolean {
    val insets = ViewCompat.getRootWindowInsets(view)

    return insets?.isVisible(WindowInsetsCompat.Type.ime()) ?: false
  }

  private fun getCurrentKeyboardHeight(insets: WindowInsetsCompat? = null): Double {
    val root = ViewCompat.getRootWindowInsets(view)
    val final = insets ?: root
    val keyboardHeight = final?.getInsets(WindowInsetsCompat.Type.ime())?.bottom ?: 0
    val navigationBar =
      if (config.hasTranslucentNavigationBar) {
        0
      } else {
        root?.getInsets(WindowInsetsCompat.Type.navigationBars())?.bottom ?: 0
      }

    // on hide it will be negative value, so we are using max function
    return (keyboardHeight - navigationBar).toFloat().dp.coerceAtLeast(0.0)
  }

  private fun flushPendingStartEvent() {
    val event = pendingStartEvent ?: return

    pendingStartEvent = null
    layoutObserver?.syncUpLayout()
    context.dispatchEvent(
      eventPropagationView.id,
      KeyboardTransitionEvent(
        surfaceId,
        eventPropagationView.id,
        KeyboardTransitionEvent.Start,
        event.keyboardHeight,
        event.progress,
        event.duration,
        event.target,
      ),
    )
  }

  private fun getEventParams(height: Double): WritableMap {
    val params: WritableMap = Arguments.createMap()
    params.putDouble("height", height)
    params.putInt("duration", duration)
    params.putDouble("timestamp", System.currentTimeMillis().toDouble())
    params.putInt("target", viewTagFocused)
    params.putString("type", FocusedInputHolder.get()?.keyboardType)
    params.putString("appearance", context.appearance)

    return params
  }
}
