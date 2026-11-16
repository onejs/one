package dev.onejs.keyboard.views

import android.annotation.SuppressLint
import android.graphics.Rect
import android.os.Build
import android.view.MotionEvent
import android.view.VelocityTracker
import android.view.ViewConfiguration
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup
import dev.onejs.keyboard.extensions.copyBoundsInWindow
import dev.onejs.keyboard.extensions.px
import dev.onejs.keyboard.interactive.KeyboardAnimationController
import dev.onejs.keyboard.interactive.interpolators.Interpolator
import dev.onejs.keyboard.interactive.interpolators.IosInterpolator
import dev.onejs.keyboard.interactive.interpolators.LinearInterpolator
import kotlin.math.absoluteValue
import kotlin.math.roundToInt

val interpolators =
  mapOf(
    "linear" to LinearInterpolator(),
    "ios" to IosInterpolator(),
  )

@Suppress("detekt:TooManyFunctions")
@SuppressLint("ViewConstructor")
class KeyboardGestureAreaReactViewGroup(
  private val reactContext: ThemedReactContext,
) : ReactViewGroup(reactContext) {
  // internal state management
  private var isHandling = false
  private var lastTouchX = 0f
  private var lastTouchY = 0f
  private var lastWindowY = 0
  private var keyboardHeight = 0

  // react props
  private var offset = 0
  private var interpolator: Interpolator = LinearInterpolator()
  private var scrollKeyboardOnScreenWhenNotVisible = false
  private var scrollKeyboardOffScreenWhenVisible = true

  private val bounds = Rect()

  private val controller = KeyboardAnimationController()

  private var velocityTracker: VelocityTracker? = null

  override fun dispatchTouchEvent(event: MotionEvent?): Boolean {
    if (velocityTracker == null) {
      // Obtain a VelocityTracker if we don't have one yet
      velocityTracker = VelocityTracker.obtain()
    }

    when (event?.action) {
      MotionEvent.ACTION_DOWN -> this.onActionDown(event)
      MotionEvent.ACTION_MOVE -> this.onActionMove(event)
      MotionEvent.ACTION_UP -> this.onActionUp(event)
      MotionEvent.ACTION_CANCEL -> this.onActionCancel()
    }

    return super.dispatchTouchEvent(event)
  }

  // region Props setters
  fun setOffset(offset: Double) {
    this.offset = offset.toFloat().px.toInt()
  }

  fun setInterpolator(interpolator: String) {
    this.interpolator = interpolators[interpolator] ?: LinearInterpolator()
  }

  fun setScrollKeyboardOnScreenWhenNotVisible(scrollImeOnScreenWhenNotVisible: Boolean) {
    this.scrollKeyboardOnScreenWhenNotVisible = scrollImeOnScreenWhenNotVisible
  }

  fun setScrollKeyboardOffScreenWhenVisible(scrollImeOffScreenWhenVisible: Boolean) {
    this.scrollKeyboardOffScreenWhenVisible = scrollImeOffScreenWhenVisible
  }
  // endregion

  // region Handlers
  private fun onActionDown(event: MotionEvent) {
    velocityTracker?.addMovement(event)

    lastTouchX = event.x
    lastTouchY = event.y

    this.copyBoundsInWindow(bounds)
    lastWindowY = bounds.top
  }

  private fun onActionMove(event: MotionEvent) {
    // Since the view is likely to be translated/moved as the WindowInsetsAnimation
    // progresses, we need to make sure we account for that change in our touch
    // handling. We do that by keeping track of the view's Y position in the window,
    // and detecting the difference between the current bounds.
    this.copyBoundsInWindow(bounds)
    val windowOffsetY = bounds.top - lastWindowY

    // We then make a copy of the MotionEvent, and offset it with the calculated
    // windowOffsetY. We can then pass it to the VelocityTracker.
    val velocityTrackerEvent = MotionEvent.obtain(event)
    velocityTrackerEvent.offsetLocation(0f, windowOffsetY.toFloat())
    velocityTracker?.addMovement(velocityTrackerEvent)

    val dx = velocityTrackerEvent.x - lastTouchX
    val dy = velocityTrackerEvent.y - lastTouchY

    if (!isHandling) {
      // If we're not currently handling the touch gesture, lets check if we should
      // start handling, by seeing if the gesture is majorly vertical, and
      // larger than the touch slop
      isHandling = dy.absoluteValue > dx.absoluteValue &&
        dy.absoluteValue >= ViewConfiguration.get(this.context).scaledTouchSlop
    }

    if (isHandling) {
      if (controller.isInsetAnimationInProgress()) {
        if (keyboardHeight == 0) {
          this.keyboardHeight = controller.getCurrentKeyboardHeight()
        }
        // If we currently have control, we can update the IME insets to 'scroll'
        // the IME in
        val moveBy =
          this.interpolator.interpolate(
            dy.roundToInt(),
            this.getWindowHeight() - event.rawY.toInt(),
            controller.getCurrentKeyboardHeight(),
            offset,
          )

        if (moveBy != 0) {
          controller.insetBy(moveBy)
        }
      } else if (!controller.isInsetAnimationRequestPending()) {
        val rootInsets = ViewCompat.getRootWindowInsets(this)
        val moveBy =
          this.interpolator.interpolate(
            dy.roundToInt(),
            this.getWindowHeight() - event.rawY.toInt(),
            rootInsets?.getInsets(WindowInsetsCompat.Type.ime())?.bottom ?: 0,
            offset,
          )

        if (
          moveBy != 0 &&
          shouldStartRequest(
            dy = dy,
            imeVisible = rootInsets?.isVisible(WindowInsetsCompat.Type.ime()) == true,
          )
        ) {
          controller.startControlRequest(this)
        }
      }

      // Lastly we record the event X, Y, and view's Y window position, for the
      // next touch event
      lastTouchY = event.y
      lastTouchX = event.x
      lastWindowY = bounds.top
    }
  }

  private fun onActionUp(event: MotionEvent) {
    velocityTracker?.addMovement(event)
    velocityTracker?.computeCurrentVelocity(VELOCITY_UNITS)

    val velocityY = velocityTracker?.yVelocity
    val isKeyboardPositionChanged =
      // check `isInsetAnimationInProgress()` before, since direct usage of `getCurrentKeyboardHeight()`
      // may throw exception
      !controller.isInsetAnimationInProgress() ||
        this.keyboardHeight != controller.getCurrentKeyboardHeight()
    // if keyboard height was changed after finger movement -> we need to calculate final position
    // and make an animated transition
    val passedVelocityY = if (isKeyboardPositionChanged) velocityY else null

    // If we received a ACTION_UP event, end any current WindowInsetsAnimation passing
    // in the calculated Y velocity
    controller.animateToFinish(passedVelocityY)

    // Reset our touch handling state
    reset()
  }

  private fun onActionCancel() {
    // If we received a ACTION_CANCEL event, cancel any current WindowInsetsAnimation
    controller.cancel()
    // Reset our touch handling state
    reset()
  }
  // endregion

  /**
   * Resets all of our internal state.
   */
  private fun reset() {
    // Clear all of our internal state
    isHandling = false
    lastTouchX = 0f
    lastTouchY = 0f
    lastWindowY = 0
    keyboardHeight = 0
    bounds.setEmpty()

    velocityTracker?.recycle()
    velocityTracker = null
  }

  /**
   * Returns true if the given [dy], [IME visibility][imeVisible], and constructor options
   * support a IME animation request.
   */
  private fun shouldStartRequest(
    dy: Float,
    imeVisible: Boolean,
  ) = when {
    // If the user is scroll up, return true if scrollImeOnScreenWhenNotVisible is true, and
    // the IME is not currently visible
    dy < 0 -> !imeVisible && scrollKeyboardOnScreenWhenNotVisible
    // If the user is scroll down, start the request if scrollImeOffScreenWhenVisible is true,
    // and the IME is currently visible
    dy > 0 -> imeVisible && scrollKeyboardOffScreenWhenVisible
    // Otherwise, return false
    else -> false
  }

  private fun getWindowHeight(): Int {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      val metrics = reactContext.currentActivity?.windowManager?.currentWindowMetrics

      return metrics?.bounds?.height() ?: 0
    }

    return 0
  }

  companion object {
    // Calculate the current velocity over 500 milliseconds
    private const val VELOCITY_UNITS = 500
  }
}
