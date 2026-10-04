package com.margelo.nitro.one

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.net.URI
import java.util.UUID
import java.util.concurrent.Executors
import kotlin.math.roundToInt

class HybridOneImageManipulator : HybridOneImageManipulatorSpec() {
    private val queue = Executors.newSingleThreadExecutor()
    private val context = requireNotNull(NitroModules.applicationContext)

    override fun transform(uri: String, options: ImageTransformOptions): Promise<ImageTransformResult> {
        val promise = Promise<ImageTransformResult>()
        queue.execute {
            try { promise.resolve(render(uri, options)) }
            catch (error: Exception) {
                promise.reject(if (error is OneNativeError) error else
                    OneNativeError("E_IMAGE_FAILED", "ImageManipulator.transform: ${error.message}"))
            }
        }
        return promise
    }

    private fun render(value: String, options: ImageTransformOptions): ImageTransformResult {
        val source = try {
            val uri = URI(value)
            require(uri.scheme == "file" && uri.path.startsWith("/") &&
                (uri.host == null || uri.host.isEmpty() || uri.host == "localhost") &&
                uri.query == null && uri.fragment == null)
            File(uri.path)
        } catch (error: Exception) { throw problem("URI", "an absolute file:// URI is required") }
        if (!source.isFile) throw problem("FILE", "file does not exist")
        val quality = options.quality ?: 0.9
        if (options.format == OneImageFormat.PNG && options.quality != null) {
            throw problem("INPUT", "quality applies only to JPEG")
        }
        if (!quality.isFinite() || quality < 0 || quality > 1) {
            throw problem("INPUT", "JPEG quality must be between 0 and 1")
        }
        var image = BitmapFactory.decodeFile(source.path) ?: throw problem("DECODE", "source is not a supported image")
        fun replace(next: Bitmap) {
            if (next !== image) image.recycle()
            image = next
        }
        try {
            val orientation = ExifInterface(source.path).getAttributeInt(
                ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
            val matrix = Matrix()
            when (orientation) {
                ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
                ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
                ExifInterface.ORIENTATION_FLIP_VERTICAL -> matrix.setScale(1f, -1f)
                ExifInterface.ORIENTATION_TRANSPOSE -> { matrix.setRotate(90f); matrix.postScale(-1f, 1f) }
                ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
                ExifInterface.ORIENTATION_TRANSVERSE -> { matrix.setRotate(270f); matrix.postScale(-1f, 1f) }
                ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(270f)
            }
            if (!matrix.isIdentity) replace(Bitmap.createBitmap(image, 0, 0, image.width, image.height, matrix, true))
            options.crop?.let { crop ->
                val x = pixel(crop.x, "crop.x", true)
                val y = pixel(crop.y, "crop.y", true)
                val width = pixel(crop.width, "crop.width")
                val height = pixel(crop.height, "crop.height")
                if (x > image.width || y > image.height || width > image.width - x || height > image.height - y) {
                    throw problem("INPUT", "crop must fit inside the source image")
                }
                replace(Bitmap.createBitmap(image, x, y, width, height))
            }
            options.resize?.let { resize ->
                if (resize.width == null && resize.height == null) throw problem("INPUT", "resize needs a width or height")
                val requestedWidth = resize.width?.let { pixel(it, "resize.width") }
                val requestedHeight = resize.height?.let { pixel(it, "resize.height") }
                val width = requestedWidth ?: maxOf(1, (image.width.toDouble() * requestedHeight!! / image.height).roundToInt())
                val height = requestedHeight ?: maxOf(1, (image.height.toDouble() * width / image.width).roundToInt())
                checkOutputSize(width, height)
                replace(Bitmap.createScaledBitmap(image, width, height, true))
            }
            options.rotate?.let { rotate ->
                if (rotate !in listOf(0.0, 90.0, 180.0, 270.0)) throw problem("INPUT", "rotate must be 0, 90, 180, or 270 degrees")
                if (rotate != 0.0) {
                    val rotation = Matrix().apply { setRotate(rotate.toFloat()) }
                    replace(Bitmap.createBitmap(image, 0, 0, image.width, image.height, rotation, true))
                }
            }
            checkOutputSize(image.width, image.height)
            val folder = File(context.cacheDir, "OneImageManipulator")
            if (!folder.isDirectory && !folder.mkdirs()) throw problem("ENCODE", "cannot create output directory")
            val png = options.format == OneImageFormat.PNG
            val output = File(folder, "${UUID.randomUUID()}.${if (png) "png" else "jpg"}")
            try {
                output.outputStream().use { stream ->
                    if (!image.compress(if (png) Bitmap.CompressFormat.PNG else Bitmap.CompressFormat.JPEG,
                        (quality * 100).roundToInt(), stream)) throw problem("ENCODE", "encoding failed")
                }
            } catch (error: Exception) { output.delete(); throw error }
            return ImageTransformResult(Uri.fromFile(output).toString(), image.width.toDouble(), image.height.toDouble(), output.length().toDouble())
        } finally { image.recycle() }
    }

    private fun pixel(value: Double, name: String, zero: Boolean = false): Int {
        if (!value.isFinite() || value < (if (zero) 0 else 1) || value > 100_000 || value != kotlin.math.floor(value)) {
            throw problem("INPUT", "$name must be a whole pixel count")
        }
        return value.toInt()
    }

    private fun checkOutputSize(width: Int, height: Int) {
        if (width < 1 || height < 1 || width > 10_000 || height > 10_000 || width.toLong() * height > 25_000_000) {
            throw problem("INPUT", "output is limited to 25 megapixels and 10,000 pixels per side")
        }
    }

    private fun problem(code: String, message: String) = OneNativeError("E_IMAGE_$code", "ImageManipulator.transform: $message")
}
