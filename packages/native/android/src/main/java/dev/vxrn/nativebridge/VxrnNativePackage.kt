package dev.vxrn.nativebridge

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import dev.onejs.onenative.OneNativeBlurManager
import dev.onejs.onenative.OneNativeClipboardModule
import dev.onejs.onenative.OneNativeComposeNodeManager
import dev.onejs.onenative.OneNativeEdgeFadeManager
import dev.onejs.onenative.OneNativeMaskManager
import dev.onejs.onenative.OneNativeNetworkModule
import dev.onejs.onenative.OneNativeSafeAreaModule
import dev.onejs.onenative.OneNativeSafeAreaProviderManager
import dev.onejs.onenative.OneNativeSyncModule

class VxrnNativePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            VxrnNativeModule.NAME -> VxrnNativeModule(reactContext)
            OneNativeSafeAreaModule.NAME -> OneNativeSafeAreaModule(reactContext)
            OneNativeSyncModule.NAME -> OneNativeSyncModule(reactContext)
            OneNativeClipboardModule.NAME -> OneNativeClipboardModule(reactContext)
            OneNativeNetworkModule.NAME -> OneNativeNetworkModule(reactContext)
            else -> null
        }
    }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            VxrnNativeModule.NAME to ReactModuleInfo(
                name = VxrnNativeModule.NAME,
                className = VxrnNativeModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = false
            ),
            OneNativeSafeAreaModule.NAME to ReactModuleInfo(
                name = OneNativeSafeAreaModule.NAME,
                className = OneNativeSafeAreaModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = false
            ),
            OneNativeSyncModule.NAME to ReactModuleInfo(
                name = OneNativeSyncModule.NAME,
                className = OneNativeSyncModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = false
            ),
            OneNativeClipboardModule.NAME to ReactModuleInfo(
                name = OneNativeClipboardModule.NAME,
                className = OneNativeClipboardModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = false
            ),
            OneNativeNetworkModule.NAME to ReactModuleInfo(
                name = OneNativeNetworkModule.NAME,
                className = OneNativeNetworkModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = false
            )
        )
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> =
        listOf(
            OneNativeComposeNodeManager(),
            OneNativeSafeAreaProviderManager(),
            OneNativeEdgeFadeManager(),
            OneNativeBlurManager(),
            OneNativeMaskManager(),
        )
}
