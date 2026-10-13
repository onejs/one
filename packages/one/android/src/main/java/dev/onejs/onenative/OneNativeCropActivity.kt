package dev.onejs.onenative

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapRegionDecoder
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.media.ExifInterface
import android.os.Bundle
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.widget.Button
import android.widget.FrameLayout
import android.widget.LinearLayout
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.abs
import kotlin.math.min

// system crop UI for One.ImagePicker allowsEditing: a fullscreen editor
// with a movable, resizable crop frame (locked to aspect when set), Crop
// and Cancel actions, and jpeg output at the requested quality. no rotation
// handle: move plus resize is the subset this editor covers.
class OneNativeCropActivity : Activity() {
    private var cropView: CropView? = null
    private var exifOrientation = ExifInterface.ORIENTATION_NORMAL
    private var storedWidth = 0
    private var storedHeight = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val inputPath = intent.getStringExtra(EXTRA_INPUT_PATH)
        val file = if (inputPath != null) File(inputPath) else null
        if (file == null || !file.exists()) {
            setResult(RESULT_CANCELED)
            finish()
            return
        }
        val aspectX = intent.getIntExtra(EXTRA_ASPECT_X, 0)
        val aspectY = intent.getIntExtra(EXTRA_ASPECT_Y, 0)
        val quality = intent.getIntExtra(EXTRA_QUALITY, 100).coerceIn(1, 100)
        val decoded = decodeDisplay(file) ?: run {
            setResult(RESULT_CANCELED)
            finish()
            return
        }
        val bitmap = decoded.first
        val sample = decoded.second
        val root = FrameLayout(this)
        val view = CropView(this, bitmap, sample, aspectX, aspectY)
        cropView = view
        view.contentDescription = "Crop area"
        root.addView(view, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ))
        val bar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.argb(220, 0, 0, 0))
        }
        val cancel = Button(this).apply { text = "Cancel" }
        cancel.setOnClickListener {
            setResult(RESULT_CANCELED)
            finish()
        }
        val crop = Button(this).apply { text = "Crop" }
        crop.setOnClickListener {
            val output = cropFull(file, view.cropRectInImage(), quality)
            if (output != null) {
                setResult(
                    RESULT_OK,
                    Intent().putExtra(EXTRA_OUTPUT_PATH, output.absolutePath)
                )
            } else {
                setResult(RESULT_CANCELED)
            }
            finish()
        }
        val params = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        bar.addView(cancel, params)
        bar.addView(crop, params)
        root.addView(bar, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.WRAP_CONTENT,
            Gravity.BOTTOM
        ))
        setContentView(root)
    }

    override fun onBackPressed() {
        setResult(RESULT_CANCELED)
        super.onBackPressed()
    }

    // the editor shows the image upright, so the frame it reports is in
    // upright pixels; cropFull maps it back to the stored pixels.
    private fun decodeDisplay(file: File): Pair<Bitmap, Int>? {
        return try {
            val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, bounds)
            exifOrientation = OneImageOrientation.read(file)
            storedWidth = bounds.outWidth
            storedHeight = bounds.outHeight
            var sample = 1
            while (bounds.outWidth / sample > 2048 || bounds.outHeight / sample > 2048) {
                sample *= 2
            }
            val options = BitmapFactory.Options().apply { inSampleSize = sample }
            val decoded = BitmapFactory.decodeFile(file.absolutePath, options) ?: return null
            val bitmap = OneImageOrientation.upright(decoded, exifOrientation)
            if (bitmap !== decoded) decoded.recycle()
            Pair(bitmap, sample)
        } catch (e: Exception) {
            null
        }
    }

    // decode only the crop rect through the region decoder, so a full-size
    // capture never sits in memory whole. falls back to a full decode when
    // the region decoder cannot open the file.
    private fun cropFull(file: File, rect: Rect, quality: Int): File? {
        return try {
            val stored = OneImageOrientation.storedRect(rect, exifOrientation, storedWidth, storedHeight)
            val region = decodeRegion(file, stored) ?: return null
            val bitmap = OneImageOrientation.upright(region, exifOrientation)
            if (bitmap !== region) region.recycle()
            try {
                val dir = File(cacheDir, "one-native-image-picker")
                dir.mkdirs()
                val output = File(dir, "CROPPED_${UUID.randomUUID()}.jpg")
                FileOutputStream(output).use { stream ->
                    if (!bitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)) {
                        return null
                    }
                }
                output
            } finally {
                bitmap.recycle()
            }
        } catch (e: Exception) {
            null
        }
    }

    private fun decodeRegion(file: File, rect: Rect): Bitmap? {
        if (rect.isEmpty) return null
        try {
            file.inputStream().use { input ->
                val decoder = BitmapRegionDecoder.newInstance(input, false) ?: return null
                try {
                    val safe = Rect(
                        rect.left.coerceIn(0, decoder.width - 1),
                        rect.top.coerceIn(0, decoder.height - 1),
                        rect.right.coerceIn(1, decoder.width),
                        rect.bottom.coerceIn(1, decoder.height)
                    )
                    if (safe.isEmpty || safe.width() <= 0 || safe.height() <= 0) return null
                    return decoder.decodeRegion(safe, BitmapFactory.Options())
                } finally {
                    decoder.recycle()
                }
            }
        } catch (e: Exception) {
            // fall through to the full decode below
        }
        return try {
            BitmapFactory.decodeFile(file.absolutePath) ?: return null
        } catch (e: Exception) {
            null
        }
    }

    companion object {
        const val EXTRA_INPUT_PATH = "dev.onejs.onenative.EXTRA_CROP_INPUT_PATH"
        const val EXTRA_ASPECT_X = "dev.onejs.onenative.EXTRA_CROP_ASPECT_X"
        const val EXTRA_ASPECT_Y = "dev.onejs.onenative.EXTRA_CROP_ASPECT_Y"
        const val EXTRA_QUALITY = "dev.onejs.onenative.EXTRA_CROP_QUALITY"
        const val EXTRA_OUTPUT_PATH = "dev.onejs.onenative.EXTRA_CROP_OUTPUT_PATH"
    }
}

// the interactive crop frame: drag inside to move, drag a corner to
// resize (locked to the aspect when one was requested). reports the frame
// in display-bitmap pixels; the activity maps it to full-size pixels by
// the sampled scale.
private class CropView(
    context: android.content.Context,
    private val bitmap: Bitmap,
    private val sample: Int,
    private val aspectX: Int,
    private val aspectY: Int
) : View(context) {
    private val imageMatrix = Matrix()
    private val frame = RectF()
    private var drag: Drag? = null
    private val handleRadius = 48f * resources.displayMetrics.density
    private val minSize = 64f * resources.displayMetrics.density

    private val bitmapPaint = Paint(Paint.FILTER_BITMAP_FLAG)
    private val dimPaint = Paint().apply { color = Color.argb(140, 0, 0, 0) }
    private val borderPaint = Paint().apply {
        color = Color.WHITE
        style = Paint.Style.STROKE
        strokeWidth = 3f * resources.displayMetrics.density
    }
    private val handlePaint = Paint().apply { color = Color.WHITE }

    private sealed interface Drag {
        data object Move : Drag
        data class Corner(val index: Int) : Drag
    }

    private val aspect: Float? =
        if (aspectX > 0 && aspectY > 0) aspectX.toFloat() / aspectY.toFloat() else null

    override fun onSizeChanged(width: Int, height: Int, oldWidth: Int, oldHeight: Int) {
        super.onSizeChanged(width, height, oldWidth, oldHeight)
        if (width == 0 || height == 0) return
        val scale = min(
            width.toFloat() / bitmap.width,
            height.toFloat() / bitmap.height
        )
        val dx = (width - bitmap.width * scale) / 2f
        val dy = (height - bitmap.height * scale) / 2f
        imageMatrix.setScale(scale, scale)
        imageMatrix.postTranslate(dx, dy)
        resetFrame(width.toFloat(), height.toFloat())
    }

    private fun resetFrame(width: Float, height: Float) {
        val aspect = aspect
        val frameWidth: Float
        val frameHeight: Float
        if (aspect != null) {
            if (width / height > aspect) {
                frameHeight = height * 0.8f
                frameWidth = frameHeight * aspect
            } else {
                frameWidth = width * 0.8f
                frameHeight = frameWidth / aspect
            }
        } else {
            frameWidth = width * 0.8f
            frameHeight = height * 0.8f
        }
        frame.set(
            (width - frameWidth) / 2f,
            (height - frameHeight) / 2f,
            (width + frameWidth) / 2f,
            (height + frameHeight) / 2f
        )
        invalidate()
    }

    private fun corners(): Array<PointF> {
        return arrayOf(
            PointF(frame.left, frame.top),
            PointF(frame.right, frame.top),
            PointF(frame.right, frame.bottom),
            PointF(frame.left, frame.bottom)
        )
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawBitmap(bitmap, imageMatrix, bitmapPaint)
        // dim everything outside the frame.
        canvas.drawRect(0f, 0f, width.toFloat(), frame.top, dimPaint)
        canvas.drawRect(0f, frame.bottom, width.toFloat(), height.toFloat(), dimPaint)
        canvas.drawRect(0f, frame.top, frame.left, frame.bottom, dimPaint)
        canvas.drawRect(frame.right, frame.top, width.toFloat(), frame.bottom, dimPaint)
        canvas.drawRect(frame, borderPaint)
        for (corner in corners()) {
            val radius = 10f * resources.displayMetrics.density
            canvas.drawRect(
                corner.x - radius, corner.y - radius,
                corner.x + radius, corner.y + radius,
                handlePaint
            )
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                drag = hitTest(event.x, event.y)
                return drag != null
            }
            MotionEvent.ACTION_MOVE -> {
                val active = drag ?: return false
                when (active) {
                    is Drag.Move -> moveBy(event.x - lastX, event.y - lastY)
                    is Drag.Corner -> resizeCorner(active.index, event.x, event.y)
                }
                lastX = event.x
                lastY = event.y
                invalidate()
                return true
            }
            MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                drag = null
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    private var lastX = 0f
    private var lastY = 0f

    private fun hitTest(x: Float, y: Float): Drag? {
        corners().forEachIndexed { index, corner ->
            if (abs(x - corner.x) <= handleRadius && abs(y - corner.y) <= handleRadius) {
                lastX = x
                lastY = y
                return Drag.Corner(index)
            }
        }
        if (frame.contains(x, y)) {
            lastX = x
            lastY = y
            return Drag.Move
        }
        return null
    }

    private fun moveBy(dx: Float, dy: Float) {
        val imageBounds = imageBounds()
        val nx = frame.left + dx
        val ny = frame.top + dy
        val clampedX = nx.coerceIn(imageBounds.left, imageBounds.right - frame.width())
        val clampedY = ny.coerceIn(imageBounds.top, imageBounds.bottom - frame.height())
        frame.offsetTo(clampedX, clampedY)
    }

    private fun resizeCorner(index: Int, x: Float, y: Float) {
        val imageBounds = imageBounds()
        val cx = x.coerceIn(imageBounds.left, imageBounds.right)
        val cy = y.coerceIn(imageBounds.top, imageBounds.bottom)
        val fixed = corners()[(index + 2) % 4]
        var left = min(fixed.x, cx)
        var top = min(fixed.y, cy)
        var right = maxOf(fixed.x, cx)
        var bottom = maxOf(fixed.y, cy)
        val aspect = aspect
        if (aspect != null) {
            // grow from the fixed corner, locked to the aspect.
            var w = right - left
            var h = bottom - top
            if (w / h > aspect) {
                w = h * aspect
            } else {
                h = w / aspect
            }
            if (w < minSize || h < minSize) return
            left = if (fixed.x <= cx) fixed.x else fixed.x - w
            top = if (fixed.y <= cy) fixed.y else fixed.y - h
            right = left + w
            bottom = top + h
        } else {
            if (right - left < minSize || bottom - top < minSize) return
        }
        frame.set(left, top, right, bottom)
    }

    private fun imageBounds(): RectF {
        val bounds = RectF(0f, 0f, bitmap.width.toFloat(), bitmap.height.toFloat())
        imageMatrix.mapRect(bounds)
        return bounds
    }

    // the frame mapped through the inverse image matrix into display
    // pixels, scaled by the sample ratio into full-size file pixels.
    fun cropRectInImage(): Rect {
        val mapped = RectF(frame)
        val inverse = Matrix()
        imageMatrix.invert(inverse)
        inverse.mapRect(mapped)
        val fullWidth = bitmap.width * sample
        val fullHeight = bitmap.height * sample
        return Rect(
            (mapped.left * sample).toInt().coerceIn(0, fullWidth - 1),
            (mapped.top * sample).toInt().coerceIn(0, fullHeight - 1),
            (mapped.right * sample).toInt().coerceIn(1, fullWidth),
            (mapped.bottom * sample).toInt().coerceIn(1, fullHeight)
        )
    }

    private data class PointF(val x: Float, val y: Float)
}
