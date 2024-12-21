// import '@vite/env'
import getDevServer from 'react-native/Libraries/Core/Devtools/getDevServer';
const importMetaUrl = {
    hostname: '127.0.0.1',
    protocol: 'http',
    port: 5173,
};
// use server configuration, then fallback to inference
const serverHost = __SERVER_HOST__;
const socketProtocol = __HMR_PROTOCOL__ || (importMetaUrl.protocol === 'https:' ? 'wss' : 'ws');
const hmrPort = __HMR_PORT__ || 5173;
let rnDevServerHost;
try {
    const { url: devServerUrl } = getDevServer();
    const [, host] = devServerUrl.match(/:\/\/([^\/]+)/) || [];
    if (host)
        rnDevServerHost = host;
}
catch (e) {
    console.warn(`[vite-native-client] failed to get react-native dev server url: ${e}`);
}
const hmrHost = rnDevServerHost ||
    `${__HMR_HOSTNAME__ || importMetaUrl.hostname}:${hmrPort || importMetaUrl.port}`;
const socketHost = `${hmrHost}${__HMR_BASE__}`;
const directSocketHost = __HMR_DIRECT_TARGET__;
const base = __BASE__ || '/';
const messageBuffer = [];
let socket;
try {
    let fallback;
    // only use fallback when port is inferred to prevent confusion
    if (!hmrPort) {
        fallback = () => {
            // fallback to connecting directly to the hmr server
            // for servers which does not support proxying websocket
            socket = setupWebSocket(socketProtocol, directSocketHost, () => {
                console.error('[vite] failed to connect to websocket.\n' +
                    'your current setup:\n' +
                    `  (browser) ${JSON.stringify(importMetaUrl)} <--[HTTP]--> ${serverHost} (server)\n` +
                    `  (browser) ${socketHost} <--[WebSocket (failing)]--> ${directSocketHost} (server)\n` +
                    'Check out your Vite / network configuration and https://vitejs.dev/config/server-options.html#server-hmr .');
            });
            socket.addEventListener('open', () => {
                console.info('[vite] Direct websocket connection fallback. Check out https://vitejs.dev/config/server-options.html#server-hmr to remove the previous connection error.');
            }, { once: true });
        };
    }
    socket = setupWebSocket(socketProtocol, socketHost, fallback);
}
catch (error) {
    console.error(`[vite] failed to connect to websocket (${error}). `);
}
function setupWebSocket(protocol, hostAndPath, onCloseWithoutOpen) {
    const endpoint = `${protocol}://${hostAndPath}`;
    const socket = new WebSocket(endpoint, 'vite-hmr');
    let isOpened = false;
    /**
     * WARNING: passing an async function as a callback to socket listeners silently fails on native
     */
    socket.addEventListener('open', () => {
        isOpened = true;
        notifyListeners('vite:ws:connect', { webSocket: socket });
    }, { once: true });
    // Listen for messages
    socket.addEventListener('message', ({ data }) => {
        if (process.env.DEBUG) {
            console.info(' ❶ hmr ', data);
        }
        handleMessage(JSON.parse(data));
    });
    socket.addEventListener('error', (err) => {
        console.info('err' + err['message'] + err['stack']);
    });
    // ping server
    socket.addEventListener('close', ({ wasClean }) => {
        if (wasClean)
            return;
        if (!isOpened && onCloseWithoutOpen) {
            onCloseWithoutOpen();
            return;
        }
        notifyListeners('vite:ws:disconnect', { webSocket: socket });
        console.info(`[vite] server connection lost. polling for restart...`);
        waitForSuccessfulPing(protocol, hostAndPath).then(() => {
            console.info('should reload');
            // location.reload()
        });
    });
    return socket;
}
function warnFailedFetch(err, path) {
    try {
        console.error(`${err.message}\n${err.stack}`);
    }
    catch {
        console.error(`${err}`);
    }
    console.error(`[hmr] Failed to reload ${path}. ` +
        `This could be due to syntax errors or importing non-existent ` +
        `modules. (see errors above)`);
}
let isFirstUpdate = true;
const debounceReload = (time) => {
    let timer;
    return () => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        timer = setTimeout(() => {
            globalThis.__vxrnReloadApp();
        }, time);
    };
};
const pageReload = debounceReload(50);
async function handleMessage(payload) {
    switch (payload.type) {
        case 'connected':
            console.info(`[vite] connected.`);
            sendMessageBuffer();
            // proxy(nginx, docker) hmr ws maybe caused timeout,
            // so send ping package let ws keep alive.
            setInterval(() => {
                if (socket.readyState === socket.OPEN) {
                    socket.send('{"type":"ping"}');
                }
            }, __HMR_TIMEOUT__);
            break;
        case 'update':
            notifyListeners('vite:beforeUpdate', payload);
            // if this is the first update and there's already an error overlay, it
            // means the page opened with existing server compile error and the whole
            // module script failed to load (since one of the nested imports is 500).
            // in this case a normal update won't work and a full reload is needed.
            if (isFirstUpdate && hasErrorOverlay()) {
                globalThis.__vxrnReloadApp();
                return;
            }
            clearErrorOverlay();
            isFirstUpdate = false;
            await Promise.all(payload.updates.map((update) => {
                if (update.type === 'js-update') {
                    return queueUpdate(fetchUpdate(update));
                }
            }));
            notifyListeners('vite:afterUpdate', payload);
            break;
        case 'custom': {
            notifyListeners(payload.event, payload.data);
            break;
        }
        case 'full-reload':
            notifyListeners('vite:beforeFullReload', payload);
            if (payload.path && payload.path.endsWith('.html')) {
                // if html file is edited, only reload the page if the browser is
                // currently on that page.
                const pagePath = decodeURI(location.pathname);
                const payloadPath = base + payload.path.slice(1);
                if (pagePath === payloadPath ||
                    payload.path === '/index.html' ||
                    (pagePath.endsWith('/') && pagePath + 'index.html' === payloadPath)) {
                    pageReload();
                }
                return;
            }
            pageReload();
            break;
        case 'prune':
            notifyListeners('vite:beforePrune', payload);
            // After an HMR update, some modules are no longer imported on the page
            // but they may have left behind side effects that need to be cleaned up
            // (.e.g style injections)
            // TODO Trigger their dispose callbacks.
            payload.paths.forEach((path) => {
                const fn = pruneMap.get(path);
                if (fn) {
                    fn(dataMap.get(path));
                }
            });
            break;
        case 'error': {
            notifyListeners('vite:error', payload);
            const err = payload.err;
            if (enableOverlay) {
                createErrorOverlay(err);
            }
            else {
                console.error(`[vite] Internal Server Error\n${err.message}\n${err.stack}`);
            }
            break;
        }
        default: {
            const check = payload;
            return check;
        }
    }
}
function notifyListeners(event, data) {
    const cbs = customListenersMap.get(event);
    if (cbs) {
        cbs.forEach((cb) => cb(data));
    }
}
const enableOverlay = __HMR_ENABLE_OVERLAY__;
function createErrorOverlay(err) {
    if (!enableOverlay)
        return;
    clearErrorOverlay();
    console.error('create error', err);
    // document.body.appendChild(new ErrorOverlay(err))
}
function clearErrorOverlay() {
    // document.querySelectorAll(overlayId).forEach((n) => (n as ErrorOverlay).close())
}
function hasErrorOverlay() {
    return false;
    // return document.querySelectorAll(overlayId).length
}
let pending = false;
let queued = [];
/**
 * buffer multiple hot updates triggered by the same src change
 * so that they are invoked in the same order they were sent.
 * (otherwise the order may be inconsistent because of the http request round trip)
 */
async function queueUpdate(p) {
    queued.push(p);
    if (!pending) {
        pending = true;
        await Promise.resolve();
        pending = false;
        const loading = [...queued];
        queued = [];
        (await Promise.all(loading)).forEach((fn) => fn && fn());
    }
}
async function waitForSuccessfulPing(socketProtocol, hostAndPath, ms = 1000) {
    const pingHostProtocol = socketProtocol === 'wss' ? 'https' : 'http';
    const ping = async () => {
        // A fetch on a websocket URL will return a successful promise with status 400,
        // but will reject a networking error.
        // When running on middleware mode, it returns status 426, and an cors error happens if mode is not no-cors
        try {
            await fetch(`${pingHostProtocol}://${hostAndPath}`, {
                mode: 'no-cors',
                headers: {
                    // Custom headers won't be included in a request with no-cors so (ab)use one of the
                    // safelisted headers to identify the ping request
                    Accept: 'text/x-vite-ping',
                },
            });
            return true;
        }
        catch { }
        return false;
    };
    if (await ping()) {
        return;
    }
    await wait(ms);
    // eslint-disable-next-line no-constant-condition
    while (true) {
        if (await ping()) {
            break;
        }
        await wait(ms);
    }
}
function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
async function fetchUpdate({ path: pathIn, acceptedPath: acceptedPathIn, timestamp, explicitImportRequired, }) {
    const path = pathIn.replace('/@id', '');
    const acceptedPath = acceptedPathIn.replace('/@id', '');
    const mod = hotModulesMap.get(path);
    if (!mod) {
        console.info(` ❶ hmr - No module found`);
        console.info(`    looked for ${path} in:`);
        hotModulesMap.forEach((value, key) => {
            console.info(`   - ${key}`);
        });
        // In a code-splitting project,
        // it is common that the hot-updating module is not loaded yet.
        // https://github.com/vitejs/vite/issues/721
        return;
    }
    let fetchedModule;
    const isSelfUpdate = path === acceptedPath;
    // determine the qualified callbacks before we re-import the modules
    const qualifiedCallbacks = mod.callbacks.filter(({ deps }) => deps.includes(acceptedPath));
    if (isSelfUpdate || qualifiedCallbacks.length > 0) {
        const disposer = disposeMap.get(acceptedPath);
        if (disposer)
            await disposer(dataMap.get(acceptedPath));
        const [acceptedPathWithoutQuery, query] = acceptedPath.split(`?`);
        try {
            const filePath = acceptedPathWithoutQuery;
            const finalQuery = `file?file=${encodeURIComponent(filePath)}&${explicitImportRequired ? 'import&' : ''}t=${timestamp}${query ? `&${query}` : ''}`;
            const scriptUrl = 
            // re-route to our cjs endpoint
            `http://${rnDevServerHost ? rnDevServerHost + '/' : serverHost.replace('5173', '8081')}` +
                finalQuery;
            console.info(` ❶ hmr fetching update: ${scriptUrl}`);
            const source = await fetch(scriptUrl).then((res) => res.text());
            // biome-ignore lint/security/noGlobalEval: this is one of those rare use cases
            const evaluatedModule = eval(source);
            fetchedModule = evaluatedModule;
        }
        catch (e) {
            warnFailedFetch(e, acceptedPath);
        }
    }
    else {
        console.info(` ❶ hmr can't accept - isSelfUpdate ${isSelfUpdate} - callbacks: ${JSON.stringify(mod.callbacks)} - acceptedPath: ${acceptedPath}`);
    }
    return () => {
        for (const { deps, fn } of qualifiedCallbacks) {
            fn(deps.map((dep) => (dep === acceptedPath ? fetchedModule : undefined)));
        }
        const loggedPath = isSelfUpdate ? path : `${acceptedPath} via ${path}`;
        if (process.env.DEBUG) {
            console.info(`[vite] hot updated: ${loggedPath}`);
        }
    };
}
function sendMessageBuffer() {
    if (socket.readyState === 1) {
        messageBuffer.forEach((msg) => socket.send(msg));
        messageBuffer.length = 0;
    }
}
const hotModulesMap = new Map();
const disposeMap = new Map();
const pruneMap = new Map();
const dataMap = new Map();
const customListenersMap = new Map();
const ctxToListenersMap = new Map();
globalThis['createHotContext'] = function createHotContext(ownerPath) {
    if (!dataMap.has(ownerPath)) {
        dataMap.set(ownerPath, {});
    }
    // when a file is hot updated, a new context is created
    // clear its stale callbacks
    const mod = hotModulesMap.get(ownerPath);
    if (mod) {
        mod.callbacks = [];
    }
    // clear stale custom event listeners
    const staleListeners = ctxToListenersMap.get(ownerPath);
    if (staleListeners) {
        for (const [event, staleFns] of staleListeners) {
            const listeners = customListenersMap.get(event);
            if (listeners) {
                customListenersMap.set(event, listeners.filter((l) => !staleFns.includes(l)));
            }
        }
    }
    const newListeners = new Map();
    ctxToListenersMap.set(ownerPath, newListeners);
    function acceptDeps(deps, callback = () => { }) {
        const mod = hotModulesMap.get(ownerPath) || {
            id: ownerPath,
            callbacks: [],
        };
        mod.callbacks.push({
            deps,
            fn: callback,
        });
        hotModulesMap.set(ownerPath, mod);
    }
    const hot = {
        get data() {
            return dataMap.get(ownerPath);
        },
        accept(deps, callback) {
            if (typeof deps === 'function' || !deps) {
                // self-accept: hot.accept(() => {})
                acceptDeps([ownerPath], ([mod]) => deps?.(mod));
            }
            else if (typeof deps === 'string') {
                // explicit deps
                acceptDeps([deps], ([mod]) => callback?.(mod));
            }
            else if (Array.isArray(deps)) {
                acceptDeps(deps, callback);
            }
            else {
                throw new Error(`invalid hot.accept() usage.`);
            }
        },
        // export names (first arg) are irrelevant on the client side, they're
        // extracted in the server for propagation
        acceptExports(_, callback) {
            acceptDeps([ownerPath], ([mod]) => callback?.(mod));
        },
        dispose(cb) {
            disposeMap.set(ownerPath, cb);
        },
        prune(cb) {
            pruneMap.set(ownerPath, cb);
        },
        // Kept for backward compatibility (#11036)
        // @ts-expect-error untyped
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        decline() { },
        // tell the server to re-perform hmr propagation from this module as root
        invalidate(message) {
            notifyListeners('vite:invalidate', { path: ownerPath, message });
            this.send('vite:invalidate', { path: ownerPath, message });
            console.info(`[vite] invalidate ${ownerPath}${message ? `: ${message}` : ''}`);
        },
        // custom events
        on(event, cb) {
            const addToMap = (map) => {
                const existing = map.get(event) || [];
                existing.push(cb);
                map.set(event, existing);
            };
            addToMap(customListenersMap);
            addToMap(newListeners);
        },
        send(event, data) {
            messageBuffer.push(JSON.stringify({ type: 'custom', event, data }));
            sendMessageBuffer();
        },
    };
    return hot;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLHFCQUFxQjtBQUNyQixPQUFPLFlBQVksTUFBTSxtREFBbUQsQ0FBQTtBQWdCNUUsTUFBTSxhQUFhLEdBQUc7SUFDcEIsUUFBUSxFQUFFLFdBQVc7SUFDckIsUUFBUSxFQUFFLE1BQU07SUFDaEIsSUFBSSxFQUFFLElBQUk7Q0FDWCxDQUFBO0FBRUQsdURBQXVEO0FBQ3ZELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQTtBQUNsQyxNQUFNLGNBQWMsR0FBRyxnQkFBZ0IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQy9GLE1BQU0sT0FBTyxHQUFHLFlBQVksSUFBSSxJQUFJLENBQUE7QUFFcEMsSUFBSSxlQUFtQyxDQUFBO0FBQ3ZDLElBQUksQ0FBQztJQUNILE1BQU0sRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLEdBQUcsWUFBWSxFQUFxQixDQUFBO0lBQy9ELE1BQU0sQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzFELElBQUksSUFBSTtRQUFFLGVBQWUsR0FBRyxJQUFJLENBQUE7QUFDbEMsQ0FBQztBQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7SUFDWCxPQUFPLENBQUMsSUFBSSxDQUFDLG1FQUFtRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO0FBQ3RGLENBQUM7QUFFRCxNQUFNLE9BQU8sR0FDWCxlQUFlO0lBQ2YsR0FBRyxnQkFBZ0IsSUFBSSxhQUFhLENBQUMsUUFBUSxJQUFJLE9BQU8sSUFBSSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUE7QUFFbEYsTUFBTSxVQUFVLEdBQUcsR0FBRyxPQUFPLEdBQUcsWUFBWSxFQUFFLENBQUE7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