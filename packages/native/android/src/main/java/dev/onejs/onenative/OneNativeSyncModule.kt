package dev.onejs.onenative

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl

class OneNativeSyncModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
    private var installer: OneNativeSyncJni? = null

    override fun getName(): String = NAME

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun install(): Boolean {
        if (installer != null) return true
        val context = reactApplicationContext
        val jsContext = context.javaScriptContextHolder?.get() ?: return false
        val jsCallInvokerHolder = context.jsCallInvokerHolder as? CallInvokerHolderImpl ?: return false
        val jni = OneNativeSyncJni()
        jni.install(jsContext, jsCallInvokerHolder)
        installer = jni
        return true
    }

    companion object {
        const val NAME = "OneNativeSyncState"
    }
}
