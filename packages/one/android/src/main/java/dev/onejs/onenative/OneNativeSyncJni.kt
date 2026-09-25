package dev.onejs.onenative

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl
import com.facebook.soloader.SoLoader

// fbjni host for the sync-state installer: initHybrid installs the JSI host
// object on the RN runtime and the worklets UI runtime. writes that bypass
// every host object (user typing in a bound field) re-enter through
// nativeDidSetExternally so the JSI listener still fires.
//
// CallInvokerHolderImpl is a framework-only API; the installer cannot reach
// the JS invoker without it, so this host opts in explicitly.
@Suppress("KotlinJniMissingFunction")
@OptIn(FrameworkAPI::class)
internal class OneNativeSyncJni {
    companion object {
        init {
            SoLoader.loadLibrary("One")
        }

        @JvmStatic
        external fun nativeDidSetExternally(stateId: Int)
    }

    @field:DoNotStrip
    @Suppress("unused")
    private var mHybridData: HybridData? = null

    private external fun initHybrid(
        jsContext: Long,
        jsCallInvokerHolder: CallInvokerHolderImpl,
    ): HybridData

    fun install(jsContext: Long, jsCallInvokerHolder: CallInvokerHolderImpl) {
        mHybridData = initHybrid(jsContext, jsCallInvokerHolder)
    }
}
