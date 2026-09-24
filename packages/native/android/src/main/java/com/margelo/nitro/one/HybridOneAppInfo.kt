package com.margelo.nitro.one

import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import com.margelo.nitro.NitroModules

// installed-binary identity for One.AppInfo: versionName, the version code
// stringified, and the package name, from PackageManager. the
// PackageInfoFlags overload is required on api 33+ (the old overload is
// deprecated and throws on some oem builds). NameNotFoundException leaves
// version and build unknown so a broken package read can never crash startup.
class HybridOneAppInfo : HybridOneAppInfoSpec() {
    private val packageName: String? = NitroModules.applicationContext?.packageName

    private val packageInfo: PackageInfo? by lazy {
        val context = NitroModules.applicationContext ?: return@lazy null
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
        } catch (e: PackageManager.NameNotFoundException) {
            null
        }
    }

    override val version: String?
        get() = packageInfo?.versionName

    // longVersionCode needs api 28+.
    override val build: String?
        get() =
            packageInfo?.let {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    it.longVersionCode.toString()
                } else {
                    @Suppress("DEPRECATION")
                    it.versionCode.toString()
                }
            }

    override val applicationId: String?
        get() = packageName
}
