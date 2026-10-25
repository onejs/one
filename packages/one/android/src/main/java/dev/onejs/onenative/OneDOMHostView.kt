package dev.onejs.onenative

import android.annotation.SuppressLint
import android.annotation.TargetApi
import android.content.Context
import android.graphics.Color
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebMessage
import android.webkit.WebMessagePort
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import com.facebook.react.common.build.ReactBuildConfig
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

// the native side of a 'use dom' component: one WebView per mount. every main
// document is fetched here, so the transport and a fresh epoch go into its head
// before any page script runs. src/dom holds the protocol both sides speak.
class OneDOMHostView(context: Context) : FrameLayout(context) {
    var onDocumentStart: ((String, Double) -> Unit)? = null
    var onMessage: ((String) -> Unit)? = null
    var onLoad: ((String) -> Unit)? = null
    var onError: ((String, String, String) -> Unit)? = null
    var onProcessTerminated: ((String) -> Unit)? = null

    private val main = Handler(Looper.getMainLooper())
    private var entryId = ""
    private var developmentURL = ""
    // the latest state React committed; each new document snapshots it on the
    // WebView's loader thread.
    @Volatile private var bootstrapState = ""
    private var scrollEnabled = true
    private var web: DOMWebView? = null
    private var document: Document? = null
    private var epoch = ""
    private var loadedEpoch = ""
    // the main frame's end of the current document's channel; nothing else can post.
    private var port: WebMessagePort? = null
    // a second crash before any load finishes stays down instead of looping.
    private var recovering = false

    // fabric sets props one at a time; configure sees the whole committed update.
    class Props(var entryId: String = "", var developmentURL: String = "", var bootstrapState: String = "", var scrollEnabled: Boolean = true)
    val props = Props()

    init {
        WebView.setWebContentsDebuggingEnabled(ReactBuildConfig.DEBUG)
    }

    fun commit() {
        configure(props.entryId, props.developmentURL, props.bootstrapState, props.scrollEnabled)
        mount()
    }

    fun configure(entryId: String, developmentURL: String, bootstrapState: String, scrollEnabled: Boolean) {
        if (web != null && (entryId != this.entryId || developmentURL != this.developmentURL)) teardown()
        this.entryId = entryId
        this.developmentURL = developmentURL
        this.bootstrapState = bootstrapState
        this.scrollEnabled = scrollEnabled
        web?.scrollEnabled = scrollEnabled
    }

    // runs after a finished prop update; errors found before any navigation
    // still produce a document the JS side can attribute them to.
    fun mount() {
        if (web != null || entryId.isEmpty()) return
        val document = if (developmentURL.isNotEmpty()) {
            val url = Uri.parse(developmentURL)
            if (url.scheme != "http" && url.scheme != "https") return fail("Invalid One DOM development URL", "DOM_LOAD_FAILED")
            Document(url, null)
        } else {
            val resources = OneDOMResources.current(context)
                ?: return fail("One DOM assets are missing from this build", "DOM_ASSETS_MISSING")
            val page = resources.page(entryId)
                ?: return fail("One DOM entry $entryId is missing from the build manifest", "DOM_ASSETS_MISSING")
            Document(Uri.parse(resources.url(page)), resources)
        }
        start(document)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun start(document: Document) {
        this.document = document
        val web = DOMWebView(context)
        web.scrollEnabled = scrollEnabled
        web.setBackgroundColor(Color.TRANSPARENT)
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = false
        web.settings.allowContentAccess = false
        web.settings.setSupportMultipleWindows(false)
        web.webViewClient = Client(document)
        addView(web, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        this.web = web
        web.loadUrl(document.owned.toString())
    }

    // commands arrive in order on the ui thread and go to the current document;
    // the envelope's epoch lets the page drop anything meant for an earlier one.
    fun post(message: String) {
        val web = web ?: return
        if (epoch.isEmpty()) return
        web.evaluateJavascript("globalThis.__oneDOMReceive?.(${JSONObject.quote(message)})", null)
    }

    // the page disposes while its realm is alive, then the WebView is destroyed.
    fun teardown() {
        val retiring = web ?: return
        val epoch = this.epoch
        web = null
        document = null
        this.epoch = ""
        loadedEpoch = ""
        recovering = false
        closePort()
        removeView(retiring)
        var finished = false
        val finish = {
            if (!finished) {
                finished = true
                retiring.destroy()
            }
        }
        if (epoch.isEmpty()) return finish()
        val dispose = "{\"version\":1,\"epoch\":${JSONObject.quote(epoch)},\"type\":\"dispose\"}"
        retiring.evaluateJavascript("globalThis.__oneDOMReceive?.(${JSONObject.quote(dispose)})") { finish() }
        // a hung renderer never answers; release the WebView anyway.
        main.postDelayed(finish, 1000)
    }

    private fun fail(message: String, code: String) {
        val epoch = UUID.randomUUID().toString()
        val revision = try { JSONObject(bootstrapState).getDouble("revision") } catch (_: Exception) { 0.0 }
        // fabric delivers events for a view once the current mount transaction ends.
        main.post {
            this.epoch = epoch
            onDocumentStart?.invoke(epoch, revision)
            onError?.invoke(epoch, message, code)
        }
    }

    private fun current(document: Document) = this.document === document && web != null

    private fun closePort() {
        port?.close()
        port = null
    }

    // the document's transport asks once its listener is installed. the request
    // proves nothing; the port goes only to the main frame at the owned origin,
    // tagged with an epoch that only that document and native know.
    private fun connect(document: Document, epoch: String) {
        val web = web
        if (!current(document) || web == null || epoch != this.epoch || port != null) return
        val (local, remote) = web.createWebMessageChannel()
        local.setWebMessageCallback(object : WebMessagePort.WebMessageCallback() {
            override fun onMessage(source: WebMessagePort, message: WebMessage) {
                if (current(document) && epoch == this@OneDOMHostView.epoch && message.data != null)
                    this@OneDOMHostView.onMessage?.invoke(message.data)
            }
        }, main)
        port = local
        web.postWebMessage(WebMessage(epoch, arrayOf(remote)), document.origin)
    }

    // MARK: - documents

    private inner class Client(private val document: Document) : WebViewClient() {
        override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
            if (request.isForMainFrame && withoutFragment(request.url) == document.owned) return begin()
            // the owned host never reaches the network; a port or userinfo variant 404s in resolve
            if (request.url.host?.equals(OneDOMResources.HOST, ignoreCase = true) != true) return null
            if (request.url.authority == OneDOMResources.HOST && request.url.path?.startsWith(CONNECT) == true) {
                val epoch = request.url.path!!.removePrefix(CONNECT)
                main.post { connect(document, epoch) }
                return OneDOMResources.response(204, "text/plain", ByteArrayInputStream(ByteArray(0)), "no-store")
            }
            return document.resources?.serve(request.url) ?: OneDOMResources.missing()
        }

        // fetches the owned document, snapshots the committed state with a fresh
        // epoch and puts the transport first in its head.
        private fun begin(): WebResourceResponse {
            val epoch = UUID.randomUUID().toString()
            val bootstrap = bootstrap(bootstrapState, entryId, epoch)
            val html = if (bootstrap == null) null else runCatching { fetch() }
            val injected = html?.getOrNull()?.let { inject(it, bootstrap!!.first, document.resources == null) }
            main.post {
                if (!current(document)) return@post
                closePort()
                this@OneDOMHostView.epoch = epoch
                onDocumentStart?.invoke(epoch, bootstrap?.second ?: 0.0)
                when {
                    bootstrap == null -> onError?.invoke(epoch, "Invalid One DOM bootstrap state", "DOM_PROTOCOL")
                    html?.isFailure == true -> onError?.invoke(
                        epoch, "One DOM page failed to load: ${html.exceptionOrNull()?.message}", "DOM_LOAD_FAILED")
                    injected == null -> onError?.invoke(epoch, "One DOM page has no <head>", "DOM_LOAD_FAILED")
                }
            }
            if (injected == null) return OneDOMResources.missing()
            return OneDOMResources.response(200, "text/html", ByteArrayInputStream(injected.toByteArray()), "no-store")
        }

        // throws with the reason, which reaches JS in the load error.
        private fun fetch(): String {
            val resources = document.resources
            if (resources != null) {
                val segments = resources.resolve(document.owned) ?: throw IOException("not an owned page")
                return resources.open(segments)?.use { it.readBytes().toString(Charsets.UTF_8) }
                    ?: throw IOException("${segments.joinToString("/")} is missing")
            }
            val connection = URL(document.owned.toString()).openConnection() as HttpURLConnection
            try {
                connection.instanceFollowRedirects = false
                if (connection.responseCode != 200) throw IOException("${document.owned} responded ${connection.responseCode}")
                return connection.inputStream.use { it.readBytes().toString(Charsets.UTF_8) }
            } finally {
                connection.disconnect()
            }
        }

        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            // embedded frames load what the page asks for; the main frame keeps its document.
            if (!request.isForMainFrame) return false
            return withoutFragment(request.url) != document.owned
        }

        override fun onPageFinished(view: WebView, url: String) {
            if (!current(document) || epoch.isEmpty() || loadedEpoch == epoch) return
            loadedEpoch = epoch
            recovering = false
            onLoad?.invoke(epoch)
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (current(document) && request.isForMainFrame)
                onError?.invoke(epoch, error.description.toString(), "DOM_LOAD_FAILED")
        }

        @TargetApi(26)
        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            // a gone renderer leaves the WebView unusable; replace it with a fresh document.
            if (view !== web) {
                (view.parent as? FrameLayout)?.removeView(view)
                view.destroy()
                return true
            }
            onProcessTerminated?.invoke(epoch)
            closePort()
            removeView(view)
            view.destroy()
            web = null
            epoch = ""
            if (recovering) return true
            recovering = true
            start(document)
            return true
        }
    }

    // the build or development page this mount may show, fixed for its lifetime.
    private class Document(owned: Uri, val resources: OneDOMResources?) {
        val owned: Uri = withoutFragment(owned)
        val origin: Uri = Uri.Builder().scheme(owned.scheme).encodedAuthority(owned.encodedAuthority).build()
    }

    private class DOMWebView(context: Context) : WebView(context) {
        var scrollEnabled = true
            set(value) {
                field = value
                isVerticalScrollBarEnabled = value
                isHorizontalScrollBarEnabled = value
                if (!value) super.scrollTo(0, 0)
            }

        override fun scrollTo(x: Int, y: Int) {
            if (scrollEnabled) super.scrollTo(x, y)
        }

        override fun overScrollBy(
            deltaX: Int, deltaY: Int, scrollX: Int, scrollY: Int, scrollRangeX: Int, scrollRangeY: Int,
            maxOverScrollX: Int, maxOverScrollY: Int, isTouchEvent: Boolean,
        ): Boolean = scrollEnabled && super.overScrollBy(
            deltaX, deltaY, scrollX, scrollY, scrollRangeX, scrollRangeY, maxOverScrollX, maxOverScrollY, isTouchEvent)
    }

    companion object {
        private const val CONNECT = "/.one-dom/connect/"
        private val head = Regex("<head(\\s[^>]*)?>", RegexOption.IGNORE_CASE)

        fun withoutFragment(url: Uri): Uri = url.buildUpon().fragment(null).build()

        fun bootstrap(state: String, entryId: String, epoch: String): Pair<String, Double>? {
            val trimmed = state.trim()
            val parsed = try { JSONObject(trimmed) } catch (_: Exception) { return null }
            if (!trimmed.startsWith("{") || parsed.optInt("version") != 1 || !parsed.has("revision")) return null
            if (parsed.has("epoch") || parsed.has("entryId") || parsed.has("os")) return null
            val revision = parsed.optDouble("revision")
            // splice the committed bytes rather than re-encode them, so numbers and
            // strings reach the page exactly as JS serialized them.
            val head = "{\"entryId\":${JSONObject.quote(entryId)},\"os\":\"android\",\"epoch\":${JSONObject.quote(epoch)},"
            return Pair(head + trimmed.substring(1), revision)
        }

        // the transport contract from src/dom/browserBridge.ts: bootstrap,
        // postMessage and subscribe, installed before any application script.
        // posts wait for native's port; a frame's message always has a source.
        fun transport(bootstrap: String, development: Boolean) = """
            (() => {
              const listeners = new Set()
              const bootstrap = $bootstrap
              const pending = []
              let port = null
              const send = (raw) => {
                if (port) port.postMessage(raw)
                else pending.push(raw)
              }
              const adopt = (event) => {
                if (port || event.source !== null || event.data !== bootstrap.epoch || event.ports.length !== 1) return
                event.stopImmediatePropagation()
                removeEventListener('message', adopt, true)
                port = event.ports[0]
                for (const raw of pending.splice(0)) port.postMessage(raw)
              }
              addEventListener('message', adopt, true)
              fetch('https://${OneDOMResources.HOST}$CONNECT' + encodeURIComponent(bootstrap.epoch), { mode: 'no-cors', cache: 'no-store' }).catch(() => {})
                    // failures before the page subscribes, such as a module that throws
                    // while evaluating or an entry that fails to load, still reach native.
                    const early = (error, fallback) => {
                      // the same fields serializeError in src/dom/serialize.ts gives
                      let failure = { name: 'Error', message: fallback }
                      try {
                        if (error instanceof Error) {
                          failure = { name: String(error.name || 'Error'), message: String(error.message) }
                          if (typeof error.code === 'string') failure.code = error.code
                          if ($development && typeof error.stack === 'string') failure.stack = error.stack
                        } else if (error === null || ['string', 'number', 'boolean', 'bigint'].includes(typeof error)) {
                          failure.message = String(error)
                        }
                      } catch {}
                      send(JSON.stringify({ version: 1, epoch: bootstrap.epoch, type: 'error', error: failure }))
                    }
                    const onError = (event) => {
                      const target = event.target
                      if (event instanceof ErrorEvent) early(event.error, event.message || 'Script error')
                      else if (target instanceof HTMLScriptElement || target instanceof HTMLLinkElement)
                        early(undefined, 'Failed to load ' + (target.src || target.href))
                    }
                    const onRejection = (event) => early(event.reason, 'Unhandled promise rejection')
                    addEventListener('error', onError, true)
                    addEventListener('unhandledrejection', onRejection)
                    // the page's first subscriber reports from then on
                    let handedOff = false
                    const handoff = () => {
                      if (handedOff) return
                      handedOff = true
                      removeEventListener('error', onError, true)
                      removeEventListener('unhandledrejection', onRejection)
                    }
              Object.defineProperty(globalThis, '__oneDOMReceive', {
                value: (raw) => { for (const listener of [...listeners]) listener(raw) },
              })
              Object.defineProperty(globalThis, '__oneDOM', {
                value: Object.freeze({
                  bootstrap,
                  postMessage(raw) {
                    if (typeof raw !== 'string') throw new TypeError('One DOM messages are strings')
                    send(raw)
                  },
                  subscribe(listener) {
                    handoff()
                    listeners.add(listener)
                    return () => { listeners.delete(listener) }
                  },
                }),
              })
            })()
        """.trimIndent()

        // json is valid script, but a "</script" inside a string would end the tag.
        fun inject(html: String, bootstrap: String, development: Boolean): String? {
            val match = head.find(html) ?: return null
            val script = "<script>" + transport(bootstrap.replace("<", "\\u003c"), development) + "</script>"
            return html.substring(0, match.range.last + 1) + script + html.substring(match.range.last + 1)
        }
    }
}
