package dev.onejs.keyboard.modules

import android.content.Context
import android.os.Build
import android.view.Choreographer
import android.view.View
import android.view.inputmethod.InputMethodManager
import androidx.core.view.ViewCompat
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.uimanager.IllegalViewOperationException
import dev.onejs.keyboard.extensions.dp
import dev.onejs.keyboard.extensions.screenLocation
import dev.onejs.keyboard.extensions.uiManager
import dev.onejs.keyboard.extensions.windowSoftInputMode
import dev.onejs.keyboard.interactive.KeyboardAnimationController
import dev.onejs.keyboard.log.Logger
import dev.onejs.keyboard.traversal.FocusedInputHolder
import dev.onejs.keyboard.traversal.ViewHierarchyNavigator

private val TAG = KeyboardControllerModuleImpl::class.qualifiedName

class KeyboardControllerModuleImpl(
  private val mReactContext: ReactApplicationContext,
) {
  private val uiManager = mReactContext.uiManager
  private val controller = KeyboardAnimationController()
  private val mDefaultMode: Int = mReactContext.windowSoftInputMode

  // region Module methods
  fun setInputMode(mode: Int) {
    setSoftInputMode(mode)
  }

  fun setDefaultMode() {
    setSoftInputMode(mDefaultMode)
  }

  fun preload() {
    // no-op on Android
  }

  @Suppress("detekt:UnusedParameter")
  fun setTranslucent(translucent: Boolean) {
    // no-op on Android
  }

  fun dismiss(
    keepFocus: Boolean,
    animated: Boolean,
  ) {
    val activity = mReactContext.currentActivity
    val view: View? = FocusedInputHolder.get()

    if (view != null) {
      UiThreadUtil.runOnUiThread {
        fun maybeClearFocus() {
          if (!keepFocus) {
            view.clearFocus()
          }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !animated) {
          controller.startControlRequest(view) { insetsController ->
            insetsController.finish(false)

            view.post {
              maybeClearFocus()
            }
          }
        } else {
          val imm = activity?.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
          imm?.hideSoftInputFromWindow(view.windowToken, 0)

          maybeClearFocus()
        }
      }
    }
  }

  fun setFocusTo(direction: String) {
    if (direction == "current") {
      UiThreadUtil.runOnUiThread {
        FocusedInputHolder.focus()
      }

      return
    }

    val view: View? = FocusedInputHolder.get()

    if (view != null) {
      ViewHierarchyNavigator.setFocusTo(direction, view)
    }
  }

  fun viewPositionInWindow(
    viewTag: Int,
    done: (frame: DoubleArray?) -> Unit,
  ) {
    val measure =
      Runnable {
        val view =
          try {
            uiManager?.resolveView(viewTag)
          } catch (e: IllegalViewOperationException) {
            Logger.w(TAG, "Could not resolve view for tag $viewTag", e)
            null
          }
        if (view == null || !ViewCompat.isAttachedToWindow(view)) {
          done(null)
          return@Runnable
        }
        val location = view.screenLocation
        done(
          doubleArrayOf(
            location[0].toFloat().dp,
            location[1].toFloat().dp,
            view.width.toFloat().dp,
            view.height.toFloat().dp,
          ),
        )
      }
    UiThreadUtil.runOnUiThread {
      // Fabric mounts during frame callbacks; read the attached view after those callbacks finish.
      Choreographer.getInstance().postFrameCallback { UiThreadUtil.runOnUiThread(measure) }
    }
  }
  // endregion

  // region Helpers
  private fun setSoftInputMode(mode: Int) {
    UiThreadUtil.runOnUiThread {
      if (mReactContext.windowSoftInputMode != mode) {
        mReactContext.currentActivity?.window?.setSoftInputMode(mode)
      }
    }
  }
  // endregion
}
