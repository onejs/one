package com.margelo.nitro.one

import android.app.Activity
import android.content.Context
import android.graphics.Bitmap
import android.graphics.pdf.PdfDocument
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.Bundle
import android.os.CancellationSignal
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.print.PageRange
import android.print.PrintAttributes
import android.print.PrintDocumentAdapter
import android.print.PrintDocumentInfo
import android.print.PrintJob
import android.print.PrintManager
import android.print.pdf.PrintedPdfDocument
import com.facebook.react.bridge.LifecycleEventListener
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import java.io.File
import java.io.FileOutputStream

// pdf printing matching the ios contract: availability, local file:// pdf
// with pages, busy guard, and { completed }. android has no print-this-pdf
// api, so each page rasterizes through the platform PdfRenderer at the job
// attributes resolution (default 300dpi) into a PrintedPdfDocument.
// cancelling the sheet resolves completed false, never rejects.
class HybridOnePrint : HybridOnePrintSpec(), LifecycleEventListener {
    private var pending: Promise<PrintResult>? = null
    private var pendingJob: PrintJob? = null
    @Volatile private var active = false
    private val mainHandler = Handler(Looper.getMainLooper())

    init {
        NitroModules.applicationContext?.addLifecycleEventListener(this)
    }

    override fun dispose() {
        NitroModules.applicationContext?.removeLifecycleEventListener(this)
        pendingJob?.cancel()
        pendingJob = null
        pending?.resolve(PrintResult(completed = false))
        pending = null
        super.dispose()
    }

    override fun onHostResume() {
        active = true
    }

    override fun onHostPause() {
        active = false
    }

    override fun onHostDestroy() {
        active = false
    }

    override fun isAvailable(): Promise<Boolean> {
        val context = NitroModules.applicationContext
        if (context == null) return Promise.resolved(false)
        return Promise.resolved(printServiceEnabled(context))
    }

    override fun printPdf(fileUri: String, jobName: String?): Promise<PrintResult> {
        val promise = Promise<PrintResult>()
        mainHandler.post {
            if (pending != null) {
                promise.reject(error("E_PRINT_BUSY", "a print sheet is already open"))
                return@post
            }
            if (jobName != null && jobName.isEmpty()) {
                promise.reject(error("E_PRINT_INPUT", "jobName must be non-empty"))
                return@post
            }
            val context = NitroModules.applicationContext
            if (context == null || !printServiceEnabled(context)) {
                promise.reject(error("E_PRINT_UNAVAILABLE", "printing is unavailable"))
                return@post
            }
            val uri = Uri.parse(fileUri)
            val host = uri.host
            if (uri.scheme != "file" || (host != null && host != "" && host != "localhost") ||
                uri.encodedQuery != null || uri.fragment != null || uri.path.isNullOrEmpty()
            ) {
                promise.reject(error("E_PRINT_URI", "a local file:// URI is required"))
                return@post
            }
            val file = File(uri.path!!)
            if (!file.exists() || file.isDirectory) {
                promise.reject(error("E_PRINT_FILE", "PDF file does not exist"))
                return@post
            }
            val pages = try {
                ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
                    val renderer = PdfRenderer(pfd)
                    try {
                        renderer.pageCount
                    } finally {
                        renderer.close()
                    }
                }
            } catch (_: Exception) {
                -1
            }
            if (pages <= 0) {
                promise.reject(error("E_PRINT_PDF", "file is not a nonempty PDF"))
                return@post
            }
            // PrintManager.print requires an activity service; the app
            // context service throws "Can print only from an activity".
            val activity = currentActivity()
            if (activity == null) {
                promise.reject(error("E_PRINT_PRESENTATION", "no foreground activity"))
                return@post
            }
            pending = promise
            try {
                val manager = activity.getSystemService(PrintManager::class.java)
                val name = jobName ?: file.nameWithoutExtension.ifEmpty { file.name }
                val job = manager.print(name, PdfAdapter(context, file, pages), null)
                if (job == null) {
                    pending = null
                    promise.reject(error("E_PRINT_PRESENTATION", "system print sheet did not open"))
                    return@post
                }
                pendingJob = job
                watch(job, promise, System.currentTimeMillis())
            } catch (e: Exception) {
                pending = null
                promise.reject(error("E_PRINT_FAILED", e.message ?: "print failed"))
            }
        }
        return promise
    }

    private fun currentActivity(): Activity? {
        if (!active) return null
        val activity = NitroModules.applicationContext?.currentActivity ?: return null
        if (activity.isFinishing || activity.isDestroyed) return null
        return activity
    }

    private fun error(code: String, message: String) =
        OneNativeError(code, "Print.printPdf: $message")

    private fun printServiceEnabled(context: Context): Boolean {
        // PrintManager exposes no enabled-services list, so read the
        // system setting that names them; empty or absent means none.
        return try {
            val enabled = android.provider.Settings.Secure.getString(
                context.contentResolver, "enabled_print_services"
            )
            !enabled.isNullOrEmpty()
        } catch (_: Exception) {
            false
        }
    }

    private fun watch(job: PrintJob, promise: Promise<PrintResult>, startedMs: Long) {
        if (pending !== promise) return
        when {
            job.isCompleted -> {
                pending = null
                pendingJob = null
                promise.resolve(PrintResult(completed = true))
            }
            job.isFailed -> {
                pending = null
                pendingJob = null
                promise.reject(error("E_PRINT_FAILED", "print failed (state ${job.info?.state})"))
            }
            job.isCancelled -> {
                pending = null
                pendingJob = null
                promise.resolve(PrintResult(completed = false))
            }
            System.currentTimeMillis() - startedMs >= 60_000 -> {
                job.cancel()
                pending = null
                pendingJob = null
                promise.resolve(PrintResult(completed = false))
            }
            else -> mainHandler.postDelayed({ watch(job, promise, startedMs) }, 500)
        }
    }

    // rasterizes the source pdf page by page. PdfRenderer is confined to
    // one background thread; the spooler callbacks arrive on a binder
    // thread and hop there before touching it.
    private class PdfAdapter(
        private val context: Context,
        private val file: File,
        private val pageCount: Int
    ) : PrintDocumentAdapter() {
        private var thread: HandlerThread? = null
        private var worker: Handler? = null
        private var attributes: PrintAttributes? = null

        override fun onLayout(
            oldAttributes: PrintAttributes?,
            newAttributes: PrintAttributes?,
            cancellationSignal: CancellationSignal?,
            callback: LayoutResultCallback?,
            extras: Bundle?
        ) {
            if (cancellationSignal?.isCanceled == true) {
                callback?.onLayoutCancelled()
                return
            }
            attributes = newAttributes
            val info = PrintDocumentInfo.Builder("document")
                .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
                .setPageCount(pageCount)
                .build()
            callback?.onLayoutFinished(info, newAttributes != oldAttributes)
        }

        override fun onWrite(
            pages: Array<PageRange>,
            destination: ParcelFileDescriptor?,
            cancellationSignal: CancellationSignal?,
            callback: WriteResultCallback?
        ) {
            ensureWorker().post {
                if (cancellationSignal?.isCanceled == true) {
                    callback?.onWriteCancelled()
                    return@post
                }
                if (destination == null) {
                    callback?.onWriteFailed("no print destination")
                    return@post
                }
                try {
                    writePages(pages, destination, cancellationSignal)
                    callback?.onWriteFinished(pages)
                } catch (e: Exception) {
                    callback?.onWriteFailed(e.message)
                }
            }
        }

        override fun onFinish() {
            thread?.quitSafely()
            thread = null
            worker = null
        }

        private fun ensureWorker(): Handler {
            worker?.let { return it }
            val created = HandlerThread("OnePrintRenderer")
            created.start()
            thread = created
            val handler = Handler(created.looper)
            worker = handler
            return handler
        }

        private fun writePages(
            pages: Array<PageRange>,
            destination: ParcelFileDescriptor,
            cancellationSignal: CancellationSignal?
        ) {
            val attrs = attributes ?: PrintAttributes.Builder().build()
            val media = attrs.mediaSize ?: PrintAttributes.MediaSize.NA_LETTER
            // page geometry is points (1/72 inch); the raster is pixels.
            val pageWidth = media.widthMils * 72 / 1000
            val pageHeight = media.heightMils * 72 / 1000
            ParcelFileDescriptor.open(file, ParcelFileDescriptor.MODE_READ_ONLY).use { pfd ->
                val renderer = PdfRenderer(pfd)
                try {
                    val document = PrintedPdfDocument(context, attrs)
                    try {
                        for (index in 0 until renderer.pageCount) {
                            if (!contains(pages, index)) continue
                            if (cancellationSignal?.isCanceled == true) return
                            val page = renderer.openPage(index)
                            try {
                                val bitmap = raster(page, attrs)
                                try {
                                    val info = PdfDocument.PageInfo.Builder(
                                        pageWidth, pageHeight, index
                                    ).create()
                                    val documentPage = document.startPage(info)
                                    documentPage.canvas.drawBitmap(
                                        bitmap, null,
                                        android.graphics.Rect(0, 0, pageWidth, pageHeight), null
                                    )
                                    document.finishPage(documentPage)
                                } finally {
                                    bitmap.recycle()
                                }
                            } finally {
                                page.close()
                            }
                        }
                        FileOutputStream(destination.fileDescriptor).use { out ->
                            document.writeTo(out)
                        }
                    } finally {
                        document.close()
                    }
                } finally {
                    renderer.close()
                }
            }
        }

        // bitmap pixels = media size inches times the job resolution,
        // defaulting to 300dpi letter when the attributes carry neither.
        private fun raster(page: PdfRenderer.Page, attrs: PrintAttributes): Bitmap {
            val resolution = attrs.resolution
            val dpiX = resolution?.horizontalDpi?.takeIf { it > 0 } ?: 300
            val dpiY = resolution?.verticalDpi?.takeIf { it > 0 } ?: 300
            val media = attrs.mediaSize ?: PrintAttributes.MediaSize.NA_LETTER
            val width = (media.widthMils * dpiX / 1000).coerceAtLeast(1)
            val height = (media.heightMils * dpiY / 1000).coerceAtLeast(1)
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            bitmap.eraseColor(android.graphics.Color.WHITE)
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_PRINT)
            return bitmap
        }

        private fun contains(pages: Array<PageRange>, index: Int): Boolean {
            for (range in pages) {
                if (index >= range.start && index <= range.end) return true
            }
            return false
        }
    }
}
