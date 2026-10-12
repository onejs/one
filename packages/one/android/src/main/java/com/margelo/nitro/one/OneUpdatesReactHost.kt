package com.margelo.nitro.one

import android.content.Context
import com.facebook.react.ReactHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactPackageTurboModuleManagerDelegate
import com.facebook.react.bridge.JSBundleLoader
import com.facebook.react.common.annotations.UnstableReactNativeAPI
import com.facebook.react.common.build.ReactBuildConfig
import com.facebook.react.defaults.DefaultComponentsRegistry
import com.facebook.react.defaults.DefaultTurboModuleManagerDelegate
import com.facebook.react.fabric.ComponentFactory
import com.facebook.react.runtime.BindingsInstaller
import com.facebook.react.runtime.JSRuntimeFactory
import com.facebook.react.runtime.ReactHostDelegate
import com.facebook.react.runtime.ReactHostImpl
import com.facebook.react.runtime.hermes.HermesInstance

// the app's ReactHost delegate when updates are configured. the stock host
// stores one fixed JSBundleLoader, so a reload would rerun the old bundle;
// this delegate's jsBundleLoader asks the launcher on every access instead,
// the way expo's host factory re-resolves its bundle file per access.
@OptIn(UnstableReactNativeAPI::class)
class OneUpdatesReactHostDelegate(
    private val context: Context,
    override val jsMainModulePath: String = "index",
    override val reactPackages: List<ReactPackage>,
    override val jsRuntimeFactory: JSRuntimeFactory = HermesInstance(),
    override val bindingsInstaller: BindingsInstaller? = null,
    override val turboModuleManagerDelegateBuilder: ReactPackageTurboModuleManagerDelegate.Builder =
        DefaultTurboModuleManagerDelegate.Builder()
) : ReactHostDelegate {
    override val jsBundleLoader: JSBundleLoader
        get() {
            if (!OneUpdatesLauncher.isEnabled()) {
                return JSBundleLoader.createAssetLoader(
                    context, "assets://${OneUpdatesLauncher.EMBEDDED_BUNDLE_ASSET}", true)
            }
            val file = OneUpdatesLauncher.select()
            if (file != null) return JSBundleLoader.createFileLoader(file.absolutePath)
            return JSBundleLoader.createAssetLoader(
                context, "assets://${OneUpdatesLauncher.EMBEDDED_BUNDLE_ASSET}", true)
        }

    override fun handleInstanceException(error: Exception) {
        // a failed launch rolls back onto the next candidate in the same
        // session; anything else rethrows exactly like the stock handler.
        if (!OneUpdatesLauncher.handleInstanceException(error)) throw error
    }
}

// builds the app's ReactHost the way DefaultReactHost does, with the One
// delegate selecting the bundle. the patched MainApplication calls this
// instead of getDefaultReactHost.
object OneUpdatesReactHost {
    private var reactHost: ReactHost? = null

    @OptIn(UnstableReactNativeAPI::class)
    @JvmStatic
    fun getDefaultReactHost(context: Context, packageList: List<ReactPackage>): ReactHost {
        reactHost?.let {
            return it
        }
        OneUpdatesLauncher.install(context)
        val delegate =
            OneUpdatesReactHostDelegate(
                context = context.applicationContext,
                reactPackages = packageList
            )
        val componentFactory = ComponentFactory()
        DefaultComponentsRegistry.register(componentFactory)
        val newReactHost =
            ReactHostImpl(
                context,
                delegate,
                componentFactory,
                true /* allowPackagerServerAccess */,
                ReactBuildConfig.DEBUG /* useDevSupport */
            )
        reactHost = newReactHost
        return newReactHost
    }
}
