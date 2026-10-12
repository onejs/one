package dev.vxrn.nativefeatures.tests

import android.app.Application
import android.content.Context
import android.os.Process
import android.os.Handler
import android.os.Looper
import androidx.work.WorkManager
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactPackage
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.shell.MainReactPackage
import com.facebook.react.uimanager.ViewManager
import org.json.JSONObject

internal fun receipt(context: Context, event: String, detail: String = "") {
    val value = JSONObject().put("event", event).put("detail", detail)
        .put("pid", Process.myPid()).put("at", System.currentTimeMillis()).toString()
    synchronized(BackgroundProofApplication::class.java) {
        context.openFileOutput("background-proof.jsonl", Context.MODE_APPEND).bufferedWriter().use {
            it.appendLine(value)
        }
    }
    android.util.Log.i("BackgroundProof", value)
}

class BackgroundProofApplication : Application(), ReactApplication {
    override val reactHost: ReactHost by lazy {
        getDefaultReactHost(
            context = applicationContext,
            packageList = listOf(
                MainReactPackage(), com.margelo.nitro.NitroModulesPackage(),
                dev.onejs.one.OnePackage(), com.swmansion.worklets.WorkletsPackage(),
                object : ReactPackage {
                    override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
                        listOf(object : ReactContextBaseJavaModule(context) {
                            override fun getName() = "BackgroundProof"
                            @ReactMethod fun record(value: String) { receipt(context, "javascript", value) }
                            @ReactMethod fun observeWork() {
                                Handler(Looper.getMainLooper()).post {
                                    for (id in listOf("proof.refresh", "proof.power", "proof.cancel", "proof.fail")) {
                                        WorkManager.getInstance(context).getWorkInfosByTagLiveData("one-bg-$id")
                                            .observeForever { infos ->
                                                for (info in infos) {
                                                    if (info.state.isFinished) receipt(context, "terminal", "$id:${info.state}")
                                                }
                                            }
                                    }
                                }
                            }
                        })
                    override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
                }
            ),
            useDevSupport = false,
        )
    }
    override fun onCreate() {
        super.onCreate()
        receipt(this, "application-created")
        loadReactNative(this)
    }
}
