package com.margelo.nitro.one

import android.net.Uri
import android.webkit.MimeTypeMap
import com.facebook.react.modules.blob.BlobModule
import com.facebook.react.modules.network.CookieJarContainer
import com.facebook.react.modules.network.ForwardingCookieHandler
import com.facebook.react.modules.network.OkHttpClientProvider
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.ArrayBuffer
import java.io.IOException
import java.io.InputStream
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import okhttp3.Call
import okhttp3.Callback
import okhttp3.OkHttpClient
import okhttp3.CookieJar
import okhttp3.JavaNetCookieJar
import okhttp3.MediaType
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.internal.http.HttpMethod
import okio.BufferedSink

// the global fetch on native, over an OkHttp client built the way react
// native's NetworkingModule builds its own: from OkHttpClientProvider, so an
// app's OkHttpClientFactory (interceptors, certificate pinning) applies, with
// its cookie jar backed by the same CookieManager store react native uses. the response head goes to js first, then every chunk as the
// socket delivers it, so response.body streams. file: and content: urls are
// read from disk, as react native's fetch reads them.
class HybridOneFetch : HybridOneFetchSpec() {
    // cancel actions for live requests; whoever removes an id owns its
    // terminal event, so a cancelled request never reports
    private val active = ConcurrentHashMap<Double, () -> Unit>()
    private val local = Executors.newCachedThreadPool()

    private val client: OkHttpClient by lazy {
        OkHttpClientProvider.createClient().also {
            (it.cookieJar as? CookieJarContainer)
                ?.setCookieJar(JavaNetCookieJar(ForwardingCookieHandler()))
        }
    }
    private val clientWithoutCookies: OkHttpClient by lazy {
        client.newBuilder().cookieJar(CookieJar.NO_COOKIES).build()
    }

    private val context
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("fetch: the react context is not ready")

    override fun start(
        id: Double,
        request: FetchNativeRequest,
        onResponse: (response: FetchNativeResponse) -> Unit,
        onChunk: (chunk: ArrayBuffer) -> Unit,
        onComplete: () -> Unit,
        onError: (message: String) -> Unit
    ) {
        val scheme = Uri.parse(request.url).scheme
        if (scheme == "file" || scheme == "content") {
            readLocal(id, request.url, onResponse, onChunk, onComplete, onError)
            return
        }
        val built = try {
            val builder = Request.Builder().url(request.url)
            for (header in request.headers) builder.addHeader(header.name, header.value)
            val type = request.headers
                .lastOrNull { it.name.equals("content-type", ignoreCase = true) }
                ?.value?.toMediaTypeOrNull()
            builder.method(request.method, body(request, type))
            builder.build()
        } catch (error: IllegalArgumentException) {
            onError(error.message ?: "invalid request")
            return
        }
        val call = (if (request.omitCredentials) clientWithoutCookies else client).newCall(built)
        active[id] = { call.cancel() }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (active.remove(id) != null) onError(e.message ?: e.javaClass.simpleName)
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    if (!active.containsKey(id)) return
                    val headers = response.headers.map { (name, value) -> FetchHeader(name, value) }
                    onResponse(
                        FetchNativeResponse(
                            response.code.toDouble(),
                            response.message,
                            response.request.url.toString(),
                            response.priorResponse != null,
                            headers.toTypedArray()
                        )
                    )
                    pump(id, response.body?.byteStream(), onChunk, onComplete, onError)
                }
            }
        })
    }

    override fun cancel(id: Double) {
        active.remove(id)?.invoke()
    }

    override fun storeBlob(bytes: ArrayBuffer): String = blobModule().store(bytes.toByteArray())

    private fun blobModule(): BlobModule =
        context.getNativeModule(BlobModule::class.java)
            ?: throw IllegalStateException("fetch: react native's BlobModule is not loaded")

    // the request body. js-owned bytes are copied now, during the call;
    // blobs, files and multipart parts are read on the network thread
    private fun body(request: FetchNativeRequest, type: MediaType?): RequestBody? {
        request.body?.let { return it.toByteArray().toRequestBody(type) }
        request.blob?.let { blob ->
            return lazyBody(type) { sink -> sink.write(resolve(blob)) }
        }
        val form = request.form
        val boundary = request.boundary
        if (form != null && boundary != null) {
            return lazyBody(type) { sink -> writeMultipart(sink, form, boundary) }
        }
        return if (HttpMethod.requiresRequestBody(request.method)) ByteArray(0).toRequestBody(type)
        else null
    }

    private fun lazyBody(type: MediaType?, write: (BufferedSink) -> Unit) = object : RequestBody() {
        override fun contentType() = type
        override fun writeTo(sink: BufferedSink) = write(sink)
    }

    private fun resolve(blob: FetchBlobRef): ByteArray =
        blobModule().resolve(blob.blobId, blob.offset.toInt(), blob.size.toInt())
            ?: throw IOException("fetch: blob ${blob.blobId} is no longer in the store")

    private fun open(uri: String): InputStream =
        context.contentResolver.openInputStream(Uri.parse(uri))
            ?: throw IOException("fetch: could not open $uri")

    // multipart/form-data per RFC 7578, the same layout react native writes
    private fun writeMultipart(sink: BufferedSink, parts: Array<FetchFormPart>, boundary: String) {
        fun line(text: String) = sink.writeUtf8(text).writeUtf8("\r\n")
        for (part in parts) {
            line("--$boundary")
            var disposition = "Content-Disposition: form-data; name=\"${escape(part.name)}\""
            val value = part.value
            if (value != null) {
                line(disposition)
                line("")
                line(value)
                continue
            }
            val filename = part.filename ?: part.uri?.let { Uri.parse(it).lastPathSegment }
            if (filename != null) disposition += "; filename=\"${escape(filename)}\""
            line(disposition)
            line("Content-Type: ${part.type ?: "application/octet-stream"}")
            line("")
            val uri = part.uri
            val blob = part.blob
            when {
                uri != null -> open(uri).use { input -> input.copyTo(sink.outputStream()) }
                blob != null -> sink.write(resolve(blob))
                else -> throw IOException("fetch: FormData part ${part.name} has no value")
            }
            line("")
        }
        line("--$boundary--")
    }

    private fun escape(value: String) =
        value.replace("\"", "%22").replace("\r", "%0D").replace("\n", "%0A")

    private fun readLocal(
        id: Double,
        url: String,
        onResponse: (response: FetchNativeResponse) -> Unit,
        onChunk: (chunk: ArrayBuffer) -> Unit,
        onComplete: () -> Unit,
        onError: (message: String) -> Unit
    ) {
        active[id] = {}
        local.execute {
            val input = try {
                open(url)
            } catch (error: Exception) {
                if (active.remove(id) != null) onError(error.message ?: "could not open $url")
                return@execute
            }
            input.use {
                val uri = Uri.parse(url)
                val type = context.contentResolver.getType(uri)
                    ?: MimeTypeMap.getSingleton().getMimeTypeFromExtension(
                        MimeTypeMap.getFileExtensionFromUrl(url)
                    )
                val headers = type?.let { arrayOf(FetchHeader("content-type", it)) } ?: emptyArray()
                if (!active.containsKey(id)) return@execute
                onResponse(FetchNativeResponse(200.0, "", url, false, headers))
                pump(id, input, onChunk, onComplete, onError)
            }
        }
    }

    private fun pump(
        id: Double,
        input: InputStream?,
        onChunk: (chunk: ArrayBuffer) -> Unit,
        onComplete: () -> Unit,
        onError: (message: String) -> Unit
    ) {
        val buffer = ByteArray(CHUNK)
        try {
            while (input != null) {
                val read = input.read(buffer)
                if (read == -1) break
                if (!active.containsKey(id)) return
                if (read > 0) onChunk(ArrayBuffer.copy(buffer.copyOf(read)))
            }
        } catch (error: IOException) {
            if (active.remove(id) != null) onError(error.message ?: error.javaClass.simpleName)
            return
        }
        if (active.remove(id) != null) onComplete()
    }

    override fun dispose() {
        active.values.forEach { it() }
        active.clear()
        local.shutdownNow()
        super.dispose()
    }

    companion object {
        private const val CHUNK = 16 * 1024
    }
}
