package dev.onejs.keyboard.extensions

import android.view.View
import com.facebook.react.views.scroll.ReactScrollView
import java.lang.reflect.Field
import java.lang.reflect.Method

internal fun View.isEnabledReactScrollView(): Boolean =
  when {
    this is ReactScrollView -> scrollEnabled
    ReactNestedScrollViewCompat.isInstance(this) ->
      ReactNestedScrollViewCompat.isScrollEnabled(this)
    else -> false
  }

private object ReactNestedScrollViewCompat {
  private const val CLASS_NAME =
    "com.facebook.react.views.scroll.ReactNestedScrollView"

  private val clazz: Class<*>? by lazy(LazyThreadSafetyMode.PUBLICATION) {
    runCatching {
      Class.forName(
        CLASS_NAME,
        false,
        ReactScrollView::class.java.classLoader,
      )
    }.getOrNull()
  }

  private val scrollEnabledGetter: Method? by lazy(LazyThreadSafetyMode.PUBLICATION) {
    val c = clazz ?: return@lazy null

    runCatching {
      c.getMethod("getScrollEnabled")
    }.getOrNull()
      ?: runCatching {
        c.getMethod("isScrollEnabled")
      }.getOrNull()
  }

  private val scrollEnabledField: Field? by lazy(LazyThreadSafetyMode.PUBLICATION) {
    val c = clazz ?: return@lazy null

    runCatching {
      c.getDeclaredField("mScrollEnabled").apply {
        isAccessible = true
      }
    }.getOrNull()
  }

  fun isInstance(view: View): Boolean = clazz?.isInstance(view) == true

  fun isScrollEnabled(view: View): Boolean =
    scrollEnabledGetter?.let { getter ->
      runCatching {
        getter.invoke(view) as Boolean
      }.getOrNull()
    }
      ?: scrollEnabledField?.let { field ->
        runCatching {
          field.getBoolean(view)
        }.getOrNull()
      }
      ?: false
}
