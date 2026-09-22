import Foundation
import JavaScriptCore
import QuartzCore
import UIKit

public final class ReactNativeLiteHost {
    public let context: JSContext
    public let viewManager: ReactNativeLiteViewManager
    public private(set) var isTornDown: Bool = false

    // Timer tracking
    private var timerId: Int = 1
    private var activeTimers: [Int: Timer] = [:]
    private var immediateTimers: [Int: JSValue] = [:]

    // DisplayLink for requestAnimationFrame
    private var displayLink: CADisplayLink?
    private var displayLinkProxy: DisplayLinkProxy?
    private var rafId: Int = 1
    private var rafCallbacks: [(id: Int, callback: JSValue)] = []

    public init(rootView: UIView? = nil, rootId: Int = 1) {
        precondition(Thread.isMainThread, "ReactNativeLiteHost must be initialized on the main thread")

        guard let ctx = JSContext() else {
            fatalError("Failed to initialize JSContext")
        }
        self.context = ctx

        let vm = ReactNativeLiteViewManager()
        self.viewManager = vm
        vm.host = self

        if let root = rootView {
            vm.registerRoot(view: root, id: rootId)
        }

        setupLogging()
        setupGlobals()
        setupTimers()
        setupDisplayLink()
        setupNativeBridge()
    }

    deinit {
        if !isTornDown {
            displayLink?.invalidate()
            for (_, t) in activeTimers {
                t.invalidate()
            }
        }
    }

    private func setupLogging() {
        context.exceptionHandler = { ctx, exception in
            if let exc = exception {
                print("[ReactNativeLite:JSException] ❌", exc.toString() ?? "unknown error")
                if let stack = exc.objectForKeyedSubscript("stack")?.toString() {
                    print("[ReactNativeLite:JSStack]", stack)
                }
            }
        }

        let log: @convention(block) () -> Void = {
            let args = JSContext.currentArguments() ?? []
            let msg = args.map { ($0 as? JSValue)?.toString() ?? "" }.joined(separator: " ")
            print("[ReactNativeLite:Log]", msg)
        }

        let warn: @convention(block) () -> Void = {
            let args = JSContext.currentArguments() ?? []
            let msg = args.map { ($0 as? JSValue)?.toString() ?? "" }.joined(separator: " ")
            print("[ReactNativeLite:Warn] ⚠️", msg)
        }

        let error: @convention(block) () -> Void = {
            let args = JSContext.currentArguments() ?? []
            let msg = args.map { ($0 as? JSValue)?.toString() ?? "" }.joined(separator: " ")
            print("[ReactNativeLite:Error] 🛑", msg)
        }

        let console = JSValue(newObjectIn: context)
        console?.setValue(unsafeBitCast(log, to: AnyObject.self), forProperty: "log")
        console?.setValue(unsafeBitCast(warn, to: AnyObject.self), forProperty: "warn")
        console?.setValue(unsafeBitCast(error, to: AnyObject.self), forProperty: "error")
        context.globalObject.setValue(console, forProperty: "console")
    }

    private func setupGlobals() {
        context.globalObject.setValue(context.globalObject, forProperty: "globalThis")
        context.globalObject.setValue(context.globalObject, forProperty: "window")

        // Polyfill queueMicrotask backed by Promise.resolve().then(...)
        // This ensures JavaScriptCore's job queue processes microtasks synchronously at script completion.
        context.evaluateScript("""
        if (typeof globalThis.queueMicrotask !== 'function') {
            globalThis.queueMicrotask = function(fn) {
                Promise.resolve().then(function() { fn(); });
            };
        }
        """)
    }

    private func setupTimers() {
        // setTimeout
        let setTimeoutBlock: @convention(block) (JSValue, Double) -> Int = { [weak self] callback, delayMs in
            precondition(Thread.isMainThread, "setTimeout must be called on the main thread")
            guard let self = self, !self.isTornDown else { return 0 }
            let id = self.timerId
            self.timerId += 1

            if delayMs <= 0 {
                self.immediateTimers[id] = callback
            }

            let seconds = max(0.001, delayMs / 1000.0)
            let timer = Timer.scheduledTimer(withTimeInterval: seconds, repeats: false) { [weak self] _ in
                precondition(Thread.isMainThread, "Timer callback must execute on the main thread")
                guard let self = self, !self.isTornDown else { return }
                self.immediateTimers.removeValue(forKey: id)
                self.activeTimers.removeValue(forKey: id)
                callback.call(withArguments: [])
                self.drainMicrotasks()
            }
            RunLoop.main.add(timer, forMode: .common)
            self.activeTimers[id] = timer
            return id
        }

        let clearTimeoutBlock: @convention(block) (Int) -> Void = { [weak self] id in
            precondition(Thread.isMainThread, "clearTimeout must be called on the main thread")
            guard let self = self else { return }
            self.immediateTimers.removeValue(forKey: id)
            if let timer = self.activeTimers.removeValue(forKey: id) {
                timer.invalidate()
            }
        }

        context.globalObject.setValue(unsafeBitCast(setTimeoutBlock, to: AnyObject.self), forProperty: "setTimeout")
        context.globalObject.setValue(unsafeBitCast(clearTimeoutBlock, to: AnyObject.self), forProperty: "clearTimeout")
    }

    private func setupDisplayLink() {
        let proxy = DisplayLinkProxy(target: self)
        self.displayLinkProxy = proxy
        let dl = CADisplayLink(target: proxy, selector: #selector(DisplayLinkProxy.onDisplayLink(link:)))
        dl.add(to: .main, forMode: .common)
        self.displayLink = dl

        let requestAnimationFrameBlock: @convention(block) (JSValue) -> Int = { [weak self] callback in
            precondition(Thread.isMainThread, "requestAnimationFrame must be called on the main thread")
            guard let self = self, !self.isTornDown else { return 0 }
            let id = self.rafId
            self.rafId += 1
            self.rafCallbacks.append((id: id, callback: callback))
            return id
        }

        let cancelAnimationFrameBlock: @convention(block) (Int) -> Void = { [weak self] id in
            precondition(Thread.isMainThread, "cancelAnimationFrame must be called on the main thread")
            self?.rafCallbacks.removeAll { $0.id == id }
        }

        context.globalObject.setValue(unsafeBitCast(requestAnimationFrameBlock, to: AnyObject.self), forProperty: "requestAnimationFrame")
        context.globalObject.setValue(unsafeBitCast(cancelAnimationFrameBlock, to: AnyObject.self), forProperty: "cancelAnimationFrame")
    }

    fileprivate func onDisplayLink(link: CADisplayLink) {
        precondition(Thread.isMainThread, "CADisplayLink must fire on the main thread")
        guard !isTornDown, !rafCallbacks.isEmpty else { return }
        let currentCallbacks = rafCallbacks
        rafCallbacks.removeAll()

        let timestamp = link.timestamp * 1000.0
        for item in currentCallbacks {
            item.callback.call(withArguments: [timestamp])
        }
        drainMicrotasks()
    }

    private func setupNativeBridge() {
        let bridge = JSValue(newObjectIn: context)

        let createViewBlock: @convention(block) (String, Int) -> Void = { [weak self] type, id in
            precondition(Thread.isMainThread, "createView bridge call must run on the main thread")
            guard let self = self, !self.isTornDown else { return }
            self.viewManager.createView(type: type, id: id)
        }

        let setPropBlock: @convention(block) (Int, String, JSValue) -> Void = { [weak self] id, key, jsVal in
            precondition(Thread.isMainThread, "setProp bridge call must run on the main thread")
            guard let self = self, !self.isTornDown else { return }
            if jsVal.isUndefined || jsVal.isNull {
                self.viewManager.setProp(id: id, key: key, value: NSNull())
            } else if let obj = jsVal.toObject() {
                self.viewManager.setProp(id: id, key: key, value: obj)
            }
        }

        let appendChildBlock: @convention(block) (Int, Int) -> Void = { [weak self] pId, cId in
            precondition(Thread.isMainThread, "appendChild bridge call must run on the main thread")
            guard let self = self, !self.isTornDown else { return }
            self.viewManager.appendChild(parentId: pId, childId: cId)
        }

        let removeChildBlock: @convention(block) (Int, Int) -> Void = { [weak self] pId, cId in
            precondition(Thread.isMainThread, "removeChild bridge call must run on the main thread")
            guard let self = self, !self.isTornDown else { return }
            self.viewManager.removeChild(parentId: pId, childId: cId)
        }

        let insertBeforeBlock: @convention(block) (Int, Int, Int) -> Void = { [weak self] pId, cId, bId in
            precondition(Thread.isMainThread, "insertBefore bridge call must run on the main thread")
            guard let self = self, !self.isTornDown else { return }
            self.viewManager.insertBefore(parentId: pId, childId: cId, beforeId: bId)
        }

        let calculateLayoutBlock: @convention(block) (Int, Double, Double) -> Void = { [weak self] rId, w, h in
            precondition(Thread.isMainThread, "calculateLayout bridge call must run on the main thread")
            guard let self = self, !self.isTornDown else { return }
            self.viewManager.calculateLayout(rootId: rId, width: CGFloat(w), height: CGFloat(h))
        }

        let destroyViewBlock: @convention(block) (Int) -> Void = { [weak self] id in
            precondition(Thread.isMainThread, "destroyView bridge call must run on the main thread")
            guard let self = self, !self.isTornDown else { return }
            self.viewManager.destroyView(id: id)
        }

        bridge?.setValue(unsafeBitCast(createViewBlock, to: AnyObject.self), forProperty: "createView")
        bridge?.setValue(unsafeBitCast(setPropBlock, to: AnyObject.self), forProperty: "setProp")
        bridge?.setValue(unsafeBitCast(appendChildBlock, to: AnyObject.self), forProperty: "appendChild")
        bridge?.setValue(unsafeBitCast(removeChildBlock, to: AnyObject.self), forProperty: "removeChild")
        bridge?.setValue(unsafeBitCast(insertBeforeBlock, to: AnyObject.self), forProperty: "insertBefore")
        bridge?.setValue(unsafeBitCast(calculateLayoutBlock, to: AnyObject.self), forProperty: "calculateLayout")
        bridge?.setValue(unsafeBitCast(destroyViewBlock, to: AnyObject.self), forProperty: "destroyView")

        context.globalObject.setValue(bridge, forProperty: "__nativeBridge")
    }

    public func attachRootView(_ view: UIView, id: Int = 1) {
        precondition(Thread.isMainThread, "attachRootView must be called on the main thread")
        precondition(!isTornDown, "Cannot attach root view to a torn-down ReactNativeLiteHost")
        viewManager.registerRoot(view: view, id: id)
    }

    public func evaluateBundle(_ jsCode: String) {
        precondition(Thread.isMainThread, "evaluateBundle must be called on the main thread")
        precondition(!isTornDown, "Cannot evaluate bundle on a torn-down ReactNativeLiteHost")
        context.evaluateScript(jsCode)
        drainPendingWork()
    }

    @discardableResult
    public func evaluateScript(_ jsCode: String) -> JSValue? {
        precondition(Thread.isMainThread, "evaluateScript must be called on the main thread")
        precondition(!isTornDown, "Cannot evaluate script on a torn-down ReactNativeLiteHost")
        let result = context.evaluateScript(jsCode)
        drainPendingWork()
        return result
    }

    public func drainMicrotasks() {
        precondition(Thread.isMainThread, "drainMicrotasks must be called on the main thread")
        guard !isTornDown else { return }
        context.evaluateScript("void 0;")
    }

    public func drainPendingWork() {
        precondition(Thread.isMainThread, "drainPendingWork must be called on the main thread")
        guard !isTornDown else { return }

        // Drain microtasks via JavaScriptCore promise job queue
        context.evaluateScript("void 0;")

        // Drain any zero-delay timers scheduled during bundle evaluation or mount
        if !immediateTimers.isEmpty {
            let pendings = immediateTimers
            immediateTimers.removeAll()
            for (id, cb) in pendings {
                if let timer = activeTimers.removeValue(forKey: id) {
                    timer.invalidate()
                }
                cb.call(withArguments: [])
            }
            context.evaluateScript("void 0;")
        }
    }

    public func dispatchNativeEvent(nodeId: Int, eventName: String, payload: Any? = nil) {
        precondition(Thread.isMainThread, "dispatchNativeEvent must run on the main thread")
        precondition(!isTornDown, "Cannot dispatch event on a torn-down ReactNativeLiteHost")
        guard let fn = context.globalObject.objectForKeyedSubscript("__dispatchNativeEvent"), !fn.isUndefined else {
            return
        }
        fn.call(withArguments: [nodeId, eventName, payload ?? NSNull()])
        drainMicrotasks()
    }

    public func shouldChangeText(nodeId: Int, location: Int, length: Int, replacement: String) -> Bool {
        precondition(Thread.isMainThread, "shouldChangeText must run on the main thread")
        precondition(!isTornDown, "Cannot query delegate on a torn-down ReactNativeLiteHost")
        guard let fn = context.globalObject.objectForKeyedSubscript("__shouldChangeText"), !fn.isUndefined else {
            return true
        }
        let result = fn.call(withArguments: [nodeId, location, length, replacement])
        let allowed = result?.toBool() ?? true
        drainMicrotasks()
        return allowed
    }

    public func teardown() {
        precondition(Thread.isMainThread, "teardown must be called on the main thread")
        guard !isTornDown else { return }
        isTornDown = true

        displayLink?.invalidate()
        displayLink = nil
        displayLinkProxy = nil
        rafCallbacks.removeAll()

        for (_, t) in activeTimers {
            t.invalidate()
        }
        activeTimers.removeAll()
        immediateTimers.removeAll()

        context.exceptionHandler = nil
        context.globalObject.setValue(nil, forProperty: "__nativeBridge")
        context.globalObject.setValue(nil, forProperty: "__dispatchNativeEvent")
        context.globalObject.setValue(nil, forProperty: "__shouldChangeText")

        viewManager.teardown()
    }
}

private final class DisplayLinkProxy {
    private weak var target: ReactNativeLiteHost?

    init(target: ReactNativeLiteHost) {
        self.target = target
    }

    @objc func onDisplayLink(link: CADisplayLink) {
        target?.onDisplayLink(link: link)
    }
}
