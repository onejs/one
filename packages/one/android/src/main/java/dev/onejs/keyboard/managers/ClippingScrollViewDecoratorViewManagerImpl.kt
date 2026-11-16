package dev.onejs.keyboard.managers

import com.facebook.react.uimanager.ThemedReactContext
import dev.onejs.keyboard.views.ClippingScrollViewDecoratorView

class ClippingScrollViewDecoratorViewManagerImpl {
  fun createViewInstance(reactContext: ThemedReactContext): ClippingScrollViewDecoratorView =
    ClippingScrollViewDecoratorView(reactContext)

  companion object {
    const val NAME = "OneClippingScrollViewDecoratorView"
  }
}
