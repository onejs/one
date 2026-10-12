package dev.vxrn.nativefeatures.tests

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class BackgroundProofActivity : ReactActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        receipt(this, "activity-created")
        super.onCreate(null)
    }
    override fun getMainComponentName() = "NativeFeatureTests"
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
