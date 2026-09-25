package dev.onejs.onenative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.events.Event
import com.facebook.react.viewmanagers.OneNativeReservedRegionsProviderManagerDelegate
import com.facebook.react.viewmanagers.OneNativeReservedRegionsProviderManagerInterface

@ReactModule(name = OneNativeReservedRegionsProviderManager.REACT_CLASS)
class OneNativeReservedRegionsProviderManager :
    ViewGroupManager<OneNativeReservedRegionsProviderView>(),
    OneNativeReservedRegionsProviderManagerInterface<OneNativeReservedRegionsProviderView> {

  private val delegate: ViewManagerDelegate<OneNativeReservedRegionsProviderView> =
      OneNativeReservedRegionsProviderManagerDelegate(this)

  override fun getName(): String = REACT_CLASS

  override fun createViewInstance(
      reactContext: ThemedReactContext
  ): OneNativeReservedRegionsProviderView = OneNativeReservedRegionsProviderView(reactContext)

  override fun getDelegate(): ViewManagerDelegate<OneNativeReservedRegionsProviderView> = delegate

  override fun addEventEmitters(
      reactContext: ThemedReactContext,
      view: OneNativeReservedRegionsProviderView
  ) {
    super.addEventEmitters(reactContext, view)
    view.setOnRegionsChangeHandler { regions, synchronous ->
      val dispatcher =
          UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.id)
              ?: return@setOnRegionsChangeHandler false
      dispatcher.dispatchEvent(
          OneNativeReservedRegionsChangeEvent(
              UIManagerHelper.getSurfaceId(view), view.id, regions, synchronous))
      true
    }
  }

  override fun prepareToRecycleView(
      reactContext: ThemedReactContext,
      view: OneNativeReservedRegionsProviderView,
  ): OneNativeReservedRegionsProviderView? {
    val recyclable = super.prepareToRecycleView(reactContext, view) ?: return null
    recyclable.resetForReuse()
    return recyclable
  }

  override fun onDropViewInstance(view: OneNativeReservedRegionsProviderView) {
    view.resetForReuse()
    super.onDropViewInstance(view)
  }

  override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
    val events =
        super.getExportedCustomDirectEventTypeConstants()?.toMutableMap() ?: mutableMapOf()
    events[OneNativeReservedRegionsChangeEvent.NAME] =
        mapOf("registrationName" to "onNativeReservedRegionsChange")
    return events
  }

  companion object {
    const val REACT_CLASS = "OneNativeReservedRegionsProvider"
  }
}

internal class OneNativeReservedRegionsChangeEvent(
    surfaceId: Int,
    viewTag: Int,
    private val regions: List<OneNativeReservedRegion>,
    private val synchronous: Boolean,
) : Event<OneNativeReservedRegionsChangeEvent>(surfaceId, viewTag) {
  override fun getEventName(): String = NAME

  override fun canCoalesce(): Boolean = false

  override fun experimental_isSynchronous(): Boolean = synchronous

  override fun getEventData(): WritableMap {
    val list = Arguments.createArray()
    for (region in regions) {
      list.pushMap(
          Arguments.createMap().apply {
            putString("id", region.id)
            putString("kind", region.kind)
            putDouble("x", PixelUtil.toDIPFromPixel(region.frame.left.toFloat()).toDouble())
            putDouble("y", PixelUtil.toDIPFromPixel(region.frame.top.toFloat()).toDouble())
            putDouble("width", PixelUtil.toDIPFromPixel(region.frame.width().toFloat()).toDouble())
            putDouble("height", PixelUtil.toDIPFromPixel(region.frame.height().toFloat()).toDouble())
            putDouble("marginTop", 0.0)
            putDouble("marginLeft", 0.0)
            putDouble("marginBottom", 0.0)
            putDouble("marginRight", 0.0)
            putBoolean("isActive", region.isActive)
          })
    }
    return Arguments.createMap().apply { putArray("regions", list) }
  }

  companion object {
    const val NAME = "topNativeReservedRegionsChange"
  }
}
