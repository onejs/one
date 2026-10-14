package com.margelo.nitro.one

import android.app.UiModeManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.os.Build
import android.os.LocaleList
import android.provider.Settings
import android.text.TextUtils
import android.text.format.DateFormat
import android.view.View
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.util.Calendar
import java.util.Currency
import java.util.Locale
import java.text.DecimalFormatSymbols
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

    private val listeners = mutableMapOf<Int, () -> Unit>()
    private var nextListenerId = 0
    private var receiver: BroadcastReceiver? = null

    override fun getLocales(): Array<LocaleInfo> =
        preferredLocales().map { localeInfo(it) }.toTypedArray()

    override fun getCalendars(): Array<CalendarInfo> {
        val locale = Locale.getDefault()
        val calendar = Calendar.getInstance(locale)
        return arrayOf(
            CalendarInfo(
                calendar = unicodeCalendar(locale),
                timeZone = TimeZone.getDefault().id,
                uses24hourClock = DateFormat.is24HourFormat(context()),
                firstWeekday = calendar.firstDayOfWeek.toDouble()
            )
        )
    }

    // the first listener registers the receiver and the last removal
    // unregisters it, so a locale change can never race the subscription.
    @Synchronized
    override fun addLocalizationListener(listener: () -> Unit): () -> Unit {
        val id = nextListenerId++
        listeners[id] = listener
        if (receiver == null) {
            val next = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) = emit()
            }
            val filter = IntentFilter().apply {
                addAction(Intent.ACTION_LOCALE_CHANGED)
                addAction(Intent.ACTION_TIMEZONE_CHANGED)
            }
            // both actions are protected system broadcasts, so no exported
            // flag is needed and no other app can send them.
            context().registerReceiver(next, filter)
            receiver = next
        }
        return { removeListener(id) }
    }

    private fun emit() {
        val current = synchronized(this) { listeners.values.toList() }
        current.forEach { it() }
    }

    @Synchronized
    private fun removeListener(id: Int) {
        listeners.remove(id)
        if (listeners.isEmpty()) {
            receiver?.let { context().unregisterReceiver(it) }
            receiver = null
        }
    }

    private fun preferredLocales(): List<Locale> {
        if (Build.VERSION.SDK_INT >= 24) {
            val list = LocaleList.getDefault()
            if (!list.isEmpty) return (0 until list.size()).map { list[it] }
        }
        return listOf(Locale.getDefault())
    }

    private fun localeInfo(locale: Locale): LocaleInfo {
        val symbols = DecimalFormatSymbols(locale)
        val currency = try {
            Currency.getInstance(locale)
        } catch (_: Exception) {
            null
        }
        val region = locale.country.takeIf { it.isNotEmpty() }
        return LocaleInfo(
            languageTag = locale.toLanguageTag(),
            languageCode = locale.language.takeIf { it.isNotEmpty() },
            languageScriptCode = locale.script.takeIf { it.isNotEmpty() },
            regionCode = region,
            languageRegionCode = region,
            currencyCode = currency?.currencyCode,
            currencySymbol = currency?.getSymbol(locale),
            languageCurrencyCode = currency?.currencyCode,
            languageCurrencySymbol = currency?.getSymbol(locale),
            decimalSeparator = symbols.decimalSeparator.toString(),
            digitGroupingSeparator = symbols.groupingSeparator.toString(),
            textDirection =
                if (TextUtils.getLayoutDirectionFromLocale(locale) == View.LAYOUT_DIRECTION_RTL) {
                    "rtl"
                } else {
                    "ltr"
                },
            measurementSystem = when (region) {
                "US" -> "us"
                "GB" -> "uk"
                null -> null
                else -> "metric"
            },
            temperatureUnit = when (region) {
                null -> null
                in FAHRENHEIT_REGIONS -> "fahrenheit"
                else -> "celsius"
            }
        )
    }

    // java calendar type to the unicode calendar type expo reports.
    private fun unicodeCalendar(locale: Locale): String =
        when (val type = calendarType(locale)) {
            "gregorian" -> "gregory"
            else -> type
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

// regions that read temperature in fahrenheit. android has no temperature
// preference, so the region decides, as in expo-localization.
private val FAHRENHEIT_REGIONS = setOf(
    "US", "BS", "BZ", "KY", "LR", "GU", "MH", "FM", "PW", "VI", "MP", "AS", "UM"
)
