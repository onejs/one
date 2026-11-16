package dev.onejs.keyboard

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.viewmanagers.OneClippingScrollViewDecoratorViewManagerDelegate
import com.facebook.react.viewmanagers.OneClippingScrollViewDecoratorViewManagerInterface
import dev.onejs.keyboard.managers.ClippingScrollViewDecoratorViewManagerImpl
import dev.onejs.keyboard.views.ClippingScrollViewDecoratorView

class ClippingScrollViewDecoratorViewManager :
  ViewGroupManager<ClippingScrollViewDecoratorView>(),
  OneClippingScrollViewDecoratorViewManagerInterface<ClippingScrollViewDecoratorView> {
  private val manager = ClippingScrollViewDecoratorViewManagerImpl()
  private val mDelegate = OneClippingScrollViewDecoratorViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<ClippingScrollViewDecoratorView> = mDelegate

  override fun getName(): String = ClippingScrollViewDecoratorViewManagerImpl.NAME

  override fun createViewInstance(context: ThemedReactContext): ClippingScrollViewDecoratorView =
    manager.createViewInstance(context)

  override fun setContentInsetBottom(
    view: ClippingScrollViewDecoratorView?,
    value: Double,
  ) {
    view?.setContentInsetBottom(value)
  }

  override fun setContentInsetTop(
    view: ClippingScrollViewDecoratorView?,
    value: Double,
  ) {
    view?.setContentInsetTop(value)
  }

  override fun setApplyWorkaroundForContentInsetHitTestBug(
    view: ClippingScrollViewDecoratorView?,
    value: Boolean,
  ) {
    view?.setApplyWorkaroundForContentInsetHitTestBug(value)
  }
}
