@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class, androidx.compose.material3.ExperimentalMaterial3ExpressiveApi::class)

package dev.onejs.onenative

import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.material3.carousel.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.asComposePath
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.DialogProperties
import androidx.graphics.shapes.*
import androidx.graphics.shapes.toPath
import com.facebook.react.bridge.ReadableMap
import kotlinx.coroutines.flow.distinctUntilChanged
import java.time.Instant
import java.time.ZoneOffset

internal data class OneNativeComposeFamilyOptions(
    val values: Map<String, Any?> = emptyMap(),
    val colors: Map<String, Int> = emptyMap(),
) {
    fun number(key: String, default: Double = 0.0): Double = (values[key] as? Number)?.toDouble() ?: default
    fun day(key: String): Long? = (values[key] as? Number)?.toLong()
    fun flag(key: String, default: Boolean = true): Boolean = values[key] as? Boolean ?: default
    fun text(key: String): String? = values[key] as? String
    fun color(key: String): Color = colors[key]?.let(::Color) ?: Color.Unspecified
    companion object {
        fun fromMap(map: ReadableMap?, context: Context): OneNativeComposeFamilyOptions {
            if (map == null) return OneNativeComposeFamilyOptions()
            val colors = listOf("color", "toolbarContainerColor", "toolbarContentColor", "fabContainerColor", "fabContentColor")
                .mapNotNull { key -> readComposeColor(map, key, context)?.let { key to it } }.toMap()
            return OneNativeComposeFamilyOptions(map.toHashMap(), colors)
        }
    }
}

@Composable
internal fun RenderComposeFamily(node: OneNativeComposeNodeView, props: OneNativeComposeNodeProps, modifier: Modifier) {
    val options = props.familyOptions
    when (props.nodeType) {
        "basicalertdialog" -> BasicAlertDialog(
            onDismissRequest = node::handleDialogDismiss,
            modifier = modifier,
            properties = DialogProperties(
                dismissOnBackPress = options.flag("dismissOnBackPress"),
                dismissOnClickOutside = options.flag("dismissOnClickOutside"),
                usePlatformDefaultWidth = options.flag("usePlatformDefaultWidth"),
                decorFitsSystemWindows = options.flag("decorFitsSystemWindows"),
            ),
        ) { node.renderedChildren.forEach { child -> key(child) { RenderComposeNode(child) } } }
        "centeredherocarousel", "multibrowsecarousel", "uncontainedcarousel" -> RenderCarousel(node, props, modifier)
        "horizontalfloatingtoolbar" -> RenderFloatingToolbar(node, props, modifier)
        "daterangepicker", "daterangepickerdialog" -> RenderDateRange(node, props, modifier)
        "shape" -> RenderShape(options, modifier)
    }
}

@Composable
private fun RenderCarousel(node: OneNativeComposeNodeView, props: OneNativeComposeNodeProps, modifier: Modifier) {
    val options = props.familyOptions
    val children = node.renderedChildren
    val state = rememberCarouselState { node.renderedChildren.size }
    val fling = options.text("flingBehavior") ?: if (props.nodeType == "uncontainedcarousel") "noSnap" else "singleAdvance"
    val flingBehavior = if (fling == "singleAdvance") CarouselDefaults.singleAdvanceFlingBehavior(state) else CarouselDefaults.noSnapFlingBehavior()
    val padding = props.lazyContentPadding
    val contentPadding = PaddingValues(start = padding.start.coerceAtLeast(0.0).toFloat().dp, end = padding.end.coerceAtLeast(0.0).toFloat().dp, top = padding.top.coerceAtLeast(0.0).toFloat().dp, bottom = padding.bottom.coerceAtLeast(0.0).toFloat().dp)
    val minSmall = options.day("minSmallItemWidth")?.let { options.number("minSmallItemWidth").toFloat().dp } ?: CarouselDefaults.MinSmallItemSize
    val maxSmall = options.day("maxSmallItemWidth")?.let { options.number("maxSmallItemWidth").toFloat().dp } ?: CarouselDefaults.MaxSmallItemSize
    when (props.nodeType) {
        "centeredherocarousel" -> HorizontalCenteredHeroCarousel(
            state = state, modifier = modifier,
            maxItemWidth = if (options.values.containsKey("maxItemWidth")) options.number("maxItemWidth").toFloat().dp else Dp.Unspecified,
            itemSpacing = options.number("itemSpacing").toFloat().dp,
            minSmallItemWidth = minSmall, maxSmallItemWidth = maxSmall,
            contentPadding = contentPadding, flingBehavior = flingBehavior, userScrollEnabled = options.flag("userScrollEnabled"),
        ) { index -> key(children[index]) { RenderComposeNode(children[index]) } }
        "multibrowsecarousel" -> HorizontalMultiBrowseCarousel(
            state = state, modifier = modifier, preferredItemWidth = options.number("preferredItemWidth").toFloat().dp,
            itemSpacing = options.number("itemSpacing").toFloat().dp,
            minSmallItemWidth = minSmall, maxSmallItemWidth = maxSmall,
            contentPadding = contentPadding, flingBehavior = flingBehavior, userScrollEnabled = options.flag("userScrollEnabled"),
        ) { index -> key(children[index]) { RenderComposeNode(children[index]) } }
        else -> HorizontalUncontainedCarousel(
            state = state, modifier = modifier, itemWidth = options.number("itemWidth").toFloat().dp,
            itemSpacing = options.number("itemSpacing").toFloat().dp,
            contentPadding = contentPadding, flingBehavior = flingBehavior, userScrollEnabled = options.flag("userScrollEnabled"),
        ) { index -> key(children[index]) { RenderComposeNode(children[index]) } }
    }
}

@Composable
private fun RenderFloatingToolbar(node: OneNativeComposeNodeView, props: OneNativeComposeNodeProps, modifier: Modifier) {
    val options = props.familyOptions
    val vibrant = props.text == "vibrant"
    val colors = if (vibrant) FloatingToolbarDefaults.vibrantFloatingToolbarColors(
        toolbarContainerColor = options.color("toolbarContainerColor"), toolbarContentColor = options.color("toolbarContentColor"),
        fabContainerColor = options.color("fabContainerColor"), fabContentColor = options.color("fabContentColor"),
    ) else FloatingToolbarDefaults.standardFloatingToolbarColors(
        toolbarContainerColor = options.color("toolbarContainerColor"), toolbarContentColor = options.color("toolbarContentColor"),
        fabContainerColor = options.color("fabContainerColor"), fabContentColor = options.color("fabContentColor"),
    )
    val fab = node.renderedChildren.firstOrNull { it.renderedProps.slotName == "floatingActionButton" }
    val content: @Composable () -> Unit = {
        node.renderedChildren.filter { it !== fab }.forEach { child -> key(child) { RenderComposeNode(child) } }
    }
    if (fab == null) HorizontalFloatingToolbar(expanded = true, modifier = modifier, colors = colors) { content() }
    else HorizontalFloatingToolbar(expanded = true, modifier = modifier, colors = colors, floatingActionButton = {
        if (vibrant) FloatingToolbarDefaults.VibrantFloatingActionButton(onClick = fab::handlePress, modifier = Modifier.applyReactSemantics(fab, fab.renderedProps), containerColor = colors.fabContainerColor, contentColor = colors.fabContentColor) {
            fab.renderedChildren.forEach { RenderComposeNode(it) }
        } else FloatingToolbarDefaults.StandardFloatingActionButton(onClick = fab::handlePress, modifier = Modifier.applyReactSemantics(fab, fab.renderedProps), containerColor = colors.fabContainerColor, contentColor = colors.fabContentColor) {
            fab.renderedChildren.forEach { RenderComposeNode(it) }
        }
    }) { content() }
}

@Composable
private fun RenderDateRange(node: OneNativeComposeNodeView, props: OneNativeComposeNodeProps, modifier: Modifier) {
    val options = props.familyOptions
    val bounds = props.pickerOptions
    val locale = LocalConfiguration.current.locales[0]
    val start = options.day("initialStart")
    val end = options.day("initialEnd")
    fun year(day: Long) = Instant.ofEpochMilli(day).atZone(ZoneOffset.UTC).year
    val state = remember(locale, start, end, bounds.minimumDay, bounds.maximumDay) {
        DateRangePickerState(
            locale = locale, initialSelectedStartDateMillis = start, initialSelectedEndDateMillis = end,
            initialDisplayedMonthMillis = start,
            yearRange = (bounds.minimumDay?.let(::year) ?: DatePickerDefaults.YearRange.first)..(bounds.maximumDay?.let(::year) ?: DatePickerDefaults.YearRange.last),
            initialDisplayMode = if (props.variant == "input") DisplayMode.Input else DisplayMode.Picker,
            selectableDates = OneNativeSelectableDates(bounds.minimumDay, bounds.maximumDay),
        )
    }
    LaunchedEffect(state, props.variant) { state.displayMode = if (props.variant == "input") DisplayMode.Input else DisplayMode.Picker }
    val dialog = props.nodeType == "daterangepickerdialog"
    LaunchedEffect(state, dialog) {
        if (!dialog) snapshotFlow { state.selectedStartDateMillis to state.selectedEndDateMillis }.distinctUntilChanged().collect { (first, last) -> node.handleDateRangeSelected(first, last) }
    }
    val colors = datePickerColors(bounds)
    val content: @Composable () -> Unit = {
        DateRangePicker(
            state = state, modifier = if (dialog) Modifier else modifier, colors = colors, showModeToggle = bounds.showModeToggle,
            title = if (options.flag("showTitle")) ({ DateRangePickerDefaults.DateRangePickerTitle(state.displayMode, contentColor = colors.titleContentColor) }) else null,
            headline = if (options.flag("showHeadline")) ({ DateRangePickerDefaults.DateRangePickerHeadline(state.selectedStartDateMillis, state.selectedEndDateMillis, state.displayMode, DatePickerDefaults.dateFormatter(), contentColor = colors.headlineContentColor) }) else null,
        )
    }
    if (!dialog) content() else DatePickerDialog(
        onDismissRequest = node::handleDialogDismiss, modifier = modifier,
        confirmButton = {
            TextButton(enabled = state.selectedStartDateMillis != null && state.selectedEndDateMillis != null, onClick = { node.handleDateRangeSelected(state.selectedStartDateMillis, state.selectedEndDateMillis) }) {
                Text(props.confirmLabel ?: androidx.compose.ui.res.stringResource(android.R.string.ok))
            }
        }, dismissButton = { TextButton(onClick = node::handleDialogDismiss) { Text(props.dismissLabel ?: androidx.compose.ui.res.stringResource(android.R.string.cancel)) } },
    ) { content() }
}

@Composable
private fun RenderShape(options: OneNativeComposeFamilyOptions, modifier: Modifier) {
    Box(modifier.drawWithCache {
        val rounding = CornerRounding(size.minDimension * options.number("cornerRounding").toFloat(), options.number("smoothing").toFloat())
        val vertices = options.number("verticesCount", 6.0).toInt()
        val radius = options.number("radius", 0.0).toFloat()
        val innerRadius = options.number("innerRadius", 0.0).toFloat()
        val smoothing = options.number("smoothing").toFloat()
        val cx = size.width / 2; val cy = size.height / 2
        val polygon = when (options.text("shapeType")) {
            "star" -> RoundedPolygon.star(numVerticesPerRadius = vertices, radius = size.minDimension * .5f * radius.coerceAtLeast(.002f), innerRadius = size.minDimension * .5f * innerRadius.coerceAtMost(radius - .001f).coerceAtLeast(.001f), centerX = cx, centerY = cy, rounding = rounding)
            "pillStar" -> RoundedPolygon.pillStar(numVerticesPerRadius = vertices, width = size.width / 2, height = size.height / 2, innerRadiusRatio = innerRadius.coerceIn(.001f, .999f), centerX = cx, centerY = cy, rounding = rounding)
            "pill" -> RoundedPolygon.pill(width = size.width, height = size.height, centerX = cx, centerY = cy, smoothing = smoothing)
            "circle" -> RoundedPolygon.circle(numVertices = vertices, radius = size.minDimension * .5f * radius.coerceAtLeast(.002f), centerX = cx, centerY = cy)
            "polygon" -> RoundedPolygon(numVertices = vertices, radius = size.minDimension / 2, centerX = cx, centerY = cy, rounding = rounding)
            "rectangle" -> RoundedPolygon.rectangle(width = size.width, height = size.height, centerX = cx, centerY = cy, rounding = rounding)
            else -> null
        }
        val path = if (polygon != null) polygon.toPath().asComposePath() else {
            val shape = RoundedCornerShape(topStart = options.number("topStart").toFloat().dp, topEnd = options.number("topEnd").toFloat().dp, bottomStart = options.number("bottomStart").toFloat().dp, bottomEnd = options.number("bottomEnd").toFloat().dp)
            when (val outline = shape.createOutline(size, layoutDirection, this)) {
                is Outline.Generic -> outline.path
                is Outline.Rectangle -> Path().apply { addRect(outline.rect) }
                is Outline.Rounded -> Path().apply { addRoundRect(outline.roundRect) }
            }
        }
        val color = options.colors["color"]?.let(::Color) ?: Color.Transparent
        onDrawBehind { drawPath(path, color) }
    })
}
