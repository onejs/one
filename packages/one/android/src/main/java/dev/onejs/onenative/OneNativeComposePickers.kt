package dev.onejs.onenative

import android.content.Context
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerColors
import androidx.compose.material3.DatePickerDefaults
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.DatePickerState
import androidx.compose.material3.DisplayMode
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.SelectableDates
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimeInput
import androidx.compose.material3.TimePicker
import androidx.compose.material3.TimePickerColors
import androidx.compose.material3.TimePickerDefaults
import androidx.compose.material3.TimePickerLayoutType
import androidx.compose.material3.TimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import java.time.Instant
import java.time.ZoneOffset

private val pickerColorKeys = listOf(
    "containerColor",
    "titleContentColor",
    "headlineContentColor",
    "weekdayContentColor",
    "subheadContentColor",
    "navigationContentColor",
    "yearContentColor",
    "disabledYearContentColor",
    "currentYearContentColor",
    "selectedYearContentColor",
    "disabledSelectedYearContentColor",
    "selectedYearContainerColor",
    "disabledSelectedYearContainerColor",
    "dayContentColor",
    "disabledDayContentColor",
    "selectedDayContentColor",
    "disabledSelectedDayContentColor",
    "selectedDayContainerColor",
    "disabledSelectedDayContainerColor",
    "todayContentColor",
    "todayDateBorderColor",
    "dayInSelectionRangeContentColor",
    "dayInSelectionRangeContainerColor",
    "dividerColor",
    "clockDialColor",
    "clockDialSelectedContentColor",
    "clockDialUnselectedContentColor",
    "selectorColor",
    "periodSelectorBorderColor",
    "periodSelectorSelectedContainerColor",
    "periodSelectorUnselectedContainerColor",
    "periodSelectorSelectedContentColor",
    "periodSelectorUnselectedContentColor",
    "timeSelectorSelectedContainerColor",
    "timeSelectorUnselectedContainerColor",
    "timeSelectorSelectedContentColor",
    "timeSelectorUnselectedContentColor",
)

// date values are utc midnight millis of the selected day, time values are
// minutes since local midnight; javascript converts both to and from Date
internal data class OneNativePickerOptions(
    val showModeToggle: Boolean = true,
    val is24Hour: Boolean? = null,
    val minimumDay: Long? = null,
    val maximumDay: Long? = null,
    val color: Int? = null,
    val colors: Map<String, Int> = emptyMap(),
) {
    companion object {
        fun fromMap(map: ReadableMap?, context: Context): OneNativePickerOptions {
            if (map == null) return OneNativePickerOptions()
            fun has(name: String, type: ReadableType) =
                map.hasKey(name) && !map.isNull(name) && map.getType(name) == type
            fun day(name: String): Long? =
                if (has(name, ReadableType.Number)) map.getDouble(name).takeIf { it.isFinite() }?.toLong() else null
            val colors = if (has("colors", ReadableType.Map)) map.getMap("colors") else null
            return OneNativePickerOptions(
                showModeToggle = !has("showModeToggle", ReadableType.Boolean) || map.getBoolean("showModeToggle"),
                is24Hour = if (has("is24Hour", ReadableType.Boolean)) map.getBoolean("is24Hour") else null,
                minimumDay = day("minimumDay"),
                maximumDay = day("maximumDay"),
                color = readComposeColor(map, "color", context),
                colors = colors?.let { source ->
                    pickerColorKeys.mapNotNull { key -> readComposeColor(source, key, context)?.let { key to it } }.toMap()
                } ?: emptyMap(),
            )
        }
    }
}

private fun OneNativePickerOptions.colorOf(key: String): Color? = colors[key]?.let(::Color)

private fun utcYear(day: Long): Int = Instant.ofEpochMilli(day).atZone(ZoneOffset.UTC).year

private class OneNativeSelectableDates(
    private val minimumDay: Long?,
    private val maximumDay: Long?,
) : SelectableDates {
    override fun isSelectableDate(utcTimeMillis: Long): Boolean =
        (minimumDay == null || utcTimeMillis >= minimumDay) && (maximumDay == null || utcTimeMillis <= maximumDay)

    override fun isSelectableYear(year: Int): Boolean =
        (minimumDay == null || year >= utcYear(minimumDay)) && (maximumDay == null || year <= utcYear(maximumDay))
}

private fun displayMode(variant: String?): DisplayMode =
    if (variant == "input") DisplayMode.Input else DisplayMode.Picker

// the calendar's months and year grid come from yearRange; selectableDates only
// greys out cells, so the range follows the bounds and always holds the selection
private fun pickerYearRange(options: OneNativePickerOptions, selected: Long): IntRange {
    val defaults = DatePickerDefaults.YearRange
    val selectedYear = utcYear(selected)
    val first = options.minimumDay?.let(::utcYear) ?: defaults.first
    val last = options.maximumDay?.let(::utcYear) ?: defaults.last
    return minOf(first, selectedYear)..maxOf(last, selectedYear)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun rememberOneDatePickerState(
    options: OneNativePickerOptions,
    variant: String?,
    selected: Long,
    key: Any,
): DatePickerState {
    val locale = LocalConfiguration.current.locales[0]
    return remember(locale, options.minimumDay, options.maximumDay, key) {
        DatePickerState(
            locale = locale,
            initialSelectedDateMillis = selected,
            initialDisplayedMonthMillis = selected,
            yearRange = pickerYearRange(options, selected),
            initialDisplayMode = displayMode(variant),
            selectableDates = OneNativeSelectableDates(options.minimumDay, options.maximumDay),
        )
    }.also { state ->
        val mode = displayMode(variant)
        LaunchedEffect(state, mode) { state.displayMode = mode }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun rememberOneTimePickerState(options: OneNativePickerOptions, minutes: Int, key: Any): TimePickerState {
    val is24Hour = options.is24Hour ?: android.text.format.DateFormat.is24HourFormat(androidx.compose.ui.platform.LocalContext.current)
    return remember(is24Hour, key) {
        TimePickerState(initialHour = minutes / 60, initialMinute = minutes % 60, is24Hour = is24Hour)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun datePickerColors(options: OneNativePickerOptions): DatePickerColors {
    val defaults = DatePickerDefaults.colors()
    val tint = options.color?.let(::Color)
    fun pick(key: String, fallback: Color, tinted: Boolean = false) =
        options.colorOf(key) ?: (if (tinted) tint else null) ?: fallback
    return defaults.copy(
        containerColor = pick("containerColor", defaults.containerColor),
        titleContentColor = pick("titleContentColor", defaults.titleContentColor, tinted = true),
        headlineContentColor = pick("headlineContentColor", defaults.headlineContentColor, tinted = true),
        weekdayContentColor = pick("weekdayContentColor", defaults.weekdayContentColor),
        subheadContentColor = pick("subheadContentColor", defaults.subheadContentColor),
        navigationContentColor = pick("navigationContentColor", defaults.navigationContentColor),
        yearContentColor = pick("yearContentColor", defaults.yearContentColor),
        disabledYearContentColor = pick("disabledYearContentColor", defaults.disabledYearContentColor),
        currentYearContentColor = pick("currentYearContentColor", defaults.currentYearContentColor),
        selectedYearContentColor = pick("selectedYearContentColor", defaults.selectedYearContentColor),
        disabledSelectedYearContentColor = pick("disabledSelectedYearContentColor", defaults.disabledSelectedYearContentColor),
        selectedYearContainerColor = pick("selectedYearContainerColor", defaults.selectedYearContainerColor),
        disabledSelectedYearContainerColor = pick("disabledSelectedYearContainerColor", defaults.disabledSelectedYearContainerColor),
        dayContentColor = pick("dayContentColor", defaults.dayContentColor),
        disabledDayContentColor = pick("disabledDayContentColor", defaults.disabledDayContentColor),
        selectedDayContentColor = pick("selectedDayContentColor", defaults.selectedDayContentColor),
        disabledSelectedDayContentColor = pick("disabledSelectedDayContentColor", defaults.disabledSelectedDayContentColor),
        selectedDayContainerColor = pick("selectedDayContainerColor", defaults.selectedDayContainerColor, tinted = true),
        disabledSelectedDayContainerColor = pick("disabledSelectedDayContainerColor", defaults.disabledSelectedDayContainerColor),
        todayContentColor = pick("todayContentColor", defaults.todayContentColor),
        todayDateBorderColor = pick("todayDateBorderColor", defaults.todayDateBorderColor, tinted = true),
        dayInSelectionRangeContentColor = pick("dayInSelectionRangeContentColor", defaults.dayInSelectionRangeContentColor),
        dayInSelectionRangeContainerColor = pick("dayInSelectionRangeContainerColor", defaults.dayInSelectionRangeContainerColor),
        dividerColor = pick("dividerColor", defaults.dividerColor),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun timePickerColors(options: OneNativePickerOptions): TimePickerColors {
    val defaults = TimePickerDefaults.colors()
    val tint = options.color?.let(::Color)
    fun pick(key: String, fallback: Color, tinted: Color? = null) = options.colorOf(key) ?: tinted ?: fallback
    return defaults.copy(
        containerColor = pick("containerColor", defaults.containerColor),
        clockDialColor = pick("clockDialColor", defaults.clockDialColor, tint?.copy(alpha = 0.3f)),
        clockDialSelectedContentColor = pick("clockDialSelectedContentColor", defaults.clockDialSelectedContentColor),
        clockDialUnselectedContentColor = pick("clockDialUnselectedContentColor", defaults.clockDialUnselectedContentColor),
        selectorColor = pick("selectorColor", defaults.selectorColor, tint),
        periodSelectorBorderColor = pick("periodSelectorBorderColor", defaults.periodSelectorBorderColor),
        periodSelectorSelectedContainerColor = pick("periodSelectorSelectedContainerColor", defaults.periodSelectorSelectedContainerColor),
        periodSelectorUnselectedContainerColor = pick("periodSelectorUnselectedContainerColor", defaults.periodSelectorUnselectedContainerColor),
        periodSelectorSelectedContentColor = pick("periodSelectorSelectedContentColor", defaults.periodSelectorSelectedContentColor),
        periodSelectorUnselectedContentColor = pick("periodSelectorUnselectedContentColor", defaults.periodSelectorUnselectedContentColor),
        timeSelectorSelectedContainerColor = pick("timeSelectorSelectedContainerColor", defaults.timeSelectorSelectedContainerColor, tint),
        timeSelectorUnselectedContainerColor = pick("timeSelectorUnselectedContainerColor", defaults.timeSelectorUnselectedContainerColor),
        timeSelectorSelectedContentColor = pick("timeSelectorSelectedContentColor", defaults.timeSelectorSelectedContentColor),
        timeSelectorUnselectedContentColor = pick("timeSelectorUnselectedContentColor", defaults.timeSelectorUnselectedContentColor),
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OneDatePickerContent(
    state: DatePickerState,
    options: OneNativePickerOptions,
    colors: DatePickerColors,
    modifier: Modifier,
) {
    // the year menu chevron tints from LocalContentColor, not navigationContentColor
    CompositionLocalProvider(LocalContentColor provides colors.navigationContentColor) {
        DatePicker(state = state, modifier = modifier, showModeToggle = options.showModeToggle, colors = colors)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun OneTimePickerContent(
    state: TimePickerState,
    variant: String?,
    colors: TimePickerColors,
    modifier: Modifier,
) {
    if (variant == "input") {
        TimeInput(state = state, modifier = modifier, colors = colors)
    } else {
        TimePicker(state = state, modifier = modifier, colors = colors, layoutType = TimePickerLayoutType.Vertical)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RenderComposeDatePicker(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    val options = props.pickerOptions
    val selected = node.renderedNumberValue.toLong()
    val state = rememberOneDatePickerState(options, props.variant, selected, Unit)
    // a controlled value React keeps or replaces always wins over the native selection
    LaunchedEffect(state, selected) {
        if (state.selectedDateMillis != selected) {
            state.selectedDateMillis = selected
            state.displayedMonthMillis = selected
        }
    }
    LaunchedEffect(state) {
        snapshotFlow { state.selectedDateMillis }.collect { day ->
            if (day != null) node.handleNumberChanged(day.toDouble())
        }
    }
    OneDatePickerContent(state, options, datePickerColors(options), modifier)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RenderComposeTimePicker(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    val options = props.pickerOptions
    val minutes = node.renderedNumberValue.toInt().coerceIn(0, 24 * 60 - 1)
    val state = rememberOneTimePickerState(options, minutes, Unit)
    LaunchedEffect(state, minutes) {
        if (state.hour * 60 + state.minute != minutes) {
            state.hour = minutes / 60
            state.minute = minutes % 60
        }
    }
    LaunchedEffect(state) {
        snapshotFlow { state.hour * 60 + state.minute }.collect { value ->
            node.handleNumberChanged(value.toDouble())
        }
    }
    OneTimePickerContent(state, props.variant, timePickerColors(options), modifier)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RenderComposeDatePickerDialog(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    if (!props.visible) return
    val options = props.pickerOptions
    val selected = props.numberValue.toLong()
    // each presentation starts from the supplied selection
    val state = rememberOneDatePickerState(options, props.variant, selected, node.dialogPresentation)
    val colors = datePickerColors(options)
    DatePickerDialog(
        onDismissRequest = { node.handleDialogDismiss() },
        confirmButton = {
            TextButton(onClick = { node.handleDialogConfirm((state.selectedDateMillis ?: selected).toDouble()) }) {
                Text(props.confirmLabel ?: stringResource(android.R.string.ok))
            }
        },
        modifier = modifier,
        dismissButton = {
            TextButton(onClick = { node.handleDialogDismiss() }) {
                Text(props.dismissLabel ?: stringResource(android.R.string.cancel))
            }
        },
        colors = colors,
    ) {
        OneDatePickerContent(
            state,
            options,
            colors,
            if (state.displayMode == DisplayMode.Picker) Modifier.wrapContentHeight(align = Alignment.Top, unbounded = true) else Modifier,
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun RenderComposeTimePickerDialog(
    node: OneNativeComposeNodeView,
    props: OneNativeComposeNodeProps,
    modifier: Modifier,
) {
    if (!props.visible) return
    val options = props.pickerOptions
    val minutes = props.numberValue.toInt().coerceIn(0, 24 * 60 - 1)
    val state = rememberOneTimePickerState(options, minutes, node.dialogPresentation)
    AlertDialog(
        onDismissRequest = { node.handleDialogDismiss() },
        confirmButton = {
            TextButton(onClick = { node.handleDialogConfirm((state.hour * 60 + state.minute).toDouble()) }) {
                Text(props.confirmLabel ?: stringResource(android.R.string.ok))
            }
        },
        modifier = modifier,
        dismissButton = {
            TextButton(onClick = { node.handleDialogDismiss() }) {
                Text(props.dismissLabel ?: stringResource(android.R.string.cancel))
            }
        },
        text = { OneTimePickerContent(state, props.variant, timePickerColors(options), Modifier) },
    )
}
