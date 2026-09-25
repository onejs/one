package dev.onejs.onenative

import android.app.PictureInPictureParams
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Rect
import android.os.Build
import android.util.Rational
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import androidx.core.app.PictureInPictureModeChangedInfo
import androidx.core.util.Consumer
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.views.view.ReactViewGroup

// uniform picture in picture (One.UI.PictureInPicture) on android. android
// shrinks the whole activity into the pip window, so while it is up the react
// root keeps its full size (no reflow) and a window-sized mirror draws only
// this view, scaled to fit. an activity in pip is paused, which would stop js
// timers, so the react host is resumed again for as long as the window shows.
class OneNativePictureInPictureView(private val reactContext: ThemedReactContext) :
  ReactViewGroup(reactContext) {

  private var requested = false
  private var autoEnter = false
  private var inPictureInPicture = false
  private var hostKeptLive = false
  private var mirror: Mirror? = null
  private var observed: ComponentActivity? = null

  private val activity: ComponentActivity?
    get() = reactContext.currentActivity as? ComponentActivity

  private val supported: Boolean
    get() =
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)

  private val modeListener = Consumer<PictureInPictureModeChangedInfo> { info ->
    if (info.isInPictureInPictureMode) enteredPictureInPicture() else exitedPictureInPicture()
  }

  // below android 12 there is no auto enter, so leaving the app enters it here.
  private val userLeaveHintListener = Runnable {
    if (autoEnter && Build.VERSION.SDK_INT < Build.VERSION_CODES.S) enter()
  }

  private val lifecycleObserver = LifecycleEventObserver { _, event ->
    when (event) {
      // ReactActivity pauses the host right after this event; resume it once
      // that has run.
      Lifecycle.Event.ON_PAUSE -> post { keepHostLive() }
      // the pip window closed: the pause android skipped for pip happens now.
      Lifecycle.Event.ON_STOP -> if (hostKeptLive) {
        hostKeptLive = false
        activity?.let { host()?.onHostPause(it) }
      }
      Lifecycle.Event.ON_RESUME -> hostKeptLive = false
      else -> {}
    }
  }

  // active is a request acted on when it changes; onNativePictureInPictureChange
  // reports what the system actually did.
  fun setActive(value: Boolean) {
    if (value == requested) return
    requested = value
    if (value) {
      enter()
    } else if (inPictureInPicture) {
      // there is no call to leave pip; bringing the task back expands it.
      val activity = activity ?: return
      activity.startActivity(
        Intent(activity, activity.javaClass).addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
      )
    }
  }

  fun setAutoEnter(value: Boolean) {
    if (value == autoEnter) return
    autoEnter = value
    updateParams()
  }

  private fun enter() {
    val activity = activity
    if (!supported || activity == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      emit(false)
      return
    }
    if (activity.isInPictureInPictureMode) return
    if (!activity.enterPictureInPictureMode(params())) emit(false)
  }

  private fun params(): PictureInPictureParams {
    val bounds = Rect()
    getGlobalVisibleRect(bounds)
    // android rejects ratios outside 1:2.39 and 2.39:1.
    val ratio = if (width > 0 && height > 0) width.toFloat() / height else 16f / 9f
    val clamped = ratio.coerceIn(1f / 2.39f, 2.39f)
    val builder =
      PictureInPictureParams.Builder()
        .setAspectRatio(Rational((clamped * 10000).toInt(), 10000))
        .setSourceRectHint(bounds)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder.setAutoEnterEnabled(autoEnter).setSeamlessResizeEnabled(false)
    }
    return builder.build()
  }

  private fun updateParams() {
    if (!supported || Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    if (autoEnter || Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      activity?.setPictureInPictureParams(params())
    }
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    // auto enter animates from the current bounds, so keep them current.
    if (changed && autoEnter && !inPictureInPicture) updateParams()
  }

  private fun enteredPictureInPicture() {
    if (inPictureInPicture) return
    inPictureInPicture = true
    val activity = activity ?: return
    val content = activity.findViewById<ViewGroup>(android.R.id.content)
    val root = content.getChildAt(0)
    if (root != null && root.width > 0) {
      root.layoutParams = FrameLayout.LayoutParams(root.width, root.height)
    }
    val decor = activity.window.decorView as ViewGroup
    mirror = Mirror(this).also {
      decor.addView(it, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    }
    keepHostLive()
    emit(true)
  }

  private fun exitedPictureInPicture() {
    if (!inPictureInPicture) return
    inPictureInPicture = false
    requested = false
    mirror?.let { (it.parent as? ViewGroup)?.removeView(it) }
    mirror = null
    activity?.findViewById<ViewGroup>(android.R.id.content)?.getChildAt(0)?.layoutParams =
      FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    emit(false)
  }

  private fun host() = (context.applicationContext as? ReactApplication)?.reactHost

  private fun keepHostLive() {
    val activity = activity ?: return
    if (hostKeptLive || !inPictureInPicture) return
    if (activity.lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) return
    hostKeptLive = true
    host()?.onHostResume(activity)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    val activity = activity ?: return
    observed = activity
    activity.addOnPictureInPictureModeChangedListener(modeListener)
    activity.addOnUserLeaveHintListener(userLeaveHintListener)
    activity.lifecycle.addObserver(lifecycleObserver)
    updateParams()
  }

  override fun onDetachedFromWindow() {
    observed?.let {
      it.removeOnPictureInPictureModeChangedListener(modeListener)
      it.removeOnUserLeaveHintListener(userLeaveHintListener)
      it.lifecycle.removeObserver(lifecycleObserver)
      if (autoEnter && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && supported) {
        it.setPictureInPictureParams(PictureInPictureParams.Builder().setAutoEnterEnabled(false).build())
      }
    }
    observed = null
    exitedPictureInPicture()
    super.onDetachedFromWindow()
  }

  private fun emit(active: Boolean) {
    UIManagerHelper.getEventDispatcher(UIManagerHelper.getReactContext(this))?.dispatchEvent(
      OneNativePictureInPictureChangeEvent(UIManagerHelper.getSurfaceId(this), id, active)
    )
  }

  // fills the pip window with the source view scaled to fit, redrawn every
  // frame so the content stays live.
  private class Mirror(private val source: View) : View(source.context) {
    override fun onDraw(canvas: Canvas) {
      canvas.drawColor(Color.BLACK)
      if (source.width > 0 && source.height > 0) {
        val scale = minOf(width.toFloat() / source.width, height.toFloat() / source.height)
        val save = canvas.save()
        canvas.translate(
          (width - source.width * scale) / 2f, (height - source.height * scale) / 2f)
        canvas.scale(scale, scale)
        source.draw(canvas)
        canvas.restoreToCount(save)
      }
      postInvalidateOnAnimation()
    }
  }
}

internal class OneNativePictureInPictureChangeEvent(
  surfaceId: Int,
  viewTag: Int,
  private val active: Boolean,
) : Event<OneNativePictureInPictureChangeEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = "topNativePictureInPictureChange"

  override fun canCoalesce(): Boolean = false

  override fun getEventData(): WritableMap = Arguments.createMap().apply { putBoolean("active", active) }
}
