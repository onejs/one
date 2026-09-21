package dev.onejs.onenative

import android.content.pm.PackageManager
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule

// installed-binary identity for One.AppInfo: versionName, the version code
// stringified, and the package name, read synchronously from PackageManager.
// the PackageInfoFlags overload is required on api 33+ (the old overload is
// deprecated and throws on some oem builds); longVersionCode needs api 28+.
// NameNotFoundException is caught so a broken package read can never crash
// startup: unknown fields come back null instead.
class OneNativeAppInfoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = NAME

    override fun getConstants(): Map<String, Any?> {
        val packageName = reactApplicationContext.packageName
        return try {
            val packageInfo =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    reactApplicationContext.packageManager.getPackageInfo(
                        packageName,
                        PackageManager.PackageInfoFlags.of(0)
                    )
                } else {
                    @Suppress("DEPRECATION")
                    reactApplicationContext.packageManager.getPackageInfo(packageName, 0)
                }
            val build =
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    packageInfo.longVersionCode.toString()
                } else {
                    @Suppress("DEPRECATION")
                    packageInfo.versionCode.toString()
                }
            mapOf(
                "version" to packageInfo.versionName,
                "build" to build,
                "applicationId" to packageName
            )
        } catch (e: PackageManager.NameNotFoundException) {
            mapOf("version" to null, "build" to null, "applicationId" to packageName)
        }
    }

    companion object {
        const val NAME = "OneNativeAppInfo"
    }
}
