package com.margelo.nitro.one

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import androidx.core.content.ContextCompat
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// battery level, state and low power mode behind One.Battery, matching
// expo-battery's values: BatteryManager for level, the sticky
// ACTION_BATTERY_CHANGED intent for charging state, PowerManager for power
// save mode. the first listener registers the receivers, so the first event
// can never race the subscription, and the last removal unregisters them.
// receivers run on the main thread, where all listener state lives.
class HybridOneBattery : HybridOneBatterySpec() {
    private class Entry(
        val level: ((BatteryLevelEvent) -> Unit)?,
        val state: ((BatteryStateEvent) -> Unit)?,
        val lowPower: ((BatteryPowerModeEvent) -> Unit)?
    )

    private val lock = Any()
    private val listeners = mutableMapOf<Int, Entry>()
    private var nextListenerId = 0
    private var receiver: BroadcastReceiver? = null
    private var modeReceiver: BroadcastReceiver? = null
    private var lastLevel: Double? = null
    private var lastState: BatteryState? = null
    private var lastLowPower: Boolean? = null

    private fun context(): Context =
        NitroModules.applicationContext
            ?: throw IllegalStateException("Battery: React context is not ready")

    private fun batteryIntent(): Intent? {
        val filter = IntentFilter(Intent.ACTION_BATTERY_CHANGED)
        return if (Build.VERSION.SDK_INT >= 33) {
            context().registerReceiver(null, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            context().registerReceiver(null, filter)
        }
    }

    private fun levelOf(intent: Intent?): Double {
        if (intent == null) return -1.0
        val manager = context().getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val capacity = manager.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
        if (capacity != Int.MIN_VALUE) return capacity / 100.0
        val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
        val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
        if (level < 0 || scale <= 0) return -1.0
        return level / scale.toDouble()
    }

    private fun stateOf(intent: Intent?): BatteryState {
        return when (intent?.getIntExtra(BatteryManager.EXTRA_STATUS, -1)) {
            BatteryManager.BATTERY_STATUS_CHARGING -> BatteryState.CHARGING
            BatteryManager.BATTERY_STATUS_FULL -> BatteryState.FULL
            BatteryManager.BATTERY_STATUS_NOT_CHARGING -> BatteryState.NOTCHARGING
            BatteryManager.BATTERY_STATUS_DISCHARGING -> BatteryState.UNPLUGGED
            else -> BatteryState.UNKNOWN
        }
    }

    private fun lowPowerMode(): Boolean {
        val manager = context().getSystemService(Context.POWER_SERVICE) as PowerManager
        return manager.isPowerSaveMode
    }

    private fun <T> guarded(code: String, verb: String, body: () -> T): Promise<T> =
        Promise.async {
            try {
                body()
            } catch (e: Exception) {
                throw OneNativeError(code, "Battery.$verb: ${e.message}")
            }
        }

    override fun getLevel(): Promise<Double> =
        guarded("E_BATTERY_LEVEL", "getLevel") { levelOf(batteryIntent()) }

    override fun getState(): Promise<BatteryState> =
        guarded("E_BATTERY_STATE", "getState") { stateOf(batteryIntent()) }

    override fun getPowerState(): Promise<BatteryPowerState> =
        guarded("E_BATTERY_POWER", "getPowerState") {
            val intent = batteryIntent()
            BatteryPowerState(levelOf(intent), stateOf(intent), lowPowerMode())
        }

    override fun isLowPowerModeEnabled(): Promise<Boolean> =
        guarded("E_BATTERY_LOW_POWER", "isLowPowerModeEnabled") { lowPowerMode() }

    // expo reports the api available on android.
    override fun isAvailable(): Boolean = true

    override fun addLevelListener(listener: (BatteryLevelEvent) -> Unit): () -> Unit =
        addListener(level = listener, state = null, lowPower = null)

    override fun addStateListener(listener: (BatteryStateEvent) -> Unit): () -> Unit =
        addListener(level = null, state = listener, lowPower = null)

    override fun addLowPowerModeListener(listener: (BatteryPowerModeEvent) -> Unit): () -> Unit =
        addListener(level = null, state = null, lowPower = listener)

    private fun addListener(
        level: ((BatteryLevelEvent) -> Unit)?,
        state: ((BatteryStateEvent) -> Unit)?,
        lowPower: ((BatteryPowerModeEvent) -> Unit)?
    ): () -> Unit {
        val id: Int
        synchronized(lock) {
            id = nextListenerId
            nextListenerId += 1
            listeners[id] = Entry(level, state, lowPower)
        }
        ensureReceivers()
        return {
            synchronized(lock) { listeners.remove(id) }
            releaseReceiversIfIdle()
        }
    }

    private fun ensureReceivers() {
        val app = context()
        if (receiver == null) {
            lastLevel = levelOf(batteryIntent())
            lastState = stateOf(batteryIntent())
            val next = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (intent?.action != Intent.ACTION_BATTERY_CHANGED) return
                    val level = levelOf(intent)
                    if (level != lastLevel) {
                        lastLevel = level
                        emit { it.level?.invoke(BatteryLevelEvent(level)) }
                    }
                    val state = stateOf(intent)
                    if (state != lastState) {
                        lastState = state
                        emit { it.state?.invoke(BatteryStateEvent(state)) }
                    }
                }
            }
            ContextCompat.registerReceiver(
                app,
                next,
                IntentFilter(Intent.ACTION_BATTERY_CHANGED),
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            receiver = next
        }
        if (modeReceiver == null) {
            lastLowPower = lowPowerMode()
            val next = object : BroadcastReceiver() {
                override fun onReceive(context: Context?, intent: Intent?) {
                    if (intent?.action != PowerManager.ACTION_POWER_SAVE_MODE_CHANGED) return
                    val lowPower = lowPowerMode()
                    if (lowPower != lastLowPower) {
                        lastLowPower = lowPower
                        emit { it.lowPower?.invoke(BatteryPowerModeEvent(lowPower)) }
                    }
                }
            }
            ContextCompat.registerReceiver(
                app,
                next,
                IntentFilter(PowerManager.ACTION_POWER_SAVE_MODE_CHANGED),
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            modeReceiver = next
        }
    }

    private fun emit(each: (Entry) -> Unit) {
        val current: List<Entry>
        synchronized(lock) { current = listeners.values.toList() }
        for (entry in current) each(entry)
    }

    private fun releaseReceiversIfIdle() {
        val idle: Boolean
        synchronized(lock) { idle = listeners.isEmpty() }
        if (!idle) return
        val app = context()
        receiver?.let {
            receiver = null
            try {
                app.unregisterReceiver(it)
            } catch (_: IllegalArgumentException) {
            }
        }
        modeReceiver?.let {
            modeReceiver = null
            try {
                app.unregisterReceiver(it)
            } catch (_: IllegalArgumentException) {
            }
        }
    }
}
