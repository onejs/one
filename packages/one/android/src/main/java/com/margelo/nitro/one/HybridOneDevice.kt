package com.margelo.nitro.one

import android.app.UiModeManager
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.LocaleList
import android.provider.Settings
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.Calendar
import java.util.Currency
import java.util.Locale
import java.util.TimeZone

// device snapshot matching the ios shape: model, system, idiom,
// simulator flag, vendor id, and locale/timezone details. the vendor
// identifier is ANDROID_ID, scoped to the app signing key, never a
// hardware id. carPlay/mac/vision idioms are unreachable on android.
class HybridOneDevice : HybridOneDeviceSpec() {
    private fun context(): Context =
        NitroModules.applicationContext
            ?: throw IllegalStateException("Device: React context is not ready")

    override fun getInfo(): Promise<DeviceInfo> {
        val context = context()
        return Promise.resolved(
            DeviceInfo(
                model = Build.MODEL ?: "",
                systemName = "Android",
                systemVersion = Build.VERSION.RELEASE ?: "",
                interfaceIdiom = idiom(context),
                isSimulator = isEmulator(),
                vendorIdentifier = Settings.Secure.getString(
                    context.contentResolver, Settings.Secure.ANDROID_ID
                )
            )
        )
    }

    override fun getLocalizationInfo(): Promise<LocalizationInfo> {
        val locale = Locale.getDefault()
        val timeZone = TimeZone.getDefault()
        val currency = try {
            Currency.getInstance(locale)?.currencyCode
        } catch (_: Exception) {
            null
        }
        return Promise.resolved(
            LocalizationInfo(
                localeIdentifier = locale.toLanguageTag(),
                preferredLanguages = preferredLanguages(),
                calendarIdentifier = calendarType(locale),
                timeZoneIdentifier = timeZone.id,
                timeZoneOffsetSeconds = (timeZone.getOffset(System.currentTimeMillis()) / 1000).toDouble(),
                currencyCode = currency
            )
        )
    }

    private fun idiom(context: Context): String {
        val uiMode = context.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
        if (uiMode?.currentModeType == Configuration.UI_MODE_TYPE_TELEVISION) return "tv"
        val smallest = context.resources.configuration.smallestScreenWidthDp
        if (smallest >= 600) return "pad"
        return "phone"
    }

    // java.util.Calendar.getCalendarType is too new for minSdk 23, so the
    // identifier is derived from the locale's calendar subclass name.
    private fun calendarType(locale: Locale): String {
        val name = Calendar.getInstance(locale).javaClass.simpleName
        return when {
            name.startsWith("Gregorian") -> "gregorian"
            name.startsWith("Buddhist") -> "buddhist"
            name.startsWith("Japanese") -> "japanese"
            name.startsWith("Islamic") -> "islamic"
            name.endsWith("Calendar") -> name.dropLast("Calendar".length).lowercase()
            else -> name.lowercase()
        }
    }

    private fun preferredLanguages(): Array<String> {
        if (Build.VERSION.SDK_INT >= 24) {
            val tags = LocaleList.getDefault().toLanguageTags()
            if (tags.isNotEmpty()) return tags.split(",").toTypedArray()
        }
        return arrayOf(Locale.getDefault().toLanguageTag())
    }

    private fun isEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT ?: ""
        val model = Build.MODEL ?: ""
        val device = Build.DEVICE ?: ""
        val product = Build.PRODUCT ?: ""
        val hardware = Build.HARDWARE ?: ""
        return fingerprint.startsWith("generic") ||
            fingerprint.contains("generic") ||
            model.contains("Emulator") ||
            model.contains("Android SDK") ||
            device.contains("generic") ||
            product in setOf("sdk", "google_sdk", "sdk_x86", "sdk_x86_64", "vbox86p", "emulator", "simulator") ||
            hardware in setOf("goldfish", "ranchu", "vbox86")
    }
}
