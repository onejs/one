package dev.onejs.onenative

import android.graphics.Bitmap
import android.graphics.Matrix
import android.graphics.Rect
import android.media.ExifInterface
import java.io.File

// exif orientation for picked and cropped images. decoders ignore the tag
// and the jpegs One writes carry no exif, so pixels written back out are
// turned upright first.
object OneImageOrientation {
    // normal when the file has no orientation tag or is not an exif format.
    fun read(file: File): Int =
        try {
            ExifInterface(file.absolutePath)
                .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
        } catch (e: Exception) {
            ExifInterface.ORIENTATION_NORMAL
        }

    // orientations 5 to 8 store the pixels transposed to the display axes.
    fun isTransposed(orientation: Int): Boolean =
        orientation == ExifInterface.ORIENTATION_TRANSPOSE ||
            orientation == ExifInterface.ORIENTATION_ROTATE_90 ||
            orientation == ExifInterface.ORIENTATION_TRANSVERSE ||
            orientation == ExifInterface.ORIENTATION_ROTATE_270

    // the bitmap as it displays. returns the same bitmap when it is upright.
    fun upright(bitmap: Bitmap, orientation: Int): Bitmap {
        val matrix = Matrix()
        when (orientation) {
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> matrix.setScale(-1f, 1f)
            ExifInterface.ORIENTATION_ROTATE_180 -> matrix.setRotate(180f)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
                matrix.setRotate(180f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_TRANSPOSE -> {
                matrix.setRotate(90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_ROTATE_90 -> matrix.setRotate(90f)
            ExifInterface.ORIENTATION_TRANSVERSE -> {
                matrix.setRotate(-90f)
                matrix.postScale(-1f, 1f)
            }
            ExifInterface.ORIENTATION_ROTATE_270 -> matrix.setRotate(-90f)
            else -> return bitmap
        }
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
    }

    // maps a rect in upright pixels to the stored pixels of a width by height
    // image, so a region decode of the result turned upright is that rect.
    fun storedRect(rect: Rect, orientation: Int, width: Int, height: Int): Rect {
        val a = storedPoint(rect.left, rect.top, orientation, width, height)
        val b = storedPoint(rect.right, rect.bottom, orientation, width, height)
        return Rect(minOf(a[0], b[0]), minOf(a[1], b[1]), maxOf(a[0], b[0]), maxOf(a[1], b[1]))
    }

    internal fun storedPoint(x: Int, y: Int, orientation: Int, width: Int, height: Int): IntArray =
        when (orientation) {
            ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> intArrayOf(width - x, y)
            ExifInterface.ORIENTATION_ROTATE_180 -> intArrayOf(width - x, height - y)
            ExifInterface.ORIENTATION_FLIP_VERTICAL -> intArrayOf(x, height - y)
            ExifInterface.ORIENTATION_TRANSPOSE -> intArrayOf(y, x)
            ExifInterface.ORIENTATION_ROTATE_90 -> intArrayOf(y, height - x)
            ExifInterface.ORIENTATION_TRANSVERSE -> intArrayOf(width - y, height - x)
            ExifInterface.ORIENTATION_ROTATE_270 -> intArrayOf(width - y, x)
            else -> intArrayOf(x, y)
        }
}
