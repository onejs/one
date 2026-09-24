package dev.onejs.onenative

import android.content.Context
import android.graphics.Rect
import android.os.Build
import android.view.WindowInsets
import androidx.core.content.ContextCompat
import androidx.core.util.Consumer
import androidx.window.WindowSdkExtensions
import androidx.window.java.layout.WindowInfoTrackerCallbackAdapter
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo
import com.facebook.react.bridge.UIManager
import com.facebook.react.bridge.UIManagerListener
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup
import kotlin.math.max
import kotlin.math.min

internal data class OneNativeReservedRegion(
    val id: String,
    val kind: String,
    val frame: Rect,
    val isActive: Boolean,
)

// view-scoped reserved regions, the Android side of UIView reservedRegions.
// a Jetpack WindowManager folding feature is a division, active while it
// separates the display or fully occludes it and inactive while the device
// lies flat; each display cutout is an active occlusion. Android reports no
// interaction margins, so margins stay zero. frames are in this view's own
// coordinates, kept only where they overlap it.
//
// the first reading is dispatched synchronously: fabric installs a view's
// event emitter after applying its first layout within one mount batch, so
// didMountItems is the earliest point that can deliver it before the frame.
@OptIn(UnstableReactNativeAPI::class)
class OneNativeReservedRegionsProviderView(context: Context) :
    ReactViewGroup(context), UIManagerListener {
  private var uiManager: UIManager? = null
  private var tracker: WindowInfoTrackerCallbackAdapter? = null
  private val layoutInfoConsumer = Consumer<WindowLayoutInfo> { info ->
    foldingFeatures = info.displayFeatures.filterIsInstance<FoldingFeature>()
    foldingFeaturesReady = true
    updateRegions()
  }
  private var foldingFeatures: List<FoldingFeature> = emptyList()
  private var foldingFeaturesReady = false
  private var lastRegions: List<OneNativeReservedRegion>? = null
  private var awaitingFirstDelivery = true
  private var regionsChangeHandler:
      ((List<OneNativeReservedRegion>, synchronous: Boolean) -> Boolean)? = null

  internal fun setOnRegionsChangeHandler(
      handler: ((List<OneNativeReservedRegion>, Boolean) -> Boolean)?
  ) {
    regionsChangeHandler = handler
    lastRegions = null
  }

  override fun willDispatchViewUpdates(uiManager: UIManager) {}

  override fun willMountItems(uiManager: UIManager) {}

  override fun didScheduleMountItems(uiManager: UIManager) {}

  override fun didDispatchMountItems(uiManager: UIManager) {}

  override fun didMountItems(uiManager: UIManager) {
    if (awaitingFirstDelivery) updateRegions()
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (awaitingFirstDelivery && uiManager == null) {
      uiManager =
          UIManagerHelper.getUIManagerForReactTag(UIManagerHelper.getReactContext(this), id)
      // runs for every mount batch in the app, so it goes after the first delivery.
      uiManager?.addUIManagerEventListener(this)
    }
    foldingFeaturesReady = false
    val activity = (context as? ThemedReactContext)?.currentActivity
    if (activity == null) {
      foldingFeaturesReady = true
    } else {
      val windowTracker = WindowInfoTracker.getOrCreate(context)
      if (WindowSdkExtensions.getInstance().extensionVersion >= 9) {
        foldingFeatures =
            windowTracker.getCurrentWindowLayoutInfo(activity).displayFeatures
                .filterIsInstance<FoldingFeature>()
        foldingFeaturesReady = true
      }
      tracker = WindowInfoTrackerCallbackAdapter(windowTracker).also {
        it.addWindowLayoutInfoListener(
            activity, ContextCompat.getMainExecutor(context), layoutInfoConsumer)
      }
    }
    updateRegions()
  }

  override fun onDetachedFromWindow() {
    stopFirstDeliveryListener()
    tracker?.removeWindowLayoutInfoListener(layoutInfoConsumer)
    tracker = null
    super.onDetachedFromWindow()
  }

  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    super.onLayout(changed, left, top, right, bottom)
    updateRegions()
  }

  override fun onApplyWindowInsets(insets: WindowInsets): WindowInsets {
    val result = super.onApplyWindowInsets(insets)
    updateRegions()
    return result
  }

  private fun updateRegions() {
    val handler = regionsChangeHandler ?: return
    if (!isAttachedToWindow || !foldingFeaturesReady || width == 0 || height == 0) return
    val origin = IntArray(2)
    getLocationInWindow(origin)
    val regions = mutableListOf<OneNativeReservedRegion>()
    for (feature in foldingFeatures) {
      val frame = overlappingFrame(feature.bounds, origin) ?: continue
      val active =
          feature.isSeparating || feature.occlusionType == FoldingFeature.OcclusionType.FULL
      regions.add(OneNativeReservedRegion("division-${regions.size + 1}", "division", frame, active))
    }
    val cutouts =
        if (Build.VERSION.SDK_INT >= 28) rootWindowInsets?.displayCutout?.boundingRects.orEmpty()
        else emptyList()
    for (bounds in cutouts) {
      val frame = overlappingFrame(bounds, origin) ?: continue
      regions.add(OneNativeReservedRegion("occlusion-${regions.size + 1}", "occlusion", frame, true))
    }
    if (regions == lastRegions) return
    if (!handler(regions, awaitingFirstDelivery)) return
    lastRegions = regions
    if (awaitingFirstDelivery) {
      awaitingFirstDelivery = false
      stopFirstDeliveryListener()
    }
  }

  private fun stopFirstDeliveryListener() {
    uiManager?.removeUIManagerEventListener(this)
    uiManager = null
  }

  private fun overlappingFrame(bounds: Rect, origin: IntArray): Rect? {
    val frame =
        Rect(bounds.left - origin[0], bounds.top - origin[1], bounds.right - origin[0], bounds.bottom - origin[1])
    val overlapWidth = min(width, frame.right) - max(0, frame.left)
    val overlapHeight = min(height, frame.bottom) - max(0, frame.top)
    if (overlapWidth < 0 || overlapHeight < 0 || (overlapWidth == 0 && overlapHeight == 0)) return null
    return frame
  }

  fun resetForReuse() {
    regionsChangeHandler = null
    lastRegions = null
    awaitingFirstDelivery = true
  }
}
