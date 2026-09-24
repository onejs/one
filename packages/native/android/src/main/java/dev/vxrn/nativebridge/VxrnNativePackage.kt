package dev.vxrn.nativebridge

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager
import com.margelo.nitro.one.VxrnNativeOnLoad
import dev.onejs.onenative.OneNativeBlurManager
import dev.onejs.onenative.OneNativeComposeNodeManager
import dev.onejs.onenative.OneNativeEdgeFadeManager
import dev.onejs.onenative.OneNativeMaskManager
import dev.onejs.onenative.OneNativeMenuPopupModule
import dev.onejs.onenative.OneNativeNotificationsModule
import dev.onejs.onenative.OneNativeSafeAreaModule
import dev.onejs.onenative.OneNativeReservedRegionsProviderManager
import dev.onejs.onenative.OneNativeSafeAreaProviderManager
import dev.onejs.onenative.OneNativeSyncModule
import dev.onejs.onenative.OneNativeUiMapManager

class VxrnNativePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
        return when (name) {
            VxrnNativeModule.NAME -> VxrnNativeModule(reactContext)
            OneNativeSafeAreaModule.NAME -> OneNativeSafeAreaModule(reactContext)
            OneNativeSyncModule.NAME -> OneNativeSyncModule(reactContext)
            OneNativeNotificationsModule.NAME -> OneNativeNotificationsModule(reactContext)
            OneNativeMenuPopupModule.NAME -> OneNativeMenuPopupModule(reactContext)
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
            OneNativeNotificationsModule.NAME to ReactModuleInfo(
                name = OneNativeNotificationsModule.NAME,
                className = OneNativeNotificationsModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit = false,
                isCxxModule = false,
                isTurboModule = false
            ),
            OneNativeMenuPopupModule.NAME to ReactModuleInfo(
                name = OneNativeMenuPopupModule.NAME,
                className = OneNativeMenuPopupModule.NAME,
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
            OneNativeReservedRegionsProviderManager(),
            OneNativeEdgeFadeManager(),
            OneNativeBlurManager(),
            OneNativeMaskManager(),
            OneNativeUiMapManager(),
        )

    companion object {
        init {
            // registers every Nitro hybrid object (OneHaptics, OneClipboard, ...)
            // before JS can ask NitroModules for one.
            VxrnNativeOnLoad.initializeNative()
        }
    }
}
