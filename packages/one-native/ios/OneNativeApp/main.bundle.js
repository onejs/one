var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// ../../node_modules/react/cjs/react.development.js
var require_react_development = __commonJS(function(exports, module) {
  (function() {
    function defineDeprecationWarning(methodName, info) {
      Object.defineProperty(Component.prototype, methodName, {
        get: function() {
          console.warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
        }
      });
    }
    function getIteratorFn(maybeIterable) {
      if (maybeIterable === null || typeof maybeIterable !== "object")
        return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return typeof maybeIterable === "function" ? maybeIterable : null;
    }
    function warnNoop(publicInstance, callerName) {
      publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
      var warningKey = publicInstance + "." + callerName;
      didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, publicInstance), didWarnStateUpdateForUnmountedComponent[warningKey] = true);
    }
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    function ComponentDummy() {}
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    function noop() {}
    function testStringCoercion(value) {
      return "" + value;
    }
    function checkKeyStringCoercion(value) {
      try {
        testStringCoercion(value);
        var JSCompiler_inline_result = false;
      } catch (e) {
        JSCompiler_inline_result = true;
      }
      if (JSCompiler_inline_result) {
        JSCompiler_inline_result = console;
        var JSCompiler_temp_const = JSCompiler_inline_result.error;
        var JSCompiler_inline_result$jscomp$0 = typeof Symbol === "function" && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
        JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
        return testStringCoercion(value);
      }
    }
    function getComponentNameFromType(type) {
      if (type == null)
        return null;
      if (typeof type === "function")
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if (typeof type === "string")
        return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if (typeof type === "object")
        switch (typeof type.tag === "number" && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = type !== "" ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, innerType !== null ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {}
        }
      return null;
    }
    function getTaskName(type) {
      if (type === REACT_FRAGMENT_TYPE)
        return "<>";
      if (typeof type === "object" && type !== null && type.$$typeof === REACT_LAZY_TYPE)
        return "<...>";
      try {
        var name = getComponentNameFromType(type);
        return name ? "<" + name + ">" : "<...>";
      } catch (x) {
        return "<...>";
      }
    }
    function getOwner() {
      var dispatcher = ReactSharedInternals.A;
      return dispatcher === null ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
      return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
      if (hasOwnProperty.call(config, "key")) {
        var getter = Object.getOwnPropertyDescriptor(config, "key").get;
        if (getter && getter.isReactWarning)
          return false;
      }
      return config.key !== undefined;
    }
    function defineKeyPropWarningGetter(props, displayName) {
      function warnAboutAccessingKey() {
        specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
      }
      warnAboutAccessingKey.isReactWarning = true;
      Object.defineProperty(props, "key", {
        get: warnAboutAccessingKey,
        configurable: true
      });
    }
    function elementRefGetterWithDeprecationWarning() {
      var componentName = getComponentNameFromType(this.type);
      didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
      componentName = this.props.ref;
      return componentName !== undefined ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
      var refProp = props.ref;
      type = {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        props,
        _owner: owner
      };
      (refProp !== undefined ? refProp : null) !== null ? Object.defineProperty(type, "ref", {
        enumerable: false,
        get: elementRefGetterWithDeprecationWarning
      }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
      type._store = {};
      Object.defineProperty(type._store, "validated", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: 0
      });
      Object.defineProperty(type, "_debugInfo", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: null
      });
      Object.defineProperty(type, "_debugStack", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugStack
      });
      Object.defineProperty(type, "_debugTask", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugTask
      });
      Object.freeze && (Object.freeze(type.props), Object.freeze(type));
      return type;
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      newKey = ReactElement(oldElement.type, newKey, oldElement.props, oldElement._owner, oldElement._debugStack, oldElement._debugTask);
      oldElement._store && (newKey._store.validated = oldElement._store.validated);
      return newKey;
    }
    function validateChildKeys(node) {
      isValidElement(node) ? node._store && (node._store.validated = 1) : typeof node === "object" && node !== null && node.$$typeof === REACT_LAZY_TYPE && (node._payload.status === "fulfilled" ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
      return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    function getElementKey(element, index) {
      return typeof element === "object" && element !== null && element.key != null ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch (typeof thenable.status === "string" ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
            thenable.status === "pending" && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
          }, function(error) {
            thenable.status === "pending" && (thenable.status = "rejected", thenable.reason = error);
          })), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if (type === "undefined" || type === "boolean")
        children = null;
      var invokeCallback = false;
      if (children === null)
        invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
            }
        }
      if (invokeCallback) {
        invokeCallback = children;
        callback = callback(invokeCallback);
        var childKey = nameSoFar === "" ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
        isArrayImpl(callback) ? (escapedPrefix = "", childKey != null && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : callback != null && (isValidElement(callback) && (callback.key != null && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(callback, escapedPrefix + (callback.key == null || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + childKey), nameSoFar !== "" && invokeCallback != null && isValidElement(invokeCallback) && invokeCallback.key == null && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
        return 1;
      }
      invokeCallback = 0;
      childKey = nameSoFar === "" ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0;i < children.length; i++)
          nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
      else if (i = getIteratorFn(children), typeof i === "function")
        for (i === children.entries && (didWarnAboutMaps || console.warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead."), didWarnAboutMaps = true), children = i.call(children), i = 0;!(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
      else if (type === "object") {
        if (typeof children.then === "function")
          return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
        array = String(children);
        throw Error("Objects are not valid as a React child (found: " + (array === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (children == null)
        return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (payload._status === -1) {
        var ioInfo = payload._ioInfo;
        ioInfo != null && (ioInfo.start = ioInfo.end = performance.now());
        ioInfo = payload._result;
        var thenable = ioInfo();
        thenable.then(function(moduleObject) {
          if (payload._status === 0 || payload._status === -1) {
            payload._status = 1;
            payload._result = moduleObject;
            var _ioInfo = payload._ioInfo;
            _ioInfo != null && (_ioInfo.end = performance.now());
            thenable.status === undefined && (thenable.status = "fulfilled", thenable.value = moduleObject);
          }
        }, function(error) {
          if (payload._status === 0 || payload._status === -1) {
            payload._status = 2;
            payload._result = error;
            var _ioInfo2 = payload._ioInfo;
            _ioInfo2 != null && (_ioInfo2.end = performance.now());
            thenable.status === undefined && (thenable.status = "rejected", thenable.reason = error);
          }
        });
        ioInfo = payload._ioInfo;
        if (ioInfo != null) {
          ioInfo.value = thenable;
          var displayName = thenable.displayName;
          typeof displayName === "string" && (ioInfo.name = displayName);
        }
        payload._status === -1 && (payload._status = 0, payload._result = thenable);
      }
      if (payload._status === 1)
        return ioInfo = payload._result, ioInfo === undefined && console.error(`lazy: Expected the result of a dynamic import() call. Instead received: %s

Your code should look like: 
  const MyComponent = lazy(() => import('./MyComponent'))

Did you accidentally put curly braces around the import?`, ioInfo), "default" in ioInfo || console.error(`lazy: Expected the result of a dynamic import() call. Instead received: %s

Your code should look like: 
  const MyComponent = lazy(() => import('./MyComponent'))`, ioInfo), ioInfo.default;
      throw payload._result;
    }
    function resolveDispatcher() {
      var dispatcher = ReactSharedInternals.H;
      dispatcher === null && console.error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`);
      return dispatcher;
    }
    function releaseAsyncTransition() {
      ReactSharedInternals.asyncTransitions--;
    }
    function enqueueTask(task) {
      if (enqueueTaskImpl === null)
        try {
          var requireString = ("require" + Math.random()).slice(0, 7);
          enqueueTaskImpl = (module && module[requireString]).call(module, "timers").setImmediate;
        } catch (_err) {
          enqueueTaskImpl = function(callback) {
            didWarnAboutMessageChannel === false && (didWarnAboutMessageChannel = true, typeof MessageChannel === "undefined" && console.error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."));
            var channel = new MessageChannel;
            channel.port1.onmessage = callback;
            channel.port2.postMessage(undefined);
          };
        }
      return enqueueTaskImpl(task);
    }
    function aggregateErrors(errors) {
      return 1 < errors.length && typeof AggregateError === "function" ? new AggregateError(errors) : errors[0];
    }
    function popActScope(prevActQueue, prevActScopeDepth) {
      prevActScopeDepth !== actScopeDepth - 1 && console.error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
      actScopeDepth = prevActScopeDepth;
    }
    function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
      var queue = ReactSharedInternals.actQueue;
      if (queue !== null)
        if (queue.length !== 0)
          try {
            flushActQueue(queue);
            enqueueTask(function() {
              return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
            });
            return;
          } catch (error) {
            ReactSharedInternals.thrownErrors.push(error);
          }
        else
          ReactSharedInternals.actQueue = null;
      0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
    }
    function flushActQueue(queue) {
      if (!isFlushing) {
        isFlushing = true;
        var i = 0;
        try {
          for (;i < queue.length; i++) {
            var callback = queue[i];
            do {
              ReactSharedInternals.didUsePromise = false;
              var continuation = callback(false);
              if (continuation !== null) {
                if (ReactSharedInternals.didUsePromise) {
                  queue[i] = callback;
                  queue.splice(0, i);
                  return;
                }
                callback = continuation;
              } else
                break;
            } while (1);
          }
          queue.length = 0;
        } catch (error) {
          queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
        } finally {
          isFlushing = false;
        }
      }
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function(publicInstance) {
        warnNoop(publicInstance, "forceUpdate");
      },
      enqueueReplaceState: function(publicInstance) {
        warnNoop(publicInstance, "replaceState");
      },
      enqueueSetState: function(publicInstance) {
        warnNoop(publicInstance, "setState");
      }
    }, assign = Object.assign, emptyObject = {};
    Object.freeze(emptyObject);
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null)
        throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    var deprecatedAPIs = {
      isMounted: [
        "isMounted",
        "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."
      ],
      replaceState: [
        "replaceState",
        "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."
      ]
    };
    for (fnName in deprecatedAPIs)
      deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
    ComponentDummy.prototype = Component.prototype;
    deprecatedAPIs = PureComponent.prototype = new ComponentDummy;
    deprecatedAPIs.constructor = PureComponent;
    assign(deprecatedAPIs, Component.prototype);
    deprecatedAPIs.isPureReactComponent = true;
    var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
      H: null,
      A: null,
      T: null,
      S: null,
      actQueue: null,
      asyncTransitions: 0,
      isBatchingLegacy: false,
      didScheduleLegacyUpdate: false,
      didUsePromise: false,
      thrownErrors: [],
      getCurrentStack: null,
      recentlyCreatedOwnerStacks: 0
    }, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
      return null;
    };
    deprecatedAPIs = {
      react_stack_bottom_frame: function(callStackForError) {
        return callStackForError();
      }
    };
    var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(deprecatedAPIs, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutMaps = false, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = typeof reportError === "function" ? reportError : function(error) {
      if (typeof window === "object" && typeof window.ErrorEvent === "function") {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: typeof error === "object" && error !== null && typeof error.message === "string" ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event))
          return;
      } else if (typeof process === "object" && typeof process.emit === "function") {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    }, didWarnAboutMessageChannel = false, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = false, isFlushing = false, queueSeveralMicrotasks = typeof queueMicrotask === "function" ? function(callback) {
      queueMicrotask(function() {
        return queueMicrotask(callback);
      });
    } : enqueueTask;
    deprecatedAPIs = Object.freeze({
      __proto__: null,
      c: function(size) {
        return resolveDispatcher().useMemoCache(size);
      }
    });
    var fnName = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(children, function() {
          forEachFunc.apply(this, arguments);
        }, forEachContext);
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error("React.Children.only expected to receive a single React element child.");
        return children;
      }
    };
    exports.Activity = REACT_ACTIVITY_TYPE;
    exports.Children = fnName;
    exports.Component = Component;
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.Profiler = REACT_PROFILER_TYPE;
    exports.PureComponent = PureComponent;
    exports.StrictMode = REACT_STRICT_MODE_TYPE;
    exports.Suspense = REACT_SUSPENSE_TYPE;
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports.__COMPILER_RUNTIME = deprecatedAPIs;
    exports.act = function(callback) {
      var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
      actScopeDepth++;
      var queue = ReactSharedInternals.actQueue = prevActQueue !== null ? prevActQueue : [], didAwaitActCall = false;
      try {
        var result = callback();
      } catch (error) {
        ReactSharedInternals.thrownErrors.push(error);
      }
      if (0 < ReactSharedInternals.thrownErrors.length)
        throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
      if (result !== null && typeof result === "object" && typeof result.then === "function") {
        var thenable = result;
        queueSeveralMicrotasks(function() {
          didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"));
        });
        return {
          then: function(resolve, reject) {
            didAwaitActCall = true;
            thenable.then(function(returnValue) {
              popActScope(prevActQueue, prevActScopeDepth);
              if (prevActScopeDepth === 0) {
                try {
                  flushActQueue(queue), enqueueTask(function() {
                    return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
                  });
                } catch (error$0) {
                  ReactSharedInternals.thrownErrors.push(error$0);
                }
                if (0 < ReactSharedInternals.thrownErrors.length) {
                  var _thrownError = aggregateErrors(ReactSharedInternals.thrownErrors);
                  ReactSharedInternals.thrownErrors.length = 0;
                  reject(_thrownError);
                }
              } else
                resolve(returnValue);
            }, function(error) {
              popActScope(prevActQueue, prevActScopeDepth);
              0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
            });
          }
        };
      }
      var returnValue$jscomp$0 = result;
      popActScope(prevActQueue, prevActScopeDepth);
      prevActScopeDepth === 0 && (flushActQueue(queue), queue.length !== 0 && queueSeveralMicrotasks(function() {
        didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = true, console.error("A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"));
      }), ReactSharedInternals.actQueue = null);
      if (0 < ReactSharedInternals.thrownErrors.length)
        throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
      return {
        then: function(resolve, reject) {
          didAwaitActCall = true;
          prevActScopeDepth === 0 ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
            return recursivelyFlushAsyncActWork(returnValue$jscomp$0, resolve, reject);
          })) : resolve(returnValue$jscomp$0);
        }
      };
    };
    exports.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports.cacheSignal = function() {
      return null;
    };
    exports.captureOwnerStack = function() {
      var getCurrentStack = ReactSharedInternals.getCurrentStack;
      return getCurrentStack === null ? null : getCurrentStack();
    };
    exports.cloneElement = function(element, config, children) {
      if (element === null || element === undefined)
        throw Error("The argument must be a React element, but you passed " + element + ".");
      var props = assign({}, element.props), key = element.key, owner = element._owner;
      if (config != null) {
        var JSCompiler_inline_result;
        a: {
          if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(config, "ref").get) && JSCompiler_inline_result.isReactWarning) {
            JSCompiler_inline_result = false;
            break a;
          }
          JSCompiler_inline_result = config.ref !== undefined;
        }
        JSCompiler_inline_result && (owner = getOwner());
        hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
        for (propName in config)
          !hasOwnProperty.call(config, propName) || propName === "key" || propName === "__self" || propName === "__source" || propName === "ref" && config.ref === undefined || (props[propName] = config[propName]);
      }
      var propName = arguments.length - 2;
      if (propName === 1)
        props.children = children;
      else if (1 < propName) {
        JSCompiler_inline_result = Array(propName);
        for (var i = 0;i < propName; i++)
          JSCompiler_inline_result[i] = arguments[i + 2];
        props.children = JSCompiler_inline_result;
      }
      props = ReactElement(element.type, key, props, owner, element._debugStack, element._debugTask);
      for (key = 2;key < arguments.length; key++)
        validateChildKeys(arguments[key]);
      return props;
    };
    exports.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      defaultValue._currentRenderer = null;
      defaultValue._currentRenderer2 = null;
      return defaultValue;
    };
    exports.createElement = function(type, config, children) {
      for (var i = 2;i < arguments.length; i++)
        validateChildKeys(arguments[i]);
      i = {};
      var key = null;
      if (config != null)
        for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = true, console.warn("Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform")), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && propName !== "key" && propName !== "__self" && propName !== "__source" && (i[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (childrenLength === 1)
        i.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), _i = 0;_i < childrenLength; _i++)
          childArray[_i] = arguments[_i + 2];
        Object.freeze && Object.freeze(childArray);
        i.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          i[propName] === undefined && (i[propName] = childrenLength[propName]);
      key && defineKeyPropWarningGetter(i, typeof type === "function" ? type.displayName || type.name || "Unknown" : type);
      var propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
      return ReactElement(type, key, i, getOwner(), propName ? Error("react-stack-top-frame") : unknownOwnerDebugStack, propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
    exports.createRef = function() {
      var refObject = { current: null };
      Object.seal(refObject);
      return refObject;
    };
    exports.forwardRef = function(render) {
      render != null && render.$$typeof === REACT_MEMO_TYPE ? console.error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).") : typeof render !== "function" ? console.error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render) : render.length !== 0 && render.length !== 2 && console.error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
      render != null && render.defaultProps != null && console.error("forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?");
      var elementType = { $$typeof: REACT_FORWARD_REF_TYPE, render }, ownName;
      Object.defineProperty(elementType, "displayName", {
        enumerable: false,
        configurable: true,
        get: function() {
          return ownName;
        },
        set: function(name) {
          ownName = name;
          render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
        }
      });
      return elementType;
    };
    exports.isValidElement = isValidElement;
    exports.lazy = function(ctor) {
      ctor = { _status: -1, _result: ctor };
      var lazyType = {
        $$typeof: REACT_LAZY_TYPE,
        _payload: ctor,
        _init: lazyInitializer
      }, ioInfo = {
        name: "lazy",
        start: -1,
        end: -1,
        value: null,
        owner: null,
        debugStack: Error("react-stack-top-frame"),
        debugTask: console.createTask ? console.createTask("lazy()") : null
      };
      ctor._ioInfo = ioInfo;
      lazyType._debugInfo = [{ awaited: ioInfo }];
      return lazyType;
    };
    exports.memo = function(type, compare) {
      type == null && console.error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
      compare = {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: compare === undefined ? null : compare
      };
      var ownName;
      Object.defineProperty(compare, "displayName", {
        enumerable: false,
        configurable: true,
        get: function() {
          return ownName;
        },
        set: function(name) {
          ownName = name;
          type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
        }
      });
      return compare;
    };
    exports.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      currentTransition._updatedFibers = new Set;
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        onStartTransitionFinish !== null && onStartTransitionFinish(currentTransition, returnValue);
        typeof returnValue === "object" && returnValue !== null && typeof returnValue.then === "function" && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
      } catch (error) {
        reportGlobalError(error);
      } finally {
        prevTransition === null && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.")), prevTransition !== null && currentTransition.types !== null && (prevTransition.types !== null && prevTransition.types !== currentTransition.types && console.error("We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    };
    exports.unstable_useCacheRefresh = function() {
      return resolveDispatcher().useCacheRefresh();
    };
    exports.use = function(usable) {
      return resolveDispatcher().use(usable);
    };
    exports.useActionState = function(action, initialState, permalink) {
      return resolveDispatcher().useActionState(action, initialState, permalink);
    };
    exports.useCallback = function(callback, deps) {
      return resolveDispatcher().useCallback(callback, deps);
    };
    exports.useContext = function(Context) {
      var dispatcher = resolveDispatcher();
      Context.$$typeof === REACT_CONSUMER_TYPE && console.error("Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?");
      return dispatcher.useContext(Context);
    };
    exports.useDebugValue = function(value, formatterFn) {
      return resolveDispatcher().useDebugValue(value, formatterFn);
    };
    exports.useDeferredValue = function(value, initialValue) {
      return resolveDispatcher().useDeferredValue(value, initialValue);
    };
    exports.useEffect = function(create, deps) {
      create == null && console.warn("React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?");
      return resolveDispatcher().useEffect(create, deps);
    };
    exports.useEffectEvent = function(callback) {
      return resolveDispatcher().useEffectEvent(callback);
    };
    exports.useId = function() {
      return resolveDispatcher().useId();
    };
    exports.useImperativeHandle = function(ref, create, deps) {
      return resolveDispatcher().useImperativeHandle(ref, create, deps);
    };
    exports.useInsertionEffect = function(create, deps) {
      create == null && console.warn("React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?");
      return resolveDispatcher().useInsertionEffect(create, deps);
    };
    exports.useLayoutEffect = function(create, deps) {
      create == null && console.warn("React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?");
      return resolveDispatcher().useLayoutEffect(create, deps);
    };
    exports.useMemo = function(create, deps) {
      return resolveDispatcher().useMemo(create, deps);
    };
    exports.useOptimistic = function(passthrough, reducer) {
      return resolveDispatcher().useOptimistic(passthrough, reducer);
    };
    exports.useReducer = function(reducer, initialArg, init) {
      return resolveDispatcher().useReducer(reducer, initialArg, init);
    };
    exports.useRef = function(initialValue) {
      return resolveDispatcher().useRef(initialValue);
    };
    exports.useState = function(initialState) {
      return resolveDispatcher().useState(initialState);
    };
    exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return resolveDispatcher().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    };
    exports.useTransition = function() {
      return resolveDispatcher().useTransition();
    };
    exports.version = "19.2.3";
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })();
});

// ../../node_modules/react/index.js
var require_react = __commonJS(function(exports, module) {
  var react_development = __toESM(require_react_development());
  if (false) {} else {
    module.exports = react_development;
  }
});

// ../../node_modules/react-reconciler/node_modules/scheduler/cjs/scheduler.development.js
var require_scheduler_development = __commonJS(function(exports) {
  (function() {
    function performWorkUntilDeadline() {
      needsPaint = false;
      if (isMessageLoopRunning) {
        var currentTime = exports.unstable_now();
        startTime = currentTime;
        var hasMoreWork = true;
        try {
          a: {
            isHostCallbackScheduled = false;
            isHostTimeoutScheduled && (isHostTimeoutScheduled = false, localClearTimeout(taskTimeoutID), taskTimeoutID = -1);
            isPerformingWork = true;
            var previousPriorityLevel = currentPriorityLevel;
            try {
              b: {
                advanceTimers(currentTime);
                for (currentTask = peek(taskQueue);currentTask !== null && !(currentTask.expirationTime > currentTime && shouldYieldToHost()); ) {
                  var callback = currentTask.callback;
                  if (typeof callback === "function") {
                    currentTask.callback = null;
                    currentPriorityLevel = currentTask.priorityLevel;
                    var continuationCallback = callback(currentTask.expirationTime <= currentTime);
                    currentTime = exports.unstable_now();
                    if (typeof continuationCallback === "function") {
                      currentTask.callback = continuationCallback;
                      advanceTimers(currentTime);
                      hasMoreWork = true;
                      break b;
                    }
                    currentTask === peek(taskQueue) && pop(taskQueue);
                    advanceTimers(currentTime);
                  } else
                    pop(taskQueue);
                  currentTask = peek(taskQueue);
                }
                if (currentTask !== null)
                  hasMoreWork = true;
                else {
                  var firstTimer = peek(timerQueue);
                  firstTimer !== null && requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
                  hasMoreWork = false;
                }
              }
              break a;
            } finally {
              currentTask = null, currentPriorityLevel = previousPriorityLevel, isPerformingWork = false;
            }
            hasMoreWork = undefined;
          }
        } finally {
          hasMoreWork ? schedulePerformWorkUntilDeadline() : isMessageLoopRunning = false;
        }
      }
    }
    function push(heap, node) {
      var index = heap.length;
      heap.push(node);
      a:
        for (;0 < index; ) {
          var parentIndex = index - 1 >>> 1, parent = heap[parentIndex];
          if (0 < compare(parent, node))
            heap[parentIndex] = node, heap[index] = parent, index = parentIndex;
          else
            break a;
        }
    }
    function peek(heap) {
      return heap.length === 0 ? null : heap[0];
    }
    function pop(heap) {
      if (heap.length === 0)
        return null;
      var first = heap[0], last = heap.pop();
      if (last !== first) {
        heap[0] = last;
        a:
          for (var index = 0, length = heap.length, halfLength = length >>> 1;index < halfLength; ) {
            var leftIndex = 2 * (index + 1) - 1, left = heap[leftIndex], rightIndex = leftIndex + 1, right = heap[rightIndex];
            if (0 > compare(left, last))
              rightIndex < length && 0 > compare(right, left) ? (heap[index] = right, heap[rightIndex] = last, index = rightIndex) : (heap[index] = left, heap[leftIndex] = last, index = leftIndex);
            else if (rightIndex < length && 0 > compare(right, last))
              heap[index] = right, heap[rightIndex] = last, index = rightIndex;
            else
              break a;
          }
      }
      return first;
    }
    function compare(a, b) {
      var diff = a.sortIndex - b.sortIndex;
      return diff !== 0 ? diff : a.id - b.id;
    }
    function advanceTimers(currentTime) {
      for (var timer = peek(timerQueue);timer !== null; ) {
        if (timer.callback === null)
          pop(timerQueue);
        else if (timer.startTime <= currentTime)
          pop(timerQueue), timer.sortIndex = timer.expirationTime, push(taskQueue, timer);
        else
          break;
        timer = peek(timerQueue);
      }
    }
    function handleTimeout(currentTime) {
      isHostTimeoutScheduled = false;
      advanceTimers(currentTime);
      if (!isHostCallbackScheduled)
        if (peek(taskQueue) !== null)
          isHostCallbackScheduled = true, isMessageLoopRunning || (isMessageLoopRunning = true, schedulePerformWorkUntilDeadline());
        else {
          var firstTimer = peek(timerQueue);
          firstTimer !== null && requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
        }
    }
    function shouldYieldToHost() {
      return needsPaint ? true : exports.unstable_now() - startTime < frameInterval ? false : true;
    }
    function requestHostTimeout(callback, ms) {
      taskTimeoutID = localSetTimeout(function() {
        callback(exports.unstable_now());
      }, ms);
    }
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
    exports.unstable_now = undefined;
    if (typeof performance === "object" && typeof performance.now === "function") {
      var localPerformance = performance;
      exports.unstable_now = function() {
        return localPerformance.now();
      };
    } else {
      var localDate = Date, initialTime = localDate.now();
      exports.unstable_now = function() {
        return localDate.now() - initialTime;
      };
    }
    var taskQueue = [], timerQueue = [], taskIdCounter = 1, currentTask = null, currentPriorityLevel = 3, isPerformingWork = false, isHostCallbackScheduled = false, isHostTimeoutScheduled = false, needsPaint = false, localSetTimeout = typeof setTimeout === "function" ? setTimeout : null, localClearTimeout = typeof clearTimeout === "function" ? clearTimeout : null, localSetImmediate = typeof setImmediate !== "undefined" ? setImmediate : null, isMessageLoopRunning = false, taskTimeoutID = -1, frameInterval = 5, startTime = -1;
    if (typeof localSetImmediate === "function")
      var schedulePerformWorkUntilDeadline = function() {
        localSetImmediate(performWorkUntilDeadline);
      };
    else if (typeof MessageChannel !== "undefined") {
      var channel = new MessageChannel, port = channel.port2;
      channel.port1.onmessage = performWorkUntilDeadline;
      schedulePerformWorkUntilDeadline = function() {
        port.postMessage(null);
      };
    } else
      schedulePerformWorkUntilDeadline = function() {
        localSetTimeout(performWorkUntilDeadline, 0);
      };
    exports.unstable_IdlePriority = 5;
    exports.unstable_ImmediatePriority = 1;
    exports.unstable_LowPriority = 4;
    exports.unstable_NormalPriority = 3;
    exports.unstable_Profiling = null;
    exports.unstable_UserBlockingPriority = 2;
    exports.unstable_cancelCallback = function(task) {
      task.callback = null;
    };
    exports.unstable_forceFrameRate = function(fps) {
      0 > fps || 125 < fps ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : frameInterval = 0 < fps ? Math.floor(1000 / fps) : 5;
    };
    exports.unstable_getCurrentPriorityLevel = function() {
      return currentPriorityLevel;
    };
    exports.unstable_next = function(eventHandler) {
      switch (currentPriorityLevel) {
        case 1:
        case 2:
        case 3:
          var priorityLevel = 3;
          break;
        default:
          priorityLevel = currentPriorityLevel;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    };
    exports.unstable_requestPaint = function() {
      needsPaint = true;
    };
    exports.unstable_runWithPriority = function(priorityLevel, eventHandler) {
      switch (priorityLevel) {
        case 1:
        case 2:
        case 3:
        case 4:
        case 5:
          break;
        default:
          priorityLevel = 3;
      }
      var previousPriorityLevel = currentPriorityLevel;
      currentPriorityLevel = priorityLevel;
      try {
        return eventHandler();
      } finally {
        currentPriorityLevel = previousPriorityLevel;
      }
    };
    exports.unstable_scheduleCallback = function(priorityLevel, callback, options) {
      var currentTime = exports.unstable_now();
      typeof options === "object" && options !== null ? (options = options.delay, options = typeof options === "number" && 0 < options ? currentTime + options : currentTime) : options = currentTime;
      switch (priorityLevel) {
        case 1:
          var timeout = -1;
          break;
        case 2:
          timeout = 250;
          break;
        case 5:
          timeout = 1073741823;
          break;
        case 4:
          timeout = 1e4;
          break;
        default:
          timeout = 5000;
      }
      timeout = options + timeout;
      priorityLevel = {
        id: taskIdCounter++,
        callback,
        priorityLevel,
        startTime: options,
        expirationTime: timeout,
        sortIndex: -1
      };
      options > currentTime ? (priorityLevel.sortIndex = options, push(timerQueue, priorityLevel), peek(taskQueue) === null && priorityLevel === peek(timerQueue) && (isHostTimeoutScheduled ? (localClearTimeout(taskTimeoutID), taskTimeoutID = -1) : isHostTimeoutScheduled = true, requestHostTimeout(handleTimeout, options - currentTime))) : (priorityLevel.sortIndex = timeout, push(taskQueue, priorityLevel), isHostCallbackScheduled || isPerformingWork || (isHostCallbackScheduled = true, isMessageLoopRunning || (isMessageLoopRunning = true, schedulePerformWorkUntilDeadline())));
      return priorityLevel;
    };
    exports.unstable_shouldYield = shouldYieldToHost;
    exports.unstable_wrapCallback = function(callback) {
      var parentPriorityLevel = currentPriorityLevel;
      return function() {
        var previousPriorityLevel = currentPriorityLevel;
        currentPriorityLevel = parentPriorityLevel;
        try {
          return callback.apply(this, arguments);
        } finally {
          currentPriorityLevel = previousPriorityLevel;
        }
      };
    };
    typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function" && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
  })();
});

// ../../node_modules/react-reconciler/node_modules/scheduler/index.js
var require_scheduler = __commonJS(function(exports, module) {
  var scheduler_development = __toESM(require_scheduler_development());
  if (false) {} else {
    module.exports = scheduler_development;
  }
});

// ../../node_modules/react-reconciler/cjs/react-reconciler.development.js
var require_react_reconciler_development = __commonJS(function(exports, module) {
  var React2 = __toESM(require_react());
  var Scheduler = __toESM(require_scheduler());
  module.exports = function($$$config) {
    function findHook(fiber, id) {
      for (fiber = fiber.memoizedState;fiber !== null && 0 < id; )
        fiber = fiber.next, id--;
      return fiber;
    }
    function copyWithSetImpl(obj, path, index, value) {
      if (index >= path.length)
        return value;
      var key = path[index], updated = isArrayImpl(obj) ? obj.slice() : assign({}, obj);
      updated[key] = copyWithSetImpl(obj[key], path, index + 1, value);
      return updated;
    }
    function copyWithRename(obj, oldPath, newPath) {
      if (oldPath.length !== newPath.length)
        console.warn("copyWithRename() expects paths of the same length");
      else {
        for (var i = 0;i < newPath.length - 1; i++)
          if (oldPath[i] !== newPath[i]) {
            console.warn("copyWithRename() expects paths to be the same except for the deepest key");
            return;
          }
        return copyWithRenameImpl(obj, oldPath, newPath, 0);
      }
    }
    function copyWithRenameImpl(obj, oldPath, newPath, index) {
      var oldKey = oldPath[index], updated = isArrayImpl(obj) ? obj.slice() : assign({}, obj);
      index + 1 === oldPath.length ? (updated[newPath[index]] = updated[oldKey], isArrayImpl(updated) ? updated.splice(oldKey, 1) : delete updated[oldKey]) : updated[oldKey] = copyWithRenameImpl(obj[oldKey], oldPath, newPath, index + 1);
      return updated;
    }
    function copyWithDeleteImpl(obj, path, index) {
      var key = path[index], updated = isArrayImpl(obj) ? obj.slice() : assign({}, obj);
      if (index + 1 === path.length)
        return isArrayImpl(updated) ? updated.splice(key, 1) : delete updated[key], updated;
      updated[key] = copyWithDeleteImpl(obj[key], path, index + 1);
      return updated;
    }
    function shouldSuspendImpl() {
      return false;
    }
    function shouldErrorImpl() {
      return null;
    }
    function createFiber(tag, pendingProps, key, mode) {
      return new FiberNode(tag, pendingProps, key, mode);
    }
    function scheduleRoot(root, element) {
      root.context === emptyContextObject && (updateContainerSync(element, root, null, null), flushSyncWork());
    }
    function scheduleRefresh(root, update) {
      if (resolveFamily !== null) {
        var staleFamilies = update.staleFamilies;
        update = update.updatedFamilies;
        flushPendingEffects();
        scheduleFibersWithFamiliesRecursively(root.current, update, staleFamilies);
        flushSyncWork();
      }
    }
    function setRefreshHandler(handler) {
      resolveFamily = handler;
    }
    function warnForMissingKey() {}
    function warnInvalidHookAccess() {
      console.error("Do not call Hooks inside useEffect(...), useMemo(...), or other built-in Hooks. You can only call Hooks at the top level of your React function. For more information, see https://react.dev/link/rules-of-hooks");
    }
    function warnInvalidContextAccess() {
      console.error("Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo().");
    }
    function noop() {}
    function setToSortedString(set) {
      var array = [];
      set.forEach(function(value) {
        array.push(value);
      });
      return array.sort().join(", ");
    }
    function getNearestMountedFiber(fiber) {
      var node = fiber, nearestMounted = fiber;
      if (fiber.alternate)
        for (;node.return; )
          node = node.return;
      else {
        fiber = node;
        do
          node = fiber, (node.flags & 4098) !== 0 && (nearestMounted = node.return), fiber = node.return;
        while (fiber);
      }
      return node.tag === 3 ? nearestMounted : null;
    }
    function assertIsMounted(fiber) {
      if (getNearestMountedFiber(fiber) !== fiber)
        throw Error("Unable to find node on an unmounted component.");
    }
    function findCurrentFiberUsingSlowPath(fiber) {
      var alternate = fiber.alternate;
      if (!alternate) {
        alternate = getNearestMountedFiber(fiber);
        if (alternate === null)
          throw Error("Unable to find node on an unmounted component.");
        return alternate !== fiber ? null : fiber;
      }
      for (var a = fiber, b = alternate;; ) {
        var parentA = a.return;
        if (parentA === null)
          break;
        var parentB = parentA.alternate;
        if (parentB === null) {
          b = parentA.return;
          if (b !== null) {
            a = b;
            continue;
          }
          break;
        }
        if (parentA.child === parentB.child) {
          for (parentB = parentA.child;parentB; ) {
            if (parentB === a)
              return assertIsMounted(parentA), fiber;
            if (parentB === b)
              return assertIsMounted(parentA), alternate;
            parentB = parentB.sibling;
          }
          throw Error("Unable to find node on an unmounted component.");
        }
        if (a.return !== b.return)
          a = parentA, b = parentB;
        else {
          for (var didFindChild = false, _child = parentA.child;_child; ) {
            if (_child === a) {
              didFindChild = true;
              a = parentA;
              b = parentB;
              break;
            }
            if (_child === b) {
              didFindChild = true;
              b = parentA;
              a = parentB;
              break;
            }
            _child = _child.sibling;
          }
          if (!didFindChild) {
            for (_child = parentB.child;_child; ) {
              if (_child === a) {
                didFindChild = true;
                a = parentB;
                b = parentA;
                break;
              }
              if (_child === b) {
                didFindChild = true;
                b = parentB;
                a = parentA;
                break;
              }
              _child = _child.sibling;
            }
            if (!didFindChild)
              throw Error("Child was not found in either parent set. This indicates a bug in React related to the return pointer. Please file an issue.");
          }
        }
        if (a.alternate !== b)
          throw Error("Return fibers should always be each others' alternates. This error is likely caused by a bug in React. Please file an issue.");
      }
      if (a.tag !== 3)
        throw Error("Unable to find node on an unmounted component.");
      return a.stateNode.current === a ? fiber : alternate;
    }
    function findCurrentHostFiber(parent) {
      parent = findCurrentFiberUsingSlowPath(parent);
      return parent !== null ? findCurrentHostFiberImpl(parent) : null;
    }
    function findCurrentHostFiberImpl(node) {
      var tag = node.tag;
      if (tag === 5 || tag === 26 || tag === 27 || tag === 6)
        return node;
      for (node = node.child;node !== null; ) {
        tag = findCurrentHostFiberImpl(node);
        if (tag !== null)
          return tag;
        node = node.sibling;
      }
      return null;
    }
    function findCurrentHostFiberWithNoPortalsImpl(node) {
      var tag = node.tag;
      if (tag === 5 || tag === 26 || tag === 27 || tag === 6)
        return node;
      for (node = node.child;node !== null; ) {
        if (node.tag !== 4 && (tag = findCurrentHostFiberWithNoPortalsImpl(node), tag !== null))
          return tag;
        node = node.sibling;
      }
      return null;
    }
    function getIteratorFn(maybeIterable) {
      if (maybeIterable === null || typeof maybeIterable !== "object")
        return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return typeof maybeIterable === "function" ? maybeIterable : null;
    }
    function getComponentNameFromType(type) {
      if (type == null)
        return null;
      if (typeof type === "function")
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if (typeof type === "string")
        return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if (typeof type === "object")
        switch (typeof type.tag === "number" && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return (type.displayName || "Context") + ".Provider";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = type !== "" ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, innerType !== null ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {}
        }
      return null;
    }
    function getComponentNameFromFiber(fiber) {
      var type = fiber.type;
      switch (fiber.tag) {
        case 31:
          return "Activity";
        case 24:
          return "Cache";
        case 9:
          return (type._context.displayName || "Context") + ".Consumer";
        case 10:
          return (type.displayName || "Context") + ".Provider";
        case 18:
          return "DehydratedFragment";
        case 11:
          return fiber = type.render, fiber = fiber.displayName || fiber.name || "", type.displayName || (fiber !== "" ? "ForwardRef(" + fiber + ")" : "ForwardRef");
        case 7:
          return "Fragment";
        case 26:
        case 27:
        case 5:
          return type;
        case 4:
          return "Portal";
        case 3:
          return "Root";
        case 6:
          return "Text";
        case 16:
          return getComponentNameFromType(type);
        case 8:
          return type === REACT_STRICT_MODE_TYPE ? "StrictMode" : "Mode";
        case 22:
          return "Offscreen";
        case 12:
          return "Profiler";
        case 21:
          return "Scope";
        case 13:
          return "Suspense";
        case 19:
          return "SuspenseList";
        case 25:
          return "TracingMarker";
        case 1:
        case 0:
        case 14:
        case 15:
          if (typeof type === "function")
            return type.displayName || type.name || null;
          if (typeof type === "string")
            return type;
          break;
        case 29:
          type = fiber._debugInfo;
          if (type != null) {
            for (var i = type.length - 1;0 <= i; i--)
              if (typeof type[i].name === "string")
                return type[i].name;
          }
          if (fiber.return !== null)
            return getComponentNameFromFiber(fiber.return);
      }
      return null;
    }
    function createCursor(defaultValue) {
      return { current: defaultValue };
    }
    function pop(cursor, fiber) {
      0 > index$jscomp$0 ? console.error("Unexpected pop.") : (fiber !== fiberStack[index$jscomp$0] && console.error("Unexpected Fiber popped."), cursor.current = valueStack[index$jscomp$0], valueStack[index$jscomp$0] = null, fiberStack[index$jscomp$0] = null, index$jscomp$0--);
    }
    function push(cursor, value, fiber) {
      index$jscomp$0++;
      valueStack[index$jscomp$0] = cursor.current;
      fiberStack[index$jscomp$0] = fiber;
      cursor.current = value;
    }
    function clz32Fallback(x) {
      x >>>= 0;
      return x === 0 ? 32 : 31 - (log$1(x) / LN2 | 0) | 0;
    }
    function getLabelForLane(lane) {
      if (lane & 1)
        return "SyncHydrationLane";
      if (lane & 2)
        return "Sync";
      if (lane & 4)
        return "InputContinuousHydration";
      if (lane & 8)
        return "InputContinuous";
      if (lane & 16)
        return "DefaultHydration";
      if (lane & 32)
        return "Default";
      if (lane & 128)
        return "TransitionHydration";
      if (lane & 4194048)
        return "Transition";
      if (lane & 62914560)
        return "Retry";
      if (lane & 67108864)
        return "SelectiveHydration";
      if (lane & 134217728)
        return "IdleHydration";
      if (lane & 268435456)
        return "Idle";
      if (lane & 536870912)
        return "Offscreen";
      if (lane & 1073741824)
        return "Deferred";
    }
    function getHighestPriorityLanes(lanes) {
      var pendingSyncLanes = lanes & 42;
      if (pendingSyncLanes !== 0)
        return pendingSyncLanes;
      switch (lanes & -lanes) {
        case 1:
          return 1;
        case 2:
          return 2;
        case 4:
          return 4;
        case 8:
          return 8;
        case 16:
          return 16;
        case 32:
          return 32;
        case 64:
          return 64;
        case 128:
          return 128;
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return lanes & 4194048;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          return lanes & 62914560;
        case 67108864:
          return 67108864;
        case 134217728:
          return 134217728;
        case 268435456:
          return 268435456;
        case 536870912:
          return 536870912;
        case 1073741824:
          return 0;
        default:
          return console.error("Should have found matching lanes. This is a bug in React."), lanes;
      }
    }
    function getNextLanes(root, wipLanes, rootHasPendingCommit) {
      var pendingLanes = root.pendingLanes;
      if (pendingLanes === 0)
        return 0;
      var nextLanes = 0, suspendedLanes = root.suspendedLanes, pingedLanes = root.pingedLanes;
      root = root.warmLanes;
      var nonIdlePendingLanes = pendingLanes & 134217727;
      nonIdlePendingLanes !== 0 ? (pendingLanes = nonIdlePendingLanes & ~suspendedLanes, pendingLanes !== 0 ? nextLanes = getHighestPriorityLanes(pendingLanes) : (pingedLanes &= nonIdlePendingLanes, pingedLanes !== 0 ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = nonIdlePendingLanes & ~root, rootHasPendingCommit !== 0 && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))))) : (nonIdlePendingLanes = pendingLanes & ~suspendedLanes, nonIdlePendingLanes !== 0 ? nextLanes = getHighestPriorityLanes(nonIdlePendingLanes) : pingedLanes !== 0 ? nextLanes = getHighestPriorityLanes(pingedLanes) : rootHasPendingCommit || (rootHasPendingCommit = pendingLanes & ~root, rootHasPendingCommit !== 0 && (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))));
      return nextLanes === 0 ? 0 : wipLanes !== 0 && wipLanes !== nextLanes && (wipLanes & suspendedLanes) === 0 && (suspendedLanes = nextLanes & -nextLanes, rootHasPendingCommit = wipLanes & -wipLanes, suspendedLanes >= rootHasPendingCommit || suspendedLanes === 32 && (rootHasPendingCommit & 4194048) !== 0) ? wipLanes : nextLanes;
    }
    function checkIfRootIsPrerendering(root, renderLanes2) {
      return (root.pendingLanes & ~(root.suspendedLanes & ~root.pingedLanes) & renderLanes2) === 0;
    }
    function computeExpirationTime(lane, currentTime) {
      switch (lane) {
        case 1:
        case 2:
        case 4:
        case 8:
        case 64:
          return currentTime + 250;
        case 16:
        case 32:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
          return currentTime + 5000;
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          return -1;
        case 67108864:
        case 134217728:
        case 268435456:
        case 536870912:
        case 1073741824:
          return -1;
        default:
          return console.error("Should have found matching lanes. This is a bug in React."), -1;
      }
    }
    function claimNextTransitionLane() {
      var lane = nextTransitionLane;
      nextTransitionLane <<= 1;
      (nextTransitionLane & 4194048) === 0 && (nextTransitionLane = 256);
      return lane;
    }
    function claimNextRetryLane() {
      var lane = nextRetryLane;
      nextRetryLane <<= 1;
      (nextRetryLane & 62914560) === 0 && (nextRetryLane = 4194304);
      return lane;
    }
    function createLaneMap(initial) {
      for (var laneMap = [], i = 0;31 > i; i++)
        laneMap.push(initial);
      return laneMap;
    }
    function markRootUpdated$1(root, updateLane) {
      root.pendingLanes |= updateLane;
      updateLane !== 268435456 && (root.suspendedLanes = 0, root.pingedLanes = 0, root.warmLanes = 0);
    }
    function markRootFinished(root, finishedLanes, remainingLanes, spawnedLane, updatedLanes, suspendedRetryLanes) {
      var previouslyPendingLanes = root.pendingLanes;
      root.pendingLanes = remainingLanes;
      root.suspendedLanes = 0;
      root.pingedLanes = 0;
      root.warmLanes = 0;
      root.expiredLanes &= remainingLanes;
      root.entangledLanes &= remainingLanes;
      root.errorRecoveryDisabledLanes &= remainingLanes;
      root.shellSuspendCounter = 0;
      var { entanglements, expirationTimes, hiddenUpdates } = root;
      for (remainingLanes = previouslyPendingLanes & ~remainingLanes;0 < remainingLanes; ) {
        var index = 31 - clz32(remainingLanes), lane = 1 << index;
        entanglements[index] = 0;
        expirationTimes[index] = -1;
        var hiddenUpdatesForLane = hiddenUpdates[index];
        if (hiddenUpdatesForLane !== null)
          for (hiddenUpdates[index] = null, index = 0;index < hiddenUpdatesForLane.length; index++) {
            var update = hiddenUpdatesForLane[index];
            update !== null && (update.lane &= -536870913);
          }
        remainingLanes &= ~lane;
      }
      spawnedLane !== 0 && markSpawnedDeferredLane(root, spawnedLane, 0);
      suspendedRetryLanes !== 0 && updatedLanes === 0 && root.tag !== 0 && (root.suspendedLanes |= suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes));
    }
    function markSpawnedDeferredLane(root, spawnedLane, entangledLanes) {
      root.pendingLanes |= spawnedLane;
      root.suspendedLanes &= ~spawnedLane;
      var spawnedLaneIndex = 31 - clz32(spawnedLane);
      root.entangledLanes |= spawnedLane;
      root.entanglements[spawnedLaneIndex] = root.entanglements[spawnedLaneIndex] | 1073741824 | entangledLanes & 4194090;
    }
    function markRootEntangled(root, entangledLanes) {
      var rootEntangledLanes = root.entangledLanes |= entangledLanes;
      for (root = root.entanglements;rootEntangledLanes; ) {
        var index = 31 - clz32(rootEntangledLanes), lane = 1 << index;
        lane & entangledLanes | root[index] & entangledLanes && (root[index] |= entangledLanes);
        rootEntangledLanes &= ~lane;
      }
    }
    function getBumpedLaneForHydrationByLane(lane) {
      switch (lane) {
        case 2:
          lane = 1;
          break;
        case 8:
          lane = 4;
          break;
        case 32:
          lane = 16;
          break;
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
          lane = 128;
          break;
        case 268435456:
          lane = 134217728;
          break;
        default:
          lane = 0;
      }
      return lane;
    }
    function addFiberToLanesMap(root, fiber, lanes) {
      if (isDevToolsPresent)
        for (root = root.pendingUpdatersLaneMap;0 < lanes; ) {
          var index = 31 - clz32(lanes), lane = 1 << index;
          root[index].add(fiber);
          lanes &= ~lane;
        }
    }
    function movePendingFibersToMemoized(root, lanes) {
      if (isDevToolsPresent)
        for (var { pendingUpdatersLaneMap, memoizedUpdaters } = root;0 < lanes; ) {
          var index = 31 - clz32(lanes);
          root = 1 << index;
          index = pendingUpdatersLaneMap[index];
          0 < index.size && (index.forEach(function(fiber) {
            var alternate = fiber.alternate;
            alternate !== null && memoizedUpdaters.has(alternate) || memoizedUpdaters.add(fiber);
          }), index.clear());
          lanes &= ~root;
        }
    }
    function lanesToEventPriority(lanes) {
      lanes &= -lanes;
      return 2 < lanes ? 8 < lanes ? (lanes & 134217727) !== 0 ? 32 : 268435456 : 8 : 2;
    }
    function injectInternals(internals) {
      if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined")
        return false;
      var hook = __REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook.isDisabled)
        return true;
      if (!hook.supportsFiber)
        return console.error("The installed version of React DevTools is too old and will not work with the current version of React. Please update React DevTools. https://react.dev/link/react-devtools"), true;
      try {
        rendererID = hook.inject(internals), injectedHook = hook;
      } catch (err) {
        console.error("React instrumentation encountered an error: %s.", err);
      }
      return hook.checkDCE ? true : false;
    }
    function setIsStrictModeForDevtools(newIsStrictMode) {
      typeof log2 === "function" && unstable_setDisableYieldValue2(newIsStrictMode);
      if (injectedHook && typeof injectedHook.setStrictMode === "function")
        try {
          injectedHook.setStrictMode(rendererID, newIsStrictMode);
        } catch (err) {
          hasLoggedError || (hasLoggedError = true, console.error("React instrumentation encountered an error: %s", err));
        }
    }
    function injectProfilingHooks(profilingHooks) {
      injectedProfilingHooks = profilingHooks;
    }
    function markCommitStopped() {
      injectedProfilingHooks !== null && typeof injectedProfilingHooks.markCommitStopped === "function" && injectedProfilingHooks.markCommitStopped();
    }
    function markComponentRenderStarted(fiber) {
      injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentRenderStarted === "function" && injectedProfilingHooks.markComponentRenderStarted(fiber);
    }
    function markComponentRenderStopped() {
      injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentRenderStopped === "function" && injectedProfilingHooks.markComponentRenderStopped();
    }
    function markRenderStarted(lanes) {
      injectedProfilingHooks !== null && typeof injectedProfilingHooks.markRenderStarted === "function" && injectedProfilingHooks.markRenderStarted(lanes);
    }
    function markRenderStopped() {
      injectedProfilingHooks !== null && typeof injectedProfilingHooks.markRenderStopped === "function" && injectedProfilingHooks.markRenderStopped();
    }
    function markStateUpdateScheduled(fiber, lane) {
      injectedProfilingHooks !== null && typeof injectedProfilingHooks.markStateUpdateScheduled === "function" && injectedProfilingHooks.markStateUpdateScheduled(fiber, lane);
    }
    function disabledLog() {}
    function disableLogs() {
      if (disabledDepth === 0) {
        prevLog = console.log;
        prevInfo = console.info;
        prevWarn = console.warn;
        prevError = console.error;
        prevGroup = console.group;
        prevGroupCollapsed = console.groupCollapsed;
        prevGroupEnd = console.groupEnd;
        var props = {
          configurable: true,
          enumerable: true,
          value: disabledLog,
          writable: true
        };
        Object.defineProperties(console, {
          info: props,
          log: props,
          warn: props,
          error: props,
          group: props,
          groupCollapsed: props,
          groupEnd: props
        });
      }
      disabledDepth++;
    }
    function reenableLogs() {
      disabledDepth--;
      if (disabledDepth === 0) {
        var props = { configurable: true, enumerable: true, writable: true };
        Object.defineProperties(console, {
          log: assign({}, props, { value: prevLog }),
          info: assign({}, props, { value: prevInfo }),
          warn: assign({}, props, { value: prevWarn }),
          error: assign({}, props, { value: prevError }),
          group: assign({}, props, { value: prevGroup }),
          groupCollapsed: assign({}, props, { value: prevGroupCollapsed }),
          groupEnd: assign({}, props, { value: prevGroupEnd })
        });
      }
      0 > disabledDepth && console.error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
    }
    function describeBuiltInComponentFrame(name) {
      if (prefix === undefined)
        try {
          throw Error();
        } catch (x) {
          var match = x.stack.trim().match(/\n( *(at )?)/);
          prefix = match && match[1] || "";
          suffix = -1 < x.stack.indexOf(`
    at`) ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
        }
      return `
` + prefix + name + suffix;
    }
    function describeNativeComponentFrame(fn, construct) {
      if (!fn || reentry)
        return "";
      var frame = componentFrameCache.get(fn);
      if (frame !== undefined)
        return frame;
      reentry = true;
      frame = Error.prepareStackTrace;
      Error.prepareStackTrace = undefined;
      var previousDispatcher = null;
      previousDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = null;
      disableLogs();
      try {
        var RunInRootFrame = {
          DetermineComponentFrameRoot: function() {
            try {
              if (construct) {
                var Fake = function() {
                  throw Error();
                };
                Object.defineProperty(Fake.prototype, "props", {
                  set: function() {
                    throw Error();
                  }
                });
                if (typeof Reflect === "object" && Reflect.construct) {
                  try {
                    Reflect.construct(Fake, []);
                  } catch (x) {
                    var control = x;
                  }
                  Reflect.construct(fn, [], Fake);
                } else {
                  try {
                    Fake.call();
                  } catch (x$0) {
                    control = x$0;
                  }
                  fn.call(Fake.prototype);
                }
              } else {
                try {
                  throw Error();
                } catch (x$1) {
                  control = x$1;
                }
                (Fake = fn()) && typeof Fake.catch === "function" && Fake.catch(function() {});
              }
            } catch (sample) {
              if (sample && control && typeof sample.stack === "string")
                return [sample.stack, control.stack];
            }
            return [null, null];
          }
        };
        RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
        var namePropDescriptor = Object.getOwnPropertyDescriptor(RunInRootFrame.DetermineComponentFrameRoot, "name");
        namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(RunInRootFrame.DetermineComponentFrameRoot, "name", { value: "DetermineComponentFrameRoot" });
        var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
        if (sampleStack && controlStack) {
          var sampleLines = sampleStack.split(`
`), controlLines = controlStack.split(`
`);
          for (_RunInRootFrame$Deter = namePropDescriptor = 0;namePropDescriptor < sampleLines.length && !sampleLines[namePropDescriptor].includes("DetermineComponentFrameRoot"); )
            namePropDescriptor++;
          for (;_RunInRootFrame$Deter < controlLines.length && !controlLines[_RunInRootFrame$Deter].includes("DetermineComponentFrameRoot"); )
            _RunInRootFrame$Deter++;
          if (namePropDescriptor === sampleLines.length || _RunInRootFrame$Deter === controlLines.length)
            for (namePropDescriptor = sampleLines.length - 1, _RunInRootFrame$Deter = controlLines.length - 1;1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter && sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]; )
              _RunInRootFrame$Deter--;
          for (;1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter; namePropDescriptor--, _RunInRootFrame$Deter--)
            if (sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
              if (namePropDescriptor !== 1 || _RunInRootFrame$Deter !== 1) {
                do
                  if (namePropDescriptor--, _RunInRootFrame$Deter--, 0 > _RunInRootFrame$Deter || sampleLines[namePropDescriptor] !== controlLines[_RunInRootFrame$Deter]) {
                    var _frame = `
` + sampleLines[namePropDescriptor].replace(" at new ", " at ");
                    fn.displayName && _frame.includes("<anonymous>") && (_frame = _frame.replace("<anonymous>", fn.displayName));
                    typeof fn === "function" && componentFrameCache.set(fn, _frame);
                    return _frame;
                  }
                while (1 <= namePropDescriptor && 0 <= _RunInRootFrame$Deter);
              }
              break;
            }
        }
      } finally {
        reentry = false, ReactSharedInternals.H = previousDispatcher, reenableLogs(), Error.prepareStackTrace = frame;
      }
      sampleLines = (sampleLines = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(sampleLines) : "";
      typeof fn === "function" && componentFrameCache.set(fn, sampleLines);
      return sampleLines;
    }
    function formatOwnerStack(error) {
      var prevPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = undefined;
      error = error.stack;
      Error.prepareStackTrace = prevPrepareStackTrace;
      error.startsWith(`Error: react-stack-top-frame
`) && (error = error.slice(29));
      prevPrepareStackTrace = error.indexOf(`
`);
      prevPrepareStackTrace !== -1 && (error = error.slice(prevPrepareStackTrace + 1));
      prevPrepareStackTrace = error.indexOf("react-stack-bottom-frame");
      prevPrepareStackTrace !== -1 && (prevPrepareStackTrace = error.lastIndexOf(`
`, prevPrepareStackTrace));
      if (prevPrepareStackTrace !== -1)
        error = error.slice(0, prevPrepareStackTrace);
      else
        return "";
      return error;
    }
    function describeFiber(fiber) {
      switch (fiber.tag) {
        case 26:
        case 27:
        case 5:
          return describeBuiltInComponentFrame(fiber.type);
        case 16:
          return describeBuiltInComponentFrame("Lazy");
        case 13:
          return describeBuiltInComponentFrame("Suspense");
        case 19:
          return describeBuiltInComponentFrame("SuspenseList");
        case 0:
        case 15:
          return describeNativeComponentFrame(fiber.type, false);
        case 11:
          return describeNativeComponentFrame(fiber.type.render, false);
        case 1:
          return describeNativeComponentFrame(fiber.type, true);
        case 31:
          return describeBuiltInComponentFrame("Activity");
        default:
          return "";
      }
    }
    function getStackByFiberInDevAndProd(workInProgress2) {
      try {
        var info = "";
        do {
          info += describeFiber(workInProgress2);
          var debugInfo = workInProgress2._debugInfo;
          if (debugInfo)
            for (var i = debugInfo.length - 1;0 <= i; i--) {
              var entry = debugInfo[i];
              if (typeof entry.name === "string") {
                var JSCompiler_temp_const = info, env = entry.env;
                var JSCompiler_inline_result = describeBuiltInComponentFrame(entry.name + (env ? " [" + env + "]" : ""));
                info = JSCompiler_temp_const + JSCompiler_inline_result;
              }
            }
          workInProgress2 = workInProgress2.return;
        } while (workInProgress2);
        return info;
      } catch (x) {
        return `
Error generating stack: ` + x.message + `
` + x.stack;
      }
    }
    function describeFunctionComponentFrameWithoutLineNumber(fn) {
      return (fn = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(fn) : "";
    }
    function createCapturedValueAtFiber(value, source) {
      if (typeof value === "object" && value !== null) {
        var existing = CapturedStacks.get(value);
        if (existing !== undefined)
          return existing;
        source = {
          value,
          source,
          stack: getStackByFiberInDevAndProd(source)
        };
        CapturedStacks.set(value, source);
        return source;
      }
      return {
        value,
        source,
        stack: getStackByFiberInDevAndProd(source)
      };
    }
    function pushTreeFork(workInProgress2, totalChildren) {
      warnIfNotHydrating();
      forkStack[forkStackIndex++] = treeForkCount;
      forkStack[forkStackIndex++] = treeForkProvider;
      treeForkProvider = workInProgress2;
      treeForkCount = totalChildren;
    }
    function pushTreeId(workInProgress2, totalChildren, index) {
      warnIfNotHydrating();
      idStack[idStackIndex++] = treeContextId;
      idStack[idStackIndex++] = treeContextOverflow;
      idStack[idStackIndex++] = treeContextProvider;
      treeContextProvider = workInProgress2;
      var baseIdWithLeadingBit = treeContextId;
      workInProgress2 = treeContextOverflow;
      var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
      baseIdWithLeadingBit &= ~(1 << baseLength);
      index += 1;
      var length = 32 - clz32(totalChildren) + baseLength;
      if (30 < length) {
        var numberOfOverflowBits = baseLength - baseLength % 5;
        length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
        baseIdWithLeadingBit >>= numberOfOverflowBits;
        baseLength -= numberOfOverflowBits;
        treeContextId = 1 << 32 - clz32(totalChildren) + baseLength | index << baseLength | baseIdWithLeadingBit;
        treeContextOverflow = length + workInProgress2;
      } else
        treeContextId = 1 << length | index << baseLength | baseIdWithLeadingBit, treeContextOverflow = workInProgress2;
    }
    function pushMaterializedTreeId(workInProgress2) {
      warnIfNotHydrating();
      workInProgress2.return !== null && (pushTreeFork(workInProgress2, 1), pushTreeId(workInProgress2, 1, 0));
    }
    function popTreeContext(workInProgress2) {
      for (;workInProgress2 === treeForkProvider; )
        treeForkProvider = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null, treeForkCount = forkStack[--forkStackIndex], forkStack[forkStackIndex] = null;
      for (;workInProgress2 === treeContextProvider; )
        treeContextProvider = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextOverflow = idStack[--idStackIndex], idStack[idStackIndex] = null, treeContextId = idStack[--idStackIndex], idStack[idStackIndex] = null;
    }
    function warnIfNotHydrating() {
      isHydrating || console.error("Expected to be hydrating. This is a bug in React. Please file an issue.");
    }
    function requiredContext(c) {
      c === null && console.error("Expected host context to exist. This error is likely caused by a bug in React. Please file an issue.");
      return c;
    }
    function pushHostContainer(fiber, nextRootInstance) {
      push(rootInstanceStackCursor, nextRootInstance, fiber);
      push(contextFiberStackCursor, fiber, fiber);
      push(contextStackCursor, null, fiber);
      nextRootInstance = getRootHostContext(nextRootInstance);
      pop(contextStackCursor, fiber);
      push(contextStackCursor, nextRootInstance, fiber);
    }
    function popHostContainer(fiber) {
      pop(contextStackCursor, fiber);
      pop(contextFiberStackCursor, fiber);
      pop(rootInstanceStackCursor, fiber);
    }
    function getHostContext() {
      return requiredContext(contextStackCursor.current);
    }
    function pushHostContext(fiber) {
      fiber.memoizedState !== null && push(hostTransitionProviderCursor, fiber, fiber);
      var context = requiredContext(contextStackCursor.current), nextContext = getChildHostContext(context, fiber.type);
      context !== nextContext && (push(contextFiberStackCursor, fiber, fiber), push(contextStackCursor, nextContext, fiber));
    }
    function popHostContext(fiber) {
      contextFiberStackCursor.current === fiber && (pop(contextStackCursor, fiber), pop(contextFiberStackCursor, fiber));
      hostTransitionProviderCursor.current === fiber && (pop(hostTransitionProviderCursor, fiber), isPrimaryRenderer ? HostTransitionContext._currentValue = NotPendingTransition : HostTransitionContext._currentValue2 = NotPendingTransition);
    }
    function findNotableNode(node, indent) {
      return node.serverProps === undefined && node.serverTail.length === 0 && node.children.length === 1 && 3 < node.distanceFromLeaf && node.distanceFromLeaf > 15 - indent ? findNotableNode(node.children[0], indent) : node;
    }
    function indentation(indent) {
      return "  " + "  ".repeat(indent);
    }
    function added(indent) {
      return "+ " + "  ".repeat(indent);
    }
    function removed(indent) {
      return "- " + "  ".repeat(indent);
    }
    function describeFiberType(fiber) {
      switch (fiber.tag) {
        case 26:
        case 27:
        case 5:
          return fiber.type;
        case 16:
          return "Lazy";
        case 13:
          return "Suspense";
        case 19:
          return "SuspenseList";
        case 0:
        case 15:
          return fiber = fiber.type, fiber.displayName || fiber.name || null;
        case 11:
          return fiber = fiber.type.render, fiber.displayName || fiber.name || null;
        case 1:
          return fiber = fiber.type, fiber.displayName || fiber.name || null;
        default:
          return null;
      }
    }
    function describeTextNode(content, maxLength) {
      return needsEscaping.test(content) ? (content = JSON.stringify(content), content.length > maxLength - 2 ? 8 > maxLength ? '{"..."}' : "{" + content.slice(0, maxLength - 7) + '..."}' : "{" + content + "}") : content.length > maxLength ? 5 > maxLength ? '{"..."}' : content.slice(0, maxLength - 3) + "..." : content;
    }
    function describeTextDiff(clientText, serverProps, indent) {
      var maxLength = 120 - 2 * indent;
      if (serverProps === null)
        return added(indent) + describeTextNode(clientText, maxLength) + `
`;
      if (typeof serverProps === "string") {
        for (var firstDiff = 0;firstDiff < serverProps.length && firstDiff < clientText.length && serverProps.charCodeAt(firstDiff) === clientText.charCodeAt(firstDiff); firstDiff++)
          ;
        firstDiff > maxLength - 8 && 10 < firstDiff && (clientText = "..." + clientText.slice(firstDiff - 8), serverProps = "..." + serverProps.slice(firstDiff - 8));
        return added(indent) + describeTextNode(clientText, maxLength) + `
` + removed(indent) + describeTextNode(serverProps, maxLength) + `
`;
      }
      return indentation(indent) + describeTextNode(clientText, maxLength) + `
`;
    }
    function objectName(object) {
      return Object.prototype.toString.call(object).replace(/^\[object (.*)\]$/, function(m, p0) {
        return p0;
      });
    }
    function describeValue(value, maxLength) {
      switch (typeof value) {
        case "string":
          return value = JSON.stringify(value), value.length > maxLength ? 5 > maxLength ? '"..."' : value.slice(0, maxLength - 4) + '..."' : value;
        case "object":
          if (value === null)
            return "null";
          if (isArrayImpl(value))
            return "[...]";
          if (value.$$typeof === REACT_ELEMENT_TYPE)
            return (maxLength = getComponentNameFromType(value.type)) ? "<" + maxLength + ">" : "<...>";
          var name = objectName(value);
          if (name === "Object") {
            name = "";
            maxLength -= 2;
            for (var propName in value)
              if (value.hasOwnProperty(propName)) {
                var jsonPropName = JSON.stringify(propName);
                jsonPropName !== '"' + propName + '"' && (propName = jsonPropName);
                maxLength -= propName.length - 2;
                jsonPropName = describeValue(value[propName], 15 > maxLength ? maxLength : 15);
                maxLength -= jsonPropName.length;
                if (0 > maxLength) {
                  name += name === "" ? "..." : ", ...";
                  break;
                }
                name += (name === "" ? "" : ",") + propName + ":" + jsonPropName;
              }
            return "{" + name + "}";
          }
          return name;
        case "function":
          return (maxLength = value.displayName || value.name) ? "function " + maxLength : "function";
        default:
          return String(value);
      }
    }
    function describePropValue(value, maxLength) {
      return typeof value !== "string" || needsEscaping.test(value) ? "{" + describeValue(value, maxLength - 2) + "}" : value.length > maxLength - 2 ? 5 > maxLength ? '"..."' : '"' + value.slice(0, maxLength - 5) + '..."' : '"' + value + '"';
    }
    function describeExpandedElement(type, props, rowPrefix) {
      var remainingRowLength = 120 - rowPrefix.length - type.length, properties = [], propName;
      for (propName in props)
        if (props.hasOwnProperty(propName) && propName !== "children") {
          var propValue = describePropValue(props[propName], 120 - rowPrefix.length - propName.length - 1);
          remainingRowLength -= propName.length + propValue.length + 2;
          properties.push(propName + "=" + propValue);
        }
      return properties.length === 0 ? rowPrefix + "<" + type + `>
` : 0 < remainingRowLength ? rowPrefix + "<" + type + " " + properties.join(" ") + `>
` : rowPrefix + "<" + type + `
` + rowPrefix + "  " + properties.join(`
` + rowPrefix + "  ") + `
` + rowPrefix + `>
`;
    }
    function describePropertiesDiff(clientObject, serverObject, indent) {
      var properties = "", remainingServerProperties = assign({}, serverObject), propName;
      for (propName in clientObject)
        if (clientObject.hasOwnProperty(propName)) {
          delete remainingServerProperties[propName];
          var maxLength = 120 - 2 * indent - propName.length - 2, clientPropValue = describeValue(clientObject[propName], maxLength);
          serverObject.hasOwnProperty(propName) ? (maxLength = describeValue(serverObject[propName], maxLength), properties += added(indent) + propName + ": " + clientPropValue + `
`, properties += removed(indent) + propName + ": " + maxLength + `
`) : properties += added(indent) + propName + ": " + clientPropValue + `
`;
        }
      for (var _propName in remainingServerProperties)
        remainingServerProperties.hasOwnProperty(_propName) && (clientObject = describeValue(remainingServerProperties[_propName], 120 - 2 * indent - _propName.length - 2), properties += removed(indent) + _propName + ": " + clientObject + `
`);
      return properties;
    }
    function describeElementDiff(type, clientProps, serverProps, indent) {
      var content = "", serverPropNames = new Map;
      for (propName$jscomp$0 in serverProps)
        serverProps.hasOwnProperty(propName$jscomp$0) && serverPropNames.set(propName$jscomp$0.toLowerCase(), propName$jscomp$0);
      if (serverPropNames.size === 1 && serverPropNames.has("children"))
        content += describeExpandedElement(type, clientProps, indentation(indent));
      else {
        for (var _propName2 in clientProps)
          if (clientProps.hasOwnProperty(_propName2) && _propName2 !== "children") {
            var maxLength$jscomp$0 = 120 - 2 * (indent + 1) - _propName2.length - 1, serverPropName = serverPropNames.get(_propName2.toLowerCase());
            if (serverPropName !== undefined) {
              serverPropNames.delete(_propName2.toLowerCase());
              var propName$jscomp$0 = clientProps[_propName2];
              serverPropName = serverProps[serverPropName];
              var clientPropValue = describePropValue(propName$jscomp$0, maxLength$jscomp$0);
              maxLength$jscomp$0 = describePropValue(serverPropName, maxLength$jscomp$0);
              typeof propName$jscomp$0 === "object" && propName$jscomp$0 !== null && typeof serverPropName === "object" && serverPropName !== null && objectName(propName$jscomp$0) === "Object" && objectName(serverPropName) === "Object" && (2 < Object.keys(propName$jscomp$0).length || 2 < Object.keys(serverPropName).length || -1 < clientPropValue.indexOf("...") || -1 < maxLength$jscomp$0.indexOf("...")) ? content += indentation(indent + 1) + _propName2 + `={{
` + describePropertiesDiff(propName$jscomp$0, serverPropName, indent + 2) + indentation(indent + 1) + `}}
` : (content += added(indent + 1) + _propName2 + "=" + clientPropValue + `
`, content += removed(indent + 1) + _propName2 + "=" + maxLength$jscomp$0 + `
`);
            } else
              content += indentation(indent + 1) + _propName2 + "=" + describePropValue(clientProps[_propName2], maxLength$jscomp$0) + `
`;
          }
        serverPropNames.forEach(function(propName) {
          if (propName !== "children") {
            var maxLength = 120 - 2 * (indent + 1) - propName.length - 1;
            content += removed(indent + 1) + propName + "=" + describePropValue(serverProps[propName], maxLength) + `
`;
          }
        });
        content = content === "" ? indentation(indent) + "<" + type + `>
` : indentation(indent) + "<" + type + `
` + content + indentation(indent) + `>
`;
      }
      type = serverProps.children;
      clientProps = clientProps.children;
      if (typeof type === "string" || typeof type === "number" || typeof type === "bigint") {
        serverPropNames = "";
        if (typeof clientProps === "string" || typeof clientProps === "number" || typeof clientProps === "bigint")
          serverPropNames = "" + clientProps;
        content += describeTextDiff(serverPropNames, "" + type, indent + 1);
      } else if (typeof clientProps === "string" || typeof clientProps === "number" || typeof clientProps === "bigint")
        content = type == null ? content + describeTextDiff("" + clientProps, null, indent + 1) : content + describeTextDiff("" + clientProps, undefined, indent + 1);
      return content;
    }
    function describeSiblingFiber(fiber, indent) {
      var type = describeFiberType(fiber);
      if (type === null) {
        type = "";
        for (fiber = fiber.child;fiber; )
          type += describeSiblingFiber(fiber, indent), fiber = fiber.sibling;
        return type;
      }
      return indentation(indent) + "<" + type + `>
`;
    }
    function describeNode(node, indent) {
      var skipToNode = findNotableNode(node, indent);
      if (skipToNode !== node && (node.children.length !== 1 || node.children[0] !== skipToNode))
        return indentation(indent) + `...
` + describeNode(skipToNode, indent + 1);
      skipToNode = "";
      var debugInfo = node.fiber._debugInfo;
      if (debugInfo)
        for (var i = 0;i < debugInfo.length; i++) {
          var serverComponentName = debugInfo[i].name;
          typeof serverComponentName === "string" && (skipToNode += indentation(indent) + "<" + serverComponentName + `>
`, indent++);
        }
      debugInfo = "";
      i = node.fiber.pendingProps;
      if (node.fiber.tag === 6)
        debugInfo = describeTextDiff(i, node.serverProps, indent), indent++;
      else if (serverComponentName = describeFiberType(node.fiber), serverComponentName !== null)
        if (node.serverProps === undefined) {
          debugInfo = indent;
          var maxLength = 120 - 2 * debugInfo - serverComponentName.length - 2, content = "";
          for (propName in i)
            if (i.hasOwnProperty(propName) && propName !== "children") {
              var propValue = describePropValue(i[propName], 15);
              maxLength -= propName.length + propValue.length + 2;
              if (0 > maxLength) {
                content += " ...";
                break;
              }
              content += " " + propName + "=" + propValue;
            }
          debugInfo = indentation(debugInfo) + "<" + serverComponentName + content + `>
`;
          indent++;
        } else
          node.serverProps === null ? (debugInfo = describeExpandedElement(serverComponentName, i, added(indent)), indent++) : typeof node.serverProps === "string" ? console.error("Should not have matched a non HostText fiber to a Text node. This is a bug in React.") : (debugInfo = describeElementDiff(serverComponentName, i, node.serverProps, indent), indent++);
      var propName = "";
      i = node.fiber.child;
      for (serverComponentName = 0;i && serverComponentName < node.children.length; )
        maxLength = node.children[serverComponentName], maxLength.fiber === i ? (propName += describeNode(maxLength, indent), serverComponentName++) : propName += describeSiblingFiber(i, indent), i = i.sibling;
      i && 0 < node.children.length && (propName += indentation(indent) + `...
`);
      i = node.serverTail;
      node.serverProps === null && indent--;
      for (node = 0;node < i.length; node++)
        serverComponentName = i[node], propName = typeof serverComponentName === "string" ? propName + (removed(indent) + describeTextNode(serverComponentName, 120 - 2 * indent) + `
`) : propName + describeExpandedElement(serverComponentName.type, serverComponentName.props, removed(indent));
      return skipToNode + debugInfo + propName;
    }
    function describeDiff(rootNode) {
      try {
        return `

` + describeNode(rootNode, 0);
      } catch (x) {
        return "";
      }
    }
    function getCurrentFiberStackInDev() {
      if (current === null)
        return "";
      var workInProgress2 = current;
      try {
        var info = "";
        workInProgress2.tag === 6 && (workInProgress2 = workInProgress2.return);
        switch (workInProgress2.tag) {
          case 26:
          case 27:
          case 5:
            info += describeBuiltInComponentFrame(workInProgress2.type);
            break;
          case 13:
            info += describeBuiltInComponentFrame("Suspense");
            break;
          case 19:
            info += describeBuiltInComponentFrame("SuspenseList");
            break;
          case 31:
            info += describeBuiltInComponentFrame("Activity");
            break;
          case 30:
          case 0:
          case 15:
          case 1:
            workInProgress2._debugOwner || info !== "" || (info += describeFunctionComponentFrameWithoutLineNumber(workInProgress2.type));
            break;
          case 11:
            workInProgress2._debugOwner || info !== "" || (info += describeFunctionComponentFrameWithoutLineNumber(workInProgress2.type.render));
        }
        for (;workInProgress2; )
          if (typeof workInProgress2.tag === "number") {
            var fiber = workInProgress2;
            workInProgress2 = fiber._debugOwner;
            var debugStack = fiber._debugStack;
            workInProgress2 && debugStack && (typeof debugStack !== "string" && (fiber._debugStack = debugStack = formatOwnerStack(debugStack)), debugStack !== "" && (info += `
` + debugStack));
          } else if (workInProgress2.debugStack != null) {
            var ownerStack = workInProgress2.debugStack;
            (workInProgress2 = workInProgress2.owner) && ownerStack && (info += `
` + formatOwnerStack(ownerStack));
          } else
            break;
        var JSCompiler_inline_result = info;
      } catch (x) {
        JSCompiler_inline_result = `
Error generating stack: ` + x.message + `
` + x.stack;
      }
      return JSCompiler_inline_result;
    }
    function runWithFiberInDEV(fiber, callback, arg0, arg1, arg2, arg3, arg4) {
      var previousFiber = current;
      setCurrentFiber(fiber);
      try {
        return fiber !== null && fiber._debugTask ? fiber._debugTask.run(callback.bind(null, arg0, arg1, arg2, arg3, arg4)) : callback(arg0, arg1, arg2, arg3, arg4);
      } finally {
        setCurrentFiber(previousFiber);
      }
      throw Error("runWithFiberInDEV should never be called in production. This is a bug in React.");
    }
    function setCurrentFiber(fiber) {
      ReactSharedInternals.getCurrentStack = fiber === null ? null : getCurrentFiberStackInDev;
      isRendering = false;
      current = fiber;
    }
    function buildHydrationDiffNode(fiber, distanceFromLeaf) {
      if (fiber.return === null) {
        if (hydrationDiffRootDEV === null)
          hydrationDiffRootDEV = {
            fiber,
            children: [],
            serverProps: undefined,
            serverTail: [],
            distanceFromLeaf
          };
        else {
          if (hydrationDiffRootDEV.fiber !== fiber)
            throw Error("Saw multiple hydration diff roots in a pass. This is a bug in React.");
          hydrationDiffRootDEV.distanceFromLeaf > distanceFromLeaf && (hydrationDiffRootDEV.distanceFromLeaf = distanceFromLeaf);
        }
        return hydrationDiffRootDEV;
      }
      var siblings = buildHydrationDiffNode(fiber.return, distanceFromLeaf + 1).children;
      if (0 < siblings.length && siblings[siblings.length - 1].fiber === fiber)
        return siblings = siblings[siblings.length - 1], siblings.distanceFromLeaf > distanceFromLeaf && (siblings.distanceFromLeaf = distanceFromLeaf), siblings;
      distanceFromLeaf = {
        fiber,
        children: [],
        serverProps: undefined,
        serverTail: [],
        distanceFromLeaf
      };
      siblings.push(distanceFromLeaf);
      return distanceFromLeaf;
    }
    function warnNonHydratedInstance(fiber, rejectedCandidate) {
      didSuspendOrErrorDEV || (fiber = buildHydrationDiffNode(fiber, 0), fiber.serverProps = null, rejectedCandidate !== null && (rejectedCandidate = describeHydratableInstanceForDevWarnings(rejectedCandidate), fiber.serverTail.push(rejectedCandidate)));
    }
    function throwOnHydrationMismatch(fiber) {
      var diff = "", diffRoot = hydrationDiffRootDEV;
      diffRoot !== null && (hydrationDiffRootDEV = null, diff = describeDiff(diffRoot));
      queueHydrationError(createCapturedValueAtFiber(Error(`Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch \`if (typeof window !== 'undefined')\`.
- Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch` + diff), fiber));
      throw HydrationMismatchException;
    }
    function prepareToHydrateHostInstance(fiber, hostContext) {
      if (!supportsHydration)
        throw Error("Expected prepareToHydrateHostInstance() to never be called. This error is likely caused by a bug in React. Please file an issue.");
      hydrateInstance(fiber.stateNode, fiber.type, fiber.memoizedProps, hostContext, fiber) || throwOnHydrationMismatch(fiber);
    }
    function popToNextHostParent(fiber) {
      for (hydrationParentFiber = fiber.return;hydrationParentFiber; )
        switch (hydrationParentFiber.tag) {
          case 5:
          case 13:
            rootOrSingletonContext = false;
            return;
          case 27:
          case 3:
            rootOrSingletonContext = true;
            return;
          default:
            hydrationParentFiber = hydrationParentFiber.return;
        }
    }
    function popHydrationState(fiber) {
      if (!supportsHydration || fiber !== hydrationParentFiber)
        return false;
      if (!isHydrating)
        return popToNextHostParent(fiber), isHydrating = true, false;
      var tag = fiber.tag;
      supportsSingletons ? tag !== 3 && tag !== 27 && (tag !== 5 || shouldDeleteUnhydratedTailInstances(fiber.type) && !shouldSetTextContent(fiber.type, fiber.memoizedProps)) && nextHydratableInstance && (warnIfUnhydratedTailNodes(fiber), throwOnHydrationMismatch(fiber)) : tag !== 3 && (tag !== 5 || shouldDeleteUnhydratedTailInstances(fiber.type) && !shouldSetTextContent(fiber.type, fiber.memoizedProps)) && nextHydratableInstance && (warnIfUnhydratedTailNodes(fiber), throwOnHydrationMismatch(fiber));
      popToNextHostParent(fiber);
      if (tag === 13) {
        if (!supportsHydration)
          throw Error("Expected skipPastDehydratedSuspenseInstance() to never be called. This error is likely caused by a bug in React. Please file an issue.");
        fiber = fiber.memoizedState;
        fiber = fiber !== null ? fiber.dehydrated : null;
        if (!fiber)
          throw Error("Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue.");
        nextHydratableInstance = getNextHydratableInstanceAfterSuspenseInstance(fiber);
      } else
        nextHydratableInstance = supportsSingletons && tag === 27 ? getNextHydratableSiblingAfterSingleton(fiber.type, nextHydratableInstance) : hydrationParentFiber ? getNextHydratableSibling(fiber.stateNode) : null;
      return true;
    }
    function warnIfUnhydratedTailNodes(fiber) {
      for (var nextInstance = nextHydratableInstance;nextInstance; ) {
        var diffNode = buildHydrationDiffNode(fiber, 0), description = describeHydratableInstanceForDevWarnings(nextInstance);
        diffNode.serverTail.push(description);
        nextInstance = description.type === "Suspense" ? getNextHydratableInstanceAfterSuspenseInstance(nextInstance) : getNextHydratableSibling(nextInstance);
      }
    }
    function resetHydrationState() {
      supportsHydration && (nextHydratableInstance = hydrationParentFiber = null, didSuspendOrErrorDEV = isHydrating = false);
    }
    function upgradeHydrationErrorsToRecoverable() {
      var queuedErrors = hydrationErrors;
      queuedErrors !== null && (workInProgressRootRecoverableErrors === null ? workInProgressRootRecoverableErrors = queuedErrors : workInProgressRootRecoverableErrors.push.apply(workInProgressRootRecoverableErrors, queuedErrors), hydrationErrors = null);
      return queuedErrors;
    }
    function queueHydrationError(error) {
      hydrationErrors === null ? hydrationErrors = [error] : hydrationErrors.push(error);
    }
    function emitPendingHydrationWarnings() {
      var diffRoot = hydrationDiffRootDEV;
      if (diffRoot !== null) {
        hydrationDiffRootDEV = null;
        for (var diff = describeDiff(diffRoot);0 < diffRoot.children.length; )
          diffRoot = diffRoot.children[0];
        runWithFiberInDEV(diffRoot.fiber, function() {
          console.error(`A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch \`if (typeof window !== 'undefined')\`.
- Variable input such as \`Date.now()\` or \`Math.random()\` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

%s%s`, "https://react.dev/link/hydration-mismatch", diff);
        });
      }
    }
    function is(x, y) {
      return x === y && (x !== 0 || 1 / x === 1 / y) || x !== x && y !== y;
    }
    function resetContextDependencies() {
      lastContextDependency = currentlyRenderingFiber$1 = null;
      isDisallowedContextReadInDEV = false;
    }
    function pushProvider(providerFiber, context, nextValue) {
      isPrimaryRenderer ? (push(valueCursor, context._currentValue, providerFiber), context._currentValue = nextValue, push(rendererCursorDEV, context._currentRenderer, providerFiber), context._currentRenderer !== undefined && context._currentRenderer !== null && context._currentRenderer !== rendererSigil && console.error("Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported."), context._currentRenderer = rendererSigil) : (push(valueCursor, context._currentValue2, providerFiber), context._currentValue2 = nextValue, push(renderer2CursorDEV, context._currentRenderer2, providerFiber), context._currentRenderer2 !== undefined && context._currentRenderer2 !== null && context._currentRenderer2 !== rendererSigil && console.error("Detected multiple renderers concurrently rendering the same context provider. This is currently unsupported."), context._currentRenderer2 = rendererSigil);
    }
    function popProvider(context, providerFiber) {
      var currentValue = valueCursor.current;
      isPrimaryRenderer ? (context._currentValue = currentValue, currentValue = rendererCursorDEV.current, pop(rendererCursorDEV, providerFiber), context._currentRenderer = currentValue) : (context._currentValue2 = currentValue, currentValue = renderer2CursorDEV.current, pop(renderer2CursorDEV, providerFiber), context._currentRenderer2 = currentValue);
      pop(valueCursor, providerFiber);
    }
    function scheduleContextWorkOnParentPath(parent, renderLanes2, propagationRoot) {
      for (;parent !== null; ) {
        var alternate = parent.alternate;
        (parent.childLanes & renderLanes2) !== renderLanes2 ? (parent.childLanes |= renderLanes2, alternate !== null && (alternate.childLanes |= renderLanes2)) : alternate !== null && (alternate.childLanes & renderLanes2) !== renderLanes2 && (alternate.childLanes |= renderLanes2);
        if (parent === propagationRoot)
          break;
        parent = parent.return;
      }
      parent !== propagationRoot && console.error("Expected to find the propagation root when scheduling context work. This error is likely caused by a bug in React. Please file an issue.");
    }
    function propagateContextChanges(workInProgress2, contexts, renderLanes2, forcePropagateEntireTree) {
      var fiber = workInProgress2.child;
      fiber !== null && (fiber.return = workInProgress2);
      for (;fiber !== null; ) {
        var list = fiber.dependencies;
        if (list !== null) {
          var nextFiber = fiber.child;
          list = list.firstContext;
          a:
            for (;list !== null; ) {
              var dependency = list;
              list = fiber;
              for (var i = 0;i < contexts.length; i++)
                if (dependency.context === contexts[i]) {
                  list.lanes |= renderLanes2;
                  dependency = list.alternate;
                  dependency !== null && (dependency.lanes |= renderLanes2);
                  scheduleContextWorkOnParentPath(list.return, renderLanes2, workInProgress2);
                  forcePropagateEntireTree || (nextFiber = null);
                  break a;
                }
              list = dependency.next;
            }
        } else if (fiber.tag === 18) {
          nextFiber = fiber.return;
          if (nextFiber === null)
            throw Error("We just came from a parent so we must have had a parent. This is a bug in React.");
          nextFiber.lanes |= renderLanes2;
          list = nextFiber.alternate;
          list !== null && (list.lanes |= renderLanes2);
          scheduleContextWorkOnParentPath(nextFiber, renderLanes2, workInProgress2);
          nextFiber = null;
        } else
          nextFiber = fiber.child;
        if (nextFiber !== null)
          nextFiber.return = fiber;
        else
          for (nextFiber = fiber;nextFiber !== null; ) {
            if (nextFiber === workInProgress2) {
              nextFiber = null;
              break;
            }
            fiber = nextFiber.sibling;
            if (fiber !== null) {
              fiber.return = nextFiber.return;
              nextFiber = fiber;
              break;
            }
            nextFiber = nextFiber.return;
          }
        fiber = nextFiber;
      }
    }
    function propagateParentContextChanges(current2, workInProgress2, renderLanes2, forcePropagateEntireTree) {
      current2 = null;
      for (var parent = workInProgress2, isInsidePropagationBailout = false;parent !== null; ) {
        if (!isInsidePropagationBailout) {
          if ((parent.flags & 524288) !== 0)
            isInsidePropagationBailout = true;
          else if ((parent.flags & 262144) !== 0)
            break;
        }
        if (parent.tag === 10) {
          var currentParent = parent.alternate;
          if (currentParent === null)
            throw Error("Should have a current fiber. This is a bug in React.");
          currentParent = currentParent.memoizedProps;
          if (currentParent !== null) {
            var context = parent.type;
            objectIs(parent.pendingProps.value, currentParent.value) || (current2 !== null ? current2.push(context) : current2 = [context]);
          }
        } else if (parent === hostTransitionProviderCursor.current) {
          currentParent = parent.alternate;
          if (currentParent === null)
            throw Error("Should have a current fiber. This is a bug in React.");
          currentParent.memoizedState.memoizedState !== parent.memoizedState.memoizedState && (current2 !== null ? current2.push(HostTransitionContext) : current2 = [HostTransitionContext]);
        }
        parent = parent.return;
      }
      current2 !== null && propagateContextChanges(workInProgress2, current2, renderLanes2, forcePropagateEntireTree);
      workInProgress2.flags |= 262144;
    }
    function checkIfContextChanged(currentDependencies) {
      for (currentDependencies = currentDependencies.firstContext;currentDependencies !== null; ) {
        var context = currentDependencies.context;
        if (!objectIs(isPrimaryRenderer ? context._currentValue : context._currentValue2, currentDependencies.memoizedValue))
          return true;
        currentDependencies = currentDependencies.next;
      }
      return false;
    }
    function prepareToReadContext(workInProgress2) {
      currentlyRenderingFiber$1 = workInProgress2;
      lastContextDependency = null;
      workInProgress2 = workInProgress2.dependencies;
      workInProgress2 !== null && (workInProgress2.firstContext = null);
    }
    function readContext(context) {
      isDisallowedContextReadInDEV && console.error("Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo().");
      return readContextForConsumer(currentlyRenderingFiber$1, context);
    }
    function readContextDuringReconciliation(consumer, context) {
      currentlyRenderingFiber$1 === null && prepareToReadContext(consumer);
      return readContextForConsumer(consumer, context);
    }
    function readContextForConsumer(consumer, context) {
      var value = isPrimaryRenderer ? context._currentValue : context._currentValue2;
      context = { context, memoizedValue: value, next: null };
      if (lastContextDependency === null) {
        if (consumer === null)
          throw Error("Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo().");
        lastContextDependency = context;
        consumer.dependencies = {
          lanes: 0,
          firstContext: context,
          _debugThenableState: null
        };
        consumer.flags |= 524288;
      } else
        lastContextDependency = lastContextDependency.next = context;
      return value;
    }
    function createCache() {
      return {
        controller: new AbortControllerLocal,
        data: new Map,
        refCount: 0
      };
    }
    function retainCache(cache) {
      cache.controller.signal.aborted && console.warn("A cache instance was retained after it was already freed. This likely indicates a bug in React.");
      cache.refCount++;
    }
    function releaseCache(cache) {
      cache.refCount--;
      0 > cache.refCount && console.warn("A cache instance was released after it was already freed. This likely indicates a bug in React.");
      cache.refCount === 0 && scheduleCallback$2(NormalPriority, function() {
        cache.controller.abort();
      });
    }
    function pushNestedEffectDurations() {
      var prevEffectDuration = profilerEffectDuration;
      profilerEffectDuration = 0;
      return prevEffectDuration;
    }
    function popNestedEffectDurations(prevEffectDuration) {
      var elapsedTime = profilerEffectDuration;
      profilerEffectDuration = prevEffectDuration;
      return elapsedTime;
    }
    function bubbleNestedEffectDurations(prevEffectDuration) {
      var elapsedTime = profilerEffectDuration;
      profilerEffectDuration += prevEffectDuration;
      return elapsedTime;
    }
    function startProfilerTimer(fiber) {
      profilerStartTime = now();
      0 > fiber.actualStartTime && (fiber.actualStartTime = profilerStartTime);
    }
    function stopProfilerTimerIfRunningAndRecordDuration(fiber) {
      if (0 <= profilerStartTime) {
        var elapsedTime = now() - profilerStartTime;
        fiber.actualDuration += elapsedTime;
        fiber.selfBaseDuration = elapsedTime;
        profilerStartTime = -1;
      }
    }
    function stopProfilerTimerIfRunningAndRecordIncompleteDuration(fiber) {
      if (0 <= profilerStartTime) {
        var elapsedTime = now() - profilerStartTime;
        fiber.actualDuration += elapsedTime;
        profilerStartTime = -1;
      }
    }
    function recordEffectDuration() {
      if (0 <= profilerStartTime) {
        var elapsedTime = now() - profilerStartTime;
        profilerStartTime = -1;
        profilerEffectDuration += elapsedTime;
      }
    }
    function startEffectTimer() {
      profilerStartTime = now();
    }
    function transferActualDuration(fiber) {
      for (var child = fiber.child;child; )
        fiber.actualDuration += child.actualDuration, child = child.sibling;
    }
    function ensureRootIsScheduled(root) {
      root !== lastScheduledRoot && root.next === null && (lastScheduledRoot === null ? firstScheduledRoot = lastScheduledRoot = root : lastScheduledRoot = lastScheduledRoot.next = root);
      mightHavePendingSyncWork = true;
      ReactSharedInternals.actQueue !== null ? didScheduleMicrotask_act || (didScheduleMicrotask_act = true, scheduleImmediateRootScheduleTask()) : didScheduleMicrotask || (didScheduleMicrotask = true, scheduleImmediateRootScheduleTask());
    }
    function flushSyncWorkAcrossRoots_impl(syncTransitionLanes, onlyLegacy) {
      if (!isFlushingWork && mightHavePendingSyncWork) {
        isFlushingWork = true;
        do {
          var didPerformSomeWork = false;
          for (var root = firstScheduledRoot;root !== null; ) {
            if (!onlyLegacy)
              if (syncTransitionLanes !== 0) {
                var pendingLanes = root.pendingLanes;
                if (pendingLanes === 0)
                  var nextLanes = 0;
                else {
                  var { suspendedLanes, pingedLanes } = root;
                  nextLanes = (1 << 31 - clz32(42 | syncTransitionLanes) + 1) - 1;
                  nextLanes &= pendingLanes & ~(suspendedLanes & ~pingedLanes);
                  nextLanes = nextLanes & 201326741 ? nextLanes & 201326741 | 1 : nextLanes ? nextLanes | 2 : 0;
                }
                nextLanes !== 0 && (didPerformSomeWork = true, performSyncWorkOnRoot(root, nextLanes));
              } else
                nextLanes = workInProgressRootRenderLanes, nextLanes = getNextLanes(root, root === workInProgressRoot ? nextLanes : 0, root.cancelPendingCommit !== null || root.timeoutHandle !== noTimeout), (nextLanes & 3) === 0 || checkIfRootIsPrerendering(root, nextLanes) || (didPerformSomeWork = true, performSyncWorkOnRoot(root, nextLanes));
            root = root.next;
          }
        } while (didPerformSomeWork);
        isFlushingWork = false;
      }
    }
    function processRootScheduleInImmediateTask() {
      processRootScheduleInMicrotask();
    }
    function processRootScheduleInMicrotask() {
      mightHavePendingSyncWork = didScheduleMicrotask_act = didScheduleMicrotask = false;
      var syncTransitionLanes = 0;
      currentEventTransitionLane !== 0 && (shouldAttemptEagerTransition() && (syncTransitionLanes = currentEventTransitionLane), currentEventTransitionLane = 0);
      for (var currentTime = now$1(), prev = null, root = firstScheduledRoot;root !== null; ) {
        var next = root.next, nextLanes = scheduleTaskForRootDuringMicrotask(root, currentTime);
        if (nextLanes === 0)
          root.next = null, prev === null ? firstScheduledRoot = next : prev.next = next, next === null && (lastScheduledRoot = prev);
        else if (prev = root, syncTransitionLanes !== 0 || (nextLanes & 3) !== 0)
          mightHavePendingSyncWork = true;
        root = next;
      }
      flushSyncWorkAcrossRoots_impl(syncTransitionLanes, false);
    }
    function scheduleTaskForRootDuringMicrotask(root, currentTime) {
      for (var { suspendedLanes, pingedLanes, expirationTimes } = root, lanes = root.pendingLanes & -62914561;0 < lanes; ) {
        var index = 31 - clz32(lanes), lane = 1 << index, expirationTime = expirationTimes[index];
        if (expirationTime === -1) {
          if ((lane & suspendedLanes) === 0 || (lane & pingedLanes) !== 0)
            expirationTimes[index] = computeExpirationTime(lane, currentTime);
        } else
          expirationTime <= currentTime && (root.expiredLanes |= lane);
        lanes &= ~lane;
      }
      currentTime = workInProgressRoot;
      suspendedLanes = workInProgressRootRenderLanes;
      suspendedLanes = getNextLanes(root, root === currentTime ? suspendedLanes : 0, root.cancelPendingCommit !== null || root.timeoutHandle !== noTimeout);
      pingedLanes = root.callbackNode;
      if (suspendedLanes === 0 || root === currentTime && (workInProgressSuspendedReason === SuspendedOnData || workInProgressSuspendedReason === SuspendedOnAction) || root.cancelPendingCommit !== null)
        return pingedLanes !== null && cancelCallback(pingedLanes), root.callbackNode = null, root.callbackPriority = 0;
      if ((suspendedLanes & 3) === 0 || checkIfRootIsPrerendering(root, suspendedLanes)) {
        currentTime = suspendedLanes & -suspendedLanes;
        if (currentTime !== root.callbackPriority || ReactSharedInternals.actQueue !== null && pingedLanes !== fakeActCallbackNode$1)
          cancelCallback(pingedLanes);
        else
          return currentTime;
        switch (lanesToEventPriority(suspendedLanes)) {
          case 2:
          case 8:
            suspendedLanes = UserBlockingPriority;
            break;
          case 32:
            suspendedLanes = NormalPriority$1;
            break;
          case 268435456:
            suspendedLanes = IdlePriority;
            break;
          default:
            suspendedLanes = NormalPriority$1;
        }
        pingedLanes = performWorkOnRootViaSchedulerTask.bind(null, root);
        ReactSharedInternals.actQueue !== null ? (ReactSharedInternals.actQueue.push(pingedLanes), suspendedLanes = fakeActCallbackNode$1) : suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
        root.callbackPriority = currentTime;
        root.callbackNode = suspendedLanes;
        return currentTime;
      }
      pingedLanes !== null && cancelCallback(pingedLanes);
      root.callbackPriority = 2;
      root.callbackNode = null;
      return 2;
    }
    function performWorkOnRootViaSchedulerTask(root, didTimeout) {
      nestedUpdateScheduled = currentUpdateIsNested = false;
      if (pendingEffectsStatus !== NO_PENDING_EFFECTS && pendingEffectsStatus !== PENDING_PASSIVE_PHASE)
        return root.callbackNode = null, root.callbackPriority = 0, null;
      var originalCallbackNode = root.callbackNode;
      if (flushPendingEffects(true) && root.callbackNode !== originalCallbackNode)
        return null;
      var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
      workInProgressRootRenderLanes$jscomp$0 = getNextLanes(root, root === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0, root.cancelPendingCommit !== null || root.timeoutHandle !== noTimeout);
      if (workInProgressRootRenderLanes$jscomp$0 === 0)
        return null;
      performWorkOnRoot(root, workInProgressRootRenderLanes$jscomp$0, didTimeout);
      scheduleTaskForRootDuringMicrotask(root, now$1());
      return root.callbackNode != null && root.callbackNode === originalCallbackNode ? performWorkOnRootViaSchedulerTask.bind(null, root) : null;
    }
    function performSyncWorkOnRoot(root, lanes) {
      if (flushPendingEffects())
        return null;
      currentUpdateIsNested = nestedUpdateScheduled;
      nestedUpdateScheduled = false;
      performWorkOnRoot(root, lanes, true);
    }
    function cancelCallback(callbackNode) {
      callbackNode !== fakeActCallbackNode$1 && callbackNode !== null && cancelCallback$1(callbackNode);
    }
    function scheduleImmediateRootScheduleTask() {
      ReactSharedInternals.actQueue !== null && ReactSharedInternals.actQueue.push(function() {
        processRootScheduleInMicrotask();
        return null;
      });
      supportsMicrotasks ? scheduleMicrotask(function() {
        (executionContext & (RenderContext | CommitContext)) !== NoContext ? scheduleCallback$3(ImmediatePriority, processRootScheduleInImmediateTask) : processRootScheduleInMicrotask();
      }) : scheduleCallback$3(ImmediatePriority, processRootScheduleInImmediateTask);
    }
    function requestTransitionLane() {
      currentEventTransitionLane === 0 && (currentEventTransitionLane = claimNextTransitionLane());
      return currentEventTransitionLane;
    }
    function entangleAsyncAction(transition, thenable) {
      if (currentEntangledListeners === null) {
        var entangledListeners = currentEntangledListeners = [];
        currentEntangledPendingCount = 0;
        currentEntangledLane = requestTransitionLane();
        currentEntangledActionThenable = {
          status: "pending",
          value: undefined,
          then: function(resolve) {
            entangledListeners.push(resolve);
          }
        };
      }
      currentEntangledPendingCount++;
      thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
      return thenable;
    }
    function pingEngtangledActionScope() {
      if (--currentEntangledPendingCount === 0 && currentEntangledListeners !== null) {
        currentEntangledActionThenable !== null && (currentEntangledActionThenable.status = "fulfilled");
        var listeners = currentEntangledListeners;
        currentEntangledListeners = null;
        currentEntangledLane = 0;
        currentEntangledActionThenable = null;
        for (var i = 0;i < listeners.length; i++)
          (0, listeners[i])();
      }
    }
    function chainThenableValue(thenable, result) {
      var listeners = [], thenableWithOverride = {
        status: "pending",
        value: null,
        reason: null,
        then: function(resolve) {
          listeners.push(resolve);
        }
      };
      thenable.then(function() {
        thenableWithOverride.status = "fulfilled";
        thenableWithOverride.value = result;
        for (var i = 0;i < listeners.length; i++)
          (0, listeners[i])(result);
      }, function(error) {
        thenableWithOverride.status = "rejected";
        thenableWithOverride.reason = error;
        for (error = 0;error < listeners.length; error++)
          (0, listeners[error])(undefined);
      });
      return thenableWithOverride;
    }
    function peekCacheFromPool() {
      var cacheResumedFromPreviousRender = resumedCache.current;
      return cacheResumedFromPreviousRender !== null ? cacheResumedFromPreviousRender : workInProgressRoot.pooledCache;
    }
    function pushTransition(offscreenWorkInProgress, prevCachePool) {
      prevCachePool === null ? push(resumedCache, resumedCache.current, offscreenWorkInProgress) : push(resumedCache, prevCachePool.pool, offscreenWorkInProgress);
    }
    function getSuspendedCache() {
      var cacheFromPool = peekCacheFromPool();
      return cacheFromPool === null ? null : {
        parent: isPrimaryRenderer ? CacheContext._currentValue : CacheContext._currentValue2,
        pool: cacheFromPool
      };
    }
    function shallowEqual(objA, objB) {
      if (objectIs(objA, objB))
        return true;
      if (typeof objA !== "object" || objA === null || typeof objB !== "object" || objB === null)
        return false;
      var keysA = Object.keys(objA), keysB = Object.keys(objB);
      if (keysA.length !== keysB.length)
        return false;
      for (keysB = 0;keysB < keysA.length; keysB++) {
        var currentKey = keysA[keysB];
        if (!hasOwnProperty.call(objB, currentKey) || !objectIs(objA[currentKey], objB[currentKey]))
          return false;
      }
      return true;
    }
    function createThenableState() {
      return { didWarnAboutUncachedPromise: false, thenables: [] };
    }
    function isThenableResolved(thenable) {
      thenable = thenable.status;
      return thenable === "fulfilled" || thenable === "rejected";
    }
    function noop$1() {}
    function trackUsedThenable(thenableState2, thenable, index) {
      ReactSharedInternals.actQueue !== null && (ReactSharedInternals.didUsePromise = true);
      var trackedThenables = thenableState2.thenables;
      index = trackedThenables[index];
      index === undefined ? trackedThenables.push(thenable) : index !== thenable && (thenableState2.didWarnAboutUncachedPromise || (thenableState2.didWarnAboutUncachedPromise = true, console.error("A component was suspended by an uncached promise. Creating promises inside a Client Component or hook is not yet supported, except via a Suspense-compatible library or framework.")), thenable.then(noop$1, noop$1), thenable = index);
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenableState2 = thenable.reason, checkIfUseWrappedInAsyncCatch(thenableState2), thenableState2;
        default:
          if (typeof thenable.status === "string")
            thenable.then(noop$1, noop$1);
          else {
            thenableState2 = workInProgressRoot;
            if (thenableState2 !== null && 100 < thenableState2.shellSuspendCounter)
              throw Error("An unknown Component is an async Client Component. Only Server Components can be async at the moment. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server.");
            thenableState2 = thenable;
            thenableState2.status = "pending";
            thenableState2.then(function(fulfilledValue) {
              if (thenable.status === "pending") {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            }, function(error) {
              if (thenable.status === "pending") {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            });
          }
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenableState2 = thenable.reason, checkIfUseWrappedInAsyncCatch(thenableState2), thenableState2;
          }
          suspendedThenable = thenable;
          needsToResetSuspendedThenableDEV = true;
          throw SuspenseException;
      }
    }
    function getSuspendedThenable() {
      if (suspendedThenable === null)
        throw Error("Expected a suspended thenable. This is a bug in React. Please file an issue.");
      var thenable = suspendedThenable;
      suspendedThenable = null;
      needsToResetSuspendedThenableDEV = false;
      return thenable;
    }
    function checkIfUseWrappedInAsyncCatch(rejectedReason) {
      if (rejectedReason === SuspenseException || rejectedReason === SuspenseActionException)
        throw Error("Hooks are not supported inside an async component. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server.");
    }
    function finishQueueingConcurrentUpdates() {
      for (var endIndex = concurrentQueuesIndex, i = concurrentlyUpdatedLanes = concurrentQueuesIndex = 0;i < endIndex; ) {
        var fiber = concurrentQueues[i];
        concurrentQueues[i++] = null;
        var queue = concurrentQueues[i];
        concurrentQueues[i++] = null;
        var update = concurrentQueues[i];
        concurrentQueues[i++] = null;
        var lane = concurrentQueues[i];
        concurrentQueues[i++] = null;
        if (queue !== null && update !== null) {
          var pending = queue.pending;
          pending === null ? update.next = update : (update.next = pending.next, pending.next = update);
          queue.pending = update;
        }
        lane !== 0 && markUpdateLaneFromFiberToRoot(fiber, update, lane);
      }
    }
    function enqueueUpdate$1(fiber, queue, update, lane) {
      concurrentQueues[concurrentQueuesIndex++] = fiber;
      concurrentQueues[concurrentQueuesIndex++] = queue;
      concurrentQueues[concurrentQueuesIndex++] = update;
      concurrentQueues[concurrentQueuesIndex++] = lane;
      concurrentlyUpdatedLanes |= lane;
      fiber.lanes |= lane;
      fiber = fiber.alternate;
      fiber !== null && (fiber.lanes |= lane);
    }
    function enqueueConcurrentHookUpdate(fiber, queue, update, lane) {
      enqueueUpdate$1(fiber, queue, update, lane);
      return getRootForUpdatedFiber(fiber);
    }
    function enqueueConcurrentRenderForLane(fiber, lane) {
      enqueueUpdate$1(fiber, null, null, lane);
      return getRootForUpdatedFiber(fiber);
    }
    function markUpdateLaneFromFiberToRoot(sourceFiber, update, lane) {
      sourceFiber.lanes |= lane;
      var alternate = sourceFiber.alternate;
      alternate !== null && (alternate.lanes |= lane);
      for (var isHidden = false, parent = sourceFiber.return;parent !== null; )
        parent.childLanes |= lane, alternate = parent.alternate, alternate !== null && (alternate.childLanes |= lane), parent.tag === 22 && (sourceFiber = parent.stateNode, sourceFiber === null || sourceFiber._visibility & 1 || (isHidden = true)), sourceFiber = parent, parent = parent.return;
      return sourceFiber.tag === 3 ? (parent = sourceFiber.stateNode, isHidden && update !== null && (isHidden = 31 - clz32(lane), sourceFiber = parent.hiddenUpdates, alternate = sourceFiber[isHidden], alternate === null ? sourceFiber[isHidden] = [update] : alternate.push(update), update.lane = lane | 536870912), parent) : null;
    }
    function getRootForUpdatedFiber(sourceFiber) {
      if (nestedUpdateCount > NESTED_UPDATE_LIMIT)
        throw nestedPassiveUpdateCount = nestedUpdateCount = 0, rootWithPassiveNestedUpdates = rootWithNestedUpdates = null, Error("Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.");
      nestedPassiveUpdateCount > NESTED_PASSIVE_UPDATE_LIMIT && (nestedPassiveUpdateCount = 0, rootWithPassiveNestedUpdates = null, console.error("Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render."));
      sourceFiber.alternate === null && (sourceFiber.flags & 4098) !== 0 && warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber);
      for (var node = sourceFiber, parent = node.return;parent !== null; )
        node.alternate === null && (node.flags & 4098) !== 0 && warnAboutUpdateOnNotYetMountedFiberInDEV(sourceFiber), node = parent, parent = node.return;
      return node.tag === 3 ? node.stateNode : null;
    }
    function initializeUpdateQueue(fiber) {
      fiber.updateQueue = {
        baseState: fiber.memoizedState,
        firstBaseUpdate: null,
        lastBaseUpdate: null,
        shared: { pending: null, lanes: 0, hiddenCallbacks: null },
        callbacks: null
      };
    }
    function cloneUpdateQueue(current2, workInProgress2) {
      current2 = current2.updateQueue;
      workInProgress2.updateQueue === current2 && (workInProgress2.updateQueue = {
        baseState: current2.baseState,
        firstBaseUpdate: current2.firstBaseUpdate,
        lastBaseUpdate: current2.lastBaseUpdate,
        shared: current2.shared,
        callbacks: null
      });
    }
    function createUpdate(lane) {
      return {
        lane,
        tag: UpdateState,
        payload: null,
        callback: null,
        next: null
      };
    }
    function enqueueUpdate(fiber, update, lane) {
      var updateQueue = fiber.updateQueue;
      if (updateQueue === null)
        return null;
      updateQueue = updateQueue.shared;
      if (currentlyProcessingQueue === updateQueue && !didWarnUpdateInsideUpdate) {
        var componentName2 = getComponentNameFromFiber(fiber);
        console.error(`An update (setState, replaceState, or forceUpdate) was scheduled from inside an update function. Update functions should be pure, with zero side-effects. Consider using componentDidUpdate or a callback.

Please update the following component: %s`, componentName2);
        didWarnUpdateInsideUpdate = true;
      }
      if ((executionContext & RenderContext) !== NoContext)
        return componentName2 = updateQueue.pending, componentName2 === null ? update.next = update : (update.next = componentName2.next, componentName2.next = update), updateQueue.pending = update, update = getRootForUpdatedFiber(fiber), markUpdateLaneFromFiberToRoot(fiber, null, lane), update;
      enqueueUpdate$1(fiber, updateQueue, update, lane);
      return getRootForUpdatedFiber(fiber);
    }
    function entangleTransitions(root, fiber, lane) {
      fiber = fiber.updateQueue;
      if (fiber !== null && (fiber = fiber.shared, (lane & 4194048) !== 0)) {
        var queueLanes = fiber.lanes;
        queueLanes &= root.pendingLanes;
        lane |= queueLanes;
        fiber.lanes = lane;
        markRootEntangled(root, lane);
      }
    }
    function enqueueCapturedUpdate(workInProgress2, capturedUpdate) {
      var { updateQueue: queue, alternate: current2 } = workInProgress2;
      if (current2 !== null && (current2 = current2.updateQueue, queue === current2)) {
        var newFirst = null, newLast = null;
        queue = queue.firstBaseUpdate;
        if (queue !== null) {
          do {
            var clone = {
              lane: queue.lane,
              tag: queue.tag,
              payload: queue.payload,
              callback: null,
              next: null
            };
            newLast === null ? newFirst = newLast = clone : newLast = newLast.next = clone;
            queue = queue.next;
          } while (queue !== null);
          newLast === null ? newFirst = newLast = capturedUpdate : newLast = newLast.next = capturedUpdate;
        } else
          newFirst = newLast = capturedUpdate;
        queue = {
          baseState: current2.baseState,
          firstBaseUpdate: newFirst,
          lastBaseUpdate: newLast,
          shared: current2.shared,
          callbacks: current2.callbacks
        };
        workInProgress2.updateQueue = queue;
        return;
      }
      workInProgress2 = queue.lastBaseUpdate;
      workInProgress2 === null ? queue.firstBaseUpdate = capturedUpdate : workInProgress2.next = capturedUpdate;
      queue.lastBaseUpdate = capturedUpdate;
    }
    function suspendIfUpdateReadFromEntangledAsyncAction() {
      if (didReadFromEntangledAsyncAction) {
        var entangledActionThenable = currentEntangledActionThenable;
        if (entangledActionThenable !== null)
          throw entangledActionThenable;
      }
    }
    function processUpdateQueue(workInProgress2, props, instance$jscomp$0, renderLanes2) {
      didReadFromEntangledAsyncAction = false;
      var queue = workInProgress2.updateQueue;
      hasForceUpdate = false;
      currentlyProcessingQueue = queue.shared;
      var { firstBaseUpdate, lastBaseUpdate } = queue, pendingQueue = queue.shared.pending;
      if (pendingQueue !== null) {
        queue.shared.pending = null;
        var lastPendingUpdate = pendingQueue, firstPendingUpdate = lastPendingUpdate.next;
        lastPendingUpdate.next = null;
        lastBaseUpdate === null ? firstBaseUpdate = firstPendingUpdate : lastBaseUpdate.next = firstPendingUpdate;
        lastBaseUpdate = lastPendingUpdate;
        var current2 = workInProgress2.alternate;
        current2 !== null && (current2 = current2.updateQueue, pendingQueue = current2.lastBaseUpdate, pendingQueue !== lastBaseUpdate && (pendingQueue === null ? current2.firstBaseUpdate = firstPendingUpdate : pendingQueue.next = firstPendingUpdate, current2.lastBaseUpdate = lastPendingUpdate));
      }
      if (firstBaseUpdate !== null) {
        var newState = queue.baseState;
        lastBaseUpdate = 0;
        current2 = firstPendingUpdate = lastPendingUpdate = null;
        pendingQueue = firstBaseUpdate;
        do {
          var updateLane = pendingQueue.lane & -536870913, isHiddenUpdate = updateLane !== pendingQueue.lane;
          if (isHiddenUpdate ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes2 & updateLane) === updateLane) {
            updateLane !== 0 && updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction = true);
            current2 !== null && (current2 = current2.next = {
              lane: 0,
              tag: pendingQueue.tag,
              payload: pendingQueue.payload,
              callback: null,
              next: null
            });
            a: {
              updateLane = workInProgress2;
              var partialState = pendingQueue;
              var nextProps = props, instance = instance$jscomp$0;
              switch (partialState.tag) {
                case ReplaceState:
                  partialState = partialState.payload;
                  if (typeof partialState === "function") {
                    isDisallowedContextReadInDEV = true;
                    var nextState = partialState.call(instance, newState, nextProps);
                    if (updateLane.mode & 8) {
                      setIsStrictModeForDevtools(true);
                      try {
                        partialState.call(instance, newState, nextProps);
                      } finally {
                        setIsStrictModeForDevtools(false);
                      }
                    }
                    isDisallowedContextReadInDEV = false;
                    newState = nextState;
                    break a;
                  }
                  newState = partialState;
                  break a;
                case CaptureUpdate:
                  updateLane.flags = updateLane.flags & -65537 | 128;
                case UpdateState:
                  nextState = partialState.payload;
                  if (typeof nextState === "function") {
                    isDisallowedContextReadInDEV = true;
                    partialState = nextState.call(instance, newState, nextProps);
                    if (updateLane.mode & 8) {
                      setIsStrictModeForDevtools(true);
                      try {
                        nextState.call(instance, newState, nextProps);
                      } finally {
                        setIsStrictModeForDevtools(false);
                      }
                    }
                    isDisallowedContextReadInDEV = false;
                  } else
                    partialState = nextState;
                  if (partialState === null || partialState === undefined)
                    break a;
                  newState = assign({}, newState, partialState);
                  break a;
                case ForceUpdate:
                  hasForceUpdate = true;
              }
            }
            updateLane = pendingQueue.callback;
            updateLane !== null && (workInProgress2.flags |= 64, isHiddenUpdate && (workInProgress2.flags |= 8192), isHiddenUpdate = queue.callbacks, isHiddenUpdate === null ? queue.callbacks = [updateLane] : isHiddenUpdate.push(updateLane));
          } else
            isHiddenUpdate = {
              lane: updateLane,
              tag: pendingQueue.tag,
              payload: pendingQueue.payload,
              callback: pendingQueue.callback,
              next: null
            }, current2 === null ? (firstPendingUpdate = current2 = isHiddenUpdate, lastPendingUpdate = newState) : current2 = current2.next = isHiddenUpdate, lastBaseUpdate |= updateLane;
          pendingQueue = pendingQueue.next;
          if (pendingQueue === null)
            if (pendingQueue = queue.shared.pending, pendingQueue === null)
              break;
            else
              isHiddenUpdate = pendingQueue, pendingQueue = isHiddenUpdate.next, isHiddenUpdate.next = null, queue.lastBaseUpdate = isHiddenUpdate, queue.shared.pending = null;
        } while (1);
        current2 === null && (lastPendingUpdate = newState);
        queue.baseState = lastPendingUpdate;
        queue.firstBaseUpdate = firstPendingUpdate;
        queue.lastBaseUpdate = current2;
        firstBaseUpdate === null && (queue.shared.lanes = 0);
        workInProgressRootSkippedLanes |= lastBaseUpdate;
        workInProgress2.lanes = lastBaseUpdate;
        workInProgress2.memoizedState = newState;
      }
      currentlyProcessingQueue = null;
    }
    function callCallback(callback, context) {
      if (typeof callback !== "function")
        throw Error("Invalid argument passed as callback. Expected a function. Instead received: " + callback);
      callback.call(context);
    }
    function commitHiddenCallbacks(updateQueue, context) {
      var hiddenCallbacks = updateQueue.shared.hiddenCallbacks;
      if (hiddenCallbacks !== null)
        for (updateQueue.shared.hiddenCallbacks = null, updateQueue = 0;updateQueue < hiddenCallbacks.length; updateQueue++)
          callCallback(hiddenCallbacks[updateQueue], context);
    }
    function commitCallbacks(updateQueue, context) {
      var callbacks = updateQueue.callbacks;
      if (callbacks !== null)
        for (updateQueue.callbacks = null, updateQueue = 0;updateQueue < callbacks.length; updateQueue++)
          callCallback(callbacks[updateQueue], context);
    }
    function pushHiddenContext(fiber, context) {
      var prevEntangledRenderLanes = entangledRenderLanes;
      push(prevEntangledRenderLanesCursor, prevEntangledRenderLanes, fiber);
      push(currentTreeHiddenStackCursor, context, fiber);
      entangledRenderLanes = prevEntangledRenderLanes | context.baseLanes;
    }
    function reuseHiddenContextOnStack(fiber) {
      push(prevEntangledRenderLanesCursor, entangledRenderLanes, fiber);
      push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current, fiber);
    }
    function popHiddenContext(fiber) {
      entangledRenderLanes = prevEntangledRenderLanesCursor.current;
      pop(currentTreeHiddenStackCursor, fiber);
      pop(prevEntangledRenderLanesCursor, fiber);
    }
    function mountHookTypesDev() {
      var hookName = currentHookNameInDev;
      hookTypesDev === null ? hookTypesDev = [hookName] : hookTypesDev.push(hookName);
    }
    function updateHookTypesDev() {
      var hookName = currentHookNameInDev;
      if (hookTypesDev !== null && (hookTypesUpdateIndexDev++, hookTypesDev[hookTypesUpdateIndexDev] !== hookName)) {
        var componentName2 = getComponentNameFromFiber(currentlyRenderingFiber);
        if (!didWarnAboutMismatchedHooksForComponent.has(componentName2) && (didWarnAboutMismatchedHooksForComponent.add(componentName2), hookTypesDev !== null)) {
          for (var table = "", i = 0;i <= hookTypesUpdateIndexDev; i++) {
            var oldHookName = hookTypesDev[i], newHookName = i === hookTypesUpdateIndexDev ? hookName : oldHookName;
            for (oldHookName = i + 1 + ". " + oldHookName;30 > oldHookName.length; )
              oldHookName += " ";
            oldHookName += newHookName + `
`;
            table += oldHookName;
          }
          console.error(`React has detected a change in the order of Hooks called by %s. This will lead to bugs and errors if not fixed. For more information, read the Rules of Hooks: https://react.dev/link/rules-of-hooks

   Previous render            Next render
   ------------------------------------------------------
%s   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
`, componentName2, table);
        }
      }
    }
    function checkDepsAreArrayDev(deps) {
      deps === undefined || deps === null || isArrayImpl(deps) || console.error("%s received a final argument that is not an array (instead, received `%s`). When specified, the final argument must be an array.", currentHookNameInDev, typeof deps);
    }
    function warnOnUseFormStateInDev() {
      var componentName2 = getComponentNameFromFiber(currentlyRenderingFiber);
      didWarnAboutUseFormState.has(componentName2) || (didWarnAboutUseFormState.add(componentName2), console.error("ReactDOM.useFormState has been renamed to React.useActionState. Please update %s to use React.useActionState.", componentName2));
    }
    function throwInvalidHookError() {
      throw Error(`Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
1. You might have mismatching versions of React and the renderer (such as React DOM)
2. You might be breaking the Rules of Hooks
3. You might have more than one copy of React in the same app
See https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.`);
    }
    function areHookInputsEqual(nextDeps, prevDeps) {
      if (ignorePreviousDependencies)
        return false;
      if (prevDeps === null)
        return console.error("%s received a final argument during this render, but not during the previous render. Even though the final argument is optional, its type cannot change between renders.", currentHookNameInDev), false;
      nextDeps.length !== prevDeps.length && console.error(`The final argument passed to %s changed size between renders. The order and size of this array must remain constant.

Previous: %s
Incoming: %s`, currentHookNameInDev, "[" + prevDeps.join(", ") + "]", "[" + nextDeps.join(", ") + "]");
      for (var i = 0;i < prevDeps.length && i < nextDeps.length; i++)
        if (!objectIs(nextDeps[i], prevDeps[i]))
          return false;
      return true;
    }
    function renderWithHooks(current2, workInProgress2, Component, props, secondArg, nextRenderLanes) {
      renderLanes = nextRenderLanes;
      currentlyRenderingFiber = workInProgress2;
      hookTypesDev = current2 !== null ? current2._debugHookTypes : null;
      hookTypesUpdateIndexDev = -1;
      ignorePreviousDependencies = current2 !== null && current2.type !== workInProgress2.type;
      if (Object.prototype.toString.call(Component) === "[object AsyncFunction]" || Object.prototype.toString.call(Component) === "[object AsyncGeneratorFunction]")
        nextRenderLanes = getComponentNameFromFiber(currentlyRenderingFiber), didWarnAboutAsyncClientComponent.has(nextRenderLanes) || (didWarnAboutAsyncClientComponent.add(nextRenderLanes), console.error("%s is an async Client Component. Only Server Components can be async at the moment. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server.", nextRenderLanes === null ? "An unknown Component" : "<" + nextRenderLanes + ">"));
      workInProgress2.memoizedState = null;
      workInProgress2.updateQueue = null;
      workInProgress2.lanes = 0;
      ReactSharedInternals.H = current2 !== null && current2.memoizedState !== null ? HooksDispatcherOnUpdateInDEV : hookTypesDev !== null ? HooksDispatcherOnMountWithHookTypesInDEV : HooksDispatcherOnMountInDEV;
      shouldDoubleInvokeUserFnsInHooksDEV = nextRenderLanes = (workInProgress2.mode & 8) !== NoMode;
      var children = callComponentInDEV(Component, props, secondArg);
      shouldDoubleInvokeUserFnsInHooksDEV = false;
      didScheduleRenderPhaseUpdateDuringThisPass && (children = renderWithHooksAgain(workInProgress2, Component, props, secondArg));
      if (nextRenderLanes) {
        setIsStrictModeForDevtools(true);
        try {
          children = renderWithHooksAgain(workInProgress2, Component, props, secondArg);
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
      finishRenderingHooks(current2, workInProgress2);
      return children;
    }
    function finishRenderingHooks(current2, workInProgress2) {
      workInProgress2._debugHookTypes = hookTypesDev;
      workInProgress2.dependencies === null ? thenableState$1 !== null && (workInProgress2.dependencies = {
        lanes: 0,
        firstContext: null,
        _debugThenableState: thenableState$1
      }) : workInProgress2.dependencies._debugThenableState = thenableState$1;
      ReactSharedInternals.H = ContextOnlyDispatcher;
      var didRenderTooFewHooks = currentHook !== null && currentHook.next !== null;
      renderLanes = 0;
      hookTypesDev = currentHookNameInDev = workInProgressHook = currentHook = currentlyRenderingFiber = null;
      hookTypesUpdateIndexDev = -1;
      current2 !== null && (current2.flags & 65011712) !== (workInProgress2.flags & 65011712) && console.error("Internal React error: Expected static flag was missing. Please notify the React team.");
      didScheduleRenderPhaseUpdate = false;
      thenableIndexCounter$1 = 0;
      thenableState$1 = null;
      if (didRenderTooFewHooks)
        throw Error("Rendered fewer hooks than expected. This may be caused by an accidental early return statement.");
      current2 === null || didReceiveUpdate || (current2 = current2.dependencies, current2 !== null && checkIfContextChanged(current2) && (didReceiveUpdate = true));
      needsToResetSuspendedThenableDEV ? (needsToResetSuspendedThenableDEV = false, current2 = true) : current2 = false;
      current2 && (workInProgress2 = getComponentNameFromFiber(workInProgress2) || "Unknown", didWarnAboutUseWrappedInTryCatch.has(workInProgress2) || didWarnAboutAsyncClientComponent.has(workInProgress2) || (didWarnAboutUseWrappedInTryCatch.add(workInProgress2), console.error("`use` was called from inside a try/catch block. This is not allowed and can lead to unexpected behavior. To handle errors triggered by `use`, wrap your component in a error boundary.")));
    }
    function renderWithHooksAgain(workInProgress2, Component, props, secondArg) {
      currentlyRenderingFiber = workInProgress2;
      var numberOfReRenders = 0;
      do {
        didScheduleRenderPhaseUpdateDuringThisPass && (thenableState$1 = null);
        thenableIndexCounter$1 = 0;
        didScheduleRenderPhaseUpdateDuringThisPass = false;
        if (numberOfReRenders >= RE_RENDER_LIMIT)
          throw Error("Too many re-renders. React limits the number of renders to prevent an infinite loop.");
        numberOfReRenders += 1;
        ignorePreviousDependencies = false;
        workInProgressHook = currentHook = null;
        if (workInProgress2.updateQueue != null) {
          var children = workInProgress2.updateQueue;
          children.lastEffect = null;
          children.events = null;
          children.stores = null;
          children.memoCache != null && (children.memoCache.index = 0);
        }
        hookTypesUpdateIndexDev = -1;
        ReactSharedInternals.H = HooksDispatcherOnRerenderInDEV;
        children = callComponentInDEV(Component, props, secondArg);
      } while (didScheduleRenderPhaseUpdateDuringThisPass);
      return children;
    }
    function TransitionAwareHostComponent() {
      var dispatcher = ReactSharedInternals.H, maybeThenable = dispatcher.useState()[0];
      maybeThenable = typeof maybeThenable.then === "function" ? useThenable(maybeThenable) : maybeThenable;
      dispatcher = dispatcher.useState()[0];
      (currentHook !== null ? currentHook.memoizedState : null) !== dispatcher && (currentlyRenderingFiber.flags |= 1024);
      return maybeThenable;
    }
    function checkDidRenderIdHook() {
      var didRenderIdHook = localIdCounter !== 0;
      localIdCounter = 0;
      return didRenderIdHook;
    }
    function bailoutHooks(current2, workInProgress2, lanes) {
      workInProgress2.updateQueue = current2.updateQueue;
      workInProgress2.flags = (workInProgress2.mode & 16) !== NoMode ? workInProgress2.flags & -402655237 : workInProgress2.flags & -2053;
      current2.lanes &= ~lanes;
    }
    function resetHooksOnUnwind(workInProgress2) {
      if (didScheduleRenderPhaseUpdate) {
        for (workInProgress2 = workInProgress2.memoizedState;workInProgress2 !== null; ) {
          var queue = workInProgress2.queue;
          queue !== null && (queue.pending = null);
          workInProgress2 = workInProgress2.next;
        }
        didScheduleRenderPhaseUpdate = false;
      }
      renderLanes = 0;
      hookTypesDev = workInProgressHook = currentHook = currentlyRenderingFiber = null;
      hookTypesUpdateIndexDev = -1;
      currentHookNameInDev = null;
      didScheduleRenderPhaseUpdateDuringThisPass = false;
      thenableIndexCounter$1 = localIdCounter = 0;
      thenableState$1 = null;
    }
    function mountWorkInProgressHook() {
      var hook = {
        memoizedState: null,
        baseState: null,
        baseQueue: null,
        queue: null,
        next: null
      };
      workInProgressHook === null ? currentlyRenderingFiber.memoizedState = workInProgressHook = hook : workInProgressHook = workInProgressHook.next = hook;
      return workInProgressHook;
    }
    function updateWorkInProgressHook() {
      if (currentHook === null) {
        var nextCurrentHook = currentlyRenderingFiber.alternate;
        nextCurrentHook = nextCurrentHook !== null ? nextCurrentHook.memoizedState : null;
      } else
        nextCurrentHook = currentHook.next;
      var nextWorkInProgressHook = workInProgressHook === null ? currentlyRenderingFiber.memoizedState : workInProgressHook.next;
      if (nextWorkInProgressHook !== null)
        workInProgressHook = nextWorkInProgressHook, currentHook = nextCurrentHook;
      else {
        if (nextCurrentHook === null) {
          if (currentlyRenderingFiber.alternate === null)
            throw Error("Update hook called on initial render. This is likely a bug in React. Please file an issue.");
          throw Error("Rendered more hooks than during the previous render.");
        }
        currentHook = nextCurrentHook;
        nextCurrentHook = {
          memoizedState: currentHook.memoizedState,
          baseState: currentHook.baseState,
          baseQueue: currentHook.baseQueue,
          queue: currentHook.queue,
          next: null
        };
        workInProgressHook === null ? currentlyRenderingFiber.memoizedState = workInProgressHook = nextCurrentHook : workInProgressHook = workInProgressHook.next = nextCurrentHook;
      }
      return workInProgressHook;
    }
    function createFunctionComponentUpdateQueue() {
      return { lastEffect: null, events: null, stores: null, memoCache: null };
    }
    function useThenable(thenable) {
      var index = thenableIndexCounter$1;
      thenableIndexCounter$1 += 1;
      thenableState$1 === null && (thenableState$1 = createThenableState());
      thenable = trackUsedThenable(thenableState$1, thenable, index);
      index = currentlyRenderingFiber;
      (workInProgressHook === null ? index.memoizedState : workInProgressHook.next) === null && (index = index.alternate, ReactSharedInternals.H = index !== null && index.memoizedState !== null ? HooksDispatcherOnUpdateInDEV : HooksDispatcherOnMountInDEV);
      return thenable;
    }
    function use(usable) {
      if (usable !== null && typeof usable === "object") {
        if (typeof usable.then === "function")
          return useThenable(usable);
        if (usable.$$typeof === REACT_CONTEXT_TYPE)
          return readContext(usable);
      }
      throw Error("An unsupported type was passed to use(): " + String(usable));
    }
    function useMemoCache(size) {
      var memoCache = null, updateQueue = currentlyRenderingFiber.updateQueue;
      updateQueue !== null && (memoCache = updateQueue.memoCache);
      if (memoCache == null) {
        var current2 = currentlyRenderingFiber.alternate;
        current2 !== null && (current2 = current2.updateQueue, current2 !== null && (current2 = current2.memoCache, current2 != null && (memoCache = {
          data: current2.data.map(function(array) {
            return array.slice();
          }),
          index: 0
        })));
      }
      memoCache == null && (memoCache = { data: [], index: 0 });
      updateQueue === null && (updateQueue = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = updateQueue);
      updateQueue.memoCache = memoCache;
      updateQueue = memoCache.data[memoCache.index];
      if (updateQueue === undefined || ignorePreviousDependencies)
        for (updateQueue = memoCache.data[memoCache.index] = Array(size), current2 = 0;current2 < size; current2++)
          updateQueue[current2] = REACT_MEMO_CACHE_SENTINEL;
      else
        updateQueue.length !== size && console.error("Expected a constant size argument for each invocation of useMemoCache. The previous cache was allocated with size %s but size %s was requested.", updateQueue.length, size);
      memoCache.index++;
      return updateQueue;
    }
    function basicStateReducer(state, action) {
      return typeof action === "function" ? action(state) : action;
    }
    function mountReducer(reducer, initialArg, init) {
      var hook = mountWorkInProgressHook();
      if (init !== undefined) {
        var initialState = init(initialArg);
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(true);
          try {
            init(initialArg);
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
      } else
        initialState = initialArg;
      hook.memoizedState = hook.baseState = initialState;
      reducer = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState
      };
      hook.queue = reducer;
      reducer = reducer.dispatch = dispatchReducerAction.bind(null, currentlyRenderingFiber, reducer);
      return [hook.memoizedState, reducer];
    }
    function updateReducer(reducer) {
      var hook = updateWorkInProgressHook();
      return updateReducerImpl(hook, currentHook, reducer);
    }
    function updateReducerImpl(hook, current2, reducer) {
      var queue = hook.queue;
      if (queue === null)
        throw Error("Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)");
      queue.lastRenderedReducer = reducer;
      var baseQueue = hook.baseQueue, pendingQueue = queue.pending;
      if (pendingQueue !== null) {
        if (baseQueue !== null) {
          var baseFirst = baseQueue.next;
          baseQueue.next = pendingQueue.next;
          pendingQueue.next = baseFirst;
        }
        current2.baseQueue !== baseQueue && console.error("Internal error: Expected work-in-progress queue to be a clone. This is a bug in React.");
        current2.baseQueue = baseQueue = pendingQueue;
        queue.pending = null;
      }
      pendingQueue = hook.baseState;
      if (baseQueue === null)
        hook.memoizedState = pendingQueue;
      else {
        current2 = baseQueue.next;
        var newBaseQueueFirst = baseFirst = null, newBaseQueueLast = null, update = current2, didReadFromEntangledAsyncAction2 = false;
        do {
          var updateLane = update.lane & -536870913;
          if (updateLane !== update.lane ? (workInProgressRootRenderLanes & updateLane) === updateLane : (renderLanes & updateLane) === updateLane) {
            var revertLane = update.revertLane;
            if (revertLane === 0)
              newBaseQueueLast !== null && (newBaseQueueLast = newBaseQueueLast.next = {
                lane: 0,
                revertLane: 0,
                action: update.action,
                hasEagerState: update.hasEagerState,
                eagerState: update.eagerState,
                next: null
              }), updateLane === currentEntangledLane && (didReadFromEntangledAsyncAction2 = true);
            else if ((renderLanes & revertLane) === revertLane) {
              update = update.next;
              revertLane === currentEntangledLane && (didReadFromEntangledAsyncAction2 = true);
              continue;
            } else
              updateLane = {
                lane: 0,
                revertLane: update.revertLane,
                action: update.action,
                hasEagerState: update.hasEagerState,
                eagerState: update.eagerState,
                next: null
              }, newBaseQueueLast === null ? (newBaseQueueFirst = newBaseQueueLast = updateLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = updateLane, currentlyRenderingFiber.lanes |= revertLane, workInProgressRootSkippedLanes |= revertLane;
            updateLane = update.action;
            shouldDoubleInvokeUserFnsInHooksDEV && reducer(pendingQueue, updateLane);
            pendingQueue = update.hasEagerState ? update.eagerState : reducer(pendingQueue, updateLane);
          } else
            revertLane = {
              lane: updateLane,
              revertLane: update.revertLane,
              action: update.action,
              hasEagerState: update.hasEagerState,
              eagerState: update.eagerState,
              next: null
            }, newBaseQueueLast === null ? (newBaseQueueFirst = newBaseQueueLast = revertLane, baseFirst = pendingQueue) : newBaseQueueLast = newBaseQueueLast.next = revertLane, currentlyRenderingFiber.lanes |= updateLane, workInProgressRootSkippedLanes |= updateLane;
          update = update.next;
        } while (update !== null && update !== current2);
        newBaseQueueLast === null ? baseFirst = pendingQueue : newBaseQueueLast.next = newBaseQueueFirst;
        if (!objectIs(pendingQueue, hook.memoizedState) && (didReceiveUpdate = true, didReadFromEntangledAsyncAction2 && (reducer = currentEntangledActionThenable, reducer !== null)))
          throw reducer;
        hook.memoizedState = pendingQueue;
        hook.baseState = baseFirst;
        hook.baseQueue = newBaseQueueLast;
        queue.lastRenderedState = pendingQueue;
      }
      baseQueue === null && (queue.lanes = 0);
      return [hook.memoizedState, queue.dispatch];
    }
    function rerenderReducer(reducer) {
      var hook = updateWorkInProgressHook(), queue = hook.queue;
      if (queue === null)
        throw Error("Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)");
      queue.lastRenderedReducer = reducer;
      var { dispatch, pending: lastRenderPhaseUpdate } = queue, newState = hook.memoizedState;
      if (lastRenderPhaseUpdate !== null) {
        queue.pending = null;
        var update = lastRenderPhaseUpdate = lastRenderPhaseUpdate.next;
        do
          newState = reducer(newState, update.action), update = update.next;
        while (update !== lastRenderPhaseUpdate);
        objectIs(newState, hook.memoizedState) || (didReceiveUpdate = true);
        hook.memoizedState = newState;
        hook.baseQueue === null && (hook.baseState = newState);
        queue.lastRenderedState = newState;
      }
      return [newState, dispatch];
    }
    function mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
      var fiber = currentlyRenderingFiber, hook = mountWorkInProgressHook();
      if (isHydrating) {
        if (getServerSnapshot === undefined)
          throw Error("Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.");
        var nextSnapshot = getServerSnapshot();
        didWarnUncachedGetSnapshot || nextSnapshot === getServerSnapshot() || (console.error("The result of getServerSnapshot should be cached to avoid an infinite loop"), didWarnUncachedGetSnapshot = true);
      } else {
        nextSnapshot = getSnapshot();
        didWarnUncachedGetSnapshot || (getServerSnapshot = getSnapshot(), objectIs(nextSnapshot, getServerSnapshot) || (console.error("The result of getSnapshot should be cached to avoid an infinite loop"), didWarnUncachedGetSnapshot = true));
        if (workInProgressRoot === null)
          throw Error("Expected a work-in-progress root. This is a bug in React. Please file an issue.");
        (workInProgressRootRenderLanes & 124) !== 0 || pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
      }
      hook.memoizedState = nextSnapshot;
      getServerSnapshot = { value: nextSnapshot, getSnapshot };
      hook.queue = getServerSnapshot;
      mountEffect(subscribeToStore.bind(null, fiber, getServerSnapshot, subscribe), [subscribe]);
      fiber.flags |= 2048;
      pushSimpleEffect(HasEffect | Passive, createEffectInstance(), updateStoreInstance.bind(null, fiber, getServerSnapshot, nextSnapshot, getSnapshot), null);
      return nextSnapshot;
    }
    function updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
      var fiber = currentlyRenderingFiber, hook = updateWorkInProgressHook(), isHydrating$jscomp$0 = isHydrating;
      if (isHydrating$jscomp$0) {
        if (getServerSnapshot === undefined)
          throw Error("Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering.");
        getServerSnapshot = getServerSnapshot();
      } else if (getServerSnapshot = getSnapshot(), !didWarnUncachedGetSnapshot) {
        var cachedSnapshot = getSnapshot();
        objectIs(getServerSnapshot, cachedSnapshot) || (console.error("The result of getSnapshot should be cached to avoid an infinite loop"), didWarnUncachedGetSnapshot = true);
      }
      if (cachedSnapshot = !objectIs((currentHook || hook).memoizedState, getServerSnapshot))
        hook.memoizedState = getServerSnapshot, didReceiveUpdate = true;
      hook = hook.queue;
      var create = subscribeToStore.bind(null, fiber, hook, subscribe);
      updateEffectImpl(2048, Passive, create, [subscribe]);
      if (hook.getSnapshot !== getSnapshot || cachedSnapshot || workInProgressHook !== null && workInProgressHook.memoizedState.tag & HasEffect) {
        fiber.flags |= 2048;
        pushSimpleEffect(HasEffect | Passive, createEffectInstance(), updateStoreInstance.bind(null, fiber, hook, getServerSnapshot, getSnapshot), null);
        if (workInProgressRoot === null)
          throw Error("Expected a work-in-progress root. This is a bug in React. Please file an issue.");
        isHydrating$jscomp$0 || (renderLanes & 124) !== 0 || pushStoreConsistencyCheck(fiber, getSnapshot, getServerSnapshot);
      }
      return getServerSnapshot;
    }
    function pushStoreConsistencyCheck(fiber, getSnapshot, renderedSnapshot) {
      fiber.flags |= 16384;
      fiber = { getSnapshot, value: renderedSnapshot };
      getSnapshot = currentlyRenderingFiber.updateQueue;
      getSnapshot === null ? (getSnapshot = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = getSnapshot, getSnapshot.stores = [fiber]) : (renderedSnapshot = getSnapshot.stores, renderedSnapshot === null ? getSnapshot.stores = [fiber] : renderedSnapshot.push(fiber));
    }
    function updateStoreInstance(fiber, inst, nextSnapshot, getSnapshot) {
      inst.value = nextSnapshot;
      inst.getSnapshot = getSnapshot;
      checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
    }
    function subscribeToStore(fiber, inst, subscribe) {
      return subscribe(function() {
        checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
      });
    }
    function checkIfSnapshotChanged(inst) {
      var latestGetSnapshot = inst.getSnapshot;
      inst = inst.value;
      try {
        var nextValue = latestGetSnapshot();
        return !objectIs(inst, nextValue);
      } catch (error) {
        return true;
      }
    }
    function forceStoreRerender(fiber) {
      var root = enqueueConcurrentRenderForLane(fiber, 2);
      root !== null && scheduleUpdateOnFiber(root, fiber, 2);
    }
    function mountStateImpl(initialState) {
      var hook = mountWorkInProgressHook();
      if (typeof initialState === "function") {
        var initialStateInitializer = initialState;
        initialState = initialStateInitializer();
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(true);
          try {
            initialStateInitializer();
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
      }
      hook.memoizedState = hook.baseState = initialState;
      hook.queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: basicStateReducer,
        lastRenderedState: initialState
      };
      return hook;
    }
    function mountState(initialState) {
      initialState = mountStateImpl(initialState);
      var queue = initialState.queue, dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
      queue.dispatch = dispatch;
      return [initialState.memoizedState, dispatch];
    }
    function mountOptimistic(passthrough) {
      var hook = mountWorkInProgressHook();
      hook.memoizedState = hook.baseState = passthrough;
      var queue = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: null,
        lastRenderedState: null
      };
      hook.queue = queue;
      hook = dispatchOptimisticSetState.bind(null, currentlyRenderingFiber, true, queue);
      queue.dispatch = hook;
      return [passthrough, hook];
    }
    function updateOptimistic(passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    }
    function updateOptimisticImpl(hook, current2, passthrough, reducer) {
      hook.baseState = passthrough;
      return updateReducerImpl(hook, currentHook, typeof reducer === "function" ? reducer : basicStateReducer);
    }
    function rerenderOptimistic(passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      if (currentHook !== null)
        return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
      hook.baseState = passthrough;
      return [passthrough, hook.queue.dispatch];
    }
    function dispatchActionState(fiber, actionQueue, setPendingState, setState, payload) {
      if (isRenderPhaseUpdate(fiber))
        throw Error("Cannot update form state while rendering.");
      fiber = actionQueue.action;
      if (fiber !== null) {
        var actionNode = {
          payload,
          action: fiber,
          next: null,
          isTransition: true,
          status: "pending",
          value: null,
          reason: null,
          listeners: [],
          then: function(listener) {
            actionNode.listeners.push(listener);
          }
        };
        ReactSharedInternals.T !== null ? setPendingState(true) : actionNode.isTransition = false;
        setState(actionNode);
        setPendingState = actionQueue.pending;
        setPendingState === null ? (actionNode.next = actionQueue.pending = actionNode, runActionStateAction(actionQueue, actionNode)) : (actionNode.next = setPendingState.next, actionQueue.pending = setPendingState.next = actionNode);
      }
    }
    function runActionStateAction(actionQueue, node) {
      var { action, payload } = node, prevState = actionQueue.state;
      if (node.isTransition) {
        var prevTransition = ReactSharedInternals.T, currentTransition = {};
        ReactSharedInternals.T = currentTransition;
        ReactSharedInternals.T._updatedFibers = new Set;
        try {
          var returnValue = action(prevState, payload), onStartTransitionFinish = ReactSharedInternals.S;
          onStartTransitionFinish !== null && onStartTransitionFinish(currentTransition, returnValue);
          handleActionReturnValue(actionQueue, node, returnValue);
        } catch (error) {
          onActionError(actionQueue, node, error);
        } finally {
          ReactSharedInternals.T = prevTransition, prevTransition === null && currentTransition._updatedFibers && (actionQueue = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < actionQueue && console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."));
        }
      } else
        try {
          currentTransition = action(prevState, payload), handleActionReturnValue(actionQueue, node, currentTransition);
        } catch (error$2) {
          onActionError(actionQueue, node, error$2);
        }
    }
    function handleActionReturnValue(actionQueue, node, returnValue) {
      returnValue !== null && typeof returnValue === "object" && typeof returnValue.then === "function" ? (returnValue.then(function(nextState) {
        onActionSuccess(actionQueue, node, nextState);
      }, function(error) {
        return onActionError(actionQueue, node, error);
      }), node.isTransition || console.error("An async function with useActionState was called outside of a transition. This is likely not what you intended (for example, isPending will not update correctly). Either call the returned function inside startTransition, or pass it to an `action` or `formAction` prop.")) : onActionSuccess(actionQueue, node, returnValue);
    }
    function onActionSuccess(actionQueue, actionNode, nextState) {
      actionNode.status = "fulfilled";
      actionNode.value = nextState;
      notifyActionListeners(actionNode);
      actionQueue.state = nextState;
      actionNode = actionQueue.pending;
      actionNode !== null && (nextState = actionNode.next, nextState === actionNode ? actionQueue.pending = null : (nextState = nextState.next, actionNode.next = nextState, runActionStateAction(actionQueue, nextState)));
    }
    function onActionError(actionQueue, actionNode, error) {
      var last = actionQueue.pending;
      actionQueue.pending = null;
      if (last !== null) {
        last = last.next;
        do
          actionNode.status = "rejected", actionNode.reason = error, notifyActionListeners(actionNode), actionNode = actionNode.next;
        while (actionNode !== last);
      }
      actionQueue.action = null;
    }
    function notifyActionListeners(actionNode) {
      actionNode = actionNode.listeners;
      for (var i = 0;i < actionNode.length; i++)
        (0, actionNode[i])();
    }
    function actionStateReducer(oldState, newState) {
      return newState;
    }
    function mountActionState(action, initialStateProp) {
      if (isHydrating) {
        var ssrFormState = workInProgressRoot.formState;
        if (ssrFormState !== null) {
          a: {
            var isMatching = currentlyRenderingFiber;
            if (isHydrating) {
              if (nextHydratableInstance) {
                var markerInstance = canHydrateFormStateMarker(nextHydratableInstance, rootOrSingletonContext);
                if (markerInstance) {
                  nextHydratableInstance = getNextHydratableSibling(markerInstance);
                  isMatching = isFormStateMarkerMatching(markerInstance);
                  break a;
                }
              }
              throwOnHydrationMismatch(isMatching);
            }
            isMatching = false;
          }
          isMatching && (initialStateProp = ssrFormState[0]);
        }
      }
      ssrFormState = mountWorkInProgressHook();
      ssrFormState.memoizedState = ssrFormState.baseState = initialStateProp;
      isMatching = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: actionStateReducer,
        lastRenderedState: initialStateProp
      };
      ssrFormState.queue = isMatching;
      ssrFormState = dispatchSetState.bind(null, currentlyRenderingFiber, isMatching);
      isMatching.dispatch = ssrFormState;
      isMatching = mountStateImpl(false);
      var setPendingState = dispatchOptimisticSetState.bind(null, currentlyRenderingFiber, false, isMatching.queue);
      isMatching = mountWorkInProgressHook();
      markerInstance = {
        state: initialStateProp,
        dispatch: null,
        action,
        pending: null
      };
      isMatching.queue = markerInstance;
      ssrFormState = dispatchActionState.bind(null, currentlyRenderingFiber, markerInstance, setPendingState, ssrFormState);
      markerInstance.dispatch = ssrFormState;
      isMatching.memoizedState = action;
      return [initialStateProp, ssrFormState, false];
    }
    function updateActionState(action) {
      var stateHook = updateWorkInProgressHook();
      return updateActionStateImpl(stateHook, currentHook, action);
    }
    function updateActionStateImpl(stateHook, currentStateHook, action) {
      currentStateHook = updateReducerImpl(stateHook, currentStateHook, actionStateReducer)[0];
      stateHook = updateReducer(basicStateReducer)[0];
      if (typeof currentStateHook === "object" && currentStateHook !== null && typeof currentStateHook.then === "function")
        try {
          var state = useThenable(currentStateHook);
        } catch (x) {
          if (x === SuspenseException)
            throw SuspenseActionException;
          throw x;
        }
      else
        state = currentStateHook;
      currentStateHook = updateWorkInProgressHook();
      var actionQueue = currentStateHook.queue, dispatch = actionQueue.dispatch;
      action !== currentStateHook.memoizedState && (currentlyRenderingFiber.flags |= 2048, pushSimpleEffect(HasEffect | Passive, createEffectInstance(), actionStateActionEffect.bind(null, actionQueue, action), null));
      return [state, dispatch, stateHook];
    }
    function actionStateActionEffect(actionQueue, action) {
      actionQueue.action = action;
    }
    function rerenderActionState(action) {
      var stateHook = updateWorkInProgressHook(), currentStateHook = currentHook;
      if (currentStateHook !== null)
        return updateActionStateImpl(stateHook, currentStateHook, action);
      updateWorkInProgressHook();
      stateHook = stateHook.memoizedState;
      currentStateHook = updateWorkInProgressHook();
      var dispatch = currentStateHook.queue.dispatch;
      currentStateHook.memoizedState = action;
      return [stateHook, dispatch, false];
    }
    function pushSimpleEffect(tag, inst, create, createDeps) {
      tag = {
        tag,
        create,
        deps: createDeps,
        inst,
        next: null
      };
      inst = currentlyRenderingFiber.updateQueue;
      inst === null && (inst = createFunctionComponentUpdateQueue(), currentlyRenderingFiber.updateQueue = inst);
      create = inst.lastEffect;
      create === null ? inst.lastEffect = tag.next = tag : (createDeps = create.next, create.next = tag, tag.next = createDeps, inst.lastEffect = tag);
      return tag;
    }
    function createEffectInstance() {
      return { destroy: undefined, resource: undefined };
    }
    function mountRef(initialValue) {
      var hook = mountWorkInProgressHook();
      initialValue = { current: initialValue };
      return hook.memoizedState = initialValue;
    }
    function mountEffectImpl(fiberFlags, hookFlags, create, createDeps) {
      var hook = mountWorkInProgressHook();
      createDeps = createDeps === undefined ? null : createDeps;
      currentlyRenderingFiber.flags |= fiberFlags;
      hook.memoizedState = pushSimpleEffect(HasEffect | hookFlags, createEffectInstance(), create, createDeps);
    }
    function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
      var hook = updateWorkInProgressHook();
      deps = deps === undefined ? null : deps;
      var inst = hook.memoizedState.inst;
      currentHook !== null && deps !== null && areHookInputsEqual(deps, currentHook.memoizedState.deps) ? hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, deps) : (currentlyRenderingFiber.flags |= fiberFlags, hook.memoizedState = pushSimpleEffect(HasEffect | hookFlags, inst, create, deps));
    }
    function mountEffect(create, createDeps) {
      (currentlyRenderingFiber.mode & 16) !== NoMode && (currentlyRenderingFiber.mode & 64) === NoMode ? mountEffectImpl(276826112, Passive, create, createDeps) : mountEffectImpl(8390656, Passive, create, createDeps);
    }
    function mountLayoutEffect(create, deps) {
      var fiberFlags = 4194308;
      (currentlyRenderingFiber.mode & 16) !== NoMode && (fiberFlags |= 134217728);
      return mountEffectImpl(fiberFlags, Layout, create, deps);
    }
    function imperativeHandleEffect(create, ref) {
      if (typeof ref === "function") {
        create = create();
        var refCleanup = ref(create);
        return function() {
          typeof refCleanup === "function" ? refCleanup() : ref(null);
        };
      }
      if (ref !== null && ref !== undefined)
        return ref.hasOwnProperty("current") || console.error("Expected useImperativeHandle() first argument to either be a ref callback or React.createRef() object. Instead received: %s.", "an object with keys {" + Object.keys(ref).join(", ") + "}"), create = create(), ref.current = create, function() {
          ref.current = null;
        };
    }
    function mountImperativeHandle(ref, create, deps) {
      typeof create !== "function" && console.error("Expected useImperativeHandle() second argument to be a function that creates a handle. Instead received: %s.", create !== null ? typeof create : "null");
      deps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
      var fiberFlags = 4194308;
      (currentlyRenderingFiber.mode & 16) !== NoMode && (fiberFlags |= 134217728);
      mountEffectImpl(fiberFlags, Layout, imperativeHandleEffect.bind(null, create, ref), deps);
    }
    function updateImperativeHandle(ref, create, deps) {
      typeof create !== "function" && console.error("Expected useImperativeHandle() second argument to be a function that creates a handle. Instead received: %s.", create !== null ? typeof create : "null");
      deps = deps !== null && deps !== undefined ? deps.concat([ref]) : null;
      updateEffectImpl(4, Layout, imperativeHandleEffect.bind(null, create, ref), deps);
    }
    function mountCallback(callback, deps) {
      mountWorkInProgressHook().memoizedState = [
        callback,
        deps === undefined ? null : deps
      ];
      return callback;
    }
    function updateCallback(callback, deps) {
      var hook = updateWorkInProgressHook();
      deps = deps === undefined ? null : deps;
      var prevState = hook.memoizedState;
      if (deps !== null && areHookInputsEqual(deps, prevState[1]))
        return prevState[0];
      hook.memoizedState = [callback, deps];
      return callback;
    }
    function mountMemo(nextCreate, deps) {
      var hook = mountWorkInProgressHook();
      deps = deps === undefined ? null : deps;
      var nextValue = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
      hook.memoizedState = [nextValue, deps];
      return nextValue;
    }
    function updateMemo(nextCreate, deps) {
      var hook = updateWorkInProgressHook();
      deps = deps === undefined ? null : deps;
      var prevState = hook.memoizedState;
      if (deps !== null && areHookInputsEqual(deps, prevState[1]))
        return prevState[0];
      prevState = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(true);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
      hook.memoizedState = [prevState, deps];
      return prevState;
    }
    function mountDeferredValue(value, initialValue) {
      var hook = mountWorkInProgressHook();
      return mountDeferredValueImpl(hook, value, initialValue);
    }
    function updateDeferredValue(value, initialValue) {
      var hook = updateWorkInProgressHook();
      return updateDeferredValueImpl(hook, currentHook.memoizedState, value, initialValue);
    }
    function rerenderDeferredValue(value, initialValue) {
      var hook = updateWorkInProgressHook();
      return currentHook === null ? mountDeferredValueImpl(hook, value, initialValue) : updateDeferredValueImpl(hook, currentHook.memoizedState, value, initialValue);
    }
    function mountDeferredValueImpl(hook, value, initialValue) {
      if (initialValue === undefined || (renderLanes & 1073741824) !== 0)
        return hook.memoizedState = value;
      hook.memoizedState = initialValue;
      hook = requestDeferredLane();
      currentlyRenderingFiber.lanes |= hook;
      workInProgressRootSkippedLanes |= hook;
      return initialValue;
    }
    function updateDeferredValueImpl(hook, prevValue, value, initialValue) {
      if (objectIs(value, prevValue))
        return value;
      if (currentTreeHiddenStackCursor.current !== null)
        return hook = mountDeferredValueImpl(hook, value, initialValue), objectIs(hook, prevValue) || (didReceiveUpdate = true), hook;
      if ((renderLanes & 42) === 0)
        return didReceiveUpdate = true, hook.memoizedState = value;
      hook = requestDeferredLane();
      currentlyRenderingFiber.lanes |= hook;
      workInProgressRootSkippedLanes |= hook;
      return prevValue;
    }
    function startTransition(fiber, queue, pendingState, finishedState, callback) {
      var previousPriority = getCurrentUpdatePriority();
      setCurrentUpdatePriority(previousPriority !== 0 && 8 > previousPriority ? previousPriority : 8);
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      dispatchOptimisticSetState(fiber, false, queue, pendingState);
      currentTransition._updatedFibers = new Set;
      try {
        var returnValue = callback(), onStartTransitionFinish = ReactSharedInternals.S;
        onStartTransitionFinish !== null && onStartTransitionFinish(currentTransition, returnValue);
        if (returnValue !== null && typeof returnValue === "object" && typeof returnValue.then === "function") {
          var thenableForFinishedState = chainThenableValue(returnValue, finishedState);
          dispatchSetStateInternal(fiber, queue, thenableForFinishedState, requestUpdateLane(fiber));
        } else
          dispatchSetStateInternal(fiber, queue, finishedState, requestUpdateLane(fiber));
      } catch (error) {
        dispatchSetStateInternal(fiber, queue, { then: function() {}, status: "rejected", reason: error }, requestUpdateLane(fiber));
      } finally {
        setCurrentUpdatePriority(previousPriority), ReactSharedInternals.T = prevTransition, prevTransition === null && currentTransition._updatedFibers && (fiber = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < fiber && console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table."));
      }
    }
    function ensureFormComponentIsStateful(formFiber) {
      var existingStateHook = formFiber.memoizedState;
      if (existingStateHook !== null)
        return existingStateHook;
      existingStateHook = {
        memoizedState: NotPendingTransition,
        baseState: NotPendingTransition,
        baseQueue: null,
        queue: {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: basicStateReducer,
          lastRenderedState: NotPendingTransition
        },
        next: null
      };
      var initialResetState = {};
      existingStateHook.next = {
        memoizedState: initialResetState,
        baseState: initialResetState,
        baseQueue: null,
        queue: {
          pending: null,
          lanes: 0,
          dispatch: null,
          lastRenderedReducer: basicStateReducer,
          lastRenderedState: initialResetState
        },
        next: null
      };
      formFiber.memoizedState = existingStateHook;
      formFiber = formFiber.alternate;
      formFiber !== null && (formFiber.memoizedState = existingStateHook);
      return existingStateHook;
    }
    function mountTransition() {
      var stateHook = mountStateImpl(false);
      stateHook = startTransition.bind(null, currentlyRenderingFiber, stateHook.queue, true, false);
      mountWorkInProgressHook().memoizedState = stateHook;
      return [false, stateHook];
    }
    function updateTransition() {
      var booleanOrThenable = updateReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
      return [
        typeof booleanOrThenable === "boolean" ? booleanOrThenable : useThenable(booleanOrThenable),
        start
      ];
    }
    function rerenderTransition() {
      var booleanOrThenable = rerenderReducer(basicStateReducer)[0], start = updateWorkInProgressHook().memoizedState;
      return [
        typeof booleanOrThenable === "boolean" ? booleanOrThenable : useThenable(booleanOrThenable),
        start
      ];
    }
    function useHostTransitionStatus() {
      return readContext(HostTransitionContext);
    }
    function mountId() {
      var hook = mountWorkInProgressHook(), identifierPrefix = workInProgressRoot.identifierPrefix;
      if (isHydrating) {
        var treeId = treeContextOverflow;
        var idWithLeadingBit = treeContextId;
        treeId = (idWithLeadingBit & ~(1 << 32 - clz32(idWithLeadingBit) - 1)).toString(32) + treeId;
        identifierPrefix = "«" + identifierPrefix + "R" + treeId;
        treeId = localIdCounter++;
        0 < treeId && (identifierPrefix += "H" + treeId.toString(32));
        identifierPrefix += "»";
      } else
        treeId = globalClientIdCounter++, identifierPrefix = "«" + identifierPrefix + "r" + treeId.toString(32) + "»";
      return hook.memoizedState = identifierPrefix;
    }
    function mountRefresh() {
      return mountWorkInProgressHook().memoizedState = refreshCache.bind(null, currentlyRenderingFiber);
    }
    function refreshCache(fiber, seedKey) {
      for (var provider = fiber.return;provider !== null; ) {
        switch (provider.tag) {
          case 24:
          case 3:
            var lane = requestUpdateLane(provider);
            fiber = createUpdate(lane);
            var root = enqueueUpdate(provider, fiber, lane);
            root !== null && (scheduleUpdateOnFiber(root, provider, lane), entangleTransitions(root, provider, lane));
            provider = createCache();
            seedKey !== null && seedKey !== undefined && root !== null && console.error("The seed argument is not enabled outside experimental channels.");
            fiber.payload = { cache: provider };
            return;
        }
        provider = provider.return;
      }
    }
    function dispatchReducerAction(fiber, queue, action) {
      var args = arguments;
      typeof args[3] === "function" && console.error("State updates from the useState() and useReducer() Hooks don't support the second callback argument. To execute a side effect after rendering, declare it in the component body with useEffect().");
      args = requestUpdateLane(fiber);
      var update = {
        lane: args,
        revertLane: 0,
        action,
        hasEagerState: false,
        eagerState: null,
        next: null
      };
      isRenderPhaseUpdate(fiber) ? enqueueRenderPhaseUpdate(queue, update) : (update = enqueueConcurrentHookUpdate(fiber, queue, update, args), update !== null && (scheduleUpdateOnFiber(update, fiber, args), entangleTransitionUpdate(update, queue, args)));
      markStateUpdateScheduled(fiber, args);
    }
    function dispatchSetState(fiber, queue, action) {
      var args = arguments;
      typeof args[3] === "function" && console.error("State updates from the useState() and useReducer() Hooks don't support the second callback argument. To execute a side effect after rendering, declare it in the component body with useEffect().");
      args = requestUpdateLane(fiber);
      dispatchSetStateInternal(fiber, queue, action, args);
      markStateUpdateScheduled(fiber, args);
    }
    function dispatchSetStateInternal(fiber, queue, action, lane) {
      var update = {
        lane,
        revertLane: 0,
        action,
        hasEagerState: false,
        eagerState: null,
        next: null
      };
      if (isRenderPhaseUpdate(fiber))
        enqueueRenderPhaseUpdate(queue, update);
      else {
        var alternate = fiber.alternate;
        if (fiber.lanes === 0 && (alternate === null || alternate.lanes === 0) && (alternate = queue.lastRenderedReducer, alternate !== null)) {
          var prevDispatcher = ReactSharedInternals.H;
          ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
          try {
            var currentState = queue.lastRenderedState, eagerState = alternate(currentState, action);
            update.hasEagerState = true;
            update.eagerState = eagerState;
            if (objectIs(eagerState, currentState))
              return enqueueUpdate$1(fiber, queue, update, 0), workInProgressRoot === null && finishQueueingConcurrentUpdates(), false;
          } catch (error) {} finally {
            ReactSharedInternals.H = prevDispatcher;
          }
        }
        action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
        if (action !== null)
          return scheduleUpdateOnFiber(action, fiber, lane), entangleTransitionUpdate(action, queue, lane), true;
      }
      return false;
    }
    function dispatchOptimisticSetState(fiber, throwIfDuringRender, queue, action) {
      ReactSharedInternals.T === null && currentEntangledLane === 0 && console.error("An optimistic state update occurred outside a transition or action. To fix, move the update to an action, or wrap with startTransition.");
      action = {
        lane: 2,
        revertLane: requestTransitionLane(),
        action,
        hasEagerState: false,
        eagerState: null,
        next: null
      };
      if (isRenderPhaseUpdate(fiber)) {
        if (throwIfDuringRender)
          throw Error("Cannot update optimistic state while rendering.");
        console.error("Cannot call startTransition while rendering.");
      } else
        throwIfDuringRender = enqueueConcurrentHookUpdate(fiber, queue, action, 2), throwIfDuringRender !== null && scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
      markStateUpdateScheduled(fiber, 2);
    }
    function isRenderPhaseUpdate(fiber) {
      var alternate = fiber.alternate;
      return fiber === currentlyRenderingFiber || alternate !== null && alternate === currentlyRenderingFiber;
    }
    function enqueueRenderPhaseUpdate(queue, update) {
      didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate = true;
      var pending = queue.pending;
      pending === null ? update.next = update : (update.next = pending.next, pending.next = update);
      queue.pending = update;
    }
    function entangleTransitionUpdate(root, queue, lane) {
      if ((lane & 4194048) !== 0) {
        var queueLanes = queue.lanes;
        queueLanes &= root.pendingLanes;
        lane |= queueLanes;
        queue.lanes = lane;
        markRootEntangled(root, lane);
      }
    }
    function pushDebugInfo(debugInfo) {
      var previousDebugInfo = currentDebugInfo;
      debugInfo != null && (currentDebugInfo = previousDebugInfo === null ? debugInfo : previousDebugInfo.concat(debugInfo));
      return previousDebugInfo;
    }
    function validateFragmentProps(element, fiber, returnFiber) {
      for (var keys = Object.keys(element.props), i = 0;i < keys.length; i++) {
        var key = keys[i];
        if (key !== "children" && key !== "key") {
          fiber === null && (fiber = createFiberFromElement(element, returnFiber.mode, 0), fiber._debugInfo = currentDebugInfo, fiber.return = returnFiber);
          runWithFiberInDEV(fiber, function(erroredKey) {
            console.error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", erroredKey);
          }, key);
          break;
        }
      }
    }
    function unwrapThenable(thenable) {
      var index = thenableIndexCounter;
      thenableIndexCounter += 1;
      thenableState === null && (thenableState = createThenableState());
      return trackUsedThenable(thenableState, thenable, index);
    }
    function coerceRef(workInProgress2, element) {
      element = element.props.ref;
      workInProgress2.ref = element !== undefined ? element : null;
    }
    function throwOnInvalidObjectType(returnFiber, newChild) {
      if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE)
        throw Error(`A React Element from an older version of React was rendered. This is not supported. It can happen if:
- Multiple copies of the "react" package is used.
- A library pre-bundled an old copy of "react" or "react/jsx-runtime".
- A compiler tries to "inline" JSX instead of using the runtime.`);
      returnFiber = Object.prototype.toString.call(newChild);
      throw Error("Objects are not valid as a React child (found: " + (returnFiber === "[object Object]" ? "object with keys {" + Object.keys(newChild).join(", ") + "}" : returnFiber) + "). If you meant to render a collection of children, use an array instead.");
    }
    function warnOnFunctionType(returnFiber, invalidChild) {
      var parentName = getComponentNameFromFiber(returnFiber) || "Component";
      ownerHasFunctionTypeWarning[parentName] || (ownerHasFunctionTypeWarning[parentName] = true, invalidChild = invalidChild.displayName || invalidChild.name || "Component", returnFiber.tag === 3 ? console.error(`Functions are not valid as a React child. This may happen if you return %s instead of <%s /> from render. Or maybe you meant to call this function rather than return it.
  root.render(%s)`, invalidChild, invalidChild, invalidChild) : console.error(`Functions are not valid as a React child. This may happen if you return %s instead of <%s /> from render. Or maybe you meant to call this function rather than return it.
  <%s>{%s}</%s>`, invalidChild, invalidChild, parentName, invalidChild, parentName));
    }
    function warnOnSymbolType(returnFiber, invalidChild) {
      var parentName = getComponentNameFromFiber(returnFiber) || "Component";
      ownerHasSymbolTypeWarning[parentName] || (ownerHasSymbolTypeWarning[parentName] = true, invalidChild = String(invalidChild), returnFiber.tag === 3 ? console.error(`Symbols are not valid as a React child.
  root.render(%s)`, invalidChild) : console.error(`Symbols are not valid as a React child.
  <%s>%s</%s>`, parentName, invalidChild, parentName));
    }
    function createChildReconciler(shouldTrackSideEffects) {
      function deleteChild(returnFiber, childToDelete) {
        if (shouldTrackSideEffects) {
          var deletions = returnFiber.deletions;
          deletions === null ? (returnFiber.deletions = [childToDelete], returnFiber.flags |= 16) : deletions.push(childToDelete);
        }
      }
      function deleteRemainingChildren(returnFiber, currentFirstChild) {
        if (!shouldTrackSideEffects)
          return null;
        for (;currentFirstChild !== null; )
          deleteChild(returnFiber, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
        return null;
      }
      function mapRemainingChildren(currentFirstChild) {
        for (var existingChildren = new Map;currentFirstChild !== null; )
          currentFirstChild.key !== null ? existingChildren.set(currentFirstChild.key, currentFirstChild) : existingChildren.set(currentFirstChild.index, currentFirstChild), currentFirstChild = currentFirstChild.sibling;
        return existingChildren;
      }
      function useFiber(fiber, pendingProps) {
        fiber = createWorkInProgress(fiber, pendingProps);
        fiber.index = 0;
        fiber.sibling = null;
        return fiber;
      }
      function placeChild(newFiber, lastPlacedIndex, newIndex) {
        newFiber.index = newIndex;
        if (!shouldTrackSideEffects)
          return newFiber.flags |= 1048576, lastPlacedIndex;
        newIndex = newFiber.alternate;
        if (newIndex !== null)
          return newIndex = newIndex.index, newIndex < lastPlacedIndex ? (newFiber.flags |= 67108866, lastPlacedIndex) : newIndex;
        newFiber.flags |= 67108866;
        return lastPlacedIndex;
      }
      function placeSingleChild(newFiber) {
        shouldTrackSideEffects && newFiber.alternate === null && (newFiber.flags |= 67108866);
        return newFiber;
      }
      function updateTextNode(returnFiber, current2, textContent, lanes) {
        if (current2 === null || current2.tag !== 6)
          return current2 = createFiberFromText(textContent, returnFiber.mode, lanes), current2.return = returnFiber, current2._debugOwner = returnFiber, current2._debugTask = returnFiber._debugTask, current2._debugInfo = currentDebugInfo, current2;
        current2 = useFiber(current2, textContent);
        current2.return = returnFiber;
        current2._debugInfo = currentDebugInfo;
        return current2;
      }
      function updateElement(returnFiber, current2, element, lanes) {
        var elementType = element.type;
        if (elementType === REACT_FRAGMENT_TYPE)
          return current2 = updateFragment(returnFiber, current2, element.props.children, lanes, element.key), validateFragmentProps(element, current2, returnFiber), current2;
        if (current2 !== null && (current2.elementType === elementType || isCompatibleFamilyForHotReloading(current2, element) || typeof elementType === "object" && elementType !== null && elementType.$$typeof === REACT_LAZY_TYPE && callLazyInitInDEV(elementType) === current2.type))
          return current2 = useFiber(current2, element.props), coerceRef(current2, element), current2.return = returnFiber, current2._debugOwner = element._owner, current2._debugInfo = currentDebugInfo, current2;
        current2 = createFiberFromElement(element, returnFiber.mode, lanes);
        coerceRef(current2, element);
        current2.return = returnFiber;
        current2._debugInfo = currentDebugInfo;
        return current2;
      }
      function updatePortal(returnFiber, current2, portal, lanes) {
        if (current2 === null || current2.tag !== 4 || current2.stateNode.containerInfo !== portal.containerInfo || current2.stateNode.implementation !== portal.implementation)
          return current2 = createFiberFromPortal(portal, returnFiber.mode, lanes), current2.return = returnFiber, current2._debugInfo = currentDebugInfo, current2;
        current2 = useFiber(current2, portal.children || []);
        current2.return = returnFiber;
        current2._debugInfo = currentDebugInfo;
        return current2;
      }
      function updateFragment(returnFiber, current2, fragment, lanes, key) {
        if (current2 === null || current2.tag !== 7)
          return current2 = createFiberFromFragment(fragment, returnFiber.mode, lanes, key), current2.return = returnFiber, current2._debugOwner = returnFiber, current2._debugTask = returnFiber._debugTask, current2._debugInfo = currentDebugInfo, current2;
        current2 = useFiber(current2, fragment);
        current2.return = returnFiber;
        current2._debugInfo = currentDebugInfo;
        return current2;
      }
      function createChild(returnFiber, newChild, lanes) {
        if (typeof newChild === "string" && newChild !== "" || typeof newChild === "number" || typeof newChild === "bigint")
          return newChild = createFiberFromText("" + newChild, returnFiber.mode, lanes), newChild.return = returnFiber, newChild._debugOwner = returnFiber, newChild._debugTask = returnFiber._debugTask, newChild._debugInfo = currentDebugInfo, newChild;
        if (typeof newChild === "object" && newChild !== null) {
          switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE:
              return lanes = createFiberFromElement(newChild, returnFiber.mode, lanes), coerceRef(lanes, newChild), lanes.return = returnFiber, returnFiber = pushDebugInfo(newChild._debugInfo), lanes._debugInfo = currentDebugInfo, currentDebugInfo = returnFiber, lanes;
            case REACT_PORTAL_TYPE:
              return newChild = createFiberFromPortal(newChild, returnFiber.mode, lanes), newChild.return = returnFiber, newChild._debugInfo = currentDebugInfo, newChild;
            case REACT_LAZY_TYPE:
              var _prevDebugInfo = pushDebugInfo(newChild._debugInfo);
              newChild = callLazyInitInDEV(newChild);
              returnFiber = createChild(returnFiber, newChild, lanes);
              currentDebugInfo = _prevDebugInfo;
              return returnFiber;
          }
          if (isArrayImpl(newChild) || getIteratorFn(newChild))
            return lanes = createFiberFromFragment(newChild, returnFiber.mode, lanes, null), lanes.return = returnFiber, lanes._debugOwner = returnFiber, lanes._debugTask = returnFiber._debugTask, returnFiber = pushDebugInfo(newChild._debugInfo), lanes._debugInfo = currentDebugInfo, currentDebugInfo = returnFiber, lanes;
          if (typeof newChild.then === "function")
            return _prevDebugInfo = pushDebugInfo(newChild._debugInfo), returnFiber = createChild(returnFiber, unwrapThenable(newChild), lanes), currentDebugInfo = _prevDebugInfo, returnFiber;
          if (newChild.$$typeof === REACT_CONTEXT_TYPE)
            return createChild(returnFiber, readContextDuringReconciliation(returnFiber, newChild), lanes);
          throwOnInvalidObjectType(returnFiber, newChild);
        }
        typeof newChild === "function" && warnOnFunctionType(returnFiber, newChild);
        typeof newChild === "symbol" && warnOnSymbolType(returnFiber, newChild);
        return null;
      }
      function updateSlot(returnFiber, oldFiber, newChild, lanes) {
        var key = oldFiber !== null ? oldFiber.key : null;
        if (typeof newChild === "string" && newChild !== "" || typeof newChild === "number" || typeof newChild === "bigint")
          return key !== null ? null : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
        if (typeof newChild === "object" && newChild !== null) {
          switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE:
              return newChild.key === key ? (key = pushDebugInfo(newChild._debugInfo), returnFiber = updateElement(returnFiber, oldFiber, newChild, lanes), currentDebugInfo = key, returnFiber) : null;
            case REACT_PORTAL_TYPE:
              return newChild.key === key ? updatePortal(returnFiber, oldFiber, newChild, lanes) : null;
            case REACT_LAZY_TYPE:
              return key = pushDebugInfo(newChild._debugInfo), newChild = callLazyInitInDEV(newChild), returnFiber = updateSlot(returnFiber, oldFiber, newChild, lanes), currentDebugInfo = key, returnFiber;
          }
          if (isArrayImpl(newChild) || getIteratorFn(newChild)) {
            if (key !== null)
              return null;
            key = pushDebugInfo(newChild._debugInfo);
            returnFiber = updateFragment(returnFiber, oldFiber, newChild, lanes, null);
            currentDebugInfo = key;
            return returnFiber;
          }
          if (typeof newChild.then === "function")
            return key = pushDebugInfo(newChild._debugInfo), returnFiber = updateSlot(returnFiber, oldFiber, unwrapThenable(newChild), lanes), currentDebugInfo = key, returnFiber;
          if (newChild.$$typeof === REACT_CONTEXT_TYPE)
            return updateSlot(returnFiber, oldFiber, readContextDuringReconciliation(returnFiber, newChild), lanes);
          throwOnInvalidObjectType(returnFiber, newChild);
        }
        typeof newChild === "function" && warnOnFunctionType(returnFiber, newChild);
        typeof newChild === "symbol" && warnOnSymbolType(returnFiber, newChild);
        return null;
      }
      function updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes) {
        if (typeof newChild === "string" && newChild !== "" || typeof newChild === "number" || typeof newChild === "bigint")
          return existingChildren = existingChildren.get(newIdx) || null, updateTextNode(returnFiber, existingChildren, "" + newChild, lanes);
        if (typeof newChild === "object" && newChild !== null) {
          switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE:
              return newIdx = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null, existingChildren = pushDebugInfo(newChild._debugInfo), returnFiber = updateElement(returnFiber, newIdx, newChild, lanes), currentDebugInfo = existingChildren, returnFiber;
            case REACT_PORTAL_TYPE:
              return existingChildren = existingChildren.get(newChild.key === null ? newIdx : newChild.key) || null, updatePortal(returnFiber, existingChildren, newChild, lanes);
            case REACT_LAZY_TYPE:
              var _prevDebugInfo7 = pushDebugInfo(newChild._debugInfo);
              newChild = callLazyInitInDEV(newChild);
              returnFiber = updateFromMap(existingChildren, returnFiber, newIdx, newChild, lanes);
              currentDebugInfo = _prevDebugInfo7;
              return returnFiber;
          }
          if (isArrayImpl(newChild) || getIteratorFn(newChild))
            return newIdx = existingChildren.get(newIdx) || null, existingChildren = pushDebugInfo(newChild._debugInfo), returnFiber = updateFragment(returnFiber, newIdx, newChild, lanes, null), currentDebugInfo = existingChildren, returnFiber;
          if (typeof newChild.then === "function")
            return _prevDebugInfo7 = pushDebugInfo(newChild._debugInfo), returnFiber = updateFromMap(existingChildren, returnFiber, newIdx, unwrapThenable(newChild), lanes), currentDebugInfo = _prevDebugInfo7, returnFiber;
          if (newChild.$$typeof === REACT_CONTEXT_TYPE)
            return updateFromMap(existingChildren, returnFiber, newIdx, readContextDuringReconciliation(returnFiber, newChild), lanes);
          throwOnInvalidObjectType(returnFiber, newChild);
        }
        typeof newChild === "function" && warnOnFunctionType(returnFiber, newChild);
        typeof newChild === "symbol" && warnOnSymbolType(returnFiber, newChild);
        return null;
      }
      function warnOnInvalidKey(returnFiber, workInProgress2, child, knownKeys) {
        if (typeof child !== "object" || child === null)
          return knownKeys;
        switch (child.$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            warnForMissingKey(returnFiber, workInProgress2, child);
            var key = child.key;
            if (typeof key !== "string")
              break;
            if (knownKeys === null) {
              knownKeys = new Set;
              knownKeys.add(key);
              break;
            }
            if (!knownKeys.has(key)) {
              knownKeys.add(key);
              break;
            }
            runWithFiberInDEV(workInProgress2, function() {
              console.error("Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version.", key);
            });
            break;
          case REACT_LAZY_TYPE:
            child = callLazyInitInDEV(child), warnOnInvalidKey(returnFiber, workInProgress2, child, knownKeys);
        }
        return knownKeys;
      }
      function reconcileChildrenArray(returnFiber, currentFirstChild, newChildren, lanes) {
        for (var knownKeys = null, resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null;oldFiber !== null && newIdx < newChildren.length; newIdx++) {
          oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
          var newFiber = updateSlot(returnFiber, oldFiber, newChildren[newIdx], lanes);
          if (newFiber === null) {
            oldFiber === null && (oldFiber = nextOldFiber);
            break;
          }
          knownKeys = warnOnInvalidKey(returnFiber, newFiber, newChildren[newIdx], knownKeys);
          shouldTrackSideEffects && oldFiber && newFiber.alternate === null && deleteChild(returnFiber, oldFiber);
          currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
          previousNewFiber === null ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
          previousNewFiber = newFiber;
          oldFiber = nextOldFiber;
        }
        if (newIdx === newChildren.length)
          return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
        if (oldFiber === null) {
          for (;newIdx < newChildren.length; newIdx++)
            oldFiber = createChild(returnFiber, newChildren[newIdx], lanes), oldFiber !== null && (knownKeys = warnOnInvalidKey(returnFiber, oldFiber, newChildren[newIdx], knownKeys), currentFirstChild = placeChild(oldFiber, currentFirstChild, newIdx), previousNewFiber === null ? resultingFirstChild = oldFiber : previousNewFiber.sibling = oldFiber, previousNewFiber = oldFiber);
          isHydrating && pushTreeFork(returnFiber, newIdx);
          return resultingFirstChild;
        }
        for (oldFiber = mapRemainingChildren(oldFiber);newIdx < newChildren.length; newIdx++)
          nextOldFiber = updateFromMap(oldFiber, returnFiber, newIdx, newChildren[newIdx], lanes), nextOldFiber !== null && (knownKeys = warnOnInvalidKey(returnFiber, nextOldFiber, newChildren[newIdx], knownKeys), shouldTrackSideEffects && nextOldFiber.alternate !== null && oldFiber.delete(nextOldFiber.key === null ? newIdx : nextOldFiber.key), currentFirstChild = placeChild(nextOldFiber, currentFirstChild, newIdx), previousNewFiber === null ? resultingFirstChild = nextOldFiber : previousNewFiber.sibling = nextOldFiber, previousNewFiber = nextOldFiber);
        shouldTrackSideEffects && oldFiber.forEach(function(child) {
          return deleteChild(returnFiber, child);
        });
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      function reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes) {
        if (newChildren == null)
          throw Error("An iterable object provided no iterator.");
        for (var resultingFirstChild = null, previousNewFiber = null, oldFiber = currentFirstChild, newIdx = currentFirstChild = 0, nextOldFiber = null, knownKeys = null, step = newChildren.next();oldFiber !== null && !step.done; newIdx++, step = newChildren.next()) {
          oldFiber.index > newIdx ? (nextOldFiber = oldFiber, oldFiber = null) : nextOldFiber = oldFiber.sibling;
          var newFiber = updateSlot(returnFiber, oldFiber, step.value, lanes);
          if (newFiber === null) {
            oldFiber === null && (oldFiber = nextOldFiber);
            break;
          }
          knownKeys = warnOnInvalidKey(returnFiber, newFiber, step.value, knownKeys);
          shouldTrackSideEffects && oldFiber && newFiber.alternate === null && deleteChild(returnFiber, oldFiber);
          currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
          previousNewFiber === null ? resultingFirstChild = newFiber : previousNewFiber.sibling = newFiber;
          previousNewFiber = newFiber;
          oldFiber = nextOldFiber;
        }
        if (step.done)
          return deleteRemainingChildren(returnFiber, oldFiber), isHydrating && pushTreeFork(returnFiber, newIdx), resultingFirstChild;
        if (oldFiber === null) {
          for (;!step.done; newIdx++, step = newChildren.next())
            oldFiber = createChild(returnFiber, step.value, lanes), oldFiber !== null && (knownKeys = warnOnInvalidKey(returnFiber, oldFiber, step.value, knownKeys), currentFirstChild = placeChild(oldFiber, currentFirstChild, newIdx), previousNewFiber === null ? resultingFirstChild = oldFiber : previousNewFiber.sibling = oldFiber, previousNewFiber = oldFiber);
          isHydrating && pushTreeFork(returnFiber, newIdx);
          return resultingFirstChild;
        }
        for (oldFiber = mapRemainingChildren(oldFiber);!step.done; newIdx++, step = newChildren.next())
          nextOldFiber = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes), nextOldFiber !== null && (knownKeys = warnOnInvalidKey(returnFiber, nextOldFiber, step.value, knownKeys), shouldTrackSideEffects && nextOldFiber.alternate !== null && oldFiber.delete(nextOldFiber.key === null ? newIdx : nextOldFiber.key), currentFirstChild = placeChild(nextOldFiber, currentFirstChild, newIdx), previousNewFiber === null ? resultingFirstChild = nextOldFiber : previousNewFiber.sibling = nextOldFiber, previousNewFiber = nextOldFiber);
        shouldTrackSideEffects && oldFiber.forEach(function(child) {
          return deleteChild(returnFiber, child);
        });
        isHydrating && pushTreeFork(returnFiber, newIdx);
        return resultingFirstChild;
      }
      function reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes) {
        typeof newChild === "object" && newChild !== null && newChild.type === REACT_FRAGMENT_TYPE && newChild.key === null && (validateFragmentProps(newChild, null, returnFiber), newChild = newChild.props.children);
        if (typeof newChild === "object" && newChild !== null) {
          switch (newChild.$$typeof) {
            case REACT_ELEMENT_TYPE:
              var prevDebugInfo = pushDebugInfo(newChild._debugInfo);
              a: {
                for (var key = newChild.key;currentFirstChild !== null; ) {
                  if (currentFirstChild.key === key) {
                    key = newChild.type;
                    if (key === REACT_FRAGMENT_TYPE) {
                      if (currentFirstChild.tag === 7) {
                        deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
                        lanes = useFiber(currentFirstChild, newChild.props.children);
                        lanes.return = returnFiber;
                        lanes._debugOwner = newChild._owner;
                        lanes._debugInfo = currentDebugInfo;
                        validateFragmentProps(newChild, lanes, returnFiber);
                        returnFiber = lanes;
                        break a;
                      }
                    } else if (currentFirstChild.elementType === key || isCompatibleFamilyForHotReloading(currentFirstChild, newChild) || typeof key === "object" && key !== null && key.$$typeof === REACT_LAZY_TYPE && callLazyInitInDEV(key) === currentFirstChild.type) {
                      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
                      lanes = useFiber(currentFirstChild, newChild.props);
                      coerceRef(lanes, newChild);
                      lanes.return = returnFiber;
                      lanes._debugOwner = newChild._owner;
                      lanes._debugInfo = currentDebugInfo;
                      returnFiber = lanes;
                      break a;
                    }
                    deleteRemainingChildren(returnFiber, currentFirstChild);
                    break;
                  } else
                    deleteChild(returnFiber, currentFirstChild);
                  currentFirstChild = currentFirstChild.sibling;
                }
                newChild.type === REACT_FRAGMENT_TYPE ? (lanes = createFiberFromFragment(newChild.props.children, returnFiber.mode, lanes, newChild.key), lanes.return = returnFiber, lanes._debugOwner = returnFiber, lanes._debugTask = returnFiber._debugTask, lanes._debugInfo = currentDebugInfo, validateFragmentProps(newChild, lanes, returnFiber), returnFiber = lanes) : (lanes = createFiberFromElement(newChild, returnFiber.mode, lanes), coerceRef(lanes, newChild), lanes.return = returnFiber, lanes._debugInfo = currentDebugInfo, returnFiber = lanes);
              }
              returnFiber = placeSingleChild(returnFiber);
              currentDebugInfo = prevDebugInfo;
              return returnFiber;
            case REACT_PORTAL_TYPE:
              a: {
                prevDebugInfo = newChild;
                for (newChild = prevDebugInfo.key;currentFirstChild !== null; ) {
                  if (currentFirstChild.key === newChild)
                    if (currentFirstChild.tag === 4 && currentFirstChild.stateNode.containerInfo === prevDebugInfo.containerInfo && currentFirstChild.stateNode.implementation === prevDebugInfo.implementation) {
                      deleteRemainingChildren(returnFiber, currentFirstChild.sibling);
                      lanes = useFiber(currentFirstChild, prevDebugInfo.children || []);
                      lanes.return = returnFiber;
                      returnFiber = lanes;
                      break a;
                    } else {
                      deleteRemainingChildren(returnFiber, currentFirstChild);
                      break;
                    }
                  else
                    deleteChild(returnFiber, currentFirstChild);
                  currentFirstChild = currentFirstChild.sibling;
                }
                lanes = createFiberFromPortal(prevDebugInfo, returnFiber.mode, lanes);
                lanes.return = returnFiber;
                returnFiber = lanes;
              }
              return placeSingleChild(returnFiber);
            case REACT_LAZY_TYPE:
              return prevDebugInfo = pushDebugInfo(newChild._debugInfo), newChild = callLazyInitInDEV(newChild), returnFiber = reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes), currentDebugInfo = prevDebugInfo, returnFiber;
          }
          if (isArrayImpl(newChild))
            return prevDebugInfo = pushDebugInfo(newChild._debugInfo), returnFiber = reconcileChildrenArray(returnFiber, currentFirstChild, newChild, lanes), currentDebugInfo = prevDebugInfo, returnFiber;
          if (getIteratorFn(newChild)) {
            prevDebugInfo = pushDebugInfo(newChild._debugInfo);
            key = getIteratorFn(newChild);
            if (typeof key !== "function")
              throw Error("An object is not an iterable. This error is likely caused by a bug in React. Please file an issue.");
            var newChildren = key.call(newChild);
            if (newChildren === newChild) {
              if (returnFiber.tag !== 0 || Object.prototype.toString.call(returnFiber.type) !== "[object GeneratorFunction]" || Object.prototype.toString.call(newChildren) !== "[object Generator]")
                didWarnAboutGenerators || console.error("Using Iterators as children is unsupported and will likely yield unexpected results because enumerating a generator mutates it. You may convert it to an array with `Array.from()` or the `[...spread]` operator before rendering. You can also use an Iterable that can iterate multiple times over the same items."), didWarnAboutGenerators = true;
            } else
              newChild.entries !== key || didWarnAboutMaps || (console.error("Using Maps as children is not supported. Use an array of keyed ReactElements instead."), didWarnAboutMaps = true);
            returnFiber = reconcileChildrenIterator(returnFiber, currentFirstChild, newChildren, lanes);
            currentDebugInfo = prevDebugInfo;
            return returnFiber;
          }
          if (typeof newChild.then === "function")
            return prevDebugInfo = pushDebugInfo(newChild._debugInfo), returnFiber = reconcileChildFibersImpl(returnFiber, currentFirstChild, unwrapThenable(newChild), lanes), currentDebugInfo = prevDebugInfo, returnFiber;
          if (newChild.$$typeof === REACT_CONTEXT_TYPE)
            return reconcileChildFibersImpl(returnFiber, currentFirstChild, readContextDuringReconciliation(returnFiber, newChild), lanes);
          throwOnInvalidObjectType(returnFiber, newChild);
        }
        if (typeof newChild === "string" && newChild !== "" || typeof newChild === "number" || typeof newChild === "bigint")
          return prevDebugInfo = "" + newChild, currentFirstChild !== null && currentFirstChild.tag === 6 ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling), lanes = useFiber(currentFirstChild, prevDebugInfo), lanes.return = returnFiber, returnFiber = lanes) : (deleteRemainingChildren(returnFiber, currentFirstChild), lanes = createFiberFromText(prevDebugInfo, returnFiber.mode, lanes), lanes.return = returnFiber, lanes._debugOwner = returnFiber, lanes._debugTask = returnFiber._debugTask, lanes._debugInfo = currentDebugInfo, returnFiber = lanes), placeSingleChild(returnFiber);
        typeof newChild === "function" && warnOnFunctionType(returnFiber, newChild);
        typeof newChild === "symbol" && warnOnSymbolType(returnFiber, newChild);
        return deleteRemainingChildren(returnFiber, currentFirstChild);
      }
      return function(returnFiber, currentFirstChild, newChild, lanes) {
        var prevDebugInfo = currentDebugInfo;
        currentDebugInfo = null;
        try {
          thenableIndexCounter = 0;
          var firstChildFiber = reconcileChildFibersImpl(returnFiber, currentFirstChild, newChild, lanes);
          thenableState = null;
          return firstChildFiber;
        } catch (x) {
          if (x === SuspenseException || x === SuspenseActionException)
            throw x;
          var fiber = createFiber(29, x, null, returnFiber.mode);
          fiber.lanes = lanes;
          fiber.return = returnFiber;
          var debugInfo = fiber._debugInfo = currentDebugInfo;
          fiber._debugOwner = returnFiber._debugOwner;
          fiber._debugTask = returnFiber._debugTask;
          if (debugInfo != null) {
            for (var i = debugInfo.length - 1;0 <= i; i--)
              if (typeof debugInfo[i].stack === "string") {
                fiber._debugOwner = debugInfo[i];
                fiber._debugTask = debugInfo[i].debugTask;
                break;
              }
          }
          return fiber;
        } finally {
          currentDebugInfo = prevDebugInfo;
        }
      };
    }
    function pushPrimaryTreeSuspenseHandler(handler) {
      var current2 = handler.alternate;
      push(suspenseStackCursor, suspenseStackCursor.current & SubtreeSuspenseContextMask, handler);
      push(suspenseHandlerStackCursor, handler, handler);
      shellBoundary === null && (current2 === null || currentTreeHiddenStackCursor.current !== null ? shellBoundary = handler : current2.memoizedState !== null && (shellBoundary = handler));
    }
    function pushOffscreenSuspenseHandler(fiber) {
      if (fiber.tag === 22) {
        if (push(suspenseStackCursor, suspenseStackCursor.current, fiber), push(suspenseHandlerStackCursor, fiber, fiber), shellBoundary === null) {
          var current2 = fiber.alternate;
          current2 !== null && current2.memoizedState !== null && (shellBoundary = fiber);
        }
      } else
        reuseSuspenseHandlerOnStack(fiber);
    }
    function reuseSuspenseHandlerOnStack(fiber) {
      push(suspenseStackCursor, suspenseStackCursor.current, fiber);
      push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current, fiber);
    }
    function popSuspenseHandler(fiber) {
      pop(suspenseHandlerStackCursor, fiber);
      shellBoundary === fiber && (shellBoundary = null);
      pop(suspenseStackCursor, fiber);
    }
    function findFirstSuspended(row) {
      for (var node = row;node !== null; ) {
        if (node.tag === 13) {
          var state = node.memoizedState;
          if (state !== null && (state = state.dehydrated, state === null || isSuspenseInstancePending(state) || isSuspenseInstanceFallback(state)))
            return node;
        } else if (node.tag === 19 && node.memoizedProps.revealOrder !== undefined) {
          if ((node.flags & 128) !== 0)
            return node;
        } else if (node.child !== null) {
          node.child.return = node;
          node = node.child;
          continue;
        }
        if (node === row)
          break;
        for (;node.sibling === null; ) {
          if (node.return === null || node.return === row)
            return null;
          node = node.return;
        }
        node.sibling.return = node.return;
        node = node.sibling;
      }
      return null;
    }
    function warnOnInvalidCallback(callback) {
      if (callback !== null && typeof callback !== "function") {
        var key = String(callback);
        didWarnOnInvalidCallback.has(key) || (didWarnOnInvalidCallback.add(key), console.error("Expected the last optional `callback` argument to be a function. Instead received: %s.", callback));
      }
    }
    function applyDerivedStateFromProps(workInProgress2, ctor, getDerivedStateFromProps, nextProps) {
      var prevState = workInProgress2.memoizedState, partialState = getDerivedStateFromProps(nextProps, prevState);
      if (workInProgress2.mode & 8) {
        setIsStrictModeForDevtools(true);
        try {
          partialState = getDerivedStateFromProps(nextProps, prevState);
        } finally {
          setIsStrictModeForDevtools(false);
        }
      }
      partialState === undefined && (ctor = getComponentNameFromType(ctor) || "Component", didWarnAboutUndefinedDerivedState.has(ctor) || (didWarnAboutUndefinedDerivedState.add(ctor), console.error("%s.getDerivedStateFromProps(): A valid state object (or null) must be returned. You have returned undefined.", ctor)));
      prevState = partialState === null || partialState === undefined ? prevState : assign({}, prevState, partialState);
      workInProgress2.memoizedState = prevState;
      workInProgress2.lanes === 0 && (workInProgress2.updateQueue.baseState = prevState);
    }
    function checkShouldComponentUpdate(workInProgress2, ctor, oldProps, newProps, oldState, newState, nextContext) {
      var instance = workInProgress2.stateNode;
      if (typeof instance.shouldComponentUpdate === "function") {
        oldProps = instance.shouldComponentUpdate(newProps, newState, nextContext);
        if (workInProgress2.mode & 8) {
          setIsStrictModeForDevtools(true);
          try {
            oldProps = instance.shouldComponentUpdate(newProps, newState, nextContext);
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
        oldProps === undefined && console.error("%s.shouldComponentUpdate(): Returned undefined instead of a boolean value. Make sure to return true or false.", getComponentNameFromType(ctor) || "Component");
        return oldProps;
      }
      return ctor.prototype && ctor.prototype.isPureReactComponent ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState) : true;
    }
    function callComponentWillReceiveProps(workInProgress2, instance, newProps, nextContext) {
      var oldState = instance.state;
      typeof instance.componentWillReceiveProps === "function" && instance.componentWillReceiveProps(newProps, nextContext);
      typeof instance.UNSAFE_componentWillReceiveProps === "function" && instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
      instance.state !== oldState && (workInProgress2 = getComponentNameFromFiber(workInProgress2) || "Component", didWarnAboutStateAssignmentForComponent.has(workInProgress2) || (didWarnAboutStateAssignmentForComponent.add(workInProgress2), console.error("%s.componentWillReceiveProps(): Assigning directly to this.state is deprecated (except inside a component's constructor). Use setState instead.", workInProgress2)), classComponentUpdater.enqueueReplaceState(instance, instance.state, null));
    }
    function resolveClassComponentProps(Component, baseProps) {
      var newProps = baseProps;
      if ("ref" in baseProps) {
        newProps = {};
        for (var propName in baseProps)
          propName !== "ref" && (newProps[propName] = baseProps[propName]);
      }
      if (Component = Component.defaultProps) {
        newProps === baseProps && (newProps = assign({}, newProps));
        for (var _propName in Component)
          newProps[_propName] === undefined && (newProps[_propName] = Component[_propName]);
      }
      return newProps;
    }
    function logUncaughtError(root, errorInfo) {
      try {
        componentName = errorInfo.source ? getComponentNameFromFiber(errorInfo.source) : null;
        errorBoundaryName = null;
        var error = errorInfo.value;
        if (ReactSharedInternals.actQueue !== null)
          ReactSharedInternals.thrownErrors.push(error);
        else {
          var onUncaughtError = root.onUncaughtError;
          onUncaughtError(error, { componentStack: errorInfo.stack });
        }
      } catch (e) {
        setTimeout(function() {
          throw e;
        });
      }
    }
    function logCaughtError(root, boundary, errorInfo) {
      try {
        componentName = errorInfo.source ? getComponentNameFromFiber(errorInfo.source) : null;
        errorBoundaryName = getComponentNameFromFiber(boundary);
        var onCaughtError = root.onCaughtError;
        onCaughtError(errorInfo.value, {
          componentStack: errorInfo.stack,
          errorBoundary: boundary.tag === 1 ? boundary.stateNode : null
        });
      } catch (e) {
        setTimeout(function() {
          throw e;
        });
      }
    }
    function createRootErrorUpdate(root, errorInfo, lane) {
      lane = createUpdate(lane);
      lane.tag = CaptureUpdate;
      lane.payload = { element: null };
      lane.callback = function() {
        runWithFiberInDEV(errorInfo.source, logUncaughtError, root, errorInfo);
      };
      return lane;
    }
    function createClassErrorUpdate(lane) {
      lane = createUpdate(lane);
      lane.tag = CaptureUpdate;
      return lane;
    }
    function initializeClassErrorUpdate(update, root, fiber, errorInfo) {
      var getDerivedStateFromError = fiber.type.getDerivedStateFromError;
      if (typeof getDerivedStateFromError === "function") {
        var error = errorInfo.value;
        update.payload = function() {
          return getDerivedStateFromError(error);
        };
        update.callback = function() {
          markFailedErrorBoundaryForHotReloading(fiber);
          runWithFiberInDEV(errorInfo.source, logCaughtError, root, fiber, errorInfo);
        };
      }
      var inst = fiber.stateNode;
      inst !== null && typeof inst.componentDidCatch === "function" && (update.callback = function() {
        markFailedErrorBoundaryForHotReloading(fiber);
        runWithFiberInDEV(errorInfo.source, logCaughtError, root, fiber, errorInfo);
        typeof getDerivedStateFromError !== "function" && (legacyErrorBoundariesThatAlreadyFailed === null ? legacyErrorBoundariesThatAlreadyFailed = new Set([this]) : legacyErrorBoundariesThatAlreadyFailed.add(this));
        callComponentDidCatchInDEV(this, errorInfo);
        typeof getDerivedStateFromError === "function" || (fiber.lanes & 2) === 0 && console.error("%s: Error boundaries should implement getDerivedStateFromError(). In that method, return a state update to display an error message or fallback UI.", getComponentNameFromFiber(fiber) || "Unknown");
      });
    }
    function throwException(root, returnFiber, sourceFiber, value, rootRenderLanes) {
      sourceFiber.flags |= 32768;
      isDevToolsPresent && restorePendingUpdaters(root, rootRenderLanes);
      if (value !== null && typeof value === "object" && typeof value.then === "function") {
        returnFiber = sourceFiber.alternate;
        returnFiber !== null && propagateParentContextChanges(returnFiber, sourceFiber, rootRenderLanes, true);
        isHydrating && (didSuspendOrErrorDEV = true);
        sourceFiber = suspenseHandlerStackCursor.current;
        if (sourceFiber !== null) {
          switch (sourceFiber.tag) {
            case 13:
              return shellBoundary === null ? renderDidSuspendDelayIfPossible() : sourceFiber.alternate === null && workInProgressRootExitStatus === RootInProgress && (workInProgressRootExitStatus = RootSuspended), sourceFiber.flags &= -257, sourceFiber.flags |= 65536, sourceFiber.lanes = rootRenderLanes, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, returnFiber === null ? sourceFiber.updateQueue = new Set([value]) : returnFiber.add(value), attachPingListener(root, value, rootRenderLanes)), false;
            case 22:
              return sourceFiber.flags |= 65536, value === noopSuspenseyCommitThenable ? sourceFiber.flags |= 16384 : (returnFiber = sourceFiber.updateQueue, returnFiber === null ? (returnFiber = {
                transitions: null,
                markerInstances: null,
                retryQueue: new Set([value])
              }, sourceFiber.updateQueue = returnFiber) : (sourceFiber = returnFiber.retryQueue, sourceFiber === null ? returnFiber.retryQueue = new Set([value]) : sourceFiber.add(value)), attachPingListener(root, value, rootRenderLanes)), false;
          }
          throw Error("Unexpected Suspense handler tag (" + sourceFiber.tag + "). This is a bug in React.");
        }
        attachPingListener(root, value, rootRenderLanes);
        renderDidSuspendDelayIfPossible();
        return false;
      }
      if (isHydrating)
        return didSuspendOrErrorDEV = true, returnFiber = suspenseHandlerStackCursor.current, returnFiber !== null ? ((returnFiber.flags & 65536) === 0 && (returnFiber.flags |= 256), returnFiber.flags |= 65536, returnFiber.lanes = rootRenderLanes, value !== HydrationMismatchException && queueHydrationError(createCapturedValueAtFiber(Error("There was an error while hydrating but React was able to recover by instead client rendering from the nearest Suspense boundary.", { cause: value }), sourceFiber))) : (value !== HydrationMismatchException && queueHydrationError(createCapturedValueAtFiber(Error("There was an error while hydrating but React was able to recover by instead client rendering the entire root.", { cause: value }), sourceFiber)), root = root.current.alternate, root.flags |= 65536, rootRenderLanes &= -rootRenderLanes, root.lanes |= rootRenderLanes, value = createCapturedValueAtFiber(value, sourceFiber), rootRenderLanes = createRootErrorUpdate(root.stateNode, value, rootRenderLanes), enqueueCapturedUpdate(root, rootRenderLanes), workInProgressRootExitStatus !== RootSuspendedWithDelay && (workInProgressRootExitStatus = RootErrored)), false;
      var error = createCapturedValueAtFiber(Error("There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.", { cause: value }), sourceFiber);
      workInProgressRootConcurrentErrors === null ? workInProgressRootConcurrentErrors = [error] : workInProgressRootConcurrentErrors.push(error);
      workInProgressRootExitStatus !== RootSuspendedWithDelay && (workInProgressRootExitStatus = RootErrored);
      if (returnFiber === null)
        return true;
      value = createCapturedValueAtFiber(value, sourceFiber);
      sourceFiber = returnFiber;
      do {
        switch (sourceFiber.tag) {
          case 3:
            return sourceFiber.flags |= 65536, root = rootRenderLanes & -rootRenderLanes, sourceFiber.lanes |= root, root = createRootErrorUpdate(sourceFiber.stateNode, value, root), enqueueCapturedUpdate(sourceFiber, root), false;
          case 1:
            if (returnFiber = sourceFiber.type, error = sourceFiber.stateNode, (sourceFiber.flags & 128) === 0 && (typeof returnFiber.getDerivedStateFromError === "function" || error !== null && typeof error.componentDidCatch === "function" && (legacyErrorBoundariesThatAlreadyFailed === null || !legacyErrorBoundariesThatAlreadyFailed.has(error))))
              return sourceFiber.flags |= 65536, rootRenderLanes &= -rootRenderLanes, sourceFiber.lanes |= rootRenderLanes, rootRenderLanes = createClassErrorUpdate(rootRenderLanes), initializeClassErrorUpdate(rootRenderLanes, root, sourceFiber, value), enqueueCapturedUpdate(sourceFiber, rootRenderLanes), false;
        }
        sourceFiber = sourceFiber.return;
      } while (sourceFiber !== null);
      return false;
    }
    function reconcileChildren(current2, workInProgress2, nextChildren, renderLanes2) {
      workInProgress2.child = current2 === null ? mountChildFibers(workInProgress2, null, nextChildren, renderLanes2) : reconcileChildFibers(workInProgress2, current2.child, nextChildren, renderLanes2);
    }
    function updateForwardRef(current2, workInProgress2, Component, nextProps, renderLanes2) {
      Component = Component.render;
      var ref = workInProgress2.ref;
      if ("ref" in nextProps) {
        var propsWithoutRef = {};
        for (var key in nextProps)
          key !== "ref" && (propsWithoutRef[key] = nextProps[key]);
      } else
        propsWithoutRef = nextProps;
      prepareToReadContext(workInProgress2);
      markComponentRenderStarted(workInProgress2);
      nextProps = renderWithHooks(current2, workInProgress2, Component, propsWithoutRef, ref, renderLanes2);
      key = checkDidRenderIdHook();
      markComponentRenderStopped();
      if (current2 !== null && !didReceiveUpdate)
        return bailoutHooks(current2, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
      isHydrating && key && pushMaterializedTreeId(workInProgress2);
      workInProgress2.flags |= 1;
      reconcileChildren(current2, workInProgress2, nextProps, renderLanes2);
      return workInProgress2.child;
    }
    function updateMemoComponent(current2, workInProgress2, Component, nextProps, renderLanes2) {
      if (current2 === null) {
        var type = Component.type;
        if (typeof type === "function" && !shouldConstruct(type) && type.defaultProps === undefined && Component.compare === null)
          return Component = resolveFunctionForHotReloading(type), workInProgress2.tag = 15, workInProgress2.type = Component, validateFunctionComponentInDev(workInProgress2, type), updateSimpleMemoComponent(current2, workInProgress2, Component, nextProps, renderLanes2);
        current2 = createFiberFromTypeAndProps(Component.type, null, nextProps, workInProgress2, workInProgress2.mode, renderLanes2);
        current2.ref = workInProgress2.ref;
        current2.return = workInProgress2;
        return workInProgress2.child = current2;
      }
      type = current2.child;
      if (!checkScheduledUpdateOrContext(current2, renderLanes2)) {
        var prevProps = type.memoizedProps;
        Component = Component.compare;
        Component = Component !== null ? Component : shallowEqual;
        if (Component(prevProps, nextProps) && current2.ref === workInProgress2.ref)
          return bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
      }
      workInProgress2.flags |= 1;
      current2 = createWorkInProgress(type, nextProps);
      current2.ref = workInProgress2.ref;
      current2.return = workInProgress2;
      return workInProgress2.child = current2;
    }
    function updateSimpleMemoComponent(current2, workInProgress2, Component, nextProps, renderLanes2) {
      if (current2 !== null) {
        var prevProps = current2.memoizedProps;
        if (shallowEqual(prevProps, nextProps) && current2.ref === workInProgress2.ref && workInProgress2.type === current2.type)
          if (didReceiveUpdate = false, workInProgress2.pendingProps = nextProps = prevProps, checkScheduledUpdateOrContext(current2, renderLanes2))
            (current2.flags & 131072) !== 0 && (didReceiveUpdate = true);
          else
            return workInProgress2.lanes = current2.lanes, bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
      }
      return updateFunctionComponent(current2, workInProgress2, Component, nextProps, renderLanes2);
    }
    function updateOffscreenComponent(current2, workInProgress2, renderLanes2) {
      var nextProps = workInProgress2.pendingProps, nextChildren = nextProps.children, prevState = current2 !== null ? current2.memoizedState : null;
      if (nextProps.mode === "hidden") {
        if ((workInProgress2.flags & 128) !== 0) {
          nextProps = prevState !== null ? prevState.baseLanes | renderLanes2 : renderLanes2;
          if (current2 !== null) {
            nextChildren = workInProgress2.child = current2.child;
            for (prevState = 0;nextChildren !== null; )
              prevState = prevState | nextChildren.lanes | nextChildren.childLanes, nextChildren = nextChildren.sibling;
            workInProgress2.childLanes = prevState & ~nextProps;
          } else
            workInProgress2.childLanes = 0, workInProgress2.child = null;
          return deferHiddenOffscreenComponent(current2, workInProgress2, nextProps, renderLanes2);
        }
        if ((renderLanes2 & 536870912) !== 0)
          workInProgress2.memoizedState = { baseLanes: 0, cachePool: null }, current2 !== null && pushTransition(workInProgress2, prevState !== null ? prevState.cachePool : null), prevState !== null ? pushHiddenContext(workInProgress2, prevState) : reuseHiddenContextOnStack(workInProgress2), pushOffscreenSuspenseHandler(workInProgress2);
        else
          return workInProgress2.lanes = workInProgress2.childLanes = 536870912, deferHiddenOffscreenComponent(current2, workInProgress2, prevState !== null ? prevState.baseLanes | renderLanes2 : renderLanes2, renderLanes2);
      } else
        prevState !== null ? (pushTransition(workInProgress2, prevState.cachePool), pushHiddenContext(workInProgress2, prevState), reuseSuspenseHandlerOnStack(workInProgress2), workInProgress2.memoizedState = null) : (current2 !== null && pushTransition(workInProgress2, null), reuseHiddenContextOnStack(workInProgress2), reuseSuspenseHandlerOnStack(workInProgress2));
      reconcileChildren(current2, workInProgress2, nextChildren, renderLanes2);
      return workInProgress2.child;
    }
    function deferHiddenOffscreenComponent(current2, workInProgress2, nextBaseLanes, renderLanes2) {
      var JSCompiler_inline_result = peekCacheFromPool();
      JSCompiler_inline_result = JSCompiler_inline_result === null ? null : {
        parent: isPrimaryRenderer ? CacheContext._currentValue : CacheContext._currentValue2,
        pool: JSCompiler_inline_result
      };
      workInProgress2.memoizedState = {
        baseLanes: nextBaseLanes,
        cachePool: JSCompiler_inline_result
      };
      current2 !== null && pushTransition(workInProgress2, null);
      reuseHiddenContextOnStack(workInProgress2);
      pushOffscreenSuspenseHandler(workInProgress2);
      current2 !== null && propagateParentContextChanges(current2, workInProgress2, renderLanes2, true);
      return null;
    }
    function markRef(current2, workInProgress2) {
      var ref = workInProgress2.ref;
      if (ref === null)
        current2 !== null && current2.ref !== null && (workInProgress2.flags |= 4194816);
      else {
        if (typeof ref !== "function" && typeof ref !== "object")
          throw Error("Expected ref to be a function, an object returned by React.createRef(), or undefined/null.");
        if (current2 === null || current2.ref !== ref)
          workInProgress2.flags |= 4194816;
      }
    }
    function updateFunctionComponent(current2, workInProgress2, Component, nextProps, renderLanes2) {
      if (Component.prototype && typeof Component.prototype.render === "function") {
        var componentName2 = getComponentNameFromType(Component) || "Unknown";
        didWarnAboutBadClass[componentName2] || (console.error("The <%s /> component appears to have a render method, but doesn't extend React.Component. This is likely to cause errors. Change %s to extend React.Component instead.", componentName2, componentName2), didWarnAboutBadClass[componentName2] = true);
      }
      workInProgress2.mode & 8 && ReactStrictModeWarnings.recordLegacyContextWarning(workInProgress2, null);
      current2 === null && (validateFunctionComponentInDev(workInProgress2, workInProgress2.type), Component.contextTypes && (componentName2 = getComponentNameFromType(Component) || "Unknown", didWarnAboutContextTypes[componentName2] || (didWarnAboutContextTypes[componentName2] = true, console.error("%s uses the legacy contextTypes API which was removed in React 19. Use React.createContext() with React.useContext() instead. (https://react.dev/link/legacy-context)", componentName2))));
      prepareToReadContext(workInProgress2);
      markComponentRenderStarted(workInProgress2);
      Component = renderWithHooks(current2, workInProgress2, Component, nextProps, undefined, renderLanes2);
      nextProps = checkDidRenderIdHook();
      markComponentRenderStopped();
      if (current2 !== null && !didReceiveUpdate)
        return bailoutHooks(current2, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
      isHydrating && nextProps && pushMaterializedTreeId(workInProgress2);
      workInProgress2.flags |= 1;
      reconcileChildren(current2, workInProgress2, Component, renderLanes2);
      return workInProgress2.child;
    }
    function replayFunctionComponent(current2, workInProgress2, nextProps, Component, secondArg, renderLanes2) {
      prepareToReadContext(workInProgress2);
      markComponentRenderStarted(workInProgress2);
      hookTypesUpdateIndexDev = -1;
      ignorePreviousDependencies = current2 !== null && current2.type !== workInProgress2.type;
      workInProgress2.updateQueue = null;
      nextProps = renderWithHooksAgain(workInProgress2, Component, nextProps, secondArg);
      finishRenderingHooks(current2, workInProgress2);
      Component = checkDidRenderIdHook();
      markComponentRenderStopped();
      if (current2 !== null && !didReceiveUpdate)
        return bailoutHooks(current2, workInProgress2, renderLanes2), bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
      isHydrating && Component && pushMaterializedTreeId(workInProgress2);
      workInProgress2.flags |= 1;
      reconcileChildren(current2, workInProgress2, nextProps, renderLanes2);
      return workInProgress2.child;
    }
    function updateClassComponent(current2, workInProgress2, Component, nextProps, renderLanes2) {
      switch (shouldErrorImpl(workInProgress2)) {
        case false:
          var _instance = workInProgress2.stateNode, state = new workInProgress2.type(workInProgress2.memoizedProps, _instance.context).state;
          _instance.updater.enqueueSetState(_instance, state, null);
          break;
        case true:
          workInProgress2.flags |= 128;
          workInProgress2.flags |= 65536;
          _instance = Error("Simulated error coming from DevTools");
          var lane = renderLanes2 & -renderLanes2;
          workInProgress2.lanes |= lane;
          state = workInProgressRoot;
          if (state === null)
            throw Error("Expected a work-in-progress root. This is a bug in React. Please file an issue.");
          lane = createClassErrorUpdate(lane);
          initializeClassErrorUpdate(lane, state, workInProgress2, createCapturedValueAtFiber(_instance, workInProgress2));
          enqueueCapturedUpdate(workInProgress2, lane);
      }
      prepareToReadContext(workInProgress2);
      if (workInProgress2.stateNode === null) {
        state = emptyContextObject;
        _instance = Component.contextType;
        "contextType" in Component && _instance !== null && (_instance === undefined || _instance.$$typeof !== REACT_CONTEXT_TYPE) && !didWarnAboutInvalidateContextType.has(Component) && (didWarnAboutInvalidateContextType.add(Component), lane = _instance === undefined ? " However, it is set to undefined. This can be caused by a typo or by mixing up named and default imports. This can also happen due to a circular dependency, so try moving the createContext() call to a separate file." : typeof _instance !== "object" ? " However, it is set to a " + typeof _instance + "." : _instance.$$typeof === REACT_CONSUMER_TYPE ? " Did you accidentally pass the Context.Consumer instead?" : " However, it is set to an object with keys {" + Object.keys(_instance).join(", ") + "}.", console.error("%s defines an invalid contextType. contextType should point to the Context object returned by React.createContext().%s", getComponentNameFromType(Component) || "Component", lane));
        typeof _instance === "object" && _instance !== null && (state = readContext(_instance));
        _instance = new Component(nextProps, state);
        if (workInProgress2.mode & 8) {
          setIsStrictModeForDevtools(true);
          try {
            _instance = new Component(nextProps, state);
          } finally {
            setIsStrictModeForDevtools(false);
          }
        }
        state = workInProgress2.memoizedState = _instance.state !== null && _instance.state !== undefined ? _instance.state : null;
        _instance.updater = classComponentUpdater;
        workInProgress2.stateNode = _instance;
        _instance._reactInternals = workInProgress2;
        _instance._reactInternalInstance = fakeInternalInstance;
        typeof Component.getDerivedStateFromProps === "function" && state === null && (state = getComponentNameFromType(Component) || "Component", didWarnAboutUninitializedState.has(state) || (didWarnAboutUninitializedState.add(state), console.error("`%s` uses `getDerivedStateFromProps` but its initial state is %s. This is not recommended. Instead, define the initial state by assigning an object to `this.state` in the constructor of `%s`. This ensures that `getDerivedStateFromProps` arguments have a consistent shape.", state, _instance.state === null ? "null" : "undefined", state)));
        if (typeof Component.getDerivedStateFromProps === "function" || typeof _instance.getSnapshotBeforeUpdate === "function") {
          var foundWillUpdateName = lane = state = null;
          typeof _instance.componentWillMount === "function" && _instance.componentWillMount.__suppressDeprecationWarning !== true ? state = "componentWillMount" : typeof _instance.UNSAFE_componentWillMount === "function" && (state = "UNSAFE_componentWillMount");
          typeof _instance.componentWillReceiveProps === "function" && _instance.componentWillReceiveProps.__suppressDeprecationWarning !== true ? lane = "componentWillReceiveProps" : typeof _instance.UNSAFE_componentWillReceiveProps === "function" && (lane = "UNSAFE_componentWillReceiveProps");
          typeof _instance.componentWillUpdate === "function" && _instance.componentWillUpdate.__suppressDeprecationWarning !== true ? foundWillUpdateName = "componentWillUpdate" : typeof _instance.UNSAFE_componentWillUpdate === "function" && (foundWillUpdateName = "UNSAFE_componentWillUpdate");
          if (state !== null || lane !== null || foundWillUpdateName !== null) {
            _instance = getComponentNameFromType(Component) || "Component";
            var newApiName = typeof Component.getDerivedStateFromProps === "function" ? "getDerivedStateFromProps()" : "getSnapshotBeforeUpdate()";
            didWarnAboutLegacyLifecyclesAndDerivedState.has(_instance) || (didWarnAboutLegacyLifecyclesAndDerivedState.add(_instance), console.error(`Unsafe legacy lifecycles will not be called for components using new component APIs.

%s uses %s but also contains the following legacy lifecycles:%s%s%s

The above lifecycles should be removed. Learn more about this warning here:
https://react.dev/link/unsafe-component-lifecycles`, _instance, newApiName, state !== null ? `
  ` + state : "", lane !== null ? `
  ` + lane : "", foundWillUpdateName !== null ? `
  ` + foundWillUpdateName : ""));
          }
        }
        _instance = workInProgress2.stateNode;
        state = getComponentNameFromType(Component) || "Component";
        _instance.render || (Component.prototype && typeof Component.prototype.render === "function" ? console.error("No `render` method found on the %s instance: did you accidentally return an object from the constructor?", state) : console.error("No `render` method found on the %s instance: you may have forgotten to define `render`.", state));
        !_instance.getInitialState || _instance.getInitialState.isReactClassApproved || _instance.state || console.error("getInitialState was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Did you mean to define a state property instead?", state);
        _instance.getDefaultProps && !_instance.getDefaultProps.isReactClassApproved && console.error("getDefaultProps was defined on %s, a plain JavaScript class. This is only supported for classes created using React.createClass. Use a static property to define defaultProps instead.", state);
        _instance.contextType && console.error("contextType was defined as an instance property on %s. Use a static property to define contextType instead.", state);
        Component.childContextTypes && !didWarnAboutChildContextTypes.has(Component) && (didWarnAboutChildContextTypes.add(Component), console.error("%s uses the legacy childContextTypes API which was removed in React 19. Use React.createContext() instead. (https://react.dev/link/legacy-context)", state));
        Component.contextTypes && !didWarnAboutContextTypes$1.has(Component) && (didWarnAboutContextTypes$1.add(Component), console.error("%s uses the legacy contextTypes API which was removed in React 19. Use React.createContext() with static contextType instead. (https://react.dev/link/legacy-context)", state));
        typeof _instance.componentShouldUpdate === "function" && console.error("%s has a method called componentShouldUpdate(). Did you mean shouldComponentUpdate()? The name is phrased as a question because the function is expected to return a value.", state);
        Component.prototype && Component.prototype.isPureReactComponent && typeof _instance.shouldComponentUpdate !== "undefined" && console.error("%s has a method called shouldComponentUpdate(). shouldComponentUpdate should not be used when extending React.PureComponent. Please extend React.Component if shouldComponentUpdate is used.", getComponentNameFromType(Component) || "A pure component");
        typeof _instance.componentDidUnmount === "function" && console.error("%s has a method called componentDidUnmount(). But there is no such lifecycle method. Did you mean componentWillUnmount()?", state);
        typeof _instance.componentDidReceiveProps === "function" && console.error("%s has a method called componentDidReceiveProps(). But there is no such lifecycle method. If you meant to update the state in response to changing props, use componentWillReceiveProps(). If you meant to fetch data or run side-effects or mutations after React has updated the UI, use componentDidUpdate().", state);
        typeof _instance.componentWillRecieveProps === "function" && console.error("%s has a method called componentWillRecieveProps(). Did you mean componentWillReceiveProps()?", state);
        typeof _instance.UNSAFE_componentWillRecieveProps === "function" && console.error("%s has a method called UNSAFE_componentWillRecieveProps(). Did you mean UNSAFE_componentWillReceiveProps()?", state);
        lane = _instance.props !== nextProps;
        _instance.props !== undefined && lane && console.error("When calling super() in `%s`, make sure to pass up the same props that your component's constructor was passed.", state);
        _instance.defaultProps && console.error("Setting defaultProps as an instance property on %s is not supported and will be ignored. Instead, define defaultProps as a static property on %s.", state, state);
        typeof _instance.getSnapshotBeforeUpdate !== "function" || typeof _instance.componentDidUpdate === "function" || didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.has(Component) || (didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate.add(Component), console.error("%s: getSnapshotBeforeUpdate() should be used with componentDidUpdate(). This component defines getSnapshotBeforeUpdate() only.", getComponentNameFromType(Component)));
        typeof _instance.getDerivedStateFromProps === "function" && console.error("%s: getDerivedStateFromProps() is defined as an instance method and will be ignored. Instead, declare it as a static method.", state);
        typeof _instance.getDerivedStateFromError === "function" && console.error("%s: getDerivedStateFromError() is defined as an instance method and will be ignored. Instead, declare it as a static method.", state);
        typeof Component.getSnapshotBeforeUpdate === "function" && console.error("%s: getSnapshotBeforeUpdate() is defined as a static method and will be ignored. Instead, declare it as an instance method.", state);
        (lane = _instance.state) && (typeof lane !== "object" || isArrayImpl(lane)) && console.error("%s.state: must be set to an object or null", state);
        typeof _instance.getChildContext === "function" && typeof Component.childContextTypes !== "object" && console.error("%s.getChildContext(): childContextTypes must be defined in order to use getChildContext().", state);
        _instance = workInProgress2.stateNode;
        _instance.props = nextProps;
        _instance.state = workInProgress2.memoizedState;
        _instance.refs = {};
        initializeUpdateQueue(workInProgress2);
        state = Component.contextType;
        _instance.context = typeof state === "object" && state !== null ? readContext(state) : emptyContextObject;
        _instance.state === nextProps && (state = getComponentNameFromType(Component) || "Component", didWarnAboutDirectlyAssigningPropsToState.has(state) || (didWarnAboutDirectlyAssigningPropsToState.add(state), console.error("%s: It is not recommended to assign props directly to state because updates to props won't be reflected in state. In most cases, it is better to use props directly.", state)));
        workInProgress2.mode & 8 && ReactStrictModeWarnings.recordLegacyContextWarning(workInProgress2, _instance);
        ReactStrictModeWarnings.recordUnsafeLifecycleWarnings(workInProgress2, _instance);
        _instance.state = workInProgress2.memoizedState;
        state = Component.getDerivedStateFromProps;
        typeof state === "function" && (applyDerivedStateFromProps(workInProgress2, Component, state, nextProps), _instance.state = workInProgress2.memoizedState);
        typeof Component.getDerivedStateFromProps === "function" || typeof _instance.getSnapshotBeforeUpdate === "function" || typeof _instance.UNSAFE_componentWillMount !== "function" && typeof _instance.componentWillMount !== "function" || (state = _instance.state, typeof _instance.componentWillMount === "function" && _instance.componentWillMount(), typeof _instance.UNSAFE_componentWillMount === "function" && _instance.UNSAFE_componentWillMount(), state !== _instance.state && (console.error("%s.componentWillMount(): Assigning directly to this.state is deprecated (except inside a component's constructor). Use setState instead.", getComponentNameFromFiber(workInProgress2) || "Component"), classComponentUpdater.enqueueReplaceState(_instance, _instance.state, null)), processUpdateQueue(workInProgress2, nextProps, _instance, renderLanes2), suspendIfUpdateReadFromEntangledAsyncAction(), _instance.state = workInProgress2.memoizedState);
        typeof _instance.componentDidMount === "function" && (workInProgress2.flags |= 4194308);
        (workInProgress2.mode & 16) !== NoMode && (workInProgress2.flags |= 134217728);
        _instance = true;
      } else if (current2 === null) {
        _instance = workInProgress2.stateNode;
        var unresolvedOldProps = workInProgress2.memoizedProps;
        lane = resolveClassComponentProps(Component, unresolvedOldProps);
        _instance.props = lane;
        var oldContext = _instance.context;
        foundWillUpdateName = Component.contextType;
        state = emptyContextObject;
        typeof foundWillUpdateName === "object" && foundWillUpdateName !== null && (state = readContext(foundWillUpdateName));
        newApiName = Component.getDerivedStateFromProps;
        foundWillUpdateName = typeof newApiName === "function" || typeof _instance.getSnapshotBeforeUpdate === "function";
        unresolvedOldProps = workInProgress2.pendingProps !== unresolvedOldProps;
        foundWillUpdateName || typeof _instance.UNSAFE_componentWillReceiveProps !== "function" && typeof _instance.componentWillReceiveProps !== "function" || (unresolvedOldProps || oldContext !== state) && callComponentWillReceiveProps(workInProgress2, _instance, nextProps, state);
        hasForceUpdate = false;
        var oldState = workInProgress2.memoizedState;
        _instance.state = oldState;
        processUpdateQueue(workInProgress2, nextProps, _instance, renderLanes2);
        suspendIfUpdateReadFromEntangledAsyncAction();
        oldContext = workInProgress2.memoizedState;
        unresolvedOldProps || oldState !== oldContext || hasForceUpdate ? (typeof newApiName === "function" && (applyDerivedStateFromProps(workInProgress2, Component, newApiName, nextProps), oldContext = workInProgress2.memoizedState), (lane = hasForceUpdate || checkShouldComponentUpdate(workInProgress2, Component, lane, nextProps, oldState, oldContext, state)) ? (foundWillUpdateName || typeof _instance.UNSAFE_componentWillMount !== "function" && typeof _instance.componentWillMount !== "function" || (typeof _instance.componentWillMount === "function" && _instance.componentWillMount(), typeof _instance.UNSAFE_componentWillMount === "function" && _instance.UNSAFE_componentWillMount()), typeof _instance.componentDidMount === "function" && (workInProgress2.flags |= 4194308), (workInProgress2.mode & 16) !== NoMode && (workInProgress2.flags |= 134217728)) : (typeof _instance.componentDidMount === "function" && (workInProgress2.flags |= 4194308), (workInProgress2.mode & 16) !== NoMode && (workInProgress2.flags |= 134217728), workInProgress2.memoizedProps = nextProps, workInProgress2.memoizedState = oldContext), _instance.props = nextProps, _instance.state = oldContext, _instance.context = state, _instance = lane) : (typeof _instance.componentDidMount === "function" && (workInProgress2.flags |= 4194308), (workInProgress2.mode & 16) !== NoMode && (workInProgress2.flags |= 134217728), _instance = false);
      } else {
        _instance = workInProgress2.stateNode;
        cloneUpdateQueue(current2, workInProgress2);
        state = workInProgress2.memoizedProps;
        foundWillUpdateName = resolveClassComponentProps(Component, state);
        _instance.props = foundWillUpdateName;
        newApiName = workInProgress2.pendingProps;
        oldState = _instance.context;
        oldContext = Component.contextType;
        lane = emptyContextObject;
        typeof oldContext === "object" && oldContext !== null && (lane = readContext(oldContext));
        unresolvedOldProps = Component.getDerivedStateFromProps;
        (oldContext = typeof unresolvedOldProps === "function" || typeof _instance.getSnapshotBeforeUpdate === "function") || typeof _instance.UNSAFE_componentWillReceiveProps !== "function" && typeof _instance.componentWillReceiveProps !== "function" || (state !== newApiName || oldState !== lane) && callComponentWillReceiveProps(workInProgress2, _instance, nextProps, lane);
        hasForceUpdate = false;
        oldState = workInProgress2.memoizedState;
        _instance.state = oldState;
        processUpdateQueue(workInProgress2, nextProps, _instance, renderLanes2);
        suspendIfUpdateReadFromEntangledAsyncAction();
        var newState = workInProgress2.memoizedState;
        state !== newApiName || oldState !== newState || hasForceUpdate || current2 !== null && current2.dependencies !== null && checkIfContextChanged(current2.dependencies) ? (typeof unresolvedOldProps === "function" && (applyDerivedStateFromProps(workInProgress2, Component, unresolvedOldProps, nextProps), newState = workInProgress2.memoizedState), (foundWillUpdateName = hasForceUpdate || checkShouldComponentUpdate(workInProgress2, Component, foundWillUpdateName, nextProps, oldState, newState, lane) || current2 !== null && current2.dependencies !== null && checkIfContextChanged(current2.dependencies)) ? (oldContext || typeof _instance.UNSAFE_componentWillUpdate !== "function" && typeof _instance.componentWillUpdate !== "function" || (typeof _instance.componentWillUpdate === "function" && _instance.componentWillUpdate(nextProps, newState, lane), typeof _instance.UNSAFE_componentWillUpdate === "function" && _instance.UNSAFE_componentWillUpdate(nextProps, newState, lane)), typeof _instance.componentDidUpdate === "function" && (workInProgress2.flags |= 4), typeof _instance.getSnapshotBeforeUpdate === "function" && (workInProgress2.flags |= 1024)) : (typeof _instance.componentDidUpdate !== "function" || state === current2.memoizedProps && oldState === current2.memoizedState || (workInProgress2.flags |= 4), typeof _instance.getSnapshotBeforeUpdate !== "function" || state === current2.memoizedProps && oldState === current2.memoizedState || (workInProgress2.flags |= 1024), workInProgress2.memoizedProps = nextProps, workInProgress2.memoizedState = newState), _instance.props = nextProps, _instance.state = newState, _instance.context = lane, _instance = foundWillUpdateName) : (typeof _instance.componentDidUpdate !== "function" || state === current2.memoizedProps && oldState === current2.memoizedState || (workInProgress2.flags |= 4), typeof _instance.getSnapshotBeforeUpdate !== "function" || state === current2.memoizedProps && oldState === current2.memoizedState || (workInProgress2.flags |= 1024), _instance = false);
      }
      lane = _instance;
      markRef(current2, workInProgress2);
      state = (workInProgress2.flags & 128) !== 0;
      if (lane || state) {
        lane = workInProgress2.stateNode;
        setCurrentFiber(workInProgress2);
        if (state && typeof Component.getDerivedStateFromError !== "function")
          Component = null, profilerStartTime = -1;
        else {
          markComponentRenderStarted(workInProgress2);
          Component = callRenderInDEV(lane);
          if (workInProgress2.mode & 8) {
            setIsStrictModeForDevtools(true);
            try {
              callRenderInDEV(lane);
            } finally {
              setIsStrictModeForDevtools(false);
            }
          }
          markComponentRenderStopped();
        }
        workInProgress2.flags |= 1;
        current2 !== null && state ? (workInProgress2.child = reconcileChildFibers(workInProgress2, current2.child, null, renderLanes2), workInProgress2.child = reconcileChildFibers(workInProgress2, null, Component, renderLanes2)) : reconcileChildren(current2, workInProgress2, Component, renderLanes2);
        workInProgress2.memoizedState = lane.state;
        current2 = workInProgress2.child;
      } else
        current2 = bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
      renderLanes2 = workInProgress2.stateNode;
      _instance && renderLanes2.props !== nextProps && (didWarnAboutReassigningProps || console.error("It looks like %s is reassigning its own `this.props` while rendering. This is not supported and can lead to confusing bugs.", getComponentNameFromFiber(workInProgress2) || "a component"), didWarnAboutReassigningProps = true);
      return current2;
    }
    function mountHostRootWithoutHydrating(current2, workInProgress2, nextChildren, renderLanes2) {
      resetHydrationState();
      workInProgress2.flags |= 256;
      reconcileChildren(current2, workInProgress2, nextChildren, renderLanes2);
      return workInProgress2.child;
    }
    function validateFunctionComponentInDev(workInProgress2, Component) {
      Component && Component.childContextTypes && console.error(`childContextTypes cannot be defined on a function component.
  %s.childContextTypes = ...`, Component.displayName || Component.name || "Component");
      typeof Component.getDerivedStateFromProps === "function" && (workInProgress2 = getComponentNameFromType(Component) || "Unknown", didWarnAboutGetDerivedStateOnFunctionComponent[workInProgress2] || (console.error("%s: Function components do not support getDerivedStateFromProps.", workInProgress2), didWarnAboutGetDerivedStateOnFunctionComponent[workInProgress2] = true));
      typeof Component.contextType === "object" && Component.contextType !== null && (Component = getComponentNameFromType(Component) || "Unknown", didWarnAboutContextTypeOnFunctionComponent[Component] || (console.error("%s: Function components do not support contextType.", Component), didWarnAboutContextTypeOnFunctionComponent[Component] = true));
    }
    function mountSuspenseOffscreenState(renderLanes2) {
      return { baseLanes: renderLanes2, cachePool: getSuspendedCache() };
    }
    function getRemainingWorkInPrimaryTree(current2, primaryTreeDidDefer, renderLanes2) {
      current2 = current2 !== null ? current2.childLanes & ~renderLanes2 : 0;
      primaryTreeDidDefer && (current2 |= workInProgressDeferredLane);
      return current2;
    }
    function updateSuspenseComponent(current2, workInProgress2, renderLanes2) {
      var nextProps = workInProgress2.pendingProps;
      shouldSuspendImpl(workInProgress2) && (workInProgress2.flags |= 128);
      var showFallback = false, didSuspend = (workInProgress2.flags & 128) !== 0, JSCompiler_temp;
      (JSCompiler_temp = didSuspend) || (JSCompiler_temp = current2 !== null && current2.memoizedState === null ? false : (suspenseStackCursor.current & ForceSuspenseFallback) !== 0);
      JSCompiler_temp && (showFallback = true, workInProgress2.flags &= -129);
      JSCompiler_temp = (workInProgress2.flags & 32) !== 0;
      workInProgress2.flags &= -33;
      if (current2 === null) {
        if (isHydrating) {
          showFallback ? pushPrimaryTreeSuspenseHandler(workInProgress2) : reuseSuspenseHandlerOnStack(workInProgress2);
          if (isHydrating) {
            var nextInstance = nextHydratableInstance, JSCompiler_temp$jscomp$0;
            (JSCompiler_temp$jscomp$0 = !nextInstance) || (JSCompiler_temp$jscomp$0 = canHydrateSuspenseInstance(nextInstance, rootOrSingletonContext), JSCompiler_temp$jscomp$0 !== null ? (warnIfNotHydrating(), workInProgress2.memoizedState = {
              dehydrated: JSCompiler_temp$jscomp$0,
              treeContext: treeContextProvider !== null ? { id: treeContextId, overflow: treeContextOverflow } : null,
              retryLane: 536870912,
              hydrationErrors: null
            }, didSuspend = createFiber(18, null, null, NoMode), didSuspend.stateNode = JSCompiler_temp$jscomp$0, didSuspend.return = workInProgress2, workInProgress2.child = didSuspend, hydrationParentFiber = workInProgress2, nextHydratableInstance = null, JSCompiler_temp$jscomp$0 = true) : JSCompiler_temp$jscomp$0 = false, JSCompiler_temp$jscomp$0 = !JSCompiler_temp$jscomp$0);
            JSCompiler_temp$jscomp$0 && (warnNonHydratedInstance(workInProgress2, nextInstance), throwOnHydrationMismatch(workInProgress2));
          }
          nextInstance = workInProgress2.memoizedState;
          if (nextInstance !== null && (nextInstance = nextInstance.dehydrated, nextInstance !== null))
            return isSuspenseInstanceFallback(nextInstance) ? workInProgress2.lanes = 32 : workInProgress2.lanes = 536870912, null;
          popSuspenseHandler(workInProgress2);
        }
        nextInstance = nextProps.children;
        nextProps = nextProps.fallback;
        if (showFallback)
          return reuseSuspenseHandlerOnStack(workInProgress2), showFallback = workInProgress2.mode, nextInstance = mountWorkInProgressOffscreenFiber({ mode: "hidden", children: nextInstance }, showFallback), nextProps = createFiberFromFragment(nextProps, showFallback, renderLanes2, null), nextInstance.return = workInProgress2, nextProps.return = workInProgress2, nextInstance.sibling = nextProps, workInProgress2.child = nextInstance, showFallback = workInProgress2.child, showFallback.memoizedState = mountSuspenseOffscreenState(renderLanes2), showFallback.childLanes = getRemainingWorkInPrimaryTree(current2, JSCompiler_temp, renderLanes2), workInProgress2.memoizedState = SUSPENDED_MARKER, nextProps;
        pushPrimaryTreeSuspenseHandler(workInProgress2);
        return mountSuspensePrimaryChildren(workInProgress2, nextInstance);
      }
      JSCompiler_temp$jscomp$0 = current2.memoizedState;
      if (JSCompiler_temp$jscomp$0 !== null && (nextInstance = JSCompiler_temp$jscomp$0.dehydrated, nextInstance !== null)) {
        if (didSuspend)
          workInProgress2.flags & 256 ? (pushPrimaryTreeSuspenseHandler(workInProgress2), workInProgress2.flags &= -257, workInProgress2 = retrySuspenseComponentWithoutHydrating(current2, workInProgress2, renderLanes2)) : workInProgress2.memoizedState !== null ? (reuseSuspenseHandlerOnStack(workInProgress2), workInProgress2.child = current2.child, workInProgress2.flags |= 128, workInProgress2 = null) : (reuseSuspenseHandlerOnStack(workInProgress2), showFallback = nextProps.fallback, nextInstance = workInProgress2.mode, nextProps = mountWorkInProgressOffscreenFiber({ mode: "visible", children: nextProps.children }, nextInstance), showFallback = createFiberFromFragment(showFallback, nextInstance, renderLanes2, null), showFallback.flags |= 2, nextProps.return = workInProgress2, showFallback.return = workInProgress2, nextProps.sibling = showFallback, workInProgress2.child = nextProps, reconcileChildFibers(workInProgress2, current2.child, null, renderLanes2), nextProps = workInProgress2.child, nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes2), nextProps.childLanes = getRemainingWorkInPrimaryTree(current2, JSCompiler_temp, renderLanes2), workInProgress2.memoizedState = SUSPENDED_MARKER, workInProgress2 = showFallback);
        else if (pushPrimaryTreeSuspenseHandler(workInProgress2), isHydrating && console.error("We should not be hydrating here. This is a bug in React. Please file a bug."), isSuspenseInstanceFallback(nextInstance))
          nextInstance = getSuspenseInstanceFallbackErrorDetails(nextInstance), JSCompiler_temp = nextInstance.digest, showFallback = nextInstance.message, nextProps = nextInstance.stack, nextInstance = nextInstance.componentStack, showFallback = showFallback ? Error(showFallback) : Error("The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering."), showFallback.stack = nextProps || "", showFallback.digest = JSCompiler_temp, JSCompiler_temp = nextInstance === undefined ? null : nextInstance, nextProps = {
            value: showFallback,
            source: null,
            stack: JSCompiler_temp
          }, typeof JSCompiler_temp === "string" && CapturedStacks.set(showFallback, nextProps), queueHydrationError(nextProps), workInProgress2 = retrySuspenseComponentWithoutHydrating(current2, workInProgress2, renderLanes2);
        else if (didReceiveUpdate || propagateParentContextChanges(current2, workInProgress2, renderLanes2, false), JSCompiler_temp = (renderLanes2 & current2.childLanes) !== 0, didReceiveUpdate || JSCompiler_temp) {
          JSCompiler_temp = workInProgressRoot;
          if (JSCompiler_temp !== null && (nextProps = renderLanes2 & -renderLanes2, nextProps = (nextProps & 42) !== 0 ? 1 : getBumpedLaneForHydrationByLane(nextProps), nextProps = (nextProps & (JSCompiler_temp.suspendedLanes | renderLanes2)) !== 0 ? 0 : nextProps, nextProps !== 0 && nextProps !== JSCompiler_temp$jscomp$0.retryLane))
            throw JSCompiler_temp$jscomp$0.retryLane = nextProps, enqueueConcurrentRenderForLane(current2, nextProps), scheduleUpdateOnFiber(JSCompiler_temp, current2, nextProps), SelectiveHydrationException;
          isSuspenseInstancePending(nextInstance) || renderDidSuspendDelayIfPossible();
          workInProgress2 = retrySuspenseComponentWithoutHydrating(current2, workInProgress2, renderLanes2);
        } else
          isSuspenseInstancePending(nextInstance) ? (workInProgress2.flags |= 192, workInProgress2.child = current2.child, workInProgress2 = null) : (current2 = JSCompiler_temp$jscomp$0.treeContext, supportsHydration && (nextHydratableInstance = getFirstHydratableChildWithinSuspenseInstance(nextInstance), hydrationParentFiber = workInProgress2, isHydrating = true, hydrationErrors = null, didSuspendOrErrorDEV = false, hydrationDiffRootDEV = null, rootOrSingletonContext = false, current2 !== null && (warnIfNotHydrating(), idStack[idStackIndex++] = treeContextId, idStack[idStackIndex++] = treeContextOverflow, idStack[idStackIndex++] = treeContextProvider, treeContextId = current2.id, treeContextOverflow = current2.overflow, treeContextProvider = workInProgress2)), workInProgress2 = mountSuspensePrimaryChildren(workInProgress2, nextProps.children), workInProgress2.flags |= 4096);
        return workInProgress2;
      }
      if (showFallback)
        return reuseSuspenseHandlerOnStack(workInProgress2), showFallback = nextProps.fallback, nextInstance = workInProgress2.mode, JSCompiler_temp$jscomp$0 = current2.child, didSuspend = JSCompiler_temp$jscomp$0.sibling, nextProps = createWorkInProgress(JSCompiler_temp$jscomp$0, {
          mode: "hidden",
          children: nextProps.children
        }), nextProps.subtreeFlags = JSCompiler_temp$jscomp$0.subtreeFlags & 65011712, didSuspend !== null ? showFallback = createWorkInProgress(didSuspend, showFallback) : (showFallback = createFiberFromFragment(showFallback, nextInstance, renderLanes2, null), showFallback.flags |= 2), showFallback.return = workInProgress2, nextProps.return = workInProgress2, nextProps.sibling = showFallback, workInProgress2.child = nextProps, nextProps = showFallback, showFallback = workInProgress2.child, nextInstance = current2.child.memoizedState, nextInstance === null ? nextInstance = mountSuspenseOffscreenState(renderLanes2) : (JSCompiler_temp$jscomp$0 = nextInstance.cachePool, JSCompiler_temp$jscomp$0 !== null ? (didSuspend = isPrimaryRenderer ? CacheContext._currentValue : CacheContext._currentValue2, JSCompiler_temp$jscomp$0 = JSCompiler_temp$jscomp$0.parent !== didSuspend ? { parent: didSuspend, pool: didSuspend } : JSCompiler_temp$jscomp$0) : JSCompiler_temp$jscomp$0 = getSuspendedCache(), nextInstance = {
          baseLanes: nextInstance.baseLanes | renderLanes2,
          cachePool: JSCompiler_temp$jscomp$0
        }), showFallback.memoizedState = nextInstance, showFallback.childLanes = getRemainingWorkInPrimaryTree(current2, JSCompiler_temp, renderLanes2), workInProgress2.memoizedState = SUSPENDED_MARKER, nextProps;
      pushPrimaryTreeSuspenseHandler(workInProgress2);
      renderLanes2 = current2.child;
      current2 = renderLanes2.sibling;
      renderLanes2 = createWorkInProgress(renderLanes2, {
        mode: "visible",
        children: nextProps.children
      });
      renderLanes2.return = workInProgress2;
      renderLanes2.sibling = null;
      current2 !== null && (JSCompiler_temp = workInProgress2.deletions, JSCompiler_temp === null ? (workInProgress2.deletions = [current2], workInProgress2.flags |= 16) : JSCompiler_temp.push(current2));
      workInProgress2.child = renderLanes2;
      workInProgress2.memoizedState = null;
      return renderLanes2;
    }
    function mountSuspensePrimaryChildren(workInProgress2, primaryChildren) {
      primaryChildren = mountWorkInProgressOffscreenFiber({ mode: "visible", children: primaryChildren }, workInProgress2.mode);
      primaryChildren.return = workInProgress2;
      return workInProgress2.child = primaryChildren;
    }
    function mountWorkInProgressOffscreenFiber(offscreenProps, mode) {
      offscreenProps = createFiber(22, offscreenProps, null, mode);
      offscreenProps.lanes = 0;
      offscreenProps.stateNode = {
        _visibility: 1,
        _pendingMarkers: null,
        _retryCache: null,
        _transitions: null
      };
      return offscreenProps;
    }
    function retrySuspenseComponentWithoutHydrating(current2, workInProgress2, renderLanes2) {
      reconcileChildFibers(workInProgress2, current2.child, null, renderLanes2);
      current2 = mountSuspensePrimaryChildren(workInProgress2, workInProgress2.pendingProps.children);
      current2.flags |= 2;
      workInProgress2.memoizedState = null;
      return current2;
    }
    function scheduleSuspenseWorkOnFiber(fiber, renderLanes2, propagationRoot) {
      fiber.lanes |= renderLanes2;
      var alternate = fiber.alternate;
      alternate !== null && (alternate.lanes |= renderLanes2);
      scheduleContextWorkOnParentPath(fiber.return, renderLanes2, propagationRoot);
    }
    function validateSuspenseListNestedChild(childSlot, index) {
      var isAnArray = isArrayImpl(childSlot);
      childSlot = !isAnArray && typeof getIteratorFn(childSlot) === "function";
      return isAnArray || childSlot ? (isAnArray = isAnArray ? "array" : "iterable", console.error("A nested %s was passed to row #%s in <SuspenseList />. Wrap it in an additional SuspenseList to configure its revealOrder: <SuspenseList revealOrder=...> ... <SuspenseList revealOrder=...>{%s}</SuspenseList> ... </SuspenseList>", isAnArray, index, isAnArray), false) : true;
    }
    function initSuspenseListRenderState(workInProgress2, isBackwards, tail, lastContentRow, tailMode) {
      var renderState = workInProgress2.memoizedState;
      renderState === null ? workInProgress2.memoizedState = {
        isBackwards,
        rendering: null,
        renderingStartTime: 0,
        last: lastContentRow,
        tail,
        tailMode
      } : (renderState.isBackwards = isBackwards, renderState.rendering = null, renderState.renderingStartTime = 0, renderState.last = lastContentRow, renderState.tail = tail, renderState.tailMode = tailMode);
    }
    function updateSuspenseListComponent(current2, workInProgress2, renderLanes2) {
      var nextProps = workInProgress2.pendingProps, revealOrder = nextProps.revealOrder, tailMode = nextProps.tail;
      nextProps = nextProps.children;
      if (revealOrder !== undefined && revealOrder !== "forwards" && revealOrder !== "backwards" && revealOrder !== "together" && !didWarnAboutRevealOrder[revealOrder])
        if (didWarnAboutRevealOrder[revealOrder] = true, typeof revealOrder === "string")
          switch (revealOrder.toLowerCase()) {
            case "together":
            case "forwards":
            case "backwards":
              console.error('"%s" is not a valid value for revealOrder on <SuspenseList />. Use lowercase "%s" instead.', revealOrder, revealOrder.toLowerCase());
              break;
            case "forward":
            case "backward":
              console.error('"%s" is not a valid value for revealOrder on <SuspenseList />. React uses the -s suffix in the spelling. Use "%ss" instead.', revealOrder, revealOrder.toLowerCase());
              break;
            default:
              console.error('"%s" is not a supported revealOrder on <SuspenseList />. Did you mean "together", "forwards" or "backwards"?', revealOrder);
          }
        else
          console.error('%s is not a supported value for revealOrder on <SuspenseList />. Did you mean "together", "forwards" or "backwards"?', revealOrder);
      tailMode === undefined || didWarnAboutTailOptions[tailMode] || (tailMode !== "collapsed" && tailMode !== "hidden" ? (didWarnAboutTailOptions[tailMode] = true, console.error('"%s" is not a supported value for tail on <SuspenseList />. Did you mean "collapsed" or "hidden"?', tailMode)) : revealOrder !== "forwards" && revealOrder !== "backwards" && (didWarnAboutTailOptions[tailMode] = true, console.error('<SuspenseList tail="%s" /> is only valid if revealOrder is "forwards" or "backwards". Did you mean to specify revealOrder="forwards"?', tailMode)));
      a:
        if ((revealOrder === "forwards" || revealOrder === "backwards") && nextProps !== undefined && nextProps !== null && nextProps !== false)
          if (isArrayImpl(nextProps))
            for (var i = 0;i < nextProps.length; i++) {
              if (!validateSuspenseListNestedChild(nextProps[i], i))
                break a;
            }
          else if (i = getIteratorFn(nextProps), typeof i === "function") {
            if (i = i.call(nextProps))
              for (var step = i.next(), _i = 0;!step.done; step = i.next()) {
                if (!validateSuspenseListNestedChild(step.value, _i))
                  break a;
                _i++;
              }
          } else
            console.error('A single row was passed to a <SuspenseList revealOrder="%s" />. This is not useful since it needs multiple rows. Did you mean to pass multiple children or an array?', revealOrder);
      reconcileChildren(current2, workInProgress2, nextProps, renderLanes2);
      nextProps = suspenseStackCursor.current;
      if ((nextProps & ForceSuspenseFallback) !== 0)
        nextProps = nextProps & SubtreeSuspenseContextMask | ForceSuspenseFallback, workInProgress2.flags |= 128;
      else {
        if (current2 !== null && (current2.flags & 128) !== 0)
          a:
            for (current2 = workInProgress2.child;current2 !== null; ) {
              if (current2.tag === 13)
                current2.memoizedState !== null && scheduleSuspenseWorkOnFiber(current2, renderLanes2, workInProgress2);
              else if (current2.tag === 19)
                scheduleSuspenseWorkOnFiber(current2, renderLanes2, workInProgress2);
              else if (current2.child !== null) {
                current2.child.return = current2;
                current2 = current2.child;
                continue;
              }
              if (current2 === workInProgress2)
                break a;
              for (;current2.sibling === null; ) {
                if (current2.return === null || current2.return === workInProgress2)
                  break a;
                current2 = current2.return;
              }
              current2.sibling.return = current2.return;
              current2 = current2.sibling;
            }
        nextProps &= SubtreeSuspenseContextMask;
      }
      push(suspenseStackCursor, nextProps, workInProgress2);
      switch (revealOrder) {
        case "forwards":
          renderLanes2 = workInProgress2.child;
          for (revealOrder = null;renderLanes2 !== null; )
            current2 = renderLanes2.alternate, current2 !== null && findFirstSuspended(current2) === null && (revealOrder = renderLanes2), renderLanes2 = renderLanes2.sibling;
          renderLanes2 = revealOrder;
          renderLanes2 === null ? (revealOrder = workInProgress2.child, workInProgress2.child = null) : (revealOrder = renderLanes2.sibling, renderLanes2.sibling = null);
          initSuspenseListRenderState(workInProgress2, false, revealOrder, renderLanes2, tailMode);
          break;
        case "backwards":
          renderLanes2 = null;
          revealOrder = workInProgress2.child;
          for (workInProgress2.child = null;revealOrder !== null; ) {
            current2 = revealOrder.alternate;
            if (current2 !== null && findFirstSuspended(current2) === null) {
              workInProgress2.child = revealOrder;
              break;
            }
            current2 = revealOrder.sibling;
            revealOrder.sibling = renderLanes2;
            renderLanes2 = revealOrder;
            revealOrder = current2;
          }
          initSuspenseListRenderState(workInProgress2, true, renderLanes2, null, tailMode);
          break;
        case "together":
          initSuspenseListRenderState(workInProgress2, false, null, null, undefined);
          break;
        default:
          workInProgress2.memoizedState = null;
      }
      return workInProgress2.child;
    }
    function bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2) {
      current2 !== null && (workInProgress2.dependencies = current2.dependencies);
      profilerStartTime = -1;
      workInProgressRootSkippedLanes |= workInProgress2.lanes;
      if ((renderLanes2 & workInProgress2.childLanes) === 0)
        if (current2 !== null) {
          if (propagateParentContextChanges(current2, workInProgress2, renderLanes2, false), (renderLanes2 & workInProgress2.childLanes) === 0)
            return null;
        } else
          return null;
      if (current2 !== null && workInProgress2.child !== current2.child)
        throw Error("Resuming work not yet implemented.");
      if (workInProgress2.child !== null) {
        current2 = workInProgress2.child;
        renderLanes2 = createWorkInProgress(current2, current2.pendingProps);
        workInProgress2.child = renderLanes2;
        for (renderLanes2.return = workInProgress2;current2.sibling !== null; )
          current2 = current2.sibling, renderLanes2 = renderLanes2.sibling = createWorkInProgress(current2, current2.pendingProps), renderLanes2.return = workInProgress2;
        renderLanes2.sibling = null;
      }
      return workInProgress2.child;
    }
    function checkScheduledUpdateOrContext(current2, renderLanes2) {
      if ((current2.lanes & renderLanes2) !== 0)
        return true;
      current2 = current2.dependencies;
      return current2 !== null && checkIfContextChanged(current2) ? true : false;
    }
    function attemptEarlyBailoutIfNoScheduledUpdate(current2, workInProgress2, renderLanes2) {
      switch (workInProgress2.tag) {
        case 3:
          pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
          pushProvider(workInProgress2, CacheContext, current2.memoizedState.cache);
          resetHydrationState();
          break;
        case 27:
        case 5:
          pushHostContext(workInProgress2);
          break;
        case 4:
          pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
          break;
        case 10:
          pushProvider(workInProgress2, workInProgress2.type, workInProgress2.memoizedProps.value);
          break;
        case 12:
          (renderLanes2 & workInProgress2.childLanes) !== 0 && (workInProgress2.flags |= 4);
          workInProgress2.flags |= 2048;
          var stateNode = workInProgress2.stateNode;
          stateNode.effectDuration = -0;
          stateNode.passiveEffectDuration = -0;
          break;
        case 13:
          stateNode = workInProgress2.memoizedState;
          if (stateNode !== null) {
            if (stateNode.dehydrated !== null)
              return pushPrimaryTreeSuspenseHandler(workInProgress2), workInProgress2.flags |= 128, null;
            if ((renderLanes2 & workInProgress2.child.childLanes) !== 0)
              return updateSuspenseComponent(current2, workInProgress2, renderLanes2);
            pushPrimaryTreeSuspenseHandler(workInProgress2);
            current2 = bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
            return current2 !== null ? current2.sibling : null;
          }
          pushPrimaryTreeSuspenseHandler(workInProgress2);
          break;
        case 19:
          var didSuspendBefore = (current2.flags & 128) !== 0;
          stateNode = (renderLanes2 & workInProgress2.childLanes) !== 0;
          stateNode || (propagateParentContextChanges(current2, workInProgress2, renderLanes2, false), stateNode = (renderLanes2 & workInProgress2.childLanes) !== 0);
          if (didSuspendBefore) {
            if (stateNode)
              return updateSuspenseListComponent(current2, workInProgress2, renderLanes2);
            workInProgress2.flags |= 128;
          }
          didSuspendBefore = workInProgress2.memoizedState;
          didSuspendBefore !== null && (didSuspendBefore.rendering = null, didSuspendBefore.tail = null, didSuspendBefore.lastEffect = null);
          push(suspenseStackCursor, suspenseStackCursor.current, workInProgress2);
          if (stateNode)
            break;
          else
            return null;
        case 22:
        case 23:
          return workInProgress2.lanes = 0, updateOffscreenComponent(current2, workInProgress2, renderLanes2);
        case 24:
          pushProvider(workInProgress2, CacheContext, current2.memoizedState.cache);
      }
      return bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
    }
    function beginWork(current2, workInProgress2, renderLanes2) {
      if (workInProgress2._debugNeedsRemount && current2 !== null) {
        renderLanes2 = createFiberFromTypeAndProps(workInProgress2.type, workInProgress2.key, workInProgress2.pendingProps, workInProgress2._debugOwner || null, workInProgress2.mode, workInProgress2.lanes);
        renderLanes2._debugStack = workInProgress2._debugStack;
        renderLanes2._debugTask = workInProgress2._debugTask;
        var returnFiber = workInProgress2.return;
        if (returnFiber === null)
          throw Error("Cannot swap the root fiber.");
        current2.alternate = null;
        workInProgress2.alternate = null;
        renderLanes2.index = workInProgress2.index;
        renderLanes2.sibling = workInProgress2.sibling;
        renderLanes2.return = workInProgress2.return;
        renderLanes2.ref = workInProgress2.ref;
        renderLanes2._debugInfo = workInProgress2._debugInfo;
        if (workInProgress2 === returnFiber.child)
          returnFiber.child = renderLanes2;
        else {
          var prevSibling = returnFiber.child;
          if (prevSibling === null)
            throw Error("Expected parent to have a child.");
          for (;prevSibling.sibling !== workInProgress2; )
            if (prevSibling = prevSibling.sibling, prevSibling === null)
              throw Error("Expected to find the previous sibling.");
          prevSibling.sibling = renderLanes2;
        }
        workInProgress2 = returnFiber.deletions;
        workInProgress2 === null ? (returnFiber.deletions = [current2], returnFiber.flags |= 16) : workInProgress2.push(current2);
        renderLanes2.flags |= 2;
        return renderLanes2;
      }
      if (current2 !== null)
        if (current2.memoizedProps !== workInProgress2.pendingProps || workInProgress2.type !== current2.type)
          didReceiveUpdate = true;
        else {
          if (!checkScheduledUpdateOrContext(current2, renderLanes2) && (workInProgress2.flags & 128) === 0)
            return didReceiveUpdate = false, attemptEarlyBailoutIfNoScheduledUpdate(current2, workInProgress2, renderLanes2);
          didReceiveUpdate = (current2.flags & 131072) !== 0 ? true : false;
        }
      else {
        didReceiveUpdate = false;
        if (returnFiber = isHydrating)
          warnIfNotHydrating(), returnFiber = (workInProgress2.flags & 1048576) !== 0;
        returnFiber && (returnFiber = workInProgress2.index, warnIfNotHydrating(), pushTreeId(workInProgress2, treeForkCount, returnFiber));
      }
      workInProgress2.lanes = 0;
      switch (workInProgress2.tag) {
        case 16:
          a:
            if (returnFiber = workInProgress2.pendingProps, current2 = callLazyInitInDEV(workInProgress2.elementType), workInProgress2.type = current2, typeof current2 === "function")
              shouldConstruct(current2) ? (returnFiber = resolveClassComponentProps(current2, returnFiber), workInProgress2.tag = 1, workInProgress2.type = current2 = resolveFunctionForHotReloading(current2), workInProgress2 = updateClassComponent(null, workInProgress2, current2, returnFiber, renderLanes2)) : (workInProgress2.tag = 0, validateFunctionComponentInDev(workInProgress2, current2), workInProgress2.type = current2 = resolveFunctionForHotReloading(current2), workInProgress2 = updateFunctionComponent(null, workInProgress2, current2, returnFiber, renderLanes2));
            else {
              if (current2 !== undefined && current2 !== null) {
                if (prevSibling = current2.$$typeof, prevSibling === REACT_FORWARD_REF_TYPE) {
                  workInProgress2.tag = 11;
                  workInProgress2.type = current2 = resolveForwardRefForHotReloading(current2);
                  workInProgress2 = updateForwardRef(null, workInProgress2, current2, returnFiber, renderLanes2);
                  break a;
                } else if (prevSibling === REACT_MEMO_TYPE) {
                  workInProgress2.tag = 14;
                  workInProgress2 = updateMemoComponent(null, workInProgress2, current2, returnFiber, renderLanes2);
                  break a;
                }
              }
              workInProgress2 = "";
              current2 !== null && typeof current2 === "object" && current2.$$typeof === REACT_LAZY_TYPE && (workInProgress2 = " Did you wrap a component in React.lazy() more than once?");
              current2 = getComponentNameFromType(current2) || current2;
              throw Error("Element type is invalid. Received a promise that resolves to: " + current2 + ". Lazy element type must resolve to a class or function." + workInProgress2);
            }
          return workInProgress2;
        case 0:
          return updateFunctionComponent(current2, workInProgress2, workInProgress2.type, workInProgress2.pendingProps, renderLanes2);
        case 1:
          return returnFiber = workInProgress2.type, prevSibling = resolveClassComponentProps(returnFiber, workInProgress2.pendingProps), updateClassComponent(current2, workInProgress2, returnFiber, prevSibling, renderLanes2);
        case 3:
          a: {
            pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo);
            if (current2 === null)
              throw Error("Should have a current fiber. This is a bug in React.");
            var nextProps = workInProgress2.pendingProps;
            prevSibling = workInProgress2.memoizedState;
            returnFiber = prevSibling.element;
            cloneUpdateQueue(current2, workInProgress2);
            processUpdateQueue(workInProgress2, nextProps, null, renderLanes2);
            var nextState = workInProgress2.memoizedState;
            nextProps = nextState.cache;
            pushProvider(workInProgress2, CacheContext, nextProps);
            nextProps !== prevSibling.cache && propagateContextChanges(workInProgress2, [CacheContext], renderLanes2, true);
            suspendIfUpdateReadFromEntangledAsyncAction();
            nextProps = nextState.element;
            if (supportsHydration && prevSibling.isDehydrated)
              if (prevSibling = {
                element: nextProps,
                isDehydrated: false,
                cache: nextState.cache
              }, workInProgress2.updateQueue.baseState = prevSibling, workInProgress2.memoizedState = prevSibling, workInProgress2.flags & 256) {
                workInProgress2 = mountHostRootWithoutHydrating(current2, workInProgress2, nextProps, renderLanes2);
                break a;
              } else if (nextProps !== returnFiber) {
                returnFiber = createCapturedValueAtFiber(Error("This root received an early update, before anything was able hydrate. Switched the entire root to client rendering."), workInProgress2);
                queueHydrationError(returnFiber);
                workInProgress2 = mountHostRootWithoutHydrating(current2, workInProgress2, nextProps, renderLanes2);
                break a;
              } else
                for (supportsHydration && (nextHydratableInstance = getFirstHydratableChildWithinContainer(workInProgress2.stateNode.containerInfo), hydrationParentFiber = workInProgress2, isHydrating = true, hydrationErrors = null, didSuspendOrErrorDEV = false, hydrationDiffRootDEV = null, rootOrSingletonContext = true), current2 = mountChildFibers(workInProgress2, null, nextProps, renderLanes2), workInProgress2.child = current2;current2; )
                  current2.flags = current2.flags & -3 | 4096, current2 = current2.sibling;
            else {
              resetHydrationState();
              if (nextProps === returnFiber) {
                workInProgress2 = bailoutOnAlreadyFinishedWork(current2, workInProgress2, renderLanes2);
                break a;
              }
              reconcileChildren(current2, workInProgress2, nextProps, renderLanes2);
            }
            workInProgress2 = workInProgress2.child;
          }
          return workInProgress2;
        case 26:
          if (supportsResources)
            return markRef(current2, workInProgress2), current2 === null ? (current2 = getResource(workInProgress2.type, null, workInProgress2.pendingProps, null)) ? workInProgress2.memoizedState = current2 : isHydrating || (workInProgress2.stateNode = createHoistableInstance(workInProgress2.type, workInProgress2.pendingProps, requiredContext(rootInstanceStackCursor.current), workInProgress2)) : workInProgress2.memoizedState = getResource(workInProgress2.type, current2.memoizedProps, workInProgress2.pendingProps, current2.memoizedState), null;
        case 27:
          if (supportsSingletons)
            return pushHostContext(workInProgress2), current2 === null && supportsSingletons && isHydrating && (prevSibling = requiredContext(rootInstanceStackCursor.current), returnFiber = getHostContext(), prevSibling = workInProgress2.stateNode = resolveSingletonInstance(workInProgress2.type, workInProgress2.pendingProps, prevSibling, returnFiber, false), didSuspendOrErrorDEV || (returnFiber = diffHydratedPropsForDevWarnings(prevSibling, workInProgress2.type, workInProgress2.pendingProps, returnFiber), returnFiber !== null && (buildHydrationDiffNode(workInProgress2, 0).serverProps = returnFiber)), hydrationParentFiber = workInProgress2, rootOrSingletonContext = true, nextHydratableInstance = getFirstHydratableChildWithinSingleton(workInProgress2.type, prevSibling, nextHydratableInstance)), reconcileChildren(current2, workInProgress2, workInProgress2.pendingProps.children, renderLanes2), markRef(current2, workInProgress2), current2 === null && (workInProgress2.flags |= 4194304), workInProgress2.child;
        case 5:
          return current2 === null && isHydrating && (nextProps = getHostContext(), returnFiber = validateHydratableInstance(workInProgress2.type, workInProgress2.pendingProps, nextProps), prevSibling = nextHydratableInstance, (nextState = !prevSibling) || (nextState = canHydrateInstance(prevSibling, workInProgress2.type, workInProgress2.pendingProps, rootOrSingletonContext), nextState !== null ? (workInProgress2.stateNode = nextState, didSuspendOrErrorDEV || (nextProps = diffHydratedPropsForDevWarnings(nextState, workInProgress2.type, workInProgress2.pendingProps, nextProps), nextProps !== null && (buildHydrationDiffNode(workInProgress2, 0).serverProps = nextProps)), hydrationParentFiber = workInProgress2, nextHydratableInstance = getFirstHydratableChild(nextState), rootOrSingletonContext = false, nextProps = true) : nextProps = false, nextState = !nextProps), nextState && (returnFiber && warnNonHydratedInstance(workInProgress2, prevSibling), throwOnHydrationMismatch(workInProgress2))), pushHostContext(workInProgress2), prevSibling = workInProgress2.type, nextProps = workInProgress2.pendingProps, nextState = current2 !== null ? current2.memoizedProps : null, returnFiber = nextProps.children, shouldSetTextContent(prevSibling, nextProps) ? returnFiber = null : nextState !== null && shouldSetTextContent(prevSibling, nextState) && (workInProgress2.flags |= 32), workInProgress2.memoizedState !== null && (prevSibling = renderWithHooks(current2, workInProgress2, TransitionAwareHostComponent, null, null, renderLanes2), isPrimaryRenderer ? HostTransitionContext._currentValue = prevSibling : HostTransitionContext._currentValue2 = prevSibling), markRef(current2, workInProgress2), reconcileChildren(current2, workInProgress2, returnFiber, renderLanes2), workInProgress2.child;
        case 6:
          return current2 === null && isHydrating && (current2 = workInProgress2.pendingProps, renderLanes2 = getHostContext(), current2 = validateHydratableTextInstance(current2, renderLanes2), renderLanes2 = nextHydratableInstance, (returnFiber = !renderLanes2) || (returnFiber = canHydrateTextInstance(renderLanes2, workInProgress2.pendingProps, rootOrSingletonContext), returnFiber !== null ? (workInProgress2.stateNode = returnFiber, hydrationParentFiber = workInProgress2, nextHydratableInstance = null, returnFiber = true) : returnFiber = false, returnFiber = !returnFiber), returnFiber && (current2 && warnNonHydratedInstance(workInProgress2, renderLanes2), throwOnHydrationMismatch(workInProgress2))), null;
        case 13:
          return updateSuspenseComponent(current2, workInProgress2, renderLanes2);
        case 4:
          return pushHostContainer(workInProgress2, workInProgress2.stateNode.containerInfo), returnFiber = workInProgress2.pendingProps, current2 === null ? workInProgress2.child = reconcileChildFibers(workInProgress2, null, returnFiber, renderLanes2) : reconcileChildren(current2, workInProgress2, returnFiber, renderLanes2), workInProgress2.child;
        case 11:
          return updateForwardRef(current2, workInProgress2, workInProgress2.type, workInProgress2.pendingProps, renderLanes2);
        case 7:
          return reconcileChildren(current2, workInProgress2, workInProgress2.pendingProps, renderLanes2), workInProgress2.child;
        case 8:
          return reconcileChildren(current2, workInProgress2, workInProgress2.pendingProps.children, renderLanes2), workInProgress2.child;
        case 12:
          return workInProgress2.flags |= 4, workInProgress2.flags |= 2048, returnFiber = workInProgress2.stateNode, returnFiber.effectDuration = -0, returnFiber.passiveEffectDuration = -0, reconcileChildren(current2, workInProgress2, workInProgress2.pendingProps.children, renderLanes2), workInProgress2.child;
        case 10:
          return returnFiber = workInProgress2.type, prevSibling = workInProgress2.pendingProps, nextProps = prevSibling.value, "value" in prevSibling || hasWarnedAboutUsingNoValuePropOnContextProvider || (hasWarnedAboutUsingNoValuePropOnContextProvider = true, console.error("The `value` prop is required for the `<Context.Provider>`. Did you misspell it or forget to pass it?")), pushProvider(workInProgress2, returnFiber, nextProps), reconcileChildren(current2, workInProgress2, prevSibling.children, renderLanes2), workInProgress2.child;
        case 9:
          return prevSibling = workInProgress2.type._context, returnFiber = workInProgress2.pendingProps.children, typeof returnFiber !== "function" && console.error("A context consumer was rendered with multiple children, or a child that isn't a function. A context consumer expects a single child that is a function. If you did pass a function, make sure there is no trailing or leading whitespace around it."), prepareToReadContext(workInProgress2), prevSibling = readContext(prevSibling), markComponentRenderStarted(workInProgress2), returnFiber = callComponentInDEV(returnFiber, prevSibling, undefined), markComponentRenderStopped(), workInProgress2.flags |= 1, reconcileChildren(current2, workInProgress2, returnFiber, renderLanes2), workInProgress2.child;
        case 14:
          return updateMemoComponent(current2, workInProgress2, workInProgress2.type, workInProgress2.pendingProps, renderLanes2);
        case 15:
          return updateSimpleMemoComponent(current2, workInProgress2, workInProgress2.type, workInProgress2.pendingProps, renderLanes2);
        case 19:
          return updateSuspenseListComponent(current2, workInProgress2, renderLanes2);
        case 31:
          return returnFiber = workInProgress2.pendingProps, renderLanes2 = workInProgress2.mode, returnFiber = {
            mode: returnFiber.mode,
            children: returnFiber.children
          }, current2 === null ? (current2 = mountWorkInProgressOffscreenFiber(returnFiber, renderLanes2), current2.ref = workInProgress2.ref, workInProgress2.child = current2, current2.return = workInProgress2, workInProgress2 = current2) : (current2 = createWorkInProgress(current2.child, returnFiber), current2.ref = workInProgress2.ref, workInProgress2.child = current2, current2.return = workInProgress2, workInProgress2 = current2), workInProgress2;
        case 22:
          return updateOffscreenComponent(current2, workInProgress2, renderLanes2);
        case 24:
          return prepareToReadContext(workInProgress2), returnFiber = readContext(CacheContext), current2 === null ? (prevSibling = peekCacheFromPool(), prevSibling === null && (prevSibling = workInProgressRoot, nextProps = createCache(), prevSibling.pooledCache = nextProps, retainCache(nextProps), nextProps !== null && (prevSibling.pooledCacheLanes |= renderLanes2), prevSibling = nextProps), workInProgress2.memoizedState = {
            parent: returnFiber,
            cache: prevSibling
          }, initializeUpdateQueue(workInProgress2), pushProvider(workInProgress2, CacheContext, prevSibling)) : ((current2.lanes & renderLanes2) !== 0 && (cloneUpdateQueue(current2, workInProgress2), processUpdateQueue(workInProgress2, null, null, renderLanes2), suspendIfUpdateReadFromEntangledAsyncAction()), prevSibling = current2.memoizedState, nextProps = workInProgress2.memoizedState, prevSibling.parent !== returnFiber ? (prevSibling = {
            parent: returnFiber,
            cache: returnFiber
          }, workInProgress2.memoizedState = prevSibling, workInProgress2.lanes === 0 && (workInProgress2.memoizedState = workInProgress2.updateQueue.baseState = prevSibling), pushProvider(workInProgress2, CacheContext, returnFiber)) : (returnFiber = nextProps.cache, pushProvider(workInProgress2, CacheContext, returnFiber), returnFiber !== prevSibling.cache && propagateContextChanges(workInProgress2, [CacheContext], renderLanes2, true))), reconcileChildren(current2, workInProgress2, workInProgress2.pendingProps.children, renderLanes2), workInProgress2.child;
        case 29:
          throw workInProgress2.pendingProps;
      }
      throw Error("Unknown unit of work tag (" + workInProgress2.tag + "). This error is likely caused by a bug in React. Please file an issue.");
    }
    function markUpdate(workInProgress2) {
      workInProgress2.flags |= 4;
    }
    function doesRequireClone(current2, completedWork) {
      if (current2 !== null && current2.child === completedWork.child)
        return false;
      if ((completedWork.flags & 16) !== 0)
        return true;
      for (current2 = completedWork.child;current2 !== null; ) {
        if ((current2.flags & 13878) !== 0 || (current2.subtreeFlags & 13878) !== 0)
          return true;
        current2 = current2.sibling;
      }
      return false;
    }
    function appendAllChildren(parent, workInProgress2, needsVisibilityToggle, isHidden) {
      if (supportsMutation)
        for (needsVisibilityToggle = workInProgress2.child;needsVisibilityToggle !== null; ) {
          if (needsVisibilityToggle.tag === 5 || needsVisibilityToggle.tag === 6)
            appendInitialChild(parent, needsVisibilityToggle.stateNode);
          else if (!(needsVisibilityToggle.tag === 4 || supportsSingletons && needsVisibilityToggle.tag === 27) && needsVisibilityToggle.child !== null) {
            needsVisibilityToggle.child.return = needsVisibilityToggle;
            needsVisibilityToggle = needsVisibilityToggle.child;
            continue;
          }
          if (needsVisibilityToggle === workInProgress2)
            break;
          for (;needsVisibilityToggle.sibling === null; ) {
            if (needsVisibilityToggle.return === null || needsVisibilityToggle.return === workInProgress2)
              return;
            needsVisibilityToggle = needsVisibilityToggle.return;
          }
          needsVisibilityToggle.sibling.return = needsVisibilityToggle.return;
          needsVisibilityToggle = needsVisibilityToggle.sibling;
        }
      else if (supportsPersistence)
        for (var _node = workInProgress2.child;_node !== null; ) {
          if (_node.tag === 5) {
            var instance = _node.stateNode;
            needsVisibilityToggle && isHidden && (instance = cloneHiddenInstance(instance, _node.type, _node.memoizedProps));
            appendInitialChild(parent, instance);
          } else if (_node.tag === 6)
            instance = _node.stateNode, needsVisibilityToggle && isHidden && (instance = cloneHiddenTextInstance(instance, _node.memoizedProps)), appendInitialChild(parent, instance);
          else if (_node.tag !== 4) {
            if (_node.tag === 22 && _node.memoizedState !== null)
              instance = _node.child, instance !== null && (instance.return = _node), appendAllChildren(parent, _node, true, true);
            else if (_node.child !== null) {
              _node.child.return = _node;
              _node = _node.child;
              continue;
            }
          }
          if (_node === workInProgress2)
            break;
          for (;_node.sibling === null; ) {
            if (_node.return === null || _node.return === workInProgress2)
              return;
            _node = _node.return;
          }
          _node.sibling.return = _node.return;
          _node = _node.sibling;
        }
    }
    function appendAllChildrenToContainer(containerChildSet, workInProgress2, needsVisibilityToggle, isHidden) {
      var hasOffscreenComponentChild = false;
      if (supportsPersistence)
        for (var node = workInProgress2.child;node !== null; ) {
          if (node.tag === 5) {
            var instance = node.stateNode;
            needsVisibilityToggle && isHidden && (instance = cloneHiddenInstance(instance, node.type, node.memoizedProps));
            appendChildToContainerChildSet(containerChildSet, instance);
          } else if (node.tag === 6)
            instance = node.stateNode, needsVisibilityToggle && isHidden && (instance = cloneHiddenTextInstance(instance, node.memoizedProps)), appendChildToContainerChildSet(containerChildSet, instance);
          else if (node.tag !== 4) {
            if (node.tag === 22 && node.memoizedState !== null)
              hasOffscreenComponentChild = node.child, hasOffscreenComponentChild !== null && (hasOffscreenComponentChild.return = node), appendAllChildrenToContainer(containerChildSet, node, true, true), hasOffscreenComponentChild = true;
            else if (node.child !== null) {
              node.child.return = node;
              node = node.child;
              continue;
            }
          }
          if (node === workInProgress2)
            break;
          for (;node.sibling === null; ) {
            if (node.return === null || node.return === workInProgress2)
              return hasOffscreenComponentChild;
            node = node.return;
          }
          node.sibling.return = node.return;
          node = node.sibling;
        }
      return hasOffscreenComponentChild;
    }
    function updateHostContainer(current2, workInProgress2) {
      if (supportsPersistence && doesRequireClone(current2, workInProgress2)) {
        current2 = workInProgress2.stateNode;
        var container = current2.containerInfo, newChildSet = createContainerChildSet();
        appendAllChildrenToContainer(newChildSet, workInProgress2, false, false);
        current2.pendingChildren = newChildSet;
        markUpdate(workInProgress2);
        finalizeContainerChildren(container, newChildSet);
      }
    }
    function updateHostComponent(current2, workInProgress2, type, newProps) {
      if (supportsMutation)
        current2.memoizedProps !== newProps && markUpdate(workInProgress2);
      else if (supportsPersistence) {
        var { stateNode: currentInstance, memoizedProps: _oldProps } = current2;
        if ((current2 = doesRequireClone(current2, workInProgress2)) || _oldProps !== newProps) {
          var currentHostContext = getHostContext();
          _oldProps = cloneInstance(currentInstance, type, _oldProps, newProps, !current2, null);
          _oldProps === currentInstance ? workInProgress2.stateNode = currentInstance : (finalizeInitialChildren(_oldProps, type, newProps, currentHostContext) && markUpdate(workInProgress2), workInProgress2.stateNode = _oldProps, current2 ? appendAllChildren(_oldProps, workInProgress2, false, false) : markUpdate(workInProgress2));
        } else
          workInProgress2.stateNode = currentInstance;
      }
    }
    function preloadInstanceAndSuspendIfNeeded(workInProgress2, type, props) {
      if (maySuspendCommit(type, props)) {
        if (workInProgress2.flags |= 16777216, !preloadInstance(type, props))
          if (shouldRemainOnPreviousScreen())
            workInProgress2.flags |= 8192;
          else
            throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
      } else
        workInProgress2.flags &= -16777217;
    }
    function preloadResourceAndSuspendIfNeeded(workInProgress2, resource) {
      if (mayResourceSuspendCommit(resource)) {
        if (workInProgress2.flags |= 16777216, !preloadResource(resource))
          if (shouldRemainOnPreviousScreen())
            workInProgress2.flags |= 8192;
          else
            throw suspendedThenable = noopSuspenseyCommitThenable, SuspenseyCommitException;
      } else
        workInProgress2.flags &= -16777217;
    }
    function scheduleRetryEffect(workInProgress2, retryQueue) {
      retryQueue !== null && (workInProgress2.flags |= 4);
      workInProgress2.flags & 16384 && (retryQueue = workInProgress2.tag !== 22 ? claimNextRetryLane() : 536870912, workInProgress2.lanes |= retryQueue, workInProgressSuspendedRetryLanes |= retryQueue);
    }
    function cutOffTailIfNeeded(renderState, hasRenderedATailFallback) {
      if (!isHydrating)
        switch (renderState.tailMode) {
          case "hidden":
            hasRenderedATailFallback = renderState.tail;
            for (var lastTailNode = null;hasRenderedATailFallback !== null; )
              hasRenderedATailFallback.alternate !== null && (lastTailNode = hasRenderedATailFallback), hasRenderedATailFallback = hasRenderedATailFallback.sibling;
            lastTailNode === null ? renderState.tail = null : lastTailNode.sibling = null;
            break;
          case "collapsed":
            lastTailNode = renderState.tail;
            for (var _lastTailNode = null;lastTailNode !== null; )
              lastTailNode.alternate !== null && (_lastTailNode = lastTailNode), lastTailNode = lastTailNode.sibling;
            _lastTailNode === null ? hasRenderedATailFallback || renderState.tail === null ? renderState.tail = null : renderState.tail.sibling = null : _lastTailNode.sibling = null;
        }
    }
    function bubbleProperties(completedWork) {
      var didBailout = completedWork.alternate !== null && completedWork.alternate.child === completedWork.child, newChildLanes = 0, subtreeFlags = 0;
      if (didBailout)
        if ((completedWork.mode & 2) !== NoMode) {
          for (var { selfBaseDuration: _treeBaseDuration, child: _child2 } = completedWork;_child2 !== null; )
            newChildLanes |= _child2.lanes | _child2.childLanes, subtreeFlags |= _child2.subtreeFlags & 65011712, subtreeFlags |= _child2.flags & 65011712, _treeBaseDuration += _child2.treeBaseDuration, _child2 = _child2.sibling;
          completedWork.treeBaseDuration = _treeBaseDuration;
        } else
          for (_treeBaseDuration = completedWork.child;_treeBaseDuration !== null; )
            newChildLanes |= _treeBaseDuration.lanes | _treeBaseDuration.childLanes, subtreeFlags |= _treeBaseDuration.subtreeFlags & 65011712, subtreeFlags |= _treeBaseDuration.flags & 65011712, _treeBaseDuration.return = completedWork, _treeBaseDuration = _treeBaseDuration.sibling;
      else if ((completedWork.mode & 2) !== NoMode) {
        _treeBaseDuration = completedWork.actualDuration;
        _child2 = completedWork.selfBaseDuration;
        for (var child = completedWork.child;child !== null; )
          newChildLanes |= child.lanes | child.childLanes, subtreeFlags |= child.subtreeFlags, subtreeFlags |= child.flags, _treeBaseDuration += child.actualDuration, _child2 += child.treeBaseDuration, child = child.sibling;
        completedWork.actualDuration = _treeBaseDuration;
        completedWork.treeBaseDuration = _child2;
      } else
        for (_treeBaseDuration = completedWork.child;_treeBaseDuration !== null; )
          newChildLanes |= _treeBaseDuration.lanes | _treeBaseDuration.childLanes, subtreeFlags |= _treeBaseDuration.subtreeFlags, subtreeFlags |= _treeBaseDuration.flags, _treeBaseDuration.return = completedWork, _treeBaseDuration = _treeBaseDuration.sibling;
      completedWork.subtreeFlags |= subtreeFlags;
      completedWork.childLanes = newChildLanes;
      return didBailout;
    }
    function completeWork(current2, workInProgress2, renderLanes2) {
      var newProps = workInProgress2.pendingProps;
      popTreeContext(workInProgress2);
      switch (workInProgress2.tag) {
        case 31:
        case 16:
        case 15:
        case 0:
        case 11:
        case 7:
        case 8:
        case 12:
        case 9:
        case 14:
          return bubbleProperties(workInProgress2), null;
        case 1:
          return bubbleProperties(workInProgress2), null;
        case 3:
          renderLanes2 = workInProgress2.stateNode;
          newProps = null;
          current2 !== null && (newProps = current2.memoizedState.cache);
          workInProgress2.memoizedState.cache !== newProps && (workInProgress2.flags |= 2048);
          popProvider(CacheContext, workInProgress2);
          popHostContainer(workInProgress2);
          renderLanes2.pendingContext && (renderLanes2.context = renderLanes2.pendingContext, renderLanes2.pendingContext = null);
          if (current2 === null || current2.child === null)
            popHydrationState(workInProgress2) ? (emitPendingHydrationWarnings(), markUpdate(workInProgress2)) : current2 === null || current2.memoizedState.isDehydrated && (workInProgress2.flags & 256) === 0 || (workInProgress2.flags |= 1024, upgradeHydrationErrorsToRecoverable());
          updateHostContainer(current2, workInProgress2);
          bubbleProperties(workInProgress2);
          return null;
        case 26:
          if (supportsResources) {
            renderLanes2 = workInProgress2.type;
            var nextResource = workInProgress2.memoizedState;
            current2 === null ? (markUpdate(workInProgress2), nextResource !== null ? (bubbleProperties(workInProgress2), preloadResourceAndSuspendIfNeeded(workInProgress2, nextResource)) : (bubbleProperties(workInProgress2), preloadInstanceAndSuspendIfNeeded(workInProgress2, renderLanes2, newProps))) : nextResource ? nextResource !== current2.memoizedState ? (markUpdate(workInProgress2), bubbleProperties(workInProgress2), preloadResourceAndSuspendIfNeeded(workInProgress2, nextResource)) : (bubbleProperties(workInProgress2), workInProgress2.flags &= -16777217) : (supportsMutation ? current2.memoizedProps !== newProps && markUpdate(workInProgress2) : updateHostComponent(current2, workInProgress2, renderLanes2, newProps), bubbleProperties(workInProgress2), preloadInstanceAndSuspendIfNeeded(workInProgress2, renderLanes2, newProps));
            return null;
          }
        case 27:
          if (supportsSingletons) {
            popHostContext(workInProgress2);
            renderLanes2 = requiredContext(rootInstanceStackCursor.current);
            nextResource = workInProgress2.type;
            if (current2 !== null && workInProgress2.stateNode != null)
              supportsMutation ? current2.memoizedProps !== newProps && markUpdate(workInProgress2) : updateHostComponent(current2, workInProgress2, nextResource, newProps);
            else {
              if (!newProps) {
                if (workInProgress2.stateNode === null)
                  throw Error("We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue.");
                bubbleProperties(workInProgress2);
                return null;
              }
              current2 = getHostContext();
              popHydrationState(workInProgress2) ? prepareToHydrateHostInstance(workInProgress2, current2) : (current2 = resolveSingletonInstance(nextResource, newProps, renderLanes2, current2, true), workInProgress2.stateNode = current2, markUpdate(workInProgress2));
            }
            bubbleProperties(workInProgress2);
            return null;
          }
        case 5:
          popHostContext(workInProgress2);
          renderLanes2 = workInProgress2.type;
          if (current2 !== null && workInProgress2.stateNode != null)
            updateHostComponent(current2, workInProgress2, renderLanes2, newProps);
          else {
            if (!newProps) {
              if (workInProgress2.stateNode === null)
                throw Error("We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue.");
              bubbleProperties(workInProgress2);
              return null;
            }
            current2 = getHostContext();
            popHydrationState(workInProgress2) ? prepareToHydrateHostInstance(workInProgress2, current2) : (nextResource = requiredContext(rootInstanceStackCursor.current), nextResource = createInstance(renderLanes2, newProps, nextResource, current2, workInProgress2), appendAllChildren(nextResource, workInProgress2, false, false), workInProgress2.stateNode = nextResource, finalizeInitialChildren(nextResource, renderLanes2, newProps, current2) && markUpdate(workInProgress2));
          }
          bubbleProperties(workInProgress2);
          preloadInstanceAndSuspendIfNeeded(workInProgress2, workInProgress2.type, workInProgress2.pendingProps);
          return null;
        case 6:
          if (current2 && workInProgress2.stateNode != null)
            renderLanes2 = current2.memoizedProps, supportsMutation ? renderLanes2 !== newProps && markUpdate(workInProgress2) : supportsPersistence && (renderLanes2 !== newProps ? (current2 = requiredContext(rootInstanceStackCursor.current), renderLanes2 = getHostContext(), workInProgress2.stateNode = createTextInstance(newProps, current2, renderLanes2, workInProgress2), markUpdate(workInProgress2)) : workInProgress2.stateNode = current2.stateNode);
          else {
            if (typeof newProps !== "string" && workInProgress2.stateNode === null)
              throw Error("We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue.");
            current2 = requiredContext(rootInstanceStackCursor.current);
            renderLanes2 = getHostContext();
            if (popHydrationState(workInProgress2)) {
              if (!supportsHydration)
                throw Error("Expected prepareToHydrateHostTextInstance() to never be called. This error is likely caused by a bug in React. Please file an issue.");
              current2 = workInProgress2.stateNode;
              renderLanes2 = workInProgress2.memoizedProps;
              nextResource = !didSuspendOrErrorDEV;
              newProps = null;
              var returnFiber = hydrationParentFiber;
              if (returnFiber !== null)
                switch (returnFiber.tag) {
                  case 3:
                    nextResource && (nextResource = diffHydratedTextForDevWarnings(current2, renderLanes2, newProps), nextResource !== null && (buildHydrationDiffNode(workInProgress2, 0).serverProps = nextResource));
                    break;
                  case 27:
                  case 5:
                    newProps = returnFiber.memoizedProps, nextResource && (nextResource = diffHydratedTextForDevWarnings(current2, renderLanes2, newProps), nextResource !== null && (buildHydrationDiffNode(workInProgress2, 0).serverProps = nextResource));
                }
              hydrateTextInstance(current2, renderLanes2, workInProgress2, newProps) || throwOnHydrationMismatch(workInProgress2);
            } else
              workInProgress2.stateNode = createTextInstance(newProps, current2, renderLanes2, workInProgress2);
          }
          bubbleProperties(workInProgress2);
          return null;
        case 13:
          newProps = workInProgress2.memoizedState;
          if (current2 === null || current2.memoizedState !== null && current2.memoizedState.dehydrated !== null) {
            nextResource = popHydrationState(workInProgress2);
            if (newProps !== null && newProps.dehydrated !== null) {
              if (current2 === null) {
                if (!nextResource)
                  throw Error("A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React.");
                if (!supportsHydration)
                  throw Error("Expected prepareToHydrateHostSuspenseInstance() to never be called. This error is likely caused by a bug in React. Please file an issue.");
                nextResource = workInProgress2.memoizedState;
                nextResource = nextResource !== null ? nextResource.dehydrated : null;
                if (!nextResource)
                  throw Error("Expected to have a hydrated suspense instance. This error is likely caused by a bug in React. Please file an issue.");
                hydrateSuspenseInstance(nextResource, workInProgress2);
                bubbleProperties(workInProgress2);
                (workInProgress2.mode & 2) !== NoMode && newProps !== null && (nextResource = workInProgress2.child, nextResource !== null && (workInProgress2.treeBaseDuration -= nextResource.treeBaseDuration));
              } else
                emitPendingHydrationWarnings(), resetHydrationState(), (workInProgress2.flags & 128) === 0 && (workInProgress2.memoizedState = null), workInProgress2.flags |= 4, bubbleProperties(workInProgress2), (workInProgress2.mode & 2) !== NoMode && newProps !== null && (nextResource = workInProgress2.child, nextResource !== null && (workInProgress2.treeBaseDuration -= nextResource.treeBaseDuration));
              nextResource = false;
            } else
              nextResource = upgradeHydrationErrorsToRecoverable(), current2 !== null && current2.memoizedState !== null && (current2.memoizedState.hydrationErrors = nextResource), nextResource = true;
            if (!nextResource) {
              if (workInProgress2.flags & 256)
                return popSuspenseHandler(workInProgress2), workInProgress2;
              popSuspenseHandler(workInProgress2);
              return null;
            }
          }
          popSuspenseHandler(workInProgress2);
          if ((workInProgress2.flags & 128) !== 0)
            return workInProgress2.lanes = renderLanes2, (workInProgress2.mode & 2) !== NoMode && transferActualDuration(workInProgress2), workInProgress2;
          renderLanes2 = newProps !== null;
          current2 = current2 !== null && current2.memoizedState !== null;
          renderLanes2 && (newProps = workInProgress2.child, nextResource = null, newProps.alternate !== null && newProps.alternate.memoizedState !== null && newProps.alternate.memoizedState.cachePool !== null && (nextResource = newProps.alternate.memoizedState.cachePool.pool), returnFiber = null, newProps.memoizedState !== null && newProps.memoizedState.cachePool !== null && (returnFiber = newProps.memoizedState.cachePool.pool), returnFiber !== nextResource && (newProps.flags |= 2048));
          renderLanes2 !== current2 && renderLanes2 && (workInProgress2.child.flags |= 8192);
          scheduleRetryEffect(workInProgress2, workInProgress2.updateQueue);
          bubbleProperties(workInProgress2);
          (workInProgress2.mode & 2) !== NoMode && renderLanes2 && (current2 = workInProgress2.child, current2 !== null && (workInProgress2.treeBaseDuration -= current2.treeBaseDuration));
          return null;
        case 4:
          return popHostContainer(workInProgress2), updateHostContainer(current2, workInProgress2), current2 === null && preparePortalMount(workInProgress2.stateNode.containerInfo), bubbleProperties(workInProgress2), null;
        case 10:
          return popProvider(workInProgress2.type, workInProgress2), bubbleProperties(workInProgress2), null;
        case 19:
          pop(suspenseStackCursor, workInProgress2);
          nextResource = workInProgress2.memoizedState;
          if (nextResource === null)
            return bubbleProperties(workInProgress2), null;
          newProps = (workInProgress2.flags & 128) !== 0;
          returnFiber = nextResource.rendering;
          if (returnFiber === null)
            if (newProps)
              cutOffTailIfNeeded(nextResource, false);
            else {
              if (workInProgressRootExitStatus !== RootInProgress || current2 !== null && (current2.flags & 128) !== 0)
                for (current2 = workInProgress2.child;current2 !== null; ) {
                  returnFiber = findFirstSuspended(current2);
                  if (returnFiber !== null) {
                    workInProgress2.flags |= 128;
                    cutOffTailIfNeeded(nextResource, false);
                    current2 = returnFiber.updateQueue;
                    workInProgress2.updateQueue = current2;
                    scheduleRetryEffect(workInProgress2, current2);
                    workInProgress2.subtreeFlags = 0;
                    current2 = renderLanes2;
                    for (renderLanes2 = workInProgress2.child;renderLanes2 !== null; )
                      resetWorkInProgress(renderLanes2, current2), renderLanes2 = renderLanes2.sibling;
                    push(suspenseStackCursor, suspenseStackCursor.current & SubtreeSuspenseContextMask | ForceSuspenseFallback, workInProgress2);
                    return workInProgress2.child;
                  }
                  current2 = current2.sibling;
                }
              nextResource.tail !== null && now$1() > workInProgressRootRenderTargetTime && (workInProgress2.flags |= 128, newProps = true, cutOffTailIfNeeded(nextResource, false), workInProgress2.lanes = 4194304);
            }
          else {
            if (!newProps)
              if (current2 = findFirstSuspended(returnFiber), current2 !== null) {
                if (workInProgress2.flags |= 128, newProps = true, current2 = current2.updateQueue, workInProgress2.updateQueue = current2, scheduleRetryEffect(workInProgress2, current2), cutOffTailIfNeeded(nextResource, true), nextResource.tail === null && nextResource.tailMode === "hidden" && !returnFiber.alternate && !isHydrating)
                  return bubbleProperties(workInProgress2), null;
              } else
                2 * now$1() - nextResource.renderingStartTime > workInProgressRootRenderTargetTime && renderLanes2 !== 536870912 && (workInProgress2.flags |= 128, newProps = true, cutOffTailIfNeeded(nextResource, false), workInProgress2.lanes = 4194304);
            nextResource.isBackwards ? (returnFiber.sibling = workInProgress2.child, workInProgress2.child = returnFiber) : (current2 = nextResource.last, current2 !== null ? current2.sibling = returnFiber : workInProgress2.child = returnFiber, nextResource.last = returnFiber);
          }
          if (nextResource.tail !== null)
            return current2 = nextResource.tail, nextResource.rendering = current2, nextResource.tail = current2.sibling, nextResource.renderingStartTime = now$1(), current2.sibling = null, renderLanes2 = suspenseStackCursor.current, renderLanes2 = newProps ? renderLanes2 & SubtreeSuspenseContextMask | ForceSuspenseFallback : renderLanes2 & SubtreeSuspenseContextMask, push(suspenseStackCursor, renderLanes2, workInProgress2), current2;
          bubbleProperties(workInProgress2);
          return null;
        case 22:
        case 23:
          return popSuspenseHandler(workInProgress2), popHiddenContext(workInProgress2), newProps = workInProgress2.memoizedState !== null, current2 !== null ? current2.memoizedState !== null !== newProps && (workInProgress2.flags |= 8192) : newProps && (workInProgress2.flags |= 8192), newProps ? (renderLanes2 & 536870912) !== 0 && (workInProgress2.flags & 128) === 0 && (bubbleProperties(workInProgress2), workInProgress2.subtreeFlags & 6 && (workInProgress2.flags |= 8192)) : bubbleProperties(workInProgress2), renderLanes2 = workInProgress2.updateQueue, renderLanes2 !== null && scheduleRetryEffect(workInProgress2, renderLanes2.retryQueue), renderLanes2 = null, current2 !== null && current2.memoizedState !== null && current2.memoizedState.cachePool !== null && (renderLanes2 = current2.memoizedState.cachePool.pool), newProps = null, workInProgress2.memoizedState !== null && workInProgress2.memoizedState.cachePool !== null && (newProps = workInProgress2.memoizedState.cachePool.pool), newProps !== renderLanes2 && (workInProgress2.flags |= 2048), current2 !== null && pop(resumedCache, workInProgress2), null;
        case 24:
          return renderLanes2 = null, current2 !== null && (renderLanes2 = current2.memoizedState.cache), workInProgress2.memoizedState.cache !== renderLanes2 && (workInProgress2.flags |= 2048), popProvider(CacheContext, workInProgress2), bubbleProperties(workInProgress2), null;
        case 25:
          return null;
        case 30:
          return null;
      }
      throw Error("Unknown unit of work tag (" + workInProgress2.tag + "). This error is likely caused by a bug in React. Please file an issue.");
    }
    function unwindWork(current2, workInProgress2) {
      popTreeContext(workInProgress2);
      switch (workInProgress2.tag) {
        case 1:
          return current2 = workInProgress2.flags, current2 & 65536 ? (workInProgress2.flags = current2 & -65537 | 128, (workInProgress2.mode & 2) !== NoMode && transferActualDuration(workInProgress2), workInProgress2) : null;
        case 3:
          return popProvider(CacheContext, workInProgress2), popHostContainer(workInProgress2), current2 = workInProgress2.flags, (current2 & 65536) !== 0 && (current2 & 128) === 0 ? (workInProgress2.flags = current2 & -65537 | 128, workInProgress2) : null;
        case 26:
        case 27:
        case 5:
          return popHostContext(workInProgress2), null;
        case 13:
          popSuspenseHandler(workInProgress2);
          current2 = workInProgress2.memoizedState;
          if (current2 !== null && current2.dehydrated !== null) {
            if (workInProgress2.alternate === null)
              throw Error("Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue.");
            resetHydrationState();
          }
          current2 = workInProgress2.flags;
          return current2 & 65536 ? (workInProgress2.flags = current2 & -65537 | 128, (workInProgress2.mode & 2) !== NoMode && transferActualDuration(workInProgress2), workInProgress2) : null;
        case 19:
          return pop(suspenseStackCursor, workInProgress2), null;
        case 4:
          return popHostContainer(workInProgress2), null;
        case 10:
          return popProvider(workInProgress2.type, workInProgress2), null;
        case 22:
        case 23:
          return popSuspenseHandler(workInProgress2), popHiddenContext(workInProgress2), current2 !== null && pop(resumedCache, workInProgress2), current2 = workInProgress2.flags, current2 & 65536 ? (workInProgress2.flags = current2 & -65537 | 128, (workInProgress2.mode & 2) !== NoMode && transferActualDuration(workInProgress2), workInProgress2) : null;
        case 24:
          return popProvider(CacheContext, workInProgress2), null;
        case 25:
          return null;
        default:
          return null;
      }
    }
    function unwindInterruptedWork(current2, interruptedWork) {
      popTreeContext(interruptedWork);
      switch (interruptedWork.tag) {
        case 3:
          popProvider(CacheContext, interruptedWork);
          popHostContainer(interruptedWork);
          break;
        case 26:
        case 27:
        case 5:
          popHostContext(interruptedWork);
          break;
        case 4:
          popHostContainer(interruptedWork);
          break;
        case 13:
          popSuspenseHandler(interruptedWork);
          break;
        case 19:
          pop(suspenseStackCursor, interruptedWork);
          break;
        case 10:
          popProvider(interruptedWork.type, interruptedWork);
          break;
        case 22:
        case 23:
          popSuspenseHandler(interruptedWork);
          popHiddenContext(interruptedWork);
          current2 !== null && pop(resumedCache, interruptedWork);
          break;
        case 24:
          popProvider(CacheContext, interruptedWork);
      }
    }
    function shouldProfile(current2) {
      return (current2.mode & 2) !== NoMode;
    }
    function commitHookLayoutEffects(finishedWork, hookFlags) {
      shouldProfile(finishedWork) ? (startEffectTimer(), commitHookEffectListMount(hookFlags, finishedWork), recordEffectDuration()) : commitHookEffectListMount(hookFlags, finishedWork);
    }
    function commitHookLayoutUnmountEffects(finishedWork, nearestMountedAncestor, hookFlags) {
      shouldProfile(finishedWork) ? (startEffectTimer(), commitHookEffectListUnmount(hookFlags, finishedWork, nearestMountedAncestor), recordEffectDuration()) : commitHookEffectListUnmount(hookFlags, finishedWork, nearestMountedAncestor);
    }
    function commitHookEffectListMount(flags, finishedWork) {
      try {
        var updateQueue = finishedWork.updateQueue, lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
        if (lastEffect !== null) {
          var firstEffect = lastEffect.next;
          updateQueue = firstEffect;
          do {
            if ((updateQueue.tag & flags) === flags && ((flags & Passive) !== NoFlags ? injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentPassiveEffectMountStarted === "function" && injectedProfilingHooks.markComponentPassiveEffectMountStarted(finishedWork) : (flags & Layout) !== NoFlags && injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentLayoutEffectMountStarted === "function" && injectedProfilingHooks.markComponentLayoutEffectMountStarted(finishedWork), lastEffect = undefined, (flags & Insertion) !== NoFlags && (isRunningInsertionEffect = true), lastEffect = runWithFiberInDEV(finishedWork, callCreateInDEV, updateQueue), (flags & Insertion) !== NoFlags && (isRunningInsertionEffect = false), (flags & Passive) !== NoFlags ? injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentPassiveEffectMountStopped === "function" && injectedProfilingHooks.markComponentPassiveEffectMountStopped() : (flags & Layout) !== NoFlags && injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentLayoutEffectMountStopped === "function" && injectedProfilingHooks.markComponentLayoutEffectMountStopped(), lastEffect !== undefined && typeof lastEffect !== "function")) {
              var hookName = undefined;
              hookName = (updateQueue.tag & Layout) !== 0 ? "useLayoutEffect" : (updateQueue.tag & Insertion) !== 0 ? "useInsertionEffect" : "useEffect";
              var addendum = undefined;
              addendum = lastEffect === null ? " You returned null. If your effect does not require clean up, return undefined (or nothing)." : typeof lastEffect.then === "function" ? `

It looks like you wrote ` + hookName + `(async () => ...) or returned a Promise. Instead, write the async function inside your effect and call it immediately:

` + hookName + `(() => {
  async function fetchData() {
    // You can await here
    const response = await MyAPI.getData(someId);
    // ...
  }
  fetchData();
}, [someId]); // Or [] if effect doesn't need props or state

Learn more about data fetching with Hooks: https://react.dev/link/hooks-data-fetching` : " You returned: " + lastEffect;
              runWithFiberInDEV(finishedWork, function(n, a) {
                console.error("%s must not return anything besides a function, which is used for clean-up.%s", n, a);
              }, hookName, addendum);
            }
            updateQueue = updateQueue.next;
          } while (updateQueue !== firstEffect);
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitHookEffectListUnmount(flags, finishedWork, nearestMountedAncestor) {
      try {
        var updateQueue = finishedWork.updateQueue, lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
        if (lastEffect !== null) {
          var firstEffect = lastEffect.next;
          updateQueue = firstEffect;
          do {
            if ((updateQueue.tag & flags) === flags) {
              var inst = updateQueue.inst, destroy = inst.destroy;
              destroy !== undefined && (inst.destroy = undefined, (flags & Passive) !== NoFlags ? injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStarted === "function" && injectedProfilingHooks.markComponentPassiveEffectUnmountStarted(finishedWork) : (flags & Layout) !== NoFlags && injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStarted === "function" && injectedProfilingHooks.markComponentLayoutEffectUnmountStarted(finishedWork), (flags & Insertion) !== NoFlags && (isRunningInsertionEffect = true), lastEffect = finishedWork, runWithFiberInDEV(lastEffect, callDestroyInDEV, lastEffect, nearestMountedAncestor, destroy), (flags & Insertion) !== NoFlags && (isRunningInsertionEffect = false), (flags & Passive) !== NoFlags ? injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentPassiveEffectUnmountStopped === "function" && injectedProfilingHooks.markComponentPassiveEffectUnmountStopped() : (flags & Layout) !== NoFlags && injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentLayoutEffectUnmountStopped === "function" && injectedProfilingHooks.markComponentLayoutEffectUnmountStopped());
            }
            updateQueue = updateQueue.next;
          } while (updateQueue !== firstEffect);
        }
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitHookPassiveMountEffects(finishedWork, hookFlags) {
      shouldProfile(finishedWork) ? (startEffectTimer(), commitHookEffectListMount(hookFlags, finishedWork), recordEffectDuration()) : commitHookEffectListMount(hookFlags, finishedWork);
    }
    function commitHookPassiveUnmountEffects(finishedWork, nearestMountedAncestor, hookFlags) {
      shouldProfile(finishedWork) ? (startEffectTimer(), commitHookEffectListUnmount(hookFlags, finishedWork, nearestMountedAncestor), recordEffectDuration()) : commitHookEffectListUnmount(hookFlags, finishedWork, nearestMountedAncestor);
    }
    function commitClassCallbacks(finishedWork) {
      var updateQueue = finishedWork.updateQueue;
      if (updateQueue !== null) {
        var instance = finishedWork.stateNode;
        finishedWork.type.defaultProps || "ref" in finishedWork.memoizedProps || didWarnAboutReassigningProps || (instance.props !== finishedWork.memoizedProps && console.error("Expected %s props to match memoized props before processing the update queue. This might either be because of a bug in React, or because a component reassigns its own `this.props`. Please file an issue.", getComponentNameFromFiber(finishedWork) || "instance"), instance.state !== finishedWork.memoizedState && console.error("Expected %s state to match memoized state before processing the update queue. This might either be because of a bug in React, or because a component reassigns its own `this.state`. Please file an issue.", getComponentNameFromFiber(finishedWork) || "instance"));
        try {
          runWithFiberInDEV(finishedWork, commitCallbacks, updateQueue, instance);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }
    function callGetSnapshotBeforeUpdates(instance, prevProps, prevState) {
      return instance.getSnapshotBeforeUpdate(prevProps, prevState);
    }
    function commitClassSnapshot(finishedWork, current2) {
      var { memoizedProps: prevProps, memoizedState: prevState } = current2;
      current2 = finishedWork.stateNode;
      finishedWork.type.defaultProps || "ref" in finishedWork.memoizedProps || didWarnAboutReassigningProps || (current2.props !== finishedWork.memoizedProps && console.error("Expected %s props to match memoized props before getSnapshotBeforeUpdate. This might either be because of a bug in React, or because a component reassigns its own `this.props`. Please file an issue.", getComponentNameFromFiber(finishedWork) || "instance"), current2.state !== finishedWork.memoizedState && console.error("Expected %s state to match memoized state before getSnapshotBeforeUpdate. This might either be because of a bug in React, or because a component reassigns its own `this.state`. Please file an issue.", getComponentNameFromFiber(finishedWork) || "instance"));
      try {
        var resolvedPrevProps = resolveClassComponentProps(finishedWork.type, prevProps, finishedWork.elementType === finishedWork.type);
        var snapshot = runWithFiberInDEV(finishedWork, callGetSnapshotBeforeUpdates, current2, resolvedPrevProps, prevState);
        prevProps = didWarnAboutUndefinedSnapshotBeforeUpdate;
        snapshot !== undefined || prevProps.has(finishedWork.type) || (prevProps.add(finishedWork.type), runWithFiberInDEV(finishedWork, function() {
          console.error("%s.getSnapshotBeforeUpdate(): A snapshot value (or null) must be returned. You have returned undefined.", getComponentNameFromFiber(finishedWork));
        }));
        current2.__reactInternalSnapshotBeforeUpdate = snapshot;
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function safelyCallComponentWillUnmount(current2, nearestMountedAncestor, instance) {
      instance.props = resolveClassComponentProps(current2.type, current2.memoizedProps);
      instance.state = current2.memoizedState;
      shouldProfile(current2) ? (startEffectTimer(), runWithFiberInDEV(current2, callComponentWillUnmountInDEV, current2, nearestMountedAncestor, instance), recordEffectDuration()) : runWithFiberInDEV(current2, callComponentWillUnmountInDEV, current2, nearestMountedAncestor, instance);
    }
    function commitAttachRef(finishedWork) {
      var ref = finishedWork.ref;
      if (ref !== null) {
        switch (finishedWork.tag) {
          case 26:
          case 27:
          case 5:
            var instanceToUse = getPublicInstance(finishedWork.stateNode);
            break;
          case 30:
            instanceToUse = finishedWork.stateNode;
            break;
          default:
            instanceToUse = finishedWork.stateNode;
        }
        if (typeof ref === "function")
          if (shouldProfile(finishedWork))
            try {
              startEffectTimer(), finishedWork.refCleanup = ref(instanceToUse);
            } finally {
              recordEffectDuration();
            }
          else
            finishedWork.refCleanup = ref(instanceToUse);
        else
          typeof ref === "string" ? console.error("String refs are no longer supported.") : ref.hasOwnProperty("current") || console.error("Unexpected ref object provided for %s. Use either a ref-setter function or React.createRef().", getComponentNameFromFiber(finishedWork)), ref.current = instanceToUse;
      }
    }
    function safelyAttachRef(current2, nearestMountedAncestor) {
      try {
        runWithFiberInDEV(current2, commitAttachRef, current2);
      } catch (error) {
        captureCommitPhaseError(current2, nearestMountedAncestor, error);
      }
    }
    function safelyDetachRef(current2, nearestMountedAncestor) {
      var { ref, refCleanup } = current2;
      if (ref !== null)
        if (typeof refCleanup === "function")
          try {
            if (shouldProfile(current2))
              try {
                startEffectTimer(), runWithFiberInDEV(current2, refCleanup);
              } finally {
                recordEffectDuration(current2);
              }
            else
              runWithFiberInDEV(current2, refCleanup);
          } catch (error) {
            captureCommitPhaseError(current2, nearestMountedAncestor, error);
          } finally {
            current2.refCleanup = null, current2 = current2.alternate, current2 != null && (current2.refCleanup = null);
          }
        else if (typeof ref === "function")
          try {
            if (shouldProfile(current2))
              try {
                startEffectTimer(), runWithFiberInDEV(current2, ref, null);
              } finally {
                recordEffectDuration(current2);
              }
            else
              runWithFiberInDEV(current2, ref, null);
          } catch (error$3) {
            captureCommitPhaseError(current2, nearestMountedAncestor, error$3);
          }
        else
          ref.current = null;
    }
    function commitProfiler(finishedWork, current2, commitStartTime2, effectDuration) {
      var _finishedWork$memoize = finishedWork.memoizedProps, id = _finishedWork$memoize.id, onCommit = _finishedWork$memoize.onCommit;
      _finishedWork$memoize = _finishedWork$memoize.onRender;
      current2 = current2 === null ? "mount" : "update";
      currentUpdateIsNested && (current2 = "nested-update");
      typeof _finishedWork$memoize === "function" && _finishedWork$memoize(id, current2, finishedWork.actualDuration, finishedWork.treeBaseDuration, finishedWork.actualStartTime, commitStartTime2);
      typeof onCommit === "function" && onCommit(finishedWork.memoizedProps.id, current2, effectDuration, commitStartTime2);
    }
    function commitProfilerPostCommitImpl(finishedWork, current2, commitStartTime2, passiveEffectDuration) {
      var _finishedWork$memoize2 = finishedWork.memoizedProps;
      finishedWork = _finishedWork$memoize2.id;
      _finishedWork$memoize2 = _finishedWork$memoize2.onPostCommit;
      current2 = current2 === null ? "mount" : "update";
      currentUpdateIsNested && (current2 = "nested-update");
      typeof _finishedWork$memoize2 === "function" && _finishedWork$memoize2(finishedWork, current2, passiveEffectDuration, commitStartTime2);
    }
    function commitHostMount(finishedWork) {
      var { type, memoizedProps: props, stateNode: instance } = finishedWork;
      try {
        runWithFiberInDEV(finishedWork, commitMount, instance, type, props, finishedWork);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitHostUpdate(finishedWork, newProps, oldProps) {
      try {
        runWithFiberInDEV(finishedWork, commitUpdate, finishedWork.stateNode, finishedWork.type, oldProps, newProps, finishedWork);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function isHostParent(fiber) {
      return fiber.tag === 5 || fiber.tag === 3 || (supportsResources ? fiber.tag === 26 : false) || (supportsSingletons ? fiber.tag === 27 && isSingletonScope(fiber.type) : false) || fiber.tag === 4;
    }
    function getHostSibling(fiber) {
      a:
        for (;; ) {
          for (;fiber.sibling === null; ) {
            if (fiber.return === null || isHostParent(fiber.return))
              return null;
            fiber = fiber.return;
          }
          fiber.sibling.return = fiber.return;
          for (fiber = fiber.sibling;fiber.tag !== 5 && fiber.tag !== 6 && fiber.tag !== 18; ) {
            if (supportsSingletons && fiber.tag === 27 && isSingletonScope(fiber.type))
              continue a;
            if (fiber.flags & 2)
              continue a;
            if (fiber.child === null || fiber.tag === 4)
              continue a;
            else
              fiber.child.return = fiber, fiber = fiber.child;
          }
          if (!(fiber.flags & 2))
            return fiber.stateNode;
        }
    }
    function insertOrAppendPlacementNodeIntoContainer(node, before, parent) {
      var tag = node.tag;
      if (tag === 5 || tag === 6)
        node = node.stateNode, before ? insertInContainerBefore(parent, node, before) : appendChildToContainer(parent, node);
      else if (tag !== 4 && (supportsSingletons && tag === 27 && isSingletonScope(node.type) && (parent = node.stateNode, before = null), node = node.child, node !== null))
        for (insertOrAppendPlacementNodeIntoContainer(node, before, parent), node = node.sibling;node !== null; )
          insertOrAppendPlacementNodeIntoContainer(node, before, parent), node = node.sibling;
    }
    function insertOrAppendPlacementNode(node, before, parent) {
      var tag = node.tag;
      if (tag === 5 || tag === 6)
        node = node.stateNode, before ? insertBefore(parent, node, before) : appendChild(parent, node);
      else if (tag !== 4 && (supportsSingletons && tag === 27 && isSingletonScope(node.type) && (parent = node.stateNode), node = node.child, node !== null))
        for (insertOrAppendPlacementNode(node, before, parent), node = node.sibling;node !== null; )
          insertOrAppendPlacementNode(node, before, parent), node = node.sibling;
    }
    function commitPlacement(finishedWork) {
      if (supportsMutation) {
        for (var hostParentFiber, parentFiber = finishedWork.return;parentFiber !== null; ) {
          if (isHostParent(parentFiber)) {
            hostParentFiber = parentFiber;
            break;
          }
          parentFiber = parentFiber.return;
        }
        if (hostParentFiber == null)
          throw Error("Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue.");
        switch (hostParentFiber.tag) {
          case 27:
            if (supportsSingletons) {
              hostParentFiber = hostParentFiber.stateNode;
              parentFiber = getHostSibling(finishedWork);
              insertOrAppendPlacementNode(finishedWork, parentFiber, hostParentFiber);
              break;
            }
          case 5:
            parentFiber = hostParentFiber.stateNode;
            hostParentFiber.flags & 32 && (resetTextContent(parentFiber), hostParentFiber.flags &= -33);
            hostParentFiber = getHostSibling(finishedWork);
            insertOrAppendPlacementNode(finishedWork, hostParentFiber, parentFiber);
            break;
          case 3:
          case 4:
            hostParentFiber = hostParentFiber.stateNode.containerInfo;
            parentFiber = getHostSibling(finishedWork);
            insertOrAppendPlacementNodeIntoContainer(finishedWork, parentFiber, hostParentFiber);
            break;
          default:
            throw Error("Invalid host parent fiber. This error is likely caused by a bug in React. Please file an issue.");
        }
      }
    }
    function commitHostPortalContainerChildren(portal, finishedWork, pendingChildren) {
      portal = portal.containerInfo;
      try {
        runWithFiberInDEV(finishedWork, replaceContainerChildren, portal, pendingChildren);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitHostSingletonAcquisition(finishedWork) {
      var { stateNode: singleton, memoizedProps: props } = finishedWork;
      try {
        runWithFiberInDEV(finishedWork, acquireSingletonInstance, finishedWork.type, props, singleton, finishedWork);
      } catch (error) {
        captureCommitPhaseError(finishedWork, finishedWork.return, error);
      }
    }
    function commitBeforeMutationEffects(root, firstChild) {
      prepareForCommit(root.containerInfo);
      for (nextEffect = firstChild;nextEffect !== null; )
        if (root = nextEffect, firstChild = root.child, (root.subtreeFlags & 1024) !== 0 && firstChild !== null)
          firstChild.return = root, nextEffect = firstChild;
        else
          for (;nextEffect !== null; ) {
            firstChild = root = nextEffect;
            var { alternate: current2, flags } = firstChild;
            switch (firstChild.tag) {
              case 0:
                break;
              case 11:
              case 15:
                break;
              case 1:
                (flags & 1024) !== 0 && current2 !== null && commitClassSnapshot(firstChild, current2);
                break;
              case 3:
                (flags & 1024) !== 0 && supportsMutation && clearContainer(firstChild.stateNode.containerInfo);
                break;
              case 5:
              case 26:
              case 27:
              case 6:
              case 4:
              case 17:
                break;
              default:
                if ((flags & 1024) !== 0)
                  throw Error("This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue.");
            }
            firstChild = root.sibling;
            if (firstChild !== null) {
              firstChild.return = root.return;
              nextEffect = firstChild;
              break;
            }
            nextEffect = root.return;
          }
    }
    function commitLayoutEffectOnFiber(finishedRoot, current2, finishedWork) {
      var flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          flags & 4 && commitHookLayoutEffects(finishedWork, Layout | HasEffect);
          break;
        case 1:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          if (flags & 4)
            if (finishedRoot = finishedWork.stateNode, current2 === null)
              finishedWork.type.defaultProps || "ref" in finishedWork.memoizedProps || didWarnAboutReassigningProps || (finishedRoot.props !== finishedWork.memoizedProps && console.error("Expected %s props to match memoized props before componentDidMount. This might either be because of a bug in React, or because a component reassigns its own `this.props`. Please file an issue.", getComponentNameFromFiber(finishedWork) || "instance"), finishedRoot.state !== finishedWork.memoizedState && console.error("Expected %s state to match memoized state before componentDidMount. This might either be because of a bug in React, or because a component reassigns its own `this.state`. Please file an issue.", getComponentNameFromFiber(finishedWork) || "instance")), shouldProfile(finishedWork) ? (startEffectTimer(), runWithFiberInDEV(finishedWork, callComponentDidMountInDEV, finishedWork, finishedRoot), recordEffectDuration()) : runWithFiberInDEV(finishedWork, callComponentDidMountInDEV, finishedWork, finishedRoot);
            else {
              var prevProps = resolveClassComponentProps(finishedWork.type, current2.memoizedProps);
              current2 = current2.memoizedState;
              finishedWork.type.defaultProps || "ref" in finishedWork.memoizedProps || didWarnAboutReassigningProps || (finishedRoot.props !== finishedWork.memoizedProps && console.error("Expected %s props to match memoized props before componentDidUpdate. This might either be because of a bug in React, or because a component reassigns its own `this.props`. Please file an issue.", getComponentNameFromFiber(finishedWork) || "instance"), finishedRoot.state !== finishedWork.memoizedState && console.error("Expected %s state to match memoized state before componentDidUpdate. This might either be because of a bug in React, or because a component reassigns its own `this.state`. Please file an issue.", getComponentNameFromFiber(finishedWork) || "instance"));
              shouldProfile(finishedWork) ? (startEffectTimer(), runWithFiberInDEV(finishedWork, callComponentDidUpdateInDEV, finishedWork, finishedRoot, prevProps, current2, finishedRoot.__reactInternalSnapshotBeforeUpdate), recordEffectDuration()) : runWithFiberInDEV(finishedWork, callComponentDidUpdateInDEV, finishedWork, finishedRoot, prevProps, current2, finishedRoot.__reactInternalSnapshotBeforeUpdate);
            }
          flags & 64 && commitClassCallbacks(finishedWork);
          flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 3:
          current2 = pushNestedEffectDurations();
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          if (flags & 64 && (flags = finishedWork.updateQueue, flags !== null)) {
            prevProps = null;
            if (finishedWork.child !== null)
              switch (finishedWork.child.tag) {
                case 27:
                case 5:
                  prevProps = getPublicInstance(finishedWork.child.stateNode);
                  break;
                case 1:
                  prevProps = finishedWork.child.stateNode;
              }
            try {
              runWithFiberInDEV(finishedWork, commitCallbacks, flags, prevProps);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
          finishedRoot.effectDuration += popNestedEffectDurations(current2);
          break;
        case 27:
          supportsSingletons && current2 === null && flags & 4 && commitHostSingletonAcquisition(finishedWork);
        case 26:
        case 5:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          current2 === null && flags & 4 && commitHostMount(finishedWork);
          flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 12:
          if (flags & 4) {
            flags = pushNestedEffectDurations();
            recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
            finishedRoot = finishedWork.stateNode;
            finishedRoot.effectDuration += bubbleNestedEffectDurations(flags);
            try {
              runWithFiberInDEV(finishedWork, commitProfiler, finishedWork, current2, commitStartTime, finishedRoot.effectDuration);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          } else
            recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          break;
        case 13:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
          flags & 64 && (finishedRoot = finishedWork.memoizedState, finishedRoot !== null && (finishedRoot = finishedRoot.dehydrated, finishedRoot !== null && (finishedWork = retryDehydratedSuspenseBoundary.bind(null, finishedWork), registerSuspenseInstanceRetry(finishedRoot, finishedWork))));
          break;
        case 22:
          flags = finishedWork.memoizedState !== null || offscreenSubtreeIsHidden;
          if (!flags) {
            current2 = current2 !== null && current2.memoizedState !== null || offscreenSubtreeWasHidden;
            prevProps = offscreenSubtreeIsHidden;
            var prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
            offscreenSubtreeIsHidden = flags;
            (offscreenSubtreeWasHidden = current2) && !prevOffscreenSubtreeWasHidden ? recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, (finishedWork.subtreeFlags & 8772) !== 0) : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
            offscreenSubtreeIsHidden = prevProps;
            offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
          }
          break;
        case 30:
          break;
        default:
          recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      }
    }
    function detachFiberAfterEffects(fiber) {
      var alternate = fiber.alternate;
      alternate !== null && (fiber.alternate = null, detachFiberAfterEffects(alternate));
      fiber.child = null;
      fiber.deletions = null;
      fiber.sibling = null;
      fiber.tag === 5 && (alternate = fiber.stateNode, alternate !== null && detachDeletedInstance(alternate));
      fiber.stateNode = null;
      fiber._debugOwner = null;
      fiber.return = null;
      fiber.dependencies = null;
      fiber.memoizedProps = null;
      fiber.memoizedState = null;
      fiber.pendingProps = null;
      fiber.stateNode = null;
      fiber.updateQueue = null;
    }
    function recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, parent) {
      for (parent = parent.child;parent !== null; )
        commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, parent), parent = parent.sibling;
    }
    function commitDeletionEffectsOnFiber(finishedRoot, nearestMountedAncestor, deletedFiber) {
      if (injectedHook && typeof injectedHook.onCommitFiberUnmount === "function")
        try {
          injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
        } catch (err) {
          hasLoggedError || (hasLoggedError = true, console.error("React instrumentation encountered an error: %s", err));
        }
      switch (deletedFiber.tag) {
        case 26:
          if (supportsResources) {
            offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
            recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
            deletedFiber.memoizedState ? releaseResource(deletedFiber.memoizedState) : deletedFiber.stateNode && unmountHoistable(deletedFiber.stateNode);
            break;
          }
        case 27:
          if (supportsSingletons) {
            offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
            var prevHostParent = hostParent, prevHostParentIsContainer = hostParentIsContainer;
            isSingletonScope(deletedFiber.type) && (hostParent = deletedFiber.stateNode, hostParentIsContainer = false);
            recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
            runWithFiberInDEV(deletedFiber, releaseSingletonInstance, deletedFiber.stateNode);
            hostParent = prevHostParent;
            hostParentIsContainer = prevHostParentIsContainer;
            break;
          }
        case 5:
          offscreenSubtreeWasHidden || safelyDetachRef(deletedFiber, nearestMountedAncestor);
        case 6:
          if (supportsMutation) {
            if (prevHostParent = hostParent, prevHostParentIsContainer = hostParentIsContainer, hostParent = null, recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber), hostParent = prevHostParent, hostParentIsContainer = prevHostParentIsContainer, hostParent !== null)
              if (hostParentIsContainer)
                try {
                  runWithFiberInDEV(deletedFiber, removeChildFromContainer, hostParent, deletedFiber.stateNode);
                } catch (error) {
                  captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
                }
              else
                try {
                  runWithFiberInDEV(deletedFiber, removeChild, hostParent, deletedFiber.stateNode);
                } catch (error) {
                  captureCommitPhaseError(deletedFiber, nearestMountedAncestor, error);
                }
          } else
            recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          break;
        case 18:
          supportsMutation && hostParent !== null && (hostParentIsContainer ? clearSuspenseBoundaryFromContainer(hostParent, deletedFiber.stateNode) : clearSuspenseBoundary(hostParent, deletedFiber.stateNode));
          break;
        case 4:
          supportsMutation ? (prevHostParent = hostParent, prevHostParentIsContainer = hostParentIsContainer, hostParent = deletedFiber.stateNode.containerInfo, hostParentIsContainer = true, recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber), hostParent = prevHostParent, hostParentIsContainer = prevHostParentIsContainer) : (supportsPersistence && commitHostPortalContainerChildren(deletedFiber.stateNode, deletedFiber, createContainerChildSet()), recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber));
          break;
        case 0:
        case 11:
        case 14:
        case 15:
          offscreenSubtreeWasHidden || commitHookEffectListUnmount(Insertion, deletedFiber, nearestMountedAncestor);
          offscreenSubtreeWasHidden || commitHookLayoutUnmountEffects(deletedFiber, nearestMountedAncestor, Layout);
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          break;
        case 1:
          offscreenSubtreeWasHidden || (safelyDetachRef(deletedFiber, nearestMountedAncestor), prevHostParent = deletedFiber.stateNode, typeof prevHostParent.componentWillUnmount === "function" && safelyCallComponentWillUnmount(deletedFiber, nearestMountedAncestor, prevHostParent));
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          break;
        case 21:
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          break;
        case 22:
          offscreenSubtreeWasHidden = (prevHostParent = offscreenSubtreeWasHidden) || deletedFiber.memoizedState !== null;
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
          offscreenSubtreeWasHidden = prevHostParent;
          break;
        default:
          recursivelyTraverseDeletionEffects(finishedRoot, nearestMountedAncestor, deletedFiber);
      }
    }
    function commitSuspenseHydrationCallbacks(finishedRoot, finishedWork) {
      if (supportsHydration && finishedWork.memoizedState === null && (finishedRoot = finishedWork.alternate, finishedRoot !== null && (finishedRoot = finishedRoot.memoizedState, finishedRoot !== null && (finishedRoot = finishedRoot.dehydrated, finishedRoot !== null))))
        try {
          runWithFiberInDEV(finishedWork, commitHydratedSuspenseInstance, finishedRoot);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
    }
    function getRetryCache(finishedWork) {
      switch (finishedWork.tag) {
        case 13:
        case 19:
          var retryCache = finishedWork.stateNode;
          retryCache === null && (retryCache = finishedWork.stateNode = new PossiblyWeakSet);
          return retryCache;
        case 22:
          return finishedWork = finishedWork.stateNode, retryCache = finishedWork._retryCache, retryCache === null && (retryCache = finishedWork._retryCache = new PossiblyWeakSet), retryCache;
        default:
          throw Error("Unexpected Suspense handler tag (" + finishedWork.tag + "). This is a bug in React.");
      }
    }
    function attachSuspenseRetryListeners(finishedWork, wakeables) {
      var retryCache = getRetryCache(finishedWork);
      wakeables.forEach(function(wakeable) {
        var retry = resolveRetryWakeable.bind(null, finishedWork, wakeable);
        if (!retryCache.has(wakeable)) {
          retryCache.add(wakeable);
          if (isDevToolsPresent)
            if (inProgressLanes !== null && inProgressRoot !== null)
              restorePendingUpdaters(inProgressRoot, inProgressLanes);
            else
              throw Error("Expected finished root and lanes to be set. This is a bug in React.");
          wakeable.then(retry, retry);
        }
      });
    }
    function recursivelyTraverseMutationEffects(root$jscomp$0, parentFiber) {
      var deletions = parentFiber.deletions;
      if (deletions !== null)
        for (var i = 0;i < deletions.length; i++) {
          var root = root$jscomp$0, returnFiber = parentFiber, deletedFiber = deletions[i];
          if (supportsMutation) {
            var parent = returnFiber;
            a:
              for (;parent !== null; ) {
                switch (parent.tag) {
                  case 27:
                    if (supportsSingletons) {
                      if (isSingletonScope(parent.type)) {
                        hostParent = parent.stateNode;
                        hostParentIsContainer = false;
                        break a;
                      }
                      break;
                    }
                  case 5:
                    hostParent = parent.stateNode;
                    hostParentIsContainer = false;
                    break a;
                  case 3:
                  case 4:
                    hostParent = parent.stateNode.containerInfo;
                    hostParentIsContainer = true;
                    break a;
                }
                parent = parent.return;
              }
            if (hostParent === null)
              throw Error("Expected to find a host parent. This error is likely caused by a bug in React. Please file an issue.");
            commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
            hostParent = null;
            hostParentIsContainer = false;
          } else
            commitDeletionEffectsOnFiber(root, returnFiber, deletedFiber);
          root = deletedFiber;
          returnFiber = root.alternate;
          returnFiber !== null && (returnFiber.return = null);
          root.return = null;
        }
      if (parentFiber.subtreeFlags & 13878)
        for (parentFiber = parentFiber.child;parentFiber !== null; )
          commitMutationEffectsOnFiber(parentFiber, root$jscomp$0), parentFiber = parentFiber.sibling;
    }
    function commitMutationEffectsOnFiber(finishedWork, root) {
      var { alternate: current2, flags } = finishedWork;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          flags & 4 && (commitHookEffectListUnmount(Insertion | HasEffect, finishedWork, finishedWork.return), commitHookEffectListMount(Insertion | HasEffect, finishedWork), commitHookLayoutUnmountEffects(finishedWork, finishedWork.return, Layout | HasEffect));
          break;
        case 1:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          flags & 512 && (offscreenSubtreeWasHidden || current2 === null || safelyDetachRef(current2, current2.return));
          flags & 64 && offscreenSubtreeIsHidden && (finishedWork = finishedWork.updateQueue, finishedWork !== null && (flags = finishedWork.callbacks, flags !== null && (current2 = finishedWork.shared.hiddenCallbacks, finishedWork.shared.hiddenCallbacks = current2 === null ? flags : current2.concat(flags))));
          break;
        case 26:
          if (supportsResources) {
            var hoistableRoot = currentHoistableRoot;
            recursivelyTraverseMutationEffects(root, finishedWork);
            commitReconciliationEffects(finishedWork);
            flags & 512 && (offscreenSubtreeWasHidden || current2 === null || safelyDetachRef(current2, current2.return));
            flags & 4 && (flags = current2 !== null ? current2.memoizedState : null, root = finishedWork.memoizedState, current2 === null ? root === null ? finishedWork.stateNode === null ? finishedWork.stateNode = hydrateHoistable(hoistableRoot, finishedWork.type, finishedWork.memoizedProps, finishedWork) : mountHoistable(hoistableRoot, finishedWork.type, finishedWork.stateNode) : finishedWork.stateNode = acquireResource(hoistableRoot, root, finishedWork.memoizedProps) : flags !== root ? (flags === null ? current2.stateNode !== null && unmountHoistable(current2.stateNode) : releaseResource(flags), root === null ? mountHoistable(hoistableRoot, finishedWork.type, finishedWork.stateNode) : acquireResource(hoistableRoot, root, finishedWork.memoizedProps)) : root === null && finishedWork.stateNode !== null && commitHostUpdate(finishedWork, finishedWork.memoizedProps, current2.memoizedProps));
            break;
          }
        case 27:
          if (supportsSingletons) {
            recursivelyTraverseMutationEffects(root, finishedWork);
            commitReconciliationEffects(finishedWork);
            flags & 512 && (offscreenSubtreeWasHidden || current2 === null || safelyDetachRef(current2, current2.return));
            current2 !== null && flags & 4 && commitHostUpdate(finishedWork, finishedWork.memoizedProps, current2.memoizedProps);
            break;
          }
        case 5:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          flags & 512 && (offscreenSubtreeWasHidden || current2 === null || safelyDetachRef(current2, current2.return));
          if (supportsMutation) {
            if (finishedWork.flags & 32) {
              root = finishedWork.stateNode;
              try {
                runWithFiberInDEV(finishedWork, resetTextContent, root);
              } catch (error) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error);
              }
            }
            flags & 4 && finishedWork.stateNode != null && (root = finishedWork.memoizedProps, commitHostUpdate(finishedWork, root, current2 !== null ? current2.memoizedProps : root));
            flags & 1024 && (needsFormReset = true, finishedWork.type !== "form" && console.error("Unexpected host component type. Expected a form. This is a bug in React."));
          }
          break;
        case 6:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 4 && supportsMutation) {
            if (finishedWork.stateNode === null)
              throw Error("This should have a text node initialized. This error is likely caused by a bug in React. Please file an issue.");
            flags = finishedWork.memoizedProps;
            current2 = current2 !== null ? current2.memoizedProps : flags;
            root = finishedWork.stateNode;
            try {
              runWithFiberInDEV(finishedWork, commitTextUpdate, root, current2, flags);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
          break;
        case 3:
          hoistableRoot = pushNestedEffectDurations();
          if (supportsResources) {
            prepareToCommitHoistables();
            var previousHoistableRoot = currentHoistableRoot;
            currentHoistableRoot = getHoistableRoot(root.containerInfo);
            recursivelyTraverseMutationEffects(root, finishedWork);
            currentHoistableRoot = previousHoistableRoot;
          } else
            recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          if (flags & 4) {
            if (supportsMutation && supportsHydration && current2 !== null && current2.memoizedState.isDehydrated)
              try {
                runWithFiberInDEV(finishedWork, commitHydratedContainer, root.containerInfo);
              } catch (error) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error);
              }
            if (supportsPersistence) {
              flags = root.containerInfo;
              current2 = root.pendingChildren;
              try {
                runWithFiberInDEV(finishedWork, replaceContainerChildren, flags, current2);
              } catch (error) {
                captureCommitPhaseError(finishedWork, finishedWork.return, error);
              }
            }
          }
          needsFormReset && (needsFormReset = false, recursivelyResetForms(finishedWork));
          root.effectDuration += popNestedEffectDurations(hoistableRoot);
          break;
        case 4:
          supportsResources ? (current2 = currentHoistableRoot, currentHoistableRoot = getHoistableRoot(finishedWork.stateNode.containerInfo), recursivelyTraverseMutationEffects(root, finishedWork), commitReconciliationEffects(finishedWork), currentHoistableRoot = current2) : (recursivelyTraverseMutationEffects(root, finishedWork), commitReconciliationEffects(finishedWork));
          flags & 4 && supportsPersistence && commitHostPortalContainerChildren(finishedWork.stateNode, finishedWork, finishedWork.stateNode.pendingChildren);
          break;
        case 12:
          flags = pushNestedEffectDurations();
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          finishedWork.stateNode.effectDuration += bubbleNestedEffectDurations(flags);
          break;
        case 13:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          finishedWork.child.flags & 8192 && finishedWork.memoizedState !== null !== (current2 !== null && current2.memoizedState !== null) && (globalMostRecentFallbackTime = now$1());
          flags & 4 && (flags = finishedWork.updateQueue, flags !== null && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, flags)));
          break;
        case 22:
          hoistableRoot = finishedWork.memoizedState !== null;
          var wasHidden = current2 !== null && current2.memoizedState !== null, prevOffscreenSubtreeIsHidden = offscreenSubtreeIsHidden, prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || hoistableRoot;
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden || wasHidden;
          recursivelyTraverseMutationEffects(root, finishedWork);
          offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
          commitReconciliationEffects(finishedWork);
          if (flags & 8192 && (root = finishedWork.stateNode, root._visibility = hoistableRoot ? root._visibility & -2 : root._visibility | 1, hoistableRoot && (current2 === null || wasHidden || offscreenSubtreeIsHidden || offscreenSubtreeWasHidden || recursivelyTraverseDisappearLayoutEffects(finishedWork)), supportsMutation)) {
            a:
              if (current2 = null, supportsMutation)
                for (root = finishedWork;; ) {
                  if (root.tag === 5 || supportsResources && root.tag === 26) {
                    if (current2 === null) {
                      wasHidden = current2 = root;
                      try {
                        previousHoistableRoot = wasHidden.stateNode, hoistableRoot ? runWithFiberInDEV(wasHidden, hideInstance, previousHoistableRoot) : runWithFiberInDEV(wasHidden, unhideInstance, wasHidden.stateNode, wasHidden.memoizedProps);
                      } catch (error) {
                        captureCommitPhaseError(wasHidden, wasHidden.return, error);
                      }
                    }
                  } else if (root.tag === 6) {
                    if (current2 === null) {
                      wasHidden = root;
                      try {
                        var instance = wasHidden.stateNode;
                        hoistableRoot ? runWithFiberInDEV(wasHidden, hideTextInstance, instance) : runWithFiberInDEV(wasHidden, unhideTextInstance, instance, wasHidden.memoizedProps);
                      } catch (error) {
                        captureCommitPhaseError(wasHidden, wasHidden.return, error);
                      }
                    }
                  } else if ((root.tag !== 22 && root.tag !== 23 || root.memoizedState === null || root === finishedWork) && root.child !== null) {
                    root.child.return = root;
                    root = root.child;
                    continue;
                  }
                  if (root === finishedWork)
                    break a;
                  for (;root.sibling === null; ) {
                    if (root.return === null || root.return === finishedWork)
                      break a;
                    current2 === root && (current2 = null);
                    root = root.return;
                  }
                  current2 === root && (current2 = null);
                  root.sibling.return = root.return;
                  root = root.sibling;
                }
          }
          flags & 4 && (flags = finishedWork.updateQueue, flags !== null && (current2 = flags.retryQueue, current2 !== null && (flags.retryQueue = null, attachSuspenseRetryListeners(finishedWork, current2))));
          break;
        case 19:
          recursivelyTraverseMutationEffects(root, finishedWork);
          commitReconciliationEffects(finishedWork);
          flags & 4 && (flags = finishedWork.updateQueue, flags !== null && (finishedWork.updateQueue = null, attachSuspenseRetryListeners(finishedWork, flags)));
          break;
        case 30:
          break;
        case 21:
          break;
        default:
          recursivelyTraverseMutationEffects(root, finishedWork), commitReconciliationEffects(finishedWork);
      }
    }
    function commitReconciliationEffects(finishedWork) {
      var flags = finishedWork.flags;
      if (flags & 2) {
        try {
          runWithFiberInDEV(finishedWork, commitPlacement, finishedWork);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
        finishedWork.flags &= -3;
      }
      flags & 4096 && (finishedWork.flags &= -4097);
    }
    function recursivelyResetForms(parentFiber) {
      if (parentFiber.subtreeFlags & 1024)
        for (parentFiber = parentFiber.child;parentFiber !== null; ) {
          var fiber = parentFiber;
          recursivelyResetForms(fiber);
          fiber.tag === 5 && fiber.flags & 1024 && resetFormInstance(fiber.stateNode);
          parentFiber = parentFiber.sibling;
        }
    }
    function recursivelyTraverseLayoutEffects(root, parentFiber) {
      if (parentFiber.subtreeFlags & 8772)
        for (parentFiber = parentFiber.child;parentFiber !== null; )
          commitLayoutEffectOnFiber(root, parentFiber.alternate, parentFiber), parentFiber = parentFiber.sibling;
    }
    function disappearLayoutEffects(finishedWork) {
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 14:
        case 15:
          commitHookLayoutUnmountEffects(finishedWork, finishedWork.return, Layout);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 1:
          safelyDetachRef(finishedWork, finishedWork.return);
          var instance = finishedWork.stateNode;
          typeof instance.componentWillUnmount === "function" && safelyCallComponentWillUnmount(finishedWork, finishedWork.return, instance);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 27:
          supportsSingletons && runWithFiberInDEV(finishedWork, releaseSingletonInstance, finishedWork.stateNode);
        case 26:
        case 5:
          safelyDetachRef(finishedWork, finishedWork.return);
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 22:
          finishedWork.memoizedState === null && recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        case 30:
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
          break;
        default:
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
      }
    }
    function recursivelyTraverseDisappearLayoutEffects(parentFiber) {
      for (parentFiber = parentFiber.child;parentFiber !== null; )
        disappearLayoutEffects(parentFiber), parentFiber = parentFiber.sibling;
    }
    function reappearLayoutEffects(finishedRoot, current2, finishedWork, includeWorkInProgressEffects) {
      var flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, includeWorkInProgressEffects);
          commitHookLayoutEffects(finishedWork, Layout);
          break;
        case 1:
          recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, includeWorkInProgressEffects);
          current2 = finishedWork.stateNode;
          typeof current2.componentDidMount === "function" && runWithFiberInDEV(finishedWork, callComponentDidMountInDEV, finishedWork, current2);
          current2 = finishedWork.updateQueue;
          if (current2 !== null) {
            finishedRoot = finishedWork.stateNode;
            try {
              runWithFiberInDEV(finishedWork, commitHiddenCallbacks, current2, finishedRoot);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          }
          includeWorkInProgressEffects && flags & 64 && commitClassCallbacks(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 27:
          supportsSingletons && commitHostSingletonAcquisition(finishedWork);
        case 26:
        case 5:
          recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, includeWorkInProgressEffects);
          includeWorkInProgressEffects && current2 === null && flags & 4 && commitHostMount(finishedWork);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 12:
          if (includeWorkInProgressEffects && flags & 4) {
            flags = pushNestedEffectDurations();
            recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, includeWorkInProgressEffects);
            includeWorkInProgressEffects = finishedWork.stateNode;
            includeWorkInProgressEffects.effectDuration += bubbleNestedEffectDurations(flags);
            try {
              runWithFiberInDEV(finishedWork, commitProfiler, finishedWork, current2, commitStartTime, includeWorkInProgressEffects.effectDuration);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          } else
            recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, includeWorkInProgressEffects);
          break;
        case 13:
          recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, includeWorkInProgressEffects);
          includeWorkInProgressEffects && flags & 4 && commitSuspenseHydrationCallbacks(finishedRoot, finishedWork);
          break;
        case 22:
          finishedWork.memoizedState === null && recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, includeWorkInProgressEffects);
          safelyAttachRef(finishedWork, finishedWork.return);
          break;
        case 30:
          break;
        default:
          recursivelyTraverseReappearLayoutEffects(finishedRoot, finishedWork, includeWorkInProgressEffects);
      }
    }
    function recursivelyTraverseReappearLayoutEffects(finishedRoot, parentFiber, includeWorkInProgressEffects) {
      includeWorkInProgressEffects = includeWorkInProgressEffects && (parentFiber.subtreeFlags & 8772) !== 0;
      for (parentFiber = parentFiber.child;parentFiber !== null; )
        reappearLayoutEffects(finishedRoot, parentFiber.alternate, parentFiber, includeWorkInProgressEffects), parentFiber = parentFiber.sibling;
    }
    function commitOffscreenPassiveMountEffects(current2, finishedWork) {
      var previousCache = null;
      current2 !== null && current2.memoizedState !== null && current2.memoizedState.cachePool !== null && (previousCache = current2.memoizedState.cachePool.pool);
      current2 = null;
      finishedWork.memoizedState !== null && finishedWork.memoizedState.cachePool !== null && (current2 = finishedWork.memoizedState.cachePool.pool);
      current2 !== previousCache && (current2 != null && retainCache(current2), previousCache != null && releaseCache(previousCache));
    }
    function commitCachePassiveMountEffect(current2, finishedWork) {
      current2 = null;
      finishedWork.alternate !== null && (current2 = finishedWork.alternate.memoizedState.cache);
      finishedWork = finishedWork.memoizedState.cache;
      finishedWork !== current2 && (retainCache(finishedWork), current2 != null && releaseCache(current2));
    }
    function recursivelyTraversePassiveMountEffects(root, parentFiber, committedLanes, committedTransitions) {
      if (parentFiber.subtreeFlags & 10256)
        for (parentFiber = parentFiber.child;parentFiber !== null; )
          commitPassiveMountOnFiber(root, parentFiber, committedLanes, committedTransitions), parentFiber = parentFiber.sibling;
    }
    function commitPassiveMountOnFiber(finishedRoot, finishedWork, committedLanes, committedTransitions) {
      var flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
          flags & 2048 && commitHookPassiveMountEffects(finishedWork, Passive | HasEffect);
          break;
        case 1:
          recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
          break;
        case 3:
          var prevEffectDuration = pushNestedEffectDurations();
          recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
          flags & 2048 && (committedLanes = null, finishedWork.alternate !== null && (committedLanes = finishedWork.alternate.memoizedState.cache), finishedWork = finishedWork.memoizedState.cache, finishedWork !== committedLanes && (retainCache(finishedWork), committedLanes != null && releaseCache(committedLanes)));
          finishedRoot.passiveEffectDuration += popNestedEffectDurations(prevEffectDuration);
          break;
        case 12:
          if (flags & 2048) {
            flags = pushNestedEffectDurations();
            recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
            finishedRoot = finishedWork.stateNode;
            finishedRoot.passiveEffectDuration += bubbleNestedEffectDurations(flags);
            try {
              runWithFiberInDEV(finishedWork, commitProfilerPostCommitImpl, finishedWork, finishedWork.alternate, commitStartTime, finishedRoot.passiveEffectDuration);
            } catch (error) {
              captureCommitPhaseError(finishedWork, finishedWork.return, error);
            }
          } else
            recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
          break;
        case 13:
          recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
          break;
        case 23:
          break;
        case 22:
          prevEffectDuration = finishedWork.stateNode;
          var _current = finishedWork.alternate;
          finishedWork.memoizedState !== null ? prevEffectDuration._visibility & 2 ? recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions) : recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork) : prevEffectDuration._visibility & 2 ? recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions) : (prevEffectDuration._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, (finishedWork.subtreeFlags & 10256) !== 0));
          flags & 2048 && commitOffscreenPassiveMountEffects(_current, finishedWork);
          break;
        case 24:
          recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
          flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraversePassiveMountEffects(finishedRoot, finishedWork, committedLanes, committedTransitions);
      }
    }
    function recursivelyTraverseReconnectPassiveEffects(finishedRoot, parentFiber, committedLanes, committedTransitions, includeWorkInProgressEffects) {
      includeWorkInProgressEffects = includeWorkInProgressEffects && (parentFiber.subtreeFlags & 10256) !== 0;
      for (parentFiber = parentFiber.child;parentFiber !== null; )
        reconnectPassiveEffects(finishedRoot, parentFiber, committedLanes, committedTransitions, includeWorkInProgressEffects), parentFiber = parentFiber.sibling;
    }
    function reconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects) {
      var flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects);
          commitHookPassiveMountEffects(finishedWork, Passive);
          break;
        case 23:
          break;
        case 22:
          var _instance2 = finishedWork.stateNode;
          finishedWork.memoizedState !== null ? _instance2._visibility & 2 ? recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects) : recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork) : (_instance2._visibility |= 2, recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects));
          includeWorkInProgressEffects && flags & 2048 && commitOffscreenPassiveMountEffects(finishedWork.alternate, finishedWork);
          break;
        case 24:
          recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects);
          includeWorkInProgressEffects && flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
          break;
        default:
          recursivelyTraverseReconnectPassiveEffects(finishedRoot, finishedWork, committedLanes, committedTransitions, includeWorkInProgressEffects);
      }
    }
    function recursivelyTraverseAtomicPassiveEffects(finishedRoot$jscomp$0, parentFiber) {
      if (parentFiber.subtreeFlags & 10256)
        for (parentFiber = parentFiber.child;parentFiber !== null; ) {
          var finishedRoot = finishedRoot$jscomp$0, finishedWork = parentFiber, flags = finishedWork.flags;
          switch (finishedWork.tag) {
            case 22:
              recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
              flags & 2048 && commitOffscreenPassiveMountEffects(finishedWork.alternate, finishedWork);
              break;
            case 24:
              recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
              flags & 2048 && commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
              break;
            default:
              recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
          }
          parentFiber = parentFiber.sibling;
        }
    }
    function recursivelyAccumulateSuspenseyCommit(parentFiber) {
      if (parentFiber.subtreeFlags & suspenseyCommitFlag)
        for (parentFiber = parentFiber.child;parentFiber !== null; )
          accumulateSuspenseyCommitOnFiber(parentFiber), parentFiber = parentFiber.sibling;
    }
    function accumulateSuspenseyCommitOnFiber(fiber) {
      switch (fiber.tag) {
        case 26:
          recursivelyAccumulateSuspenseyCommit(fiber);
          fiber.flags & suspenseyCommitFlag && (fiber.memoizedState !== null ? suspendResource(currentHoistableRoot, fiber.memoizedState, fiber.memoizedProps) : suspendInstance(fiber.type, fiber.memoizedProps));
          break;
        case 5:
          recursivelyAccumulateSuspenseyCommit(fiber);
          fiber.flags & suspenseyCommitFlag && suspendInstance(fiber.type, fiber.memoizedProps);
          break;
        case 3:
        case 4:
          if (supportsResources) {
            var previousHoistableRoot = currentHoistableRoot;
            currentHoistableRoot = getHoistableRoot(fiber.stateNode.containerInfo);
            recursivelyAccumulateSuspenseyCommit(fiber);
            currentHoistableRoot = previousHoistableRoot;
          } else
            recursivelyAccumulateSuspenseyCommit(fiber);
          break;
        case 22:
          fiber.memoizedState === null && (previousHoistableRoot = fiber.alternate, previousHoistableRoot !== null && previousHoistableRoot.memoizedState !== null ? (previousHoistableRoot = suspenseyCommitFlag, suspenseyCommitFlag = 16777216, recursivelyAccumulateSuspenseyCommit(fiber), suspenseyCommitFlag = previousHoistableRoot) : recursivelyAccumulateSuspenseyCommit(fiber));
          break;
        default:
          recursivelyAccumulateSuspenseyCommit(fiber);
      }
    }
    function detachAlternateSiblings(parentFiber) {
      var previousFiber = parentFiber.alternate;
      if (previousFiber !== null && (parentFiber = previousFiber.child, parentFiber !== null)) {
        previousFiber.child = null;
        do
          previousFiber = parentFiber.sibling, parentFiber.sibling = null, parentFiber = previousFiber;
        while (parentFiber !== null);
      }
    }
    function recursivelyTraversePassiveUnmountEffects(parentFiber) {
      var deletions = parentFiber.deletions;
      if ((parentFiber.flags & 16) !== 0) {
        if (deletions !== null)
          for (var i = 0;i < deletions.length; i++) {
            var childToDelete = deletions[i];
            nextEffect = childToDelete;
            commitPassiveUnmountEffectsInsideOfDeletedTree_begin(childToDelete, parentFiber);
          }
        detachAlternateSiblings(parentFiber);
      }
      if (parentFiber.subtreeFlags & 10256)
        for (parentFiber = parentFiber.child;parentFiber !== null; )
          commitPassiveUnmountOnFiber(parentFiber), parentFiber = parentFiber.sibling;
    }
    function commitPassiveUnmountOnFiber(finishedWork) {
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          recursivelyTraversePassiveUnmountEffects(finishedWork);
          finishedWork.flags & 2048 && commitHookPassiveUnmountEffects(finishedWork, finishedWork.return, Passive | HasEffect);
          break;
        case 3:
          var prevEffectDuration = pushNestedEffectDurations();
          recursivelyTraversePassiveUnmountEffects(finishedWork);
          finishedWork.stateNode.passiveEffectDuration += popNestedEffectDurations(prevEffectDuration);
          break;
        case 12:
          prevEffectDuration = pushNestedEffectDurations();
          recursivelyTraversePassiveUnmountEffects(finishedWork);
          finishedWork.stateNode.passiveEffectDuration += bubbleNestedEffectDurations(prevEffectDuration);
          break;
        case 22:
          prevEffectDuration = finishedWork.stateNode;
          finishedWork.memoizedState !== null && prevEffectDuration._visibility & 2 && (finishedWork.return === null || finishedWork.return.tag !== 13) ? (prevEffectDuration._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(finishedWork)) : recursivelyTraversePassiveUnmountEffects(finishedWork);
          break;
        default:
          recursivelyTraversePassiveUnmountEffects(finishedWork);
      }
    }
    function recursivelyTraverseDisconnectPassiveEffects(parentFiber) {
      var deletions = parentFiber.deletions;
      if ((parentFiber.flags & 16) !== 0) {
        if (deletions !== null)
          for (var i = 0;i < deletions.length; i++) {
            var childToDelete = deletions[i];
            nextEffect = childToDelete;
            commitPassiveUnmountEffectsInsideOfDeletedTree_begin(childToDelete, parentFiber);
          }
        detachAlternateSiblings(parentFiber);
      }
      for (parentFiber = parentFiber.child;parentFiber !== null; )
        disconnectPassiveEffect(parentFiber), parentFiber = parentFiber.sibling;
    }
    function disconnectPassiveEffect(finishedWork) {
      switch (finishedWork.tag) {
        case 0:
        case 11:
        case 15:
          commitHookPassiveUnmountEffects(finishedWork, finishedWork.return, Passive);
          recursivelyTraverseDisconnectPassiveEffects(finishedWork);
          break;
        case 22:
          var instance = finishedWork.stateNode;
          instance._visibility & 2 && (instance._visibility &= -3, recursivelyTraverseDisconnectPassiveEffects(finishedWork));
          break;
        default:
          recursivelyTraverseDisconnectPassiveEffects(finishedWork);
      }
    }
    function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(deletedSubtreeRoot, nearestMountedAncestor) {
      for (;nextEffect !== null; ) {
        var fiber = nextEffect, current2 = fiber;
        switch (current2.tag) {
          case 0:
          case 11:
          case 15:
            commitHookPassiveUnmountEffects(current2, nearestMountedAncestor, Passive);
            break;
          case 23:
          case 22:
            current2.memoizedState !== null && current2.memoizedState.cachePool !== null && (current2 = current2.memoizedState.cachePool.pool, current2 != null && retainCache(current2));
            break;
          case 24:
            releaseCache(current2.memoizedState.cache);
        }
        current2 = fiber.child;
        if (current2 !== null)
          current2.return = fiber, nextEffect = current2;
        else
          a:
            for (fiber = deletedSubtreeRoot;nextEffect !== null; ) {
              current2 = nextEffect;
              var { sibling, return: returnFiber } = current2;
              detachFiberAfterEffects(current2);
              if (current2 === fiber) {
                nextEffect = null;
                break a;
              }
              if (sibling !== null) {
                sibling.return = returnFiber;
                nextEffect = sibling;
                break a;
              }
              nextEffect = returnFiber;
            }
      }
    }
    function findFiberRootForHostRoot(hostRoot) {
      var maybeFiber = getInstanceFromNode(hostRoot);
      if (maybeFiber != null) {
        if (typeof maybeFiber.memoizedProps["data-testname"] !== "string")
          throw Error("Invalid host root specified. Should be either a React container or a node with a testname attribute.");
        return maybeFiber;
      }
      hostRoot = findFiberRoot(hostRoot);
      if (hostRoot === null)
        throw Error("Could not find React container within specified host subtree.");
      return hostRoot.stateNode.current;
    }
    function matchSelector(fiber$jscomp$0, selector) {
      var tag = fiber$jscomp$0.tag;
      switch (selector.$$typeof) {
        case COMPONENT_TYPE:
          if (fiber$jscomp$0.type === selector.value)
            return true;
          break;
        case HAS_PSEUDO_CLASS_TYPE:
          a: {
            selector = selector.value;
            fiber$jscomp$0 = [fiber$jscomp$0, 0];
            for (tag = 0;tag < fiber$jscomp$0.length; ) {
              var fiber = fiber$jscomp$0[tag++], tag$jscomp$0 = fiber.tag, selectorIndex = fiber$jscomp$0[tag++], selector$jscomp$0 = selector[selectorIndex];
              if (tag$jscomp$0 !== 5 && tag$jscomp$0 !== 26 && tag$jscomp$0 !== 27 || !isHiddenSubtree(fiber)) {
                for (;selector$jscomp$0 != null && matchSelector(fiber, selector$jscomp$0); )
                  selectorIndex++, selector$jscomp$0 = selector[selectorIndex];
                if (selectorIndex === selector.length) {
                  selector = true;
                  break a;
                } else
                  for (fiber = fiber.child;fiber !== null; )
                    fiber$jscomp$0.push(fiber, selectorIndex), fiber = fiber.sibling;
              }
            }
            selector = false;
          }
          return selector;
        case ROLE_TYPE:
          if ((tag === 5 || tag === 26 || tag === 27) && matchAccessibilityRole(fiber$jscomp$0.stateNode, selector.value))
            return true;
          break;
        case TEXT_TYPE:
          if (tag === 5 || tag === 6 || tag === 26 || tag === 27) {
            if (fiber$jscomp$0 = getTextContent(fiber$jscomp$0), fiber$jscomp$0 !== null && 0 <= fiber$jscomp$0.indexOf(selector.value))
              return true;
          }
          break;
        case TEST_NAME_TYPE:
          if (tag === 5 || tag === 26 || tag === 27) {
            if (fiber$jscomp$0 = fiber$jscomp$0.memoizedProps["data-testname"], typeof fiber$jscomp$0 === "string" && fiber$jscomp$0.toLowerCase() === selector.value.toLowerCase())
              return true;
          }
          break;
        default:
          throw Error("Invalid selector type specified.");
      }
      return false;
    }
    function selectorToString(selector) {
      switch (selector.$$typeof) {
        case COMPONENT_TYPE:
          return "<" + (getComponentNameFromType(selector.value) || "Unknown") + ">";
        case HAS_PSEUDO_CLASS_TYPE:
          return ":has(" + (selectorToString(selector) || "") + ")";
        case ROLE_TYPE:
          return '[role="' + selector.value + '"]';
        case TEXT_TYPE:
          return '"' + selector.value + '"';
        case TEST_NAME_TYPE:
          return '[data-testname="' + selector.value + '"]';
        default:
          throw Error("Invalid selector type specified.");
      }
    }
    function findPaths(root, selectors) {
      var matchingFibers = [];
      root = [root, 0];
      for (var index = 0;index < root.length; ) {
        var fiber = root[index++], tag = fiber.tag, selectorIndex = root[index++], selector = selectors[selectorIndex];
        if (tag !== 5 && tag !== 26 && tag !== 27 || !isHiddenSubtree(fiber)) {
          for (;selector != null && matchSelector(fiber, selector); )
            selectorIndex++, selector = selectors[selectorIndex];
          if (selectorIndex === selectors.length)
            matchingFibers.push(fiber);
          else
            for (fiber = fiber.child;fiber !== null; )
              root.push(fiber, selectorIndex), fiber = fiber.sibling;
        }
      }
      return matchingFibers;
    }
    function findAllNodes(hostRoot, selectors) {
      if (!supportsTestSelectors)
        throw Error("Test selector API is not supported by this renderer.");
      hostRoot = findFiberRootForHostRoot(hostRoot);
      hostRoot = findPaths(hostRoot, selectors);
      selectors = [];
      hostRoot = Array.from(hostRoot);
      for (var index = 0;index < hostRoot.length; ) {
        var node = hostRoot[index++], tag = node.tag;
        if (tag === 5 || tag === 26 || tag === 27)
          isHiddenSubtree(node) || selectors.push(node.stateNode);
        else
          for (node = node.child;node !== null; )
            hostRoot.push(node), node = node.sibling;
      }
      return selectors;
    }
    function onCommitRoot() {
      supportsTestSelectors && commitHooks.forEach(function(commitHook) {
        return commitHook();
      });
    }
    function isConcurrentActEnvironment() {
      var isReactActEnvironmentGlobal = typeof IS_REACT_ACT_ENVIRONMENT !== "undefined" ? IS_REACT_ACT_ENVIRONMENT : undefined;
      isReactActEnvironmentGlobal || ReactSharedInternals.actQueue === null || console.error("The current testing environment is not configured to support act(...)");
      return isReactActEnvironmentGlobal;
    }
    function requestUpdateLane(fiber) {
      if ((executionContext & RenderContext) !== NoContext && workInProgressRootRenderLanes !== 0)
        return workInProgressRootRenderLanes & -workInProgressRootRenderLanes;
      var transition = ReactSharedInternals.T;
      return transition !== null ? (transition._updatedFibers || (transition._updatedFibers = new Set), transition._updatedFibers.add(fiber), fiber = currentEntangledLane, fiber !== 0 ? fiber : requestTransitionLane()) : resolveUpdatePriority();
    }
    function requestDeferredLane() {
      workInProgressDeferredLane === 0 && (workInProgressDeferredLane = (workInProgressRootRenderLanes & 536870912) === 0 || isHydrating ? claimNextTransitionLane() : 536870912);
      var suspenseHandler = suspenseHandlerStackCursor.current;
      suspenseHandler !== null && (suspenseHandler.flags |= 32);
      return workInProgressDeferredLane;
    }
    function scheduleUpdateOnFiber(root, fiber, lane) {
      isRunningInsertionEffect && console.error("useInsertionEffect must not schedule updates.");
      isFlushingPassiveEffects && (didScheduleUpdateDuringPassiveEffects = true);
      if (root === workInProgressRoot && (workInProgressSuspendedReason === SuspendedOnData || workInProgressSuspendedReason === SuspendedOnAction) || root.cancelPendingCommit !== null)
        prepareFreshStack(root, 0), markRootSuspended(root, workInProgressRootRenderLanes, workInProgressDeferredLane, false);
      markRootUpdated$1(root, lane);
      if ((executionContext & RenderContext) !== 0 && root === workInProgressRoot) {
        if (isRendering)
          switch (fiber.tag) {
            case 0:
            case 11:
            case 15:
              root = workInProgress && getComponentNameFromFiber(workInProgress) || "Unknown";
              didWarnAboutUpdateInRenderForAnotherComponent.has(root) || (didWarnAboutUpdateInRenderForAnotherComponent.add(root), fiber = getComponentNameFromFiber(fiber) || "Unknown", console.error("Cannot update a component (`%s`) while rendering a different component (`%s`). To locate the bad setState() call inside `%s`, follow the stack trace as described in https://react.dev/link/setstate-in-render", fiber, root, root));
              break;
            case 1:
              didWarnAboutUpdateInRender || (console.error("Cannot update during an existing state transition (such as within `render`). Render methods should be a pure function of props and state."), didWarnAboutUpdateInRender = true);
          }
      } else
        isDevToolsPresent && addFiberToLanesMap(root, fiber, lane), warnIfUpdatesNotWrappedWithActDEV(fiber), root === workInProgressRoot && ((executionContext & RenderContext) === NoContext && (workInProgressRootInterleavedUpdatedLanes |= lane), workInProgressRootExitStatus === RootSuspendedWithDelay && markRootSuspended(root, workInProgressRootRenderLanes, workInProgressDeferredLane, false)), ensureRootIsScheduled(root);
    }
    function performWorkOnRoot(root, lanes, forceSync) {
      if ((executionContext & (RenderContext | CommitContext)) !== NoContext)
        throw Error("Should not already be working.");
      var shouldTimeSlice = !forceSync && (lanes & 124) === 0 && (lanes & root.expiredLanes) === 0 || checkIfRootIsPrerendering(root, lanes), exitStatus = shouldTimeSlice ? renderRootConcurrent(root, lanes) : renderRootSync(root, lanes, true), renderWasConcurrent = shouldTimeSlice;
      do {
        if (exitStatus === RootInProgress) {
          workInProgressRootIsPrerendering && !shouldTimeSlice && markRootSuspended(root, lanes, 0, false);
          break;
        } else {
          forceSync = root.current.alternate;
          if (renderWasConcurrent && !isRenderConsistentWithExternalStores(forceSync)) {
            exitStatus = renderRootSync(root, lanes, false);
            renderWasConcurrent = false;
            continue;
          }
          if (exitStatus === RootErrored) {
            renderWasConcurrent = lanes;
            if (root.errorRecoveryDisabledLanes & renderWasConcurrent)
              var errorRetryLanes = 0;
            else
              errorRetryLanes = root.pendingLanes & -536870913, errorRetryLanes = errorRetryLanes !== 0 ? errorRetryLanes : errorRetryLanes & 536870912 ? 536870912 : 0;
            if (errorRetryLanes !== 0) {
              lanes = errorRetryLanes;
              a: {
                exitStatus = root;
                var errorRetryLanes$jscomp$0 = errorRetryLanes;
                errorRetryLanes = workInProgressRootConcurrentErrors;
                var wasRootDehydrated = supportsHydration && exitStatus.current.memoizedState.isDehydrated;
                wasRootDehydrated && (prepareFreshStack(exitStatus, errorRetryLanes$jscomp$0).flags |= 256);
                errorRetryLanes$jscomp$0 = renderRootSync(exitStatus, errorRetryLanes$jscomp$0, false);
                if (errorRetryLanes$jscomp$0 !== RootErrored) {
                  if (workInProgressRootDidAttachPingListener && !wasRootDehydrated) {
                    exitStatus.errorRecoveryDisabledLanes |= renderWasConcurrent;
                    workInProgressRootInterleavedUpdatedLanes |= renderWasConcurrent;
                    exitStatus = RootSuspendedWithDelay;
                    break a;
                  }
                  exitStatus = workInProgressRootRecoverableErrors;
                  workInProgressRootRecoverableErrors = errorRetryLanes;
                  exitStatus !== null && (workInProgressRootRecoverableErrors === null ? workInProgressRootRecoverableErrors = exitStatus : workInProgressRootRecoverableErrors.push.apply(workInProgressRootRecoverableErrors, exitStatus));
                }
                exitStatus = errorRetryLanes$jscomp$0;
              }
              renderWasConcurrent = false;
              if (exitStatus !== RootErrored)
                continue;
            }
          }
          if (exitStatus === RootFatalErrored) {
            prepareFreshStack(root, 0);
            markRootSuspended(root, lanes, 0, true);
            break;
          }
          a: {
            shouldTimeSlice = root;
            switch (exitStatus) {
              case RootInProgress:
              case RootFatalErrored:
                throw Error("Root did not complete. This is a bug in React.");
              case RootSuspendedWithDelay:
                if ((lanes & 4194048) !== lanes)
                  break;
              case RootSuspendedAtTheShell:
                markRootSuspended(shouldTimeSlice, lanes, workInProgressDeferredLane, !workInProgressRootDidSkipSuspendedSiblings);
                break a;
              case RootErrored:
                workInProgressRootRecoverableErrors = null;
                break;
              case RootSuspended:
              case RootCompleted:
                break;
              default:
                throw Error("Unknown root exit status.");
            }
            if (ReactSharedInternals.actQueue !== null)
              commitRoot(shouldTimeSlice, forceSync, lanes, workInProgressRootRecoverableErrors, workInProgressTransitions, workInProgressRootDidIncludeRecursiveRenderUpdate, workInProgressDeferredLane, workInProgressRootInterleavedUpdatedLanes, workInProgressSuspendedRetryLanes);
            else {
              if ((lanes & 62914560) === lanes && (renderWasConcurrent = globalMostRecentFallbackTime + FALLBACK_THROTTLE_MS - now$1(), 10 < renderWasConcurrent)) {
                markRootSuspended(shouldTimeSlice, lanes, workInProgressDeferredLane, !workInProgressRootDidSkipSuspendedSiblings);
                if (getNextLanes(shouldTimeSlice, 0, true) !== 0)
                  break a;
                shouldTimeSlice.timeoutHandle = scheduleTimeout(commitRootWhenReady.bind(null, shouldTimeSlice, forceSync, workInProgressRootRecoverableErrors, workInProgressTransitions, workInProgressRootDidIncludeRecursiveRenderUpdate, lanes, workInProgressDeferredLane, workInProgressRootInterleavedUpdatedLanes, workInProgressSuspendedRetryLanes, workInProgressRootDidSkipSuspendedSiblings, exitStatus, THROTTLED_COMMIT, -0, 0), renderWasConcurrent);
                break a;
              }
              commitRootWhenReady(shouldTimeSlice, forceSync, workInProgressRootRecoverableErrors, workInProgressTransitions, workInProgressRootDidIncludeRecursiveRenderUpdate, lanes, workInProgressDeferredLane, workInProgressRootInterleavedUpdatedLanes, workInProgressSuspendedRetryLanes, workInProgressRootDidSkipSuspendedSiblings, exitStatus, IMMEDIATE_COMMIT, -0, 0);
            }
          }
        }
        break;
      } while (1);
      ensureRootIsScheduled(root);
    }
    function commitRootWhenReady(root, finishedWork, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, lanes, spawnedLane, updatedLanes, suspendedRetryLanes, didSkipSuspendedSiblings, exitStatus, suspendedCommitReason, completedRenderStartTime, completedRenderEndTime) {
      root.timeoutHandle = noTimeout;
      suspendedCommitReason = finishedWork.subtreeFlags;
      if (suspendedCommitReason & 8192 || (suspendedCommitReason & 16785408) === 16785408) {
        if (startSuspendingCommit(), accumulateSuspenseyCommitOnFiber(finishedWork), suspendedCommitReason = waitForCommitToBeReady(), suspendedCommitReason !== null) {
          root.cancelPendingCommit = suspendedCommitReason(commitRoot.bind(null, root, finishedWork, lanes, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes, exitStatus, SUSPENDED_COMMIT, completedRenderStartTime, completedRenderEndTime));
          markRootSuspended(root, lanes, spawnedLane, !didSkipSuspendedSiblings);
          return;
        }
      }
      commitRoot(root, finishedWork, lanes, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes);
    }
    function isRenderConsistentWithExternalStores(finishedWork) {
      for (var node = finishedWork;; ) {
        var tag = node.tag;
        if ((tag === 0 || tag === 11 || tag === 15) && node.flags & 16384 && (tag = node.updateQueue, tag !== null && (tag = tag.stores, tag !== null)))
          for (var i = 0;i < tag.length; i++) {
            var check = tag[i], getSnapshot = check.getSnapshot;
            check = check.value;
            try {
              if (!objectIs(getSnapshot(), check))
                return false;
            } catch (error) {
              return false;
            }
          }
        tag = node.child;
        if (node.subtreeFlags & 16384 && tag !== null)
          tag.return = node, node = tag;
        else {
          if (node === finishedWork)
            break;
          for (;node.sibling === null; ) {
            if (node.return === null || node.return === finishedWork)
              return true;
            node = node.return;
          }
          node.sibling.return = node.return;
          node = node.sibling;
        }
      }
      return true;
    }
    function markRootSuspended(root, suspendedLanes, spawnedLane, didAttemptEntireTree) {
      suspendedLanes &= ~workInProgressRootPingedLanes;
      suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
      root.suspendedLanes |= suspendedLanes;
      root.pingedLanes &= ~suspendedLanes;
      didAttemptEntireTree && (root.warmLanes |= suspendedLanes);
      didAttemptEntireTree = root.expirationTimes;
      for (var lanes = suspendedLanes;0 < lanes; ) {
        var index = 31 - clz32(lanes), lane = 1 << index;
        didAttemptEntireTree[index] = -1;
        lanes &= ~lane;
      }
      spawnedLane !== 0 && markSpawnedDeferredLane(root, spawnedLane, suspendedLanes);
    }
    function flushSyncWork() {
      return (executionContext & (RenderContext | CommitContext)) === NoContext ? (flushSyncWorkAcrossRoots_impl(0, false), false) : true;
    }
    function resetWorkInProgressStack() {
      if (workInProgress !== null) {
        if (workInProgressSuspendedReason === NotSuspended)
          var interruptedWork = workInProgress.return;
        else
          interruptedWork = workInProgress, resetContextDependencies(), resetHooksOnUnwind(interruptedWork), thenableState = null, thenableIndexCounter = 0, interruptedWork = workInProgress;
        for (;interruptedWork !== null; )
          unwindInterruptedWork(interruptedWork.alternate, interruptedWork), interruptedWork = interruptedWork.return;
        workInProgress = null;
      }
    }
    function prepareFreshStack(root, lanes) {
      var timeoutHandle = root.timeoutHandle;
      timeoutHandle !== noTimeout && (root.timeoutHandle = noTimeout, cancelTimeout(timeoutHandle));
      timeoutHandle = root.cancelPendingCommit;
      timeoutHandle !== null && (root.cancelPendingCommit = null, timeoutHandle());
      resetWorkInProgressStack();
      workInProgressRoot = root;
      workInProgress = timeoutHandle = createWorkInProgress(root.current, null);
      workInProgressRootRenderLanes = lanes;
      workInProgressSuspendedReason = NotSuspended;
      workInProgressThrownValue = null;
      workInProgressRootDidSkipSuspendedSiblings = false;
      workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
      workInProgressRootDidAttachPingListener = false;
      workInProgressRootExitStatus = RootInProgress;
      workInProgressSuspendedRetryLanes = workInProgressDeferredLane = workInProgressRootPingedLanes = workInProgressRootInterleavedUpdatedLanes = workInProgressRootSkippedLanes = 0;
      workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors = null;
      workInProgressRootDidIncludeRecursiveRenderUpdate = false;
      (lanes & 8) !== 0 && (lanes |= lanes & 32);
      var allEntangledLanes = root.entangledLanes;
      if (allEntangledLanes !== 0)
        for (root = root.entanglements, allEntangledLanes &= lanes;0 < allEntangledLanes; ) {
          var index = 31 - clz32(allEntangledLanes), lane = 1 << index;
          lanes |= root[index];
          allEntangledLanes &= ~lane;
        }
      entangledRenderLanes = lanes;
      finishQueueingConcurrentUpdates();
      lanes = getCurrentTime();
      1000 < lanes - lastResetTime && (ReactSharedInternals.recentlyCreatedOwnerStacks = 0, lastResetTime = lanes);
      ReactStrictModeWarnings.discardPendingWarnings();
      return timeoutHandle;
    }
    function handleThrow(root, thrownValue) {
      currentlyRenderingFiber = null;
      ReactSharedInternals.H = ContextOnlyDispatcher;
      ReactSharedInternals.getCurrentStack = null;
      isRendering = false;
      current = null;
      thrownValue === SuspenseException || thrownValue === SuspenseActionException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = SuspendedOnImmediate) : thrownValue === SuspenseyCommitException ? (thrownValue = getSuspendedThenable(), workInProgressSuspendedReason = SuspendedOnInstance) : workInProgressSuspendedReason = thrownValue === SelectiveHydrationException ? SuspendedOnHydration : thrownValue !== null && typeof thrownValue === "object" && typeof thrownValue.then === "function" ? SuspendedOnDeprecatedThrowPromise : SuspendedOnError;
      workInProgressThrownValue = thrownValue;
      var erroredWork = workInProgress;
      if (erroredWork === null)
        workInProgressRootExitStatus = RootFatalErrored, logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current));
      else
        switch (erroredWork.mode & 2 && stopProfilerTimerIfRunningAndRecordDuration(erroredWork), markComponentRenderStopped(), workInProgressSuspendedReason) {
          case SuspendedOnError:
            injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentErrored === "function" && injectedProfilingHooks.markComponentErrored(erroredWork, thrownValue, workInProgressRootRenderLanes);
            break;
          case SuspendedOnData:
          case SuspendedOnAction:
          case SuspendedOnImmediate:
          case SuspendedOnDeprecatedThrowPromise:
          case SuspendedAndReadyToContinue:
            injectedProfilingHooks !== null && typeof injectedProfilingHooks.markComponentSuspended === "function" && injectedProfilingHooks.markComponentSuspended(erroredWork, thrownValue, workInProgressRootRenderLanes);
        }
    }
    function shouldRemainOnPreviousScreen() {
      var handler = suspenseHandlerStackCursor.current;
      return handler === null ? true : (workInProgressRootRenderLanes & 4194048) === workInProgressRootRenderLanes ? shellBoundary === null ? true : false : (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes || (workInProgressRootRenderLanes & 536870912) !== 0 ? handler === shellBoundary : false;
    }
    function pushDispatcher() {
      var prevDispatcher = ReactSharedInternals.H;
      ReactSharedInternals.H = ContextOnlyDispatcher;
      return prevDispatcher === null ? ContextOnlyDispatcher : prevDispatcher;
    }
    function pushAsyncDispatcher() {
      var prevAsyncDispatcher = ReactSharedInternals.A;
      ReactSharedInternals.A = DefaultAsyncDispatcher;
      return prevAsyncDispatcher;
    }
    function renderDidSuspendDelayIfPossible() {
      workInProgressRootExitStatus = RootSuspendedWithDelay;
      workInProgressRootDidSkipSuspendedSiblings || (workInProgressRootRenderLanes & 4194048) !== workInProgressRootRenderLanes && suspenseHandlerStackCursor.current !== null || (workInProgressRootIsPrerendering = true);
      (workInProgressRootSkippedLanes & 134217727) === 0 && (workInProgressRootInterleavedUpdatedLanes & 134217727) === 0 || workInProgressRoot === null || markRootSuspended(workInProgressRoot, workInProgressRootRenderLanes, workInProgressDeferredLane, false);
    }
    function renderRootSync(root, lanes, shouldYieldForPrerendering) {
      var prevExecutionContext = executionContext;
      executionContext |= RenderContext;
      var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
      if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
        if (isDevToolsPresent) {
          var memoizedUpdaters = root.memoizedUpdaters;
          0 < memoizedUpdaters.size && (restorePendingUpdaters(root, workInProgressRootRenderLanes), memoizedUpdaters.clear());
          movePendingFibersToMemoized(root, lanes);
        }
        workInProgressTransitions = null;
        prepareFreshStack(root, lanes);
      }
      markRenderStarted(lanes);
      lanes = false;
      memoizedUpdaters = workInProgressRootExitStatus;
      a:
        do
          try {
            if (workInProgressSuspendedReason !== NotSuspended && workInProgress !== null) {
              var unitOfWork = workInProgress, thrownValue = workInProgressThrownValue;
              switch (workInProgressSuspendedReason) {
                case SuspendedOnHydration:
                  resetWorkInProgressStack();
                  memoizedUpdaters = RootSuspendedAtTheShell;
                  break a;
                case SuspendedOnImmediate:
                case SuspendedOnData:
                case SuspendedOnAction:
                case SuspendedOnDeprecatedThrowPromise:
                  suspenseHandlerStackCursor.current === null && (lanes = true);
                  var reason = workInProgressSuspendedReason;
                  workInProgressSuspendedReason = NotSuspended;
                  workInProgressThrownValue = null;
                  throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
                  if (shouldYieldForPrerendering && workInProgressRootIsPrerendering) {
                    memoizedUpdaters = RootInProgress;
                    break a;
                  }
                  break;
                default:
                  reason = workInProgressSuspendedReason, workInProgressSuspendedReason = NotSuspended, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
              }
            }
            workLoopSync();
            memoizedUpdaters = workInProgressRootExitStatus;
            break;
          } catch (thrownValue$4) {
            handleThrow(root, thrownValue$4);
          }
        while (1);
      lanes && root.shellSuspendCounter++;
      resetContextDependencies();
      executionContext = prevExecutionContext;
      ReactSharedInternals.H = prevDispatcher;
      ReactSharedInternals.A = prevAsyncDispatcher;
      markRenderStopped();
      workInProgress === null && (workInProgressRoot = null, workInProgressRootRenderLanes = 0, finishQueueingConcurrentUpdates());
      return memoizedUpdaters;
    }
    function workLoopSync() {
      for (;workInProgress !== null; )
        performUnitOfWork(workInProgress);
    }
    function renderRootConcurrent(root, lanes) {
      var prevExecutionContext = executionContext;
      executionContext |= RenderContext;
      var prevDispatcher = pushDispatcher(), prevAsyncDispatcher = pushAsyncDispatcher();
      if (workInProgressRoot !== root || workInProgressRootRenderLanes !== lanes) {
        if (isDevToolsPresent) {
          var memoizedUpdaters = root.memoizedUpdaters;
          0 < memoizedUpdaters.size && (restorePendingUpdaters(root, workInProgressRootRenderLanes), memoizedUpdaters.clear());
          movePendingFibersToMemoized(root, lanes);
        }
        workInProgressTransitions = null;
        workInProgressRootRenderTargetTime = now$1() + RENDER_TIMEOUT_MS;
        prepareFreshStack(root, lanes);
      } else
        workInProgressRootIsPrerendering = checkIfRootIsPrerendering(root, lanes);
      markRenderStarted(lanes);
      a:
        do
          try {
            if (workInProgressSuspendedReason !== NotSuspended && workInProgress !== null)
              b:
                switch (lanes = workInProgress, memoizedUpdaters = workInProgressThrownValue, workInProgressSuspendedReason) {
                  case SuspendedOnError:
                    workInProgressSuspendedReason = NotSuspended;
                    workInProgressThrownValue = null;
                    throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters, SuspendedOnError);
                    break;
                  case SuspendedOnData:
                  case SuspendedOnAction:
                    if (isThenableResolved(memoizedUpdaters)) {
                      workInProgressSuspendedReason = NotSuspended;
                      workInProgressThrownValue = null;
                      replaySuspendedUnitOfWork(lanes);
                      break;
                    }
                    lanes = function() {
                      workInProgressSuspendedReason !== SuspendedOnData && workInProgressSuspendedReason !== SuspendedOnAction || workInProgressRoot !== root || (workInProgressSuspendedReason = SuspendedAndReadyToContinue);
                      ensureRootIsScheduled(root);
                    };
                    memoizedUpdaters.then(lanes, lanes);
                    break a;
                  case SuspendedOnImmediate:
                    workInProgressSuspendedReason = SuspendedAndReadyToContinue;
                    break a;
                  case SuspendedOnInstance:
                    workInProgressSuspendedReason = SuspendedOnInstanceAndReadyToContinue;
                    break a;
                  case SuspendedAndReadyToContinue:
                    isThenableResolved(memoizedUpdaters) ? (workInProgressSuspendedReason = NotSuspended, workInProgressThrownValue = null, replaySuspendedUnitOfWork(lanes)) : (workInProgressSuspendedReason = NotSuspended, workInProgressThrownValue = null, throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters, SuspendedAndReadyToContinue));
                    break;
                  case SuspendedOnInstanceAndReadyToContinue:
                    var resource = null;
                    switch (workInProgress.tag) {
                      case 26:
                        resource = workInProgress.memoizedState;
                      case 5:
                      case 27:
                        var hostFiber = workInProgress, type = hostFiber.type, props = hostFiber.pendingProps;
                        if (resource ? preloadResource(resource) : preloadInstance(type, props)) {
                          workInProgressSuspendedReason = NotSuspended;
                          workInProgressThrownValue = null;
                          var sibling = hostFiber.sibling;
                          if (sibling !== null)
                            workInProgress = sibling;
                          else {
                            var returnFiber = hostFiber.return;
                            returnFiber !== null ? (workInProgress = returnFiber, completeUnitOfWork(returnFiber)) : workInProgress = null;
                          }
                          break b;
                        }
                        break;
                      default:
                        console.error("Unexpected type of fiber triggered a suspensey commit. This is a bug in React.");
                    }
                    workInProgressSuspendedReason = NotSuspended;
                    workInProgressThrownValue = null;
                    throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters, SuspendedOnInstanceAndReadyToContinue);
                    break;
                  case SuspendedOnDeprecatedThrowPromise:
                    workInProgressSuspendedReason = NotSuspended;
                    workInProgressThrownValue = null;
                    throwAndUnwindWorkLoop(root, lanes, memoizedUpdaters, SuspendedOnDeprecatedThrowPromise);
                    break;
                  case SuspendedOnHydration:
                    resetWorkInProgressStack();
                    workInProgressRootExitStatus = RootSuspendedAtTheShell;
                    break a;
                  default:
                    throw Error("Unexpected SuspendedReason. This is a bug in React.");
                }
            ReactSharedInternals.actQueue !== null ? workLoopSync() : workLoopConcurrentByScheduler();
            break;
          } catch (thrownValue$5) {
            handleThrow(root, thrownValue$5);
          }
        while (1);
      resetContextDependencies();
      ReactSharedInternals.H = prevDispatcher;
      ReactSharedInternals.A = prevAsyncDispatcher;
      executionContext = prevExecutionContext;
      if (workInProgress !== null)
        return injectedProfilingHooks !== null && typeof injectedProfilingHooks.markRenderYielded === "function" && injectedProfilingHooks.markRenderYielded(), RootInProgress;
      markRenderStopped();
      workInProgressRoot = null;
      workInProgressRootRenderLanes = 0;
      finishQueueingConcurrentUpdates();
      return workInProgressRootExitStatus;
    }
    function workLoopConcurrentByScheduler() {
      for (;workInProgress !== null && !shouldYield(); )
        performUnitOfWork(workInProgress);
    }
    function performUnitOfWork(unitOfWork) {
      var current2 = unitOfWork.alternate;
      (unitOfWork.mode & 2) !== NoMode ? (startProfilerTimer(unitOfWork), current2 = runWithFiberInDEV(unitOfWork, beginWork, current2, unitOfWork, entangledRenderLanes), stopProfilerTimerIfRunningAndRecordDuration(unitOfWork)) : current2 = runWithFiberInDEV(unitOfWork, beginWork, current2, unitOfWork, entangledRenderLanes);
      unitOfWork.memoizedProps = unitOfWork.pendingProps;
      current2 === null ? completeUnitOfWork(unitOfWork) : workInProgress = current2;
    }
    function replaySuspendedUnitOfWork(unitOfWork) {
      var next = runWithFiberInDEV(unitOfWork, replayBeginWork, unitOfWork);
      unitOfWork.memoizedProps = unitOfWork.pendingProps;
      next === null ? completeUnitOfWork(unitOfWork) : workInProgress = next;
    }
    function replayBeginWork(unitOfWork) {
      var current2 = unitOfWork.alternate, isProfilingMode = (unitOfWork.mode & 2) !== NoMode;
      isProfilingMode && startProfilerTimer(unitOfWork);
      switch (unitOfWork.tag) {
        case 15:
        case 0:
          current2 = replayFunctionComponent(current2, unitOfWork, unitOfWork.pendingProps, unitOfWork.type, undefined, workInProgressRootRenderLanes);
          break;
        case 11:
          current2 = replayFunctionComponent(current2, unitOfWork, unitOfWork.pendingProps, unitOfWork.type.render, unitOfWork.ref, workInProgressRootRenderLanes);
          break;
        case 5:
          resetHooksOnUnwind(unitOfWork);
        default:
          unwindInterruptedWork(current2, unitOfWork), unitOfWork = workInProgress = resetWorkInProgress(unitOfWork, entangledRenderLanes), current2 = beginWork(current2, unitOfWork, entangledRenderLanes);
      }
      isProfilingMode && stopProfilerTimerIfRunningAndRecordDuration(unitOfWork);
      return current2;
    }
    function throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, suspendedReason) {
      resetContextDependencies();
      resetHooksOnUnwind(unitOfWork);
      thenableState = null;
      thenableIndexCounter = 0;
      var returnFiber = unitOfWork.return;
      try {
        if (throwException(root, returnFiber, unitOfWork, thrownValue, workInProgressRootRenderLanes)) {
          workInProgressRootExitStatus = RootFatalErrored;
          logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current));
          workInProgress = null;
          return;
        }
      } catch (error) {
        if (returnFiber !== null)
          throw workInProgress = returnFiber, error;
        workInProgressRootExitStatus = RootFatalErrored;
        logUncaughtError(root, createCapturedValueAtFiber(thrownValue, root.current));
        workInProgress = null;
        return;
      }
      if (unitOfWork.flags & 32768) {
        if (isHydrating || suspendedReason === SuspendedOnError)
          root = true;
        else if (workInProgressRootIsPrerendering || (workInProgressRootRenderLanes & 536870912) !== 0)
          root = false;
        else if (workInProgressRootDidSkipSuspendedSiblings = root = true, suspendedReason === SuspendedOnData || suspendedReason === SuspendedOnAction || suspendedReason === SuspendedOnImmediate || suspendedReason === SuspendedOnDeprecatedThrowPromise)
          suspendedReason = suspenseHandlerStackCursor.current, suspendedReason !== null && suspendedReason.tag === 13 && (suspendedReason.flags |= 16384);
        unwindUnitOfWork(unitOfWork, root);
      } else
        completeUnitOfWork(unitOfWork);
    }
    function completeUnitOfWork(unitOfWork) {
      var completedWork = unitOfWork;
      do {
        if ((completedWork.flags & 32768) !== 0) {
          unwindUnitOfWork(completedWork, workInProgressRootDidSkipSuspendedSiblings);
          return;
        }
        var current2 = completedWork.alternate;
        unitOfWork = completedWork.return;
        startProfilerTimer(completedWork);
        current2 = runWithFiberInDEV(completedWork, completeWork, current2, completedWork, entangledRenderLanes);
        (completedWork.mode & 2) !== NoMode && stopProfilerTimerIfRunningAndRecordIncompleteDuration(completedWork);
        if (current2 !== null) {
          workInProgress = current2;
          return;
        }
        completedWork = completedWork.sibling;
        if (completedWork !== null) {
          workInProgress = completedWork;
          return;
        }
        workInProgress = completedWork = unitOfWork;
      } while (completedWork !== null);
      workInProgressRootExitStatus === RootInProgress && (workInProgressRootExitStatus = RootCompleted);
    }
    function unwindUnitOfWork(unitOfWork, skipSiblings) {
      do {
        var next = unwindWork(unitOfWork.alternate, unitOfWork);
        if (next !== null) {
          next.flags &= 32767;
          workInProgress = next;
          return;
        }
        if ((unitOfWork.mode & 2) !== NoMode) {
          stopProfilerTimerIfRunningAndRecordIncompleteDuration(unitOfWork);
          next = unitOfWork.actualDuration;
          for (var child = unitOfWork.child;child !== null; )
            next += child.actualDuration, child = child.sibling;
          unitOfWork.actualDuration = next;
        }
        next = unitOfWork.return;
        next !== null && (next.flags |= 32768, next.subtreeFlags = 0, next.deletions = null);
        if (!skipSiblings && (unitOfWork = unitOfWork.sibling, unitOfWork !== null)) {
          workInProgress = unitOfWork;
          return;
        }
        workInProgress = unitOfWork = next;
      } while (unitOfWork !== null);
      workInProgressRootExitStatus = RootSuspendedAtTheShell;
      workInProgress = null;
    }
    function commitRoot(root, finishedWork, lanes, recoverableErrors, transitions, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes) {
      root.cancelPendingCommit = null;
      do
        flushPendingEffects();
      while (pendingEffectsStatus !== NO_PENDING_EFFECTS);
      ReactStrictModeWarnings.flushLegacyContextWarning();
      ReactStrictModeWarnings.flushPendingUnsafeLifecycleWarnings();
      if ((executionContext & (RenderContext | CommitContext)) !== NoContext)
        throw Error("Should not already be working.");
      injectedProfilingHooks !== null && typeof injectedProfilingHooks.markCommitStarted === "function" && injectedProfilingHooks.markCommitStarted(lanes);
      if (finishedWork === null)
        markCommitStopped();
      else {
        lanes === 0 && console.error("finishedLanes should not be empty during a commit. This is a bug in React.");
        if (finishedWork === root.current)
          throw Error("Cannot commit the same tree as before. This error is likely caused by a bug in React. Please file an issue.");
        didIncludeRenderPhaseUpdate = finishedWork.lanes | finishedWork.childLanes;
        didIncludeRenderPhaseUpdate |= concurrentlyUpdatedLanes;
        markRootFinished(root, lanes, didIncludeRenderPhaseUpdate, spawnedLane, updatedLanes, suspendedRetryLanes);
        root === workInProgressRoot && (workInProgress = workInProgressRoot = null, workInProgressRootRenderLanes = 0);
        pendingFinishedWork = finishedWork;
        pendingEffectsRoot = root;
        pendingEffectsLanes = lanes;
        pendingEffectsRemainingLanes = didIncludeRenderPhaseUpdate;
        pendingPassiveTransitions = transitions;
        pendingRecoverableErrors = recoverableErrors;
        (finishedWork.subtreeFlags & 10256) !== 0 || (finishedWork.flags & 10256) !== 0 ? (root.callbackNode = null, root.callbackPriority = 0, scheduleCallback(NormalPriority$1, function() {
          flushPassiveEffects(true);
          return null;
        })) : (root.callbackNode = null, root.callbackPriority = 0);
        commitStartTime = now();
        recoverableErrors = (finishedWork.flags & 13878) !== 0;
        if ((finishedWork.subtreeFlags & 13878) !== 0 || recoverableErrors) {
          recoverableErrors = ReactSharedInternals.T;
          ReactSharedInternals.T = null;
          transitions = getCurrentUpdatePriority();
          setCurrentUpdatePriority(2);
          spawnedLane = executionContext;
          executionContext |= CommitContext;
          try {
            commitBeforeMutationEffects(root, finishedWork, lanes);
          } finally {
            executionContext = spawnedLane, setCurrentUpdatePriority(transitions), ReactSharedInternals.T = recoverableErrors;
          }
        }
        pendingEffectsStatus = PENDING_MUTATION_PHASE;
        flushMutationEffects();
        flushLayoutEffects();
        flushSpawnedWork();
      }
    }
    function flushMutationEffects() {
      if (pendingEffectsStatus === PENDING_MUTATION_PHASE) {
        pendingEffectsStatus = NO_PENDING_EFFECTS;
        var root = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, rootMutationHasEffect = (finishedWork.flags & 13878) !== 0;
        if ((finishedWork.subtreeFlags & 13878) !== 0 || rootMutationHasEffect) {
          rootMutationHasEffect = ReactSharedInternals.T;
          ReactSharedInternals.T = null;
          var previousPriority = getCurrentUpdatePriority();
          setCurrentUpdatePriority(2);
          var prevExecutionContext = executionContext;
          executionContext |= CommitContext;
          try {
            inProgressLanes = lanes, inProgressRoot = root, commitMutationEffectsOnFiber(finishedWork, root), inProgressRoot = inProgressLanes = null, resetAfterCommit(root.containerInfo);
          } finally {
            executionContext = prevExecutionContext, setCurrentUpdatePriority(previousPriority), ReactSharedInternals.T = rootMutationHasEffect;
          }
        }
        root.current = finishedWork;
        pendingEffectsStatus = PENDING_LAYOUT_PHASE;
      }
    }
    function flushLayoutEffects() {
      if (pendingEffectsStatus === PENDING_LAYOUT_PHASE) {
        pendingEffectsStatus = NO_PENDING_EFFECTS;
        var root = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, rootHasLayoutEffect = (finishedWork.flags & 8772) !== 0;
        if ((finishedWork.subtreeFlags & 8772) !== 0 || rootHasLayoutEffect) {
          rootHasLayoutEffect = ReactSharedInternals.T;
          ReactSharedInternals.T = null;
          var previousPriority = getCurrentUpdatePriority();
          setCurrentUpdatePriority(2);
          var prevExecutionContext = executionContext;
          executionContext |= CommitContext;
          try {
            injectedProfilingHooks !== null && typeof injectedProfilingHooks.markLayoutEffectsStarted === "function" && injectedProfilingHooks.markLayoutEffectsStarted(lanes), inProgressLanes = lanes, inProgressRoot = root, commitLayoutEffectOnFiber(root, finishedWork.alternate, finishedWork), inProgressRoot = inProgressLanes = null, injectedProfilingHooks !== null && typeof injectedProfilingHooks.markLayoutEffectsStopped === "function" && injectedProfilingHooks.markLayoutEffectsStopped();
          } finally {
            executionContext = prevExecutionContext, setCurrentUpdatePriority(previousPriority), ReactSharedInternals.T = rootHasLayoutEffect;
          }
        }
        pendingEffectsStatus = PENDING_AFTER_MUTATION_PHASE;
      }
    }
    function flushSpawnedWork() {
      if (pendingEffectsStatus === PENDING_SPAWNED_WORK || pendingEffectsStatus === PENDING_AFTER_MUTATION_PHASE) {
        pendingEffectsStatus = NO_PENDING_EFFECTS;
        requestPaint();
        var root = pendingEffectsRoot, finishedWork = pendingFinishedWork, lanes = pendingEffectsLanes, recoverableErrors = pendingRecoverableErrors, rootDidHavePassiveEffects = (finishedWork.subtreeFlags & 10256) !== 0 || (finishedWork.flags & 10256) !== 0;
        rootDidHavePassiveEffects ? pendingEffectsStatus = PENDING_PASSIVE_PHASE : (pendingEffectsStatus = NO_PENDING_EFFECTS, pendingFinishedWork = pendingEffectsRoot = null, releaseRootPooledCache(root, root.pendingLanes), nestedPassiveUpdateCount = 0, rootWithPassiveNestedUpdates = null);
        var remainingLanes = root.pendingLanes;
        remainingLanes === 0 && (legacyErrorBoundariesThatAlreadyFailed = null);
        rootDidHavePassiveEffects || commitDoubleInvokeEffectsInDEV(root);
        rootDidHavePassiveEffects = lanesToEventPriority(lanes);
        finishedWork = finishedWork.stateNode;
        if (injectedHook && typeof injectedHook.onCommitFiberRoot === "function")
          try {
            var didError = (finishedWork.current.flags & 128) === 128;
            switch (rootDidHavePassiveEffects) {
              case 2:
                var schedulerPriority = ImmediatePriority;
                break;
              case 8:
                schedulerPriority = UserBlockingPriority;
                break;
              case 32:
                schedulerPriority = NormalPriority$1;
                break;
              case 268435456:
                schedulerPriority = IdlePriority;
                break;
              default:
                schedulerPriority = NormalPriority$1;
            }
            injectedHook.onCommitFiberRoot(rendererID, finishedWork, schedulerPriority, didError);
          } catch (err) {
            hasLoggedError || (hasLoggedError = true, console.error("React instrumentation encountered an error: %s", err));
          }
        isDevToolsPresent && root.memoizedUpdaters.clear();
        onCommitRoot();
        if (recoverableErrors !== null) {
          didError = ReactSharedInternals.T;
          schedulerPriority = getCurrentUpdatePriority();
          setCurrentUpdatePriority(2);
          ReactSharedInternals.T = null;
          try {
            var onRecoverableError = root.onRecoverableError;
            for (finishedWork = 0;finishedWork < recoverableErrors.length; finishedWork++) {
              var recoverableError = recoverableErrors[finishedWork], errorInfo = makeErrorInfo(recoverableError.stack);
              runWithFiberInDEV(recoverableError.source, onRecoverableError, recoverableError.value, errorInfo);
            }
          } finally {
            ReactSharedInternals.T = didError, setCurrentUpdatePriority(schedulerPriority);
          }
        }
        (pendingEffectsLanes & 3) !== 0 && flushPendingEffects();
        ensureRootIsScheduled(root);
        remainingLanes = root.pendingLanes;
        (lanes & 4194090) !== 0 && (remainingLanes & 42) !== 0 ? (nestedUpdateScheduled = true, root === rootWithNestedUpdates ? nestedUpdateCount++ : (nestedUpdateCount = 0, rootWithNestedUpdates = root)) : nestedUpdateCount = 0;
        flushSyncWorkAcrossRoots_impl(0, false);
        markCommitStopped();
      }
    }
    function makeErrorInfo(componentStack) {
      componentStack = { componentStack };
      Object.defineProperty(componentStack, "digest", {
        get: function() {
          console.error('You are accessing "digest" from the errorInfo object passed to onRecoverableError. This property is no longer provided as part of errorInfo but can be accessed as a property of the Error instance itself.');
        }
      });
      return componentStack;
    }
    function releaseRootPooledCache(root, remainingLanes) {
      (root.pooledCacheLanes &= remainingLanes) === 0 && (remainingLanes = root.pooledCache, remainingLanes != null && (root.pooledCache = null, releaseCache(remainingLanes)));
    }
    function flushPendingEffects(wasDelayedCommit) {
      flushMutationEffects();
      flushLayoutEffects();
      flushSpawnedWork();
      return flushPassiveEffects(wasDelayedCommit);
    }
    function flushPassiveEffects() {
      if (pendingEffectsStatus !== PENDING_PASSIVE_PHASE)
        return false;
      var root = pendingEffectsRoot, remainingLanes = pendingEffectsRemainingLanes;
      pendingEffectsRemainingLanes = 0;
      var renderPriority = lanesToEventPriority(pendingEffectsLanes), priority = 32 > renderPriority ? 32 : renderPriority;
      renderPriority = ReactSharedInternals.T;
      var previousPriority = getCurrentUpdatePriority();
      try {
        setCurrentUpdatePriority(priority);
        ReactSharedInternals.T = null;
        priority = pendingPassiveTransitions;
        pendingPassiveTransitions = null;
        var root$jscomp$0 = pendingEffectsRoot, lanes = pendingEffectsLanes;
        pendingEffectsStatus = NO_PENDING_EFFECTS;
        pendingFinishedWork = pendingEffectsRoot = null;
        pendingEffectsLanes = 0;
        if ((executionContext & (RenderContext | CommitContext)) !== NoContext)
          throw Error("Cannot flush passive effects while already rendering.");
        isFlushingPassiveEffects = true;
        didScheduleUpdateDuringPassiveEffects = false;
        injectedProfilingHooks !== null && typeof injectedProfilingHooks.markPassiveEffectsStarted === "function" && injectedProfilingHooks.markPassiveEffectsStarted(lanes);
        var prevExecutionContext = executionContext;
        executionContext |= CommitContext;
        commitPassiveUnmountOnFiber(root$jscomp$0.current);
        commitPassiveMountOnFiber(root$jscomp$0, root$jscomp$0.current, lanes, priority);
        injectedProfilingHooks !== null && typeof injectedProfilingHooks.markPassiveEffectsStopped === "function" && injectedProfilingHooks.markPassiveEffectsStopped();
        commitDoubleInvokeEffectsInDEV(root$jscomp$0);
        executionContext = prevExecutionContext;
        flushSyncWorkAcrossRoots_impl(0, false);
        didScheduleUpdateDuringPassiveEffects ? root$jscomp$0 === rootWithPassiveNestedUpdates ? nestedPassiveUpdateCount++ : (nestedPassiveUpdateCount = 0, rootWithPassiveNestedUpdates = root$jscomp$0) : nestedPassiveUpdateCount = 0;
        didScheduleUpdateDuringPassiveEffects = isFlushingPassiveEffects = false;
        if (injectedHook && typeof injectedHook.onPostCommitFiberRoot === "function")
          try {
            injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
          } catch (err) {
            hasLoggedError || (hasLoggedError = true, console.error("React instrumentation encountered an error: %s", err));
          }
        var stateNode = root$jscomp$0.current.stateNode;
        stateNode.effectDuration = 0;
        stateNode.passiveEffectDuration = 0;
        return true;
      } finally {
        setCurrentUpdatePriority(previousPriority), ReactSharedInternals.T = renderPriority, releaseRootPooledCache(root, remainingLanes);
      }
    }
    function captureCommitPhaseErrorOnRoot(rootFiber, sourceFiber, error) {
      sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
      sourceFiber = createRootErrorUpdate(rootFiber.stateNode, sourceFiber, 2);
      rootFiber = enqueueUpdate(rootFiber, sourceFiber, 2);
      rootFiber !== null && (markRootUpdated$1(rootFiber, 2), ensureRootIsScheduled(rootFiber));
    }
    function captureCommitPhaseError(sourceFiber, nearestMountedAncestor, error) {
      isRunningInsertionEffect = false;
      if (sourceFiber.tag === 3)
        captureCommitPhaseErrorOnRoot(sourceFiber, sourceFiber, error);
      else {
        for (;nearestMountedAncestor !== null; ) {
          if (nearestMountedAncestor.tag === 3) {
            captureCommitPhaseErrorOnRoot(nearestMountedAncestor, sourceFiber, error);
            return;
          }
          if (nearestMountedAncestor.tag === 1) {
            var instance = nearestMountedAncestor.stateNode;
            if (typeof nearestMountedAncestor.type.getDerivedStateFromError === "function" || typeof instance.componentDidCatch === "function" && (legacyErrorBoundariesThatAlreadyFailed === null || !legacyErrorBoundariesThatAlreadyFailed.has(instance))) {
              sourceFiber = createCapturedValueAtFiber(error, sourceFiber);
              error = createClassErrorUpdate(2);
              instance = enqueueUpdate(nearestMountedAncestor, error, 2);
              instance !== null && (initializeClassErrorUpdate(error, instance, nearestMountedAncestor, sourceFiber), markRootUpdated$1(instance, 2), ensureRootIsScheduled(instance));
              return;
            }
          }
          nearestMountedAncestor = nearestMountedAncestor.return;
        }
        console.error(`Internal React error: Attempted to capture a commit phase error inside a detached tree. This indicates a bug in React. Potential causes include deleting the same fiber more than once, committing an already-finished tree, or an inconsistent return pointer.

Error message:

%s`, error);
      }
    }
    function attachPingListener(root, wakeable, lanes) {
      var pingCache = root.pingCache;
      if (pingCache === null) {
        pingCache = root.pingCache = new PossiblyWeakMap;
        var threadIDs = new Set;
        pingCache.set(wakeable, threadIDs);
      } else
        threadIDs = pingCache.get(wakeable), threadIDs === undefined && (threadIDs = new Set, pingCache.set(wakeable, threadIDs));
      threadIDs.has(lanes) || (workInProgressRootDidAttachPingListener = true, threadIDs.add(lanes), pingCache = pingSuspendedRoot.bind(null, root, wakeable, lanes), isDevToolsPresent && restorePendingUpdaters(root, lanes), wakeable.then(pingCache, pingCache));
    }
    function pingSuspendedRoot(root, wakeable, pingedLanes) {
      var pingCache = root.pingCache;
      pingCache !== null && pingCache.delete(wakeable);
      root.pingedLanes |= root.suspendedLanes & pingedLanes;
      root.warmLanes &= ~pingedLanes;
      isConcurrentActEnvironment() && ReactSharedInternals.actQueue === null && console.error(`A suspended resource finished loading inside a test, but the event was not wrapped in act(...).

When testing, code that resolves suspended data should be wrapped into act(...):

act(() => {
  /* finish loading suspended data */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act`);
      workInProgressRoot === root && (workInProgressRootRenderLanes & pingedLanes) === pingedLanes && (workInProgressRootExitStatus === RootSuspendedWithDelay || workInProgressRootExitStatus === RootSuspended && (workInProgressRootRenderLanes & 62914560) === workInProgressRootRenderLanes && now$1() - globalMostRecentFallbackTime < FALLBACK_THROTTLE_MS ? (executionContext & RenderContext) === NoContext && prepareFreshStack(root, 0) : workInProgressRootPingedLanes |= pingedLanes, workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes && (workInProgressSuspendedRetryLanes = 0));
      ensureRootIsScheduled(root);
    }
    function retryTimedOutBoundary(boundaryFiber, retryLane) {
      retryLane === 0 && (retryLane = claimNextRetryLane());
      boundaryFiber = enqueueConcurrentRenderForLane(boundaryFiber, retryLane);
      boundaryFiber !== null && (markRootUpdated$1(boundaryFiber, retryLane), ensureRootIsScheduled(boundaryFiber));
    }
    function retryDehydratedSuspenseBoundary(boundaryFiber) {
      var suspenseState = boundaryFiber.memoizedState, retryLane = 0;
      suspenseState !== null && (retryLane = suspenseState.retryLane);
      retryTimedOutBoundary(boundaryFiber, retryLane);
    }
    function resolveRetryWakeable(boundaryFiber, wakeable) {
      var retryLane = 0;
      switch (boundaryFiber.tag) {
        case 13:
          var retryCache = boundaryFiber.stateNode;
          var suspenseState = boundaryFiber.memoizedState;
          suspenseState !== null && (retryLane = suspenseState.retryLane);
          break;
        case 19:
          retryCache = boundaryFiber.stateNode;
          break;
        case 22:
          retryCache = boundaryFiber.stateNode._retryCache;
          break;
        default:
          throw Error("Pinged unknown suspense boundary type. This is probably a bug in React.");
      }
      retryCache !== null && retryCache.delete(wakeable);
      retryTimedOutBoundary(boundaryFiber, retryLane);
    }
    function recursivelyTraverseAndDoubleInvokeEffectsInDEV(root$jscomp$0, parentFiber, isInStrictMode) {
      if ((parentFiber.subtreeFlags & 67117056) !== 0)
        for (parentFiber = parentFiber.child;parentFiber !== null; ) {
          var root = root$jscomp$0, fiber = parentFiber, isStrictModeFiber = fiber.type === REACT_STRICT_MODE_TYPE;
          isStrictModeFiber = isInStrictMode || isStrictModeFiber;
          fiber.tag !== 22 ? fiber.flags & 67108864 ? isStrictModeFiber && runWithFiberInDEV(fiber, doubleInvokeEffectsOnFiber, root, fiber, (fiber.mode & 64) === NoMode) : recursivelyTraverseAndDoubleInvokeEffectsInDEV(root, fiber, isStrictModeFiber) : fiber.memoizedState === null && (isStrictModeFiber && fiber.flags & 8192 ? runWithFiberInDEV(fiber, doubleInvokeEffectsOnFiber, root, fiber) : fiber.subtreeFlags & 67108864 && runWithFiberInDEV(fiber, recursivelyTraverseAndDoubleInvokeEffectsInDEV, root, fiber, isStrictModeFiber));
          parentFiber = parentFiber.sibling;
        }
    }
    function doubleInvokeEffectsOnFiber(root, fiber) {
      var shouldDoubleInvokePassiveEffects = 2 < arguments.length && arguments[2] !== undefined ? arguments[2] : true;
      setIsStrictModeForDevtools(true);
      try {
        disappearLayoutEffects(fiber), shouldDoubleInvokePassiveEffects && disconnectPassiveEffect(fiber), reappearLayoutEffects(root, fiber.alternate, fiber, false), shouldDoubleInvokePassiveEffects && reconnectPassiveEffects(root, fiber, 0, null, false, 0);
      } finally {
        setIsStrictModeForDevtools(false);
      }
    }
    function commitDoubleInvokeEffectsInDEV(root) {
      var doubleInvokeEffects = true;
      root.current.mode & 24 || (doubleInvokeEffects = false);
      recursivelyTraverseAndDoubleInvokeEffectsInDEV(root, root.current, doubleInvokeEffects);
    }
    function warnAboutUpdateOnNotYetMountedFiberInDEV(fiber) {
      if ((executionContext & RenderContext) === NoContext) {
        var tag = fiber.tag;
        if (tag === 3 || tag === 1 || tag === 0 || tag === 11 || tag === 14 || tag === 15) {
          tag = getComponentNameFromFiber(fiber) || "ReactComponent";
          if (didWarnStateUpdateForNotYetMountedComponent !== null) {
            if (didWarnStateUpdateForNotYetMountedComponent.has(tag))
              return;
            didWarnStateUpdateForNotYetMountedComponent.add(tag);
          } else
            didWarnStateUpdateForNotYetMountedComponent = new Set([tag]);
          runWithFiberInDEV(fiber, function() {
            console.error("Can't perform a React state update on a component that hasn't mounted yet. This indicates that you have a side-effect in your render function that asynchronously later calls tries to update the component. Move this work to useEffect instead.");
          });
        }
      }
    }
    function restorePendingUpdaters(root, lanes) {
      isDevToolsPresent && root.memoizedUpdaters.forEach(function(schedulingFiber) {
        addFiberToLanesMap(root, schedulingFiber, lanes);
      });
    }
    function scheduleCallback(priorityLevel, callback) {
      var actQueue = ReactSharedInternals.actQueue;
      return actQueue !== null ? (actQueue.push(callback), fakeActCallbackNode) : scheduleCallback$3(priorityLevel, callback);
    }
    function warnIfUpdatesNotWrappedWithActDEV(fiber) {
      isConcurrentActEnvironment() && ReactSharedInternals.actQueue === null && runWithFiberInDEV(fiber, function() {
        console.error(`An update to %s inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://react.dev/link/wrap-tests-with-act`, getComponentNameFromFiber(fiber));
      });
    }
    function resolveFunctionForHotReloading(type) {
      if (resolveFamily === null)
        return type;
      var family = resolveFamily(type);
      return family === undefined ? type : family.current;
    }
    function resolveForwardRefForHotReloading(type) {
      if (resolveFamily === null)
        return type;
      var family = resolveFamily(type);
      return family === undefined ? type !== null && type !== undefined && typeof type.render === "function" && (family = resolveFunctionForHotReloading(type.render), type.render !== family) ? (family = { $$typeof: REACT_FORWARD_REF_TYPE, render: family }, type.displayName !== undefined && (family.displayName = type.displayName), family) : type : family.current;
    }
    function isCompatibleFamilyForHotReloading(fiber, element) {
      if (resolveFamily === null)
        return false;
      var prevType = fiber.elementType;
      element = element.type;
      var needsCompareFamilies = false, $$typeofNextType = typeof element === "object" && element !== null ? element.$$typeof : null;
      switch (fiber.tag) {
        case 1:
          typeof element === "function" && (needsCompareFamilies = true);
          break;
        case 0:
          typeof element === "function" ? needsCompareFamilies = true : $$typeofNextType === REACT_LAZY_TYPE && (needsCompareFamilies = true);
          break;
        case 11:
          $$typeofNextType === REACT_FORWARD_REF_TYPE ? needsCompareFamilies = true : $$typeofNextType === REACT_LAZY_TYPE && (needsCompareFamilies = true);
          break;
        case 14:
        case 15:
          $$typeofNextType === REACT_MEMO_TYPE ? needsCompareFamilies = true : $$typeofNextType === REACT_LAZY_TYPE && (needsCompareFamilies = true);
          break;
        default:
          return false;
      }
      return needsCompareFamilies && (fiber = resolveFamily(prevType), fiber !== undefined && fiber === resolveFamily(element)) ? true : false;
    }
    function markFailedErrorBoundaryForHotReloading(fiber) {
      resolveFamily !== null && typeof WeakSet === "function" && (failedBoundaries === null && (failedBoundaries = new WeakSet), failedBoundaries.add(fiber));
    }
    function scheduleFibersWithFamiliesRecursively(fiber, updatedFamilies, staleFamilies) {
      var { alternate, child, sibling, tag, type } = fiber, candidateType = null;
      switch (tag) {
        case 0:
        case 15:
        case 1:
          candidateType = type;
          break;
        case 11:
          candidateType = type.render;
      }
      if (resolveFamily === null)
        throw Error("Expected resolveFamily to be set during hot reload.");
      var needsRender = false;
      type = false;
      candidateType !== null && (candidateType = resolveFamily(candidateType), candidateType !== undefined && (staleFamilies.has(candidateType) ? type = true : updatedFamilies.has(candidateType) && (tag === 1 ? type = true : needsRender = true)));
      failedBoundaries !== null && (failedBoundaries.has(fiber) || alternate !== null && failedBoundaries.has(alternate)) && (type = true);
      type && (fiber._debugNeedsRemount = true);
      if (type || needsRender)
        alternate = enqueueConcurrentRenderForLane(fiber, 2), alternate !== null && scheduleUpdateOnFiber(alternate, fiber, 2);
      child === null || type || scheduleFibersWithFamiliesRecursively(child, updatedFamilies, staleFamilies);
      sibling !== null && scheduleFibersWithFamiliesRecursively(sibling, updatedFamilies, staleFamilies);
    }
    function FiberNode(tag, pendingProps, key, mode) {
      this.tag = tag;
      this.key = key;
      this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
      this.index = 0;
      this.refCleanup = this.ref = null;
      this.pendingProps = pendingProps;
      this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
      this.mode = mode;
      this.subtreeFlags = this.flags = 0;
      this.deletions = null;
      this.childLanes = this.lanes = 0;
      this.alternate = null;
      this.actualDuration = -0;
      this.actualStartTime = -1.1;
      this.treeBaseDuration = this.selfBaseDuration = -0;
      this._debugTask = this._debugStack = this._debugOwner = this._debugInfo = null;
      this._debugNeedsRemount = false;
      this._debugHookTypes = null;
      hasBadMapPolyfill || typeof Object.preventExtensions !== "function" || Object.preventExtensions(this);
    }
    function shouldConstruct(Component) {
      Component = Component.prototype;
      return !(!Component || !Component.isReactComponent);
    }
    function createWorkInProgress(current2, pendingProps) {
      var workInProgress2 = current2.alternate;
      workInProgress2 === null ? (workInProgress2 = createFiber(current2.tag, pendingProps, current2.key, current2.mode), workInProgress2.elementType = current2.elementType, workInProgress2.type = current2.type, workInProgress2.stateNode = current2.stateNode, workInProgress2._debugOwner = current2._debugOwner, workInProgress2._debugStack = current2._debugStack, workInProgress2._debugTask = current2._debugTask, workInProgress2._debugHookTypes = current2._debugHookTypes, workInProgress2.alternate = current2, current2.alternate = workInProgress2) : (workInProgress2.pendingProps = pendingProps, workInProgress2.type = current2.type, workInProgress2.flags = 0, workInProgress2.subtreeFlags = 0, workInProgress2.deletions = null, workInProgress2.actualDuration = -0, workInProgress2.actualStartTime = -1.1);
      workInProgress2.flags = current2.flags & 65011712;
      workInProgress2.childLanes = current2.childLanes;
      workInProgress2.lanes = current2.lanes;
      workInProgress2.child = current2.child;
      workInProgress2.memoizedProps = current2.memoizedProps;
      workInProgress2.memoizedState = current2.memoizedState;
      workInProgress2.updateQueue = current2.updateQueue;
      pendingProps = current2.dependencies;
      workInProgress2.dependencies = pendingProps === null ? null : {
        lanes: pendingProps.lanes,
        firstContext: pendingProps.firstContext,
        _debugThenableState: pendingProps._debugThenableState
      };
      workInProgress2.sibling = current2.sibling;
      workInProgress2.index = current2.index;
      workInProgress2.ref = current2.ref;
      workInProgress2.refCleanup = current2.refCleanup;
      workInProgress2.selfBaseDuration = current2.selfBaseDuration;
      workInProgress2.treeBaseDuration = current2.treeBaseDuration;
      workInProgress2._debugInfo = current2._debugInfo;
      workInProgress2._debugNeedsRemount = current2._debugNeedsRemount;
      switch (workInProgress2.tag) {
        case 0:
        case 15:
          workInProgress2.type = resolveFunctionForHotReloading(current2.type);
          break;
        case 1:
          workInProgress2.type = resolveFunctionForHotReloading(current2.type);
          break;
        case 11:
          workInProgress2.type = resolveForwardRefForHotReloading(current2.type);
      }
      return workInProgress2;
    }
    function resetWorkInProgress(workInProgress2, renderLanes2) {
      workInProgress2.flags &= 65011714;
      var current2 = workInProgress2.alternate;
      current2 === null ? (workInProgress2.childLanes = 0, workInProgress2.lanes = renderLanes2, workInProgress2.child = null, workInProgress2.subtreeFlags = 0, workInProgress2.memoizedProps = null, workInProgress2.memoizedState = null, workInProgress2.updateQueue = null, workInProgress2.dependencies = null, workInProgress2.stateNode = null, workInProgress2.selfBaseDuration = 0, workInProgress2.treeBaseDuration = 0) : (workInProgress2.childLanes = current2.childLanes, workInProgress2.lanes = current2.lanes, workInProgress2.child = current2.child, workInProgress2.subtreeFlags = 0, workInProgress2.deletions = null, workInProgress2.memoizedProps = current2.memoizedProps, workInProgress2.memoizedState = current2.memoizedState, workInProgress2.updateQueue = current2.updateQueue, workInProgress2.type = current2.type, renderLanes2 = current2.dependencies, workInProgress2.dependencies = renderLanes2 === null ? null : {
        lanes: renderLanes2.lanes,
        firstContext: renderLanes2.firstContext,
        _debugThenableState: renderLanes2._debugThenableState
      }, workInProgress2.selfBaseDuration = current2.selfBaseDuration, workInProgress2.treeBaseDuration = current2.treeBaseDuration);
      return workInProgress2;
    }
    function createFiberFromTypeAndProps(type, key, pendingProps, owner, mode, lanes) {
      var fiberTag = 0, resolvedType = type;
      if (typeof type === "function")
        shouldConstruct(type) && (fiberTag = 1), resolvedType = resolveFunctionForHotReloading(resolvedType);
      else if (typeof type === "string")
        supportsResources && supportsSingletons ? (fiberTag = getHostContext(), fiberTag = isHostHoistableType(type, pendingProps, fiberTag) ? 26 : isHostSingletonType(type) ? 27 : 5) : supportsResources ? (fiberTag = getHostContext(), fiberTag = isHostHoistableType(type, pendingProps, fiberTag) ? 26 : 5) : fiberTag = supportsSingletons ? isHostSingletonType(type) ? 27 : 5 : 5;
      else
        a:
          switch (type) {
            case REACT_ACTIVITY_TYPE:
              return key = createFiber(31, pendingProps, key, mode), key.elementType = REACT_ACTIVITY_TYPE, key.lanes = lanes, key;
            case REACT_FRAGMENT_TYPE:
              return createFiberFromFragment(pendingProps.children, mode, lanes, key);
            case REACT_STRICT_MODE_TYPE:
              fiberTag = 8;
              mode |= 24;
              break;
            case REACT_PROFILER_TYPE:
              return type = pendingProps, owner = mode, typeof type.id !== "string" && console.error('Profiler must specify an "id" of type `string` as a prop. Received the type `%s` instead.', typeof type.id), key = createFiber(12, type, key, owner | 2), key.elementType = REACT_PROFILER_TYPE, key.lanes = lanes, key.stateNode = { effectDuration: 0, passiveEffectDuration: 0 }, key;
            case REACT_SUSPENSE_TYPE:
              return key = createFiber(13, pendingProps, key, mode), key.elementType = REACT_SUSPENSE_TYPE, key.lanes = lanes, key;
            case REACT_SUSPENSE_LIST_TYPE:
              return key = createFiber(19, pendingProps, key, mode), key.elementType = REACT_SUSPENSE_LIST_TYPE, key.lanes = lanes, key;
            default:
              if (typeof type === "object" && type !== null)
                switch (type.$$typeof) {
                  case REACT_PROVIDER_TYPE:
                  case REACT_CONTEXT_TYPE:
                    fiberTag = 10;
                    break a;
                  case REACT_CONSUMER_TYPE:
                    fiberTag = 9;
                    break a;
                  case REACT_FORWARD_REF_TYPE:
                    fiberTag = 11;
                    resolvedType = resolveForwardRefForHotReloading(resolvedType);
                    break a;
                  case REACT_MEMO_TYPE:
                    fiberTag = 14;
                    break a;
                  case REACT_LAZY_TYPE:
                    fiberTag = 16;
                    resolvedType = null;
                    break a;
                }
              resolvedType = "";
              if (type === undefined || typeof type === "object" && type !== null && Object.keys(type).length === 0)
                resolvedType += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
              type === null ? pendingProps = "null" : isArrayImpl(type) ? pendingProps = "array" : type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE ? (pendingProps = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />", resolvedType = " Did you accidentally export a JSX literal instead of a component?") : pendingProps = typeof type;
              fiberTag = owner ? typeof owner.tag === "number" ? getComponentNameFromFiber(owner) : typeof owner.name === "string" ? owner.name : null : null;
              fiberTag && (resolvedType += `

Check the render method of \`` + fiberTag + "`.");
              fiberTag = 29;
              pendingProps = Error("Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " + (pendingProps + "." + resolvedType));
              resolvedType = null;
          }
      key = createFiber(fiberTag, pendingProps, key, mode);
      key.elementType = type;
      key.type = resolvedType;
      key.lanes = lanes;
      key._debugOwner = owner;
      return key;
    }
    function createFiberFromElement(element, mode, lanes) {
      mode = createFiberFromTypeAndProps(element.type, element.key, element.props, element._owner, mode, lanes);
      mode._debugOwner = element._owner;
      mode._debugStack = element._debugStack;
      mode._debugTask = element._debugTask;
      return mode;
    }
    function createFiberFromFragment(elements, mode, lanes, key) {
      elements = createFiber(7, elements, key, mode);
      elements.lanes = lanes;
      return elements;
    }
    function createFiberFromText(content, mode, lanes) {
      content = createFiber(6, content, null, mode);
      content.lanes = lanes;
      return content;
    }
    function createFiberFromPortal(portal, mode, lanes) {
      mode = createFiber(4, portal.children !== null ? portal.children : [], portal.key, mode);
      mode.lanes = lanes;
      mode.stateNode = {
        containerInfo: portal.containerInfo,
        pendingChildren: null,
        implementation: portal.implementation
      };
      return mode;
    }
    function FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, formState) {
      this.tag = 1;
      this.containerInfo = containerInfo;
      this.pingCache = this.current = this.pendingChildren = null;
      this.timeoutHandle = noTimeout;
      this.callbackNode = this.next = this.pendingContext = this.context = this.cancelPendingCommit = null;
      this.callbackPriority = 0;
      this.expirationTimes = createLaneMap(-1);
      this.entangledLanes = this.shellSuspendCounter = this.errorRecoveryDisabledLanes = this.expiredLanes = this.warmLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
      this.entanglements = createLaneMap(0);
      this.hiddenUpdates = createLaneMap(null);
      this.identifierPrefix = identifierPrefix;
      this.onUncaughtError = onUncaughtError;
      this.onCaughtError = onCaughtError;
      this.onRecoverableError = onRecoverableError;
      this.pooledCache = null;
      this.pooledCacheLanes = 0;
      this.formState = formState;
      this.incompleteTransitions = new Map;
      this.passiveEffectDuration = this.effectDuration = -0;
      this.memoizedUpdaters = new Set;
      containerInfo = this.pendingUpdatersLaneMap = [];
      for (tag = 0;31 > tag; tag++)
        containerInfo.push(new Set);
      this._debugRootType = hydrate ? "hydrateRoot()" : "createRoot()";
    }
    function createFiberRoot(containerInfo, tag, hydrate, initialChildren, hydrationCallbacks, isStrictMode, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, transitionCallbacks, formState) {
      containerInfo = new FiberRootNode(containerInfo, tag, hydrate, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, formState);
      tag = 1;
      isStrictMode === true && (tag |= 24);
      isDevToolsPresent && (tag |= 2);
      isStrictMode = createFiber(3, null, null, tag);
      containerInfo.current = isStrictMode;
      isStrictMode.stateNode = containerInfo;
      tag = createCache();
      retainCache(tag);
      containerInfo.pooledCache = tag;
      retainCache(tag);
      isStrictMode.memoizedState = {
        element: initialChildren,
        isDehydrated: hydrate,
        cache: tag
      };
      initializeUpdateQueue(isStrictMode);
      return containerInfo;
    }
    function testStringCoercion(value) {
      return "" + value;
    }
    function getContextForSubtree(parentComponent) {
      if (!parentComponent)
        return emptyContextObject;
      parentComponent = emptyContextObject;
      return parentComponent;
    }
    function updateContainerSync(element, container, parentComponent, callback) {
      updateContainerImpl(container.current, 2, element, container, parentComponent, callback);
      return 2;
    }
    function updateContainerImpl(rootFiber, lane, element, container, parentComponent, callback) {
      if (injectedHook && typeof injectedHook.onScheduleFiberRoot === "function")
        try {
          injectedHook.onScheduleFiberRoot(rendererID, container, element);
        } catch (err) {
          hasLoggedError || (hasLoggedError = true, console.error("React instrumentation encountered an error: %s", err));
        }
      injectedProfilingHooks !== null && typeof injectedProfilingHooks.markRenderScheduled === "function" && injectedProfilingHooks.markRenderScheduled(lane);
      parentComponent = getContextForSubtree(parentComponent);
      container.context === null ? container.context = parentComponent : container.pendingContext = parentComponent;
      isRendering && current !== null && !didWarnAboutNestedUpdates && (didWarnAboutNestedUpdates = true, console.error(`Render methods should be a pure function of props and state; triggering nested component updates from render is not allowed. If necessary, trigger nested updates in componentDidUpdate.

Check the render method of %s.`, getComponentNameFromFiber(current) || "Unknown"));
      container = createUpdate(lane);
      container.payload = { element };
      callback = callback === undefined ? null : callback;
      callback !== null && (typeof callback !== "function" && console.error("Expected the last optional `callback` argument to be a function. Instead received: %s.", callback), container.callback = callback);
      element = enqueueUpdate(rootFiber, container, lane);
      element !== null && (scheduleUpdateOnFiber(element, rootFiber, lane), entangleTransitions(element, rootFiber, lane));
    }
    function markRetryLaneImpl(fiber, retryLane) {
      fiber = fiber.memoizedState;
      if (fiber !== null && fiber.dehydrated !== null) {
        var a = fiber.retryLane;
        fiber.retryLane = a !== 0 && a < retryLane ? a : retryLane;
      }
    }
    function markRetryLaneIfNotHydrated(fiber, retryLane) {
      markRetryLaneImpl(fiber, retryLane);
      (fiber = fiber.alternate) && markRetryLaneImpl(fiber, retryLane);
    }
    function getCurrentFiberForDevTools() {
      return current;
    }
    function getLaneLabelMap() {
      for (var map = new Map, lane = 1, index = 0;31 > index; index++) {
        var label = getLabelForLane(lane);
        map.set(lane, label);
        lane *= 2;
      }
      return map;
    }
    var exports2 = {};
    var assign = Object.assign, REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"), REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_PROVIDER_TYPE = Symbol.for("react.provider"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy");
    Symbol.for("react.scope");
    var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
    Symbol.for("react.legacy_hidden");
    Symbol.for("react.tracing_marker");
    var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel");
    Symbol.for("react.view_transition");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), isArrayImpl = Array.isArray, ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, rendererVersion = $$$config.rendererVersion, rendererPackageName = $$$config.rendererPackageName, extraDevToolsConfig = $$$config.extraDevToolsConfig, getPublicInstance = $$$config.getPublicInstance, getRootHostContext = $$$config.getRootHostContext, getChildHostContext = $$$config.getChildHostContext, prepareForCommit = $$$config.prepareForCommit, resetAfterCommit = $$$config.resetAfterCommit, createInstance = $$$config.createInstance;
    $$$config.cloneMutableInstance;
    var { appendInitialChild, finalizeInitialChildren, shouldSetTextContent, createTextInstance } = $$$config;
    $$$config.cloneMutableTextInstance;
    var { scheduleTimeout, cancelTimeout, noTimeout, isPrimaryRenderer } = $$$config;
    $$$config.warnsIfNotActing;
    var { supportsMutation, supportsPersistence, supportsHydration, getInstanceFromNode } = $$$config;
    $$$config.beforeActiveInstanceBlur;
    var preparePortalMount = $$$config.preparePortalMount;
    $$$config.prepareScopeUpdate;
    $$$config.getInstanceFromScope;
    var { setCurrentUpdatePriority, getCurrentUpdatePriority, resolveUpdatePriority } = $$$config;
    $$$config.trackSchedulerEvent;
    $$$config.resolveEventType;
    $$$config.resolveEventTimeStamp;
    var { shouldAttemptEagerTransition, detachDeletedInstance } = $$$config;
    $$$config.requestPostPaintCallback;
    var { maySuspendCommit, preloadInstance, startSuspendingCommit, suspendInstance } = $$$config;
    $$$config.suspendOnActiveViewTransition;
    var { waitForCommitToBeReady, NotPendingTransition, HostTransitionContext, resetFormInstance, bindToConsole, supportsMicrotasks, scheduleMicrotask, supportsTestSelectors, findFiberRoot, getBoundingRect, getTextContent, isHiddenSubtree, matchAccessibilityRole, setFocusIfFocusable, setupIntersectionObserver, appendChild, appendChildToContainer, commitTextUpdate, commitMount, commitUpdate, insertBefore, insertInContainerBefore, removeChild, removeChildFromContainer, resetTextContent, hideInstance, hideTextInstance, unhideInstance, unhideTextInstance } = $$$config;
    $$$config.cancelViewTransitionName;
    $$$config.cancelRootViewTransitionName;
    $$$config.restoreRootViewTransitionName;
    $$$config.cloneRootViewTransitionContainer;
    $$$config.removeRootViewTransitionClone;
    $$$config.measureClonedInstance;
    $$$config.hasInstanceChanged;
    $$$config.hasInstanceAffectedParent;
    $$$config.startViewTransition;
    $$$config.startGestureTransition;
    $$$config.stopGestureTransition;
    $$$config.getCurrentGestureOffset;
    $$$config.subscribeToGestureDirection;
    $$$config.createViewTransitionInstance;
    var clearContainer = $$$config.clearContainer;
    $$$config.createFragmentInstance;
    $$$config.updateFragmentInstanceFiber;
    $$$config.commitNewChildToFragmentInstance;
    $$$config.deleteChildFromFragmentInstance;
    var { cloneInstance, createContainerChildSet, appendChildToContainerChildSet, finalizeContainerChildren, replaceContainerChildren, cloneHiddenInstance, cloneHiddenTextInstance, isSuspenseInstancePending, isSuspenseInstanceFallback, getSuspenseInstanceFallbackErrorDetails, registerSuspenseInstanceRetry, canHydrateFormStateMarker, isFormStateMarkerMatching, getNextHydratableSibling, getNextHydratableSiblingAfterSingleton, getFirstHydratableChild, getFirstHydratableChildWithinContainer, getFirstHydratableChildWithinSuspenseInstance, getFirstHydratableChildWithinSingleton, canHydrateInstance, canHydrateTextInstance, canHydrateSuspenseInstance, hydrateInstance, hydrateTextInstance, hydrateSuspenseInstance, getNextHydratableInstanceAfterSuspenseInstance, commitHydratedContainer, commitHydratedSuspenseInstance, clearSuspenseBoundary, clearSuspenseBoundaryFromContainer, shouldDeleteUnhydratedTailInstances, diffHydratedPropsForDevWarnings, diffHydratedTextForDevWarnings, describeHydratableInstanceForDevWarnings, validateHydratableInstance, validateHydratableTextInstance, supportsResources, isHostHoistableType, getHoistableRoot, getResource, acquireResource, releaseResource, hydrateHoistable, mountHoistable, unmountHoistable, createHoistableInstance, prepareToCommitHoistables, mayResourceSuspendCommit, preloadResource, suspendResource, supportsSingletons, resolveSingletonInstance, acquireSingletonInstance, releaseSingletonInstance, isHostSingletonType, isSingletonScope } = $$$config, valueStack = [];
    var fiberStack = [];
    var index$jscomp$0 = -1, emptyContextObject = {};
    Object.freeze(emptyContextObject);
    var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback, log$1 = Math.log, LN2 = Math.LN2, nextTransitionLane = 256, nextRetryLane = 4194304, scheduleCallback$3 = Scheduler.unstable_scheduleCallback, cancelCallback$1 = Scheduler.unstable_cancelCallback, shouldYield = Scheduler.unstable_shouldYield, requestPaint = Scheduler.unstable_requestPaint, now$1 = Scheduler.unstable_now, ImmediatePriority = Scheduler.unstable_ImmediatePriority, UserBlockingPriority = Scheduler.unstable_UserBlockingPriority, NormalPriority$1 = Scheduler.unstable_NormalPriority, IdlePriority = Scheduler.unstable_IdlePriority, log2 = Scheduler.log, unstable_setDisableYieldValue2 = Scheduler.unstable_setDisableYieldValue, rendererID = null, injectedHook = null, injectedProfilingHooks = null, hasLoggedError = false, isDevToolsPresent = typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined", disabledDepth = 0, prevLog, prevInfo, prevWarn, prevError, prevGroup, prevGroupCollapsed, prevGroupEnd;
    disabledLog.__reactDisabledLog = true;
    var prefix, suffix, reentry = false;
    var componentFrameCache = new (typeof WeakMap === "function" ? WeakMap : Map);
    var CapturedStacks = new WeakMap, forkStack = [], forkStackIndex = 0, treeForkProvider = null, treeForkCount = 0, idStack = [], idStackIndex = 0, treeContextProvider = null, treeContextId = 1, treeContextOverflow = "", contextStackCursor = createCursor(null), contextFiberStackCursor = createCursor(null), rootInstanceStackCursor = createCursor(null), hostTransitionProviderCursor = createCursor(null), needsEscaping = /["'&<>\n\t]|^\s|\s$/, current = null, isRendering = false, hydrationParentFiber = null, nextHydratableInstance = null, isHydrating = false, didSuspendOrErrorDEV = false, hydrationDiffRootDEV = null, hydrationErrors = null, rootOrSingletonContext = false, HydrationMismatchException = Error("Hydration Mismatch Exception: This is not a real error, and should not leak into userspace. If you're seeing this, it's likely a bug in React."), lastResetTime = 0;
    if (typeof performance === "object" && typeof performance.now === "function") {
      var localPerformance = performance;
      var getCurrentTime = function() {
        return localPerformance.now();
      };
    } else {
      var localDate = Date;
      getCurrentTime = function() {
        return localDate.now();
      };
    }
    var objectIs = typeof Object.is === "function" ? Object.is : is, NoMode = 0, valueCursor = createCursor(null);
    var rendererCursorDEV = createCursor(null);
    var renderer2CursorDEV = createCursor(null);
    var rendererSigil = {};
    var currentlyRenderingFiber$1 = null, lastContextDependency = null, isDisallowedContextReadInDEV = false, AbortControllerLocal = typeof AbortController !== "undefined" ? AbortController : function() {
      var listeners = [], signal = this.signal = {
        aborted: false,
        addEventListener: function(type, listener) {
          listeners.push(listener);
        }
      };
      this.abort = function() {
        signal.aborted = true;
        listeners.forEach(function(listener) {
          return listener();
        });
      };
    }, scheduleCallback$2 = Scheduler.unstable_scheduleCallback, NormalPriority = Scheduler.unstable_NormalPriority, CacheContext = {
      $$typeof: REACT_CONTEXT_TYPE,
      Consumer: null,
      Provider: null,
      _currentValue: null,
      _currentValue2: null,
      _threadCount: 0,
      _currentRenderer: null,
      _currentRenderer2: null
    }, now = Scheduler.unstable_now, commitStartTime = -0, profilerStartTime = -1.1, profilerEffectDuration = -0, currentUpdateIsNested = false, nestedUpdateScheduled = false, firstScheduledRoot = null, lastScheduledRoot = null, didScheduleMicrotask = false, didScheduleMicrotask_act = false, mightHavePendingSyncWork = false, isFlushingWork = false, currentEventTransitionLane = 0, fakeActCallbackNode$1 = {}, currentEntangledListeners = null, currentEntangledPendingCount = 0, currentEntangledLane = 0, currentEntangledActionThenable = null, prevOnStartTransitionFinish = ReactSharedInternals.S;
    ReactSharedInternals.S = function(transition, returnValue) {
      typeof returnValue === "object" && returnValue !== null && typeof returnValue.then === "function" && entangleAsyncAction(transition, returnValue);
      prevOnStartTransitionFinish !== null && prevOnStartTransitionFinish(transition, returnValue);
    };
    var resumedCache = createCursor(null), hasOwnProperty = Object.prototype.hasOwnProperty, ReactStrictModeWarnings = {
      recordUnsafeLifecycleWarnings: function() {},
      flushPendingUnsafeLifecycleWarnings: function() {},
      recordLegacyContextWarning: function() {},
      flushLegacyContextWarning: function() {},
      discardPendingWarnings: function() {}
    }, pendingComponentWillMountWarnings = [], pendingUNSAFE_ComponentWillMountWarnings = [], pendingComponentWillReceivePropsWarnings = [], pendingUNSAFE_ComponentWillReceivePropsWarnings = [], pendingComponentWillUpdateWarnings = [], pendingUNSAFE_ComponentWillUpdateWarnings = [], didWarnAboutUnsafeLifecycles = new Set;
    ReactStrictModeWarnings.recordUnsafeLifecycleWarnings = function(fiber, instance) {
      didWarnAboutUnsafeLifecycles.has(fiber.type) || (typeof instance.componentWillMount === "function" && instance.componentWillMount.__suppressDeprecationWarning !== true && pendingComponentWillMountWarnings.push(fiber), fiber.mode & 8 && typeof instance.UNSAFE_componentWillMount === "function" && pendingUNSAFE_ComponentWillMountWarnings.push(fiber), typeof instance.componentWillReceiveProps === "function" && instance.componentWillReceiveProps.__suppressDeprecationWarning !== true && pendingComponentWillReceivePropsWarnings.push(fiber), fiber.mode & 8 && typeof instance.UNSAFE_componentWillReceiveProps === "function" && pendingUNSAFE_ComponentWillReceivePropsWarnings.push(fiber), typeof instance.componentWillUpdate === "function" && instance.componentWillUpdate.__suppressDeprecationWarning !== true && pendingComponentWillUpdateWarnings.push(fiber), fiber.mode & 8 && typeof instance.UNSAFE_componentWillUpdate === "function" && pendingUNSAFE_ComponentWillUpdateWarnings.push(fiber));
    };
    ReactStrictModeWarnings.flushPendingUnsafeLifecycleWarnings = function() {
      var componentWillMountUniqueNames = new Set;
      0 < pendingComponentWillMountWarnings.length && (pendingComponentWillMountWarnings.forEach(function(fiber) {
        componentWillMountUniqueNames.add(getComponentNameFromFiber(fiber) || "Component");
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      }), pendingComponentWillMountWarnings = []);
      var UNSAFE_componentWillMountUniqueNames = new Set;
      0 < pendingUNSAFE_ComponentWillMountWarnings.length && (pendingUNSAFE_ComponentWillMountWarnings.forEach(function(fiber) {
        UNSAFE_componentWillMountUniqueNames.add(getComponentNameFromFiber(fiber) || "Component");
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      }), pendingUNSAFE_ComponentWillMountWarnings = []);
      var componentWillReceivePropsUniqueNames = new Set;
      0 < pendingComponentWillReceivePropsWarnings.length && (pendingComponentWillReceivePropsWarnings.forEach(function(fiber) {
        componentWillReceivePropsUniqueNames.add(getComponentNameFromFiber(fiber) || "Component");
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      }), pendingComponentWillReceivePropsWarnings = []);
      var UNSAFE_componentWillReceivePropsUniqueNames = new Set;
      0 < pendingUNSAFE_ComponentWillReceivePropsWarnings.length && (pendingUNSAFE_ComponentWillReceivePropsWarnings.forEach(function(fiber) {
        UNSAFE_componentWillReceivePropsUniqueNames.add(getComponentNameFromFiber(fiber) || "Component");
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      }), pendingUNSAFE_ComponentWillReceivePropsWarnings = []);
      var componentWillUpdateUniqueNames = new Set;
      0 < pendingComponentWillUpdateWarnings.length && (pendingComponentWillUpdateWarnings.forEach(function(fiber) {
        componentWillUpdateUniqueNames.add(getComponentNameFromFiber(fiber) || "Component");
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      }), pendingComponentWillUpdateWarnings = []);
      var UNSAFE_componentWillUpdateUniqueNames = new Set;
      0 < pendingUNSAFE_ComponentWillUpdateWarnings.length && (pendingUNSAFE_ComponentWillUpdateWarnings.forEach(function(fiber) {
        UNSAFE_componentWillUpdateUniqueNames.add(getComponentNameFromFiber(fiber) || "Component");
        didWarnAboutUnsafeLifecycles.add(fiber.type);
      }), pendingUNSAFE_ComponentWillUpdateWarnings = []);
      if (0 < UNSAFE_componentWillMountUniqueNames.size) {
        var sortedNames = setToSortedString(UNSAFE_componentWillMountUniqueNames);
        console.error(`Using UNSAFE_componentWillMount in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code with side effects to componentDidMount, and set initial state in the constructor.

Please update the following components: %s`, sortedNames);
      }
      0 < UNSAFE_componentWillReceivePropsUniqueNames.size && (sortedNames = setToSortedString(UNSAFE_componentWillReceivePropsUniqueNames), console.error(`Using UNSAFE_componentWillReceiveProps in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* If you're updating state whenever props change, refactor your code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state

Please update the following components: %s`, sortedNames));
      0 < UNSAFE_componentWillUpdateUniqueNames.size && (sortedNames = setToSortedString(UNSAFE_componentWillUpdateUniqueNames), console.error(`Using UNSAFE_componentWillUpdate in strict mode is not recommended and may indicate bugs in your code. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.

Please update the following components: %s`, sortedNames));
      0 < componentWillMountUniqueNames.size && (sortedNames = setToSortedString(componentWillMountUniqueNames), console.warn(`componentWillMount has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move code with side effects to componentDidMount, and set initial state in the constructor.
* Rename componentWillMount to UNSAFE_componentWillMount to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: %s`, sortedNames));
      0 < componentWillReceivePropsUniqueNames.size && (sortedNames = setToSortedString(componentWillReceivePropsUniqueNames), console.warn(`componentWillReceiveProps has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* If you're updating state whenever props change, refactor your code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://react.dev/link/derived-state
* Rename componentWillReceiveProps to UNSAFE_componentWillReceiveProps to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: %s`, sortedNames));
      0 < componentWillUpdateUniqueNames.size && (sortedNames = setToSortedString(componentWillUpdateUniqueNames), console.warn(`componentWillUpdate has been renamed, and is not recommended for use. See https://react.dev/link/unsafe-component-lifecycles for details.

* Move data fetching code or side effects to componentDidUpdate.
* Rename componentWillUpdate to UNSAFE_componentWillUpdate to suppress this warning in non-strict mode. In React 18.x, only the UNSAFE_ name will work. To rename all deprecated lifecycles to their new names, you can run \`npx react-codemod rename-unsafe-lifecycles\` in your project source folder.

Please update the following components: %s`, sortedNames));
    };
    var pendingLegacyContextWarning = new Map, didWarnAboutLegacyContext = new Set;
    ReactStrictModeWarnings.recordLegacyContextWarning = function(fiber, instance) {
      var strictRoot = null;
      for (var node = fiber;node !== null; )
        node.mode & 8 && (strictRoot = node), node = node.return;
      strictRoot === null ? console.error("Expected to find a StrictMode component in a strict mode tree. This error is likely caused by a bug in React. Please file an issue.") : !didWarnAboutLegacyContext.has(fiber.type) && (node = pendingLegacyContextWarning.get(strictRoot), fiber.type.contextTypes != null || fiber.type.childContextTypes != null || instance !== null && typeof instance.getChildContext === "function") && (node === undefined && (node = [], pendingLegacyContextWarning.set(strictRoot, node)), node.push(fiber));
    };
    ReactStrictModeWarnings.flushLegacyContextWarning = function() {
      pendingLegacyContextWarning.forEach(function(fiberArray) {
        if (fiberArray.length !== 0) {
          var firstFiber = fiberArray[0], uniqueNames = new Set;
          fiberArray.forEach(function(fiber) {
            uniqueNames.add(getComponentNameFromFiber(fiber) || "Component");
            didWarnAboutLegacyContext.add(fiber.type);
          });
          var sortedNames = setToSortedString(uniqueNames);
          runWithFiberInDEV(firstFiber, function() {
            console.error(`Legacy context API has been detected within a strict-mode tree.

The old API will be supported in all 16.x releases, but applications using it should migrate to the new version.

Please update the following components: %s

Learn more about this warning here: https://react.dev/link/legacy-context`, sortedNames);
          });
        }
      });
    };
    ReactStrictModeWarnings.discardPendingWarnings = function() {
      pendingComponentWillMountWarnings = [];
      pendingUNSAFE_ComponentWillMountWarnings = [];
      pendingComponentWillReceivePropsWarnings = [];
      pendingUNSAFE_ComponentWillReceivePropsWarnings = [];
      pendingComponentWillUpdateWarnings = [];
      pendingUNSAFE_ComponentWillUpdateWarnings = [];
      pendingLegacyContextWarning = new Map;
    };
    var SuspenseException = Error("Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."), SuspenseyCommitException = Error("Suspense Exception: This is not a real error, and should not leak into userspace. If you're seeing this, it's likely a bug in React."), SuspenseActionException = Error("Suspense Exception: This is not a real error! It's an implementation detail of `useActionState` to interrupt the current render. You must either rethrow it immediately, or move the `useActionState` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary."), noopSuspenseyCommitThenable = {
      then: function() {
        console.error('Internal React error: A listener was unexpectedly attached to a "noop" thenable. This is a bug in React. Please file an issue.');
      }
    }, suspendedThenable = null, needsToResetSuspendedThenableDEV = false, NoFlags = 0, HasEffect = 1, Insertion = 2, Layout = 4, Passive = 8, concurrentQueues = [], concurrentQueuesIndex = 0, concurrentlyUpdatedLanes = 0, UpdateState = 0, ReplaceState = 1, ForceUpdate = 2, CaptureUpdate = 3, hasForceUpdate = false;
    var didWarnUpdateInsideUpdate = false;
    var currentlyProcessingQueue = null;
    var didReadFromEntangledAsyncAction = false, currentTreeHiddenStackCursor = createCursor(null), prevEntangledRenderLanesCursor = createCursor(0), didWarnUncachedGetSnapshot;
    var didWarnAboutMismatchedHooksForComponent = new Set;
    var didWarnAboutUseWrappedInTryCatch = new Set;
    var didWarnAboutAsyncClientComponent = new Set;
    var didWarnAboutUseFormState = new Set;
    var renderLanes = 0, currentlyRenderingFiber = null, currentHook = null, workInProgressHook = null, didScheduleRenderPhaseUpdate = false, didScheduleRenderPhaseUpdateDuringThisPass = false, shouldDoubleInvokeUserFnsInHooksDEV = false, localIdCounter = 0, thenableIndexCounter$1 = 0, thenableState$1 = null, globalClientIdCounter = 0, RE_RENDER_LIMIT = 25, currentHookNameInDev = null, hookTypesDev = null, hookTypesUpdateIndexDev = -1, ignorePreviousDependencies = false, ContextOnlyDispatcher = {
      readContext,
      use,
      useCallback: throwInvalidHookError,
      useContext: throwInvalidHookError,
      useEffect: throwInvalidHookError,
      useImperativeHandle: throwInvalidHookError,
      useLayoutEffect: throwInvalidHookError,
      useInsertionEffect: throwInvalidHookError,
      useMemo: throwInvalidHookError,
      useReducer: throwInvalidHookError,
      useRef: throwInvalidHookError,
      useState: throwInvalidHookError,
      useDebugValue: throwInvalidHookError,
      useDeferredValue: throwInvalidHookError,
      useTransition: throwInvalidHookError,
      useSyncExternalStore: throwInvalidHookError,
      useId: throwInvalidHookError,
      useHostTransitionStatus: throwInvalidHookError,
      useFormState: throwInvalidHookError,
      useActionState: throwInvalidHookError,
      useOptimistic: throwInvalidHookError,
      useMemoCache: throwInvalidHookError,
      useCacheRefresh: throwInvalidHookError
    }, HooksDispatcherOnMountInDEV = null, HooksDispatcherOnMountWithHookTypesInDEV = null, HooksDispatcherOnUpdateInDEV = null, HooksDispatcherOnRerenderInDEV = null, InvalidNestedHooksDispatcherOnMountInDEV = null, InvalidNestedHooksDispatcherOnUpdateInDEV = null, InvalidNestedHooksDispatcherOnRerenderInDEV = null;
    HooksDispatcherOnMountInDEV = {
      readContext: function(context) {
        return readContext(context);
      },
      use,
      useCallback: function(callback, deps) {
        currentHookNameInDev = "useCallback";
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountCallback(callback, deps);
      },
      useContext: function(context) {
        currentHookNameInDev = "useContext";
        mountHookTypesDev();
        return readContext(context);
      },
      useEffect: function(create, createDeps) {
        currentHookNameInDev = "useEffect";
        mountHookTypesDev();
        checkDepsAreArrayDev(createDeps);
        return mountEffect(create, createDeps);
      },
      useImperativeHandle: function(ref, create, deps) {
        currentHookNameInDev = "useImperativeHandle";
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function(create, deps) {
        currentHookNameInDev = "useInsertionEffect";
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        mountEffectImpl(4, Insertion, create, deps);
      },
      useLayoutEffect: function(create, deps) {
        currentHookNameInDev = "useLayoutEffect";
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        return mountLayoutEffect(create, deps);
      },
      useMemo: function(create, deps) {
        currentHookNameInDev = "useMemo";
        mountHookTypesDev();
        checkDepsAreArrayDev(deps);
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountMemo(create, deps);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useReducer: function(reducer, initialArg, init) {
        currentHookNameInDev = "useReducer";
        mountHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountReducer(reducer, initialArg, init);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useRef: function(initialValue) {
        currentHookNameInDev = "useRef";
        mountHookTypesDev();
        return mountRef(initialValue);
      },
      useState: function(initialState) {
        currentHookNameInDev = "useState";
        mountHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountState(initialState);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useDebugValue: function() {
        currentHookNameInDev = "useDebugValue";
        mountHookTypesDev();
      },
      useDeferredValue: function(value, initialValue) {
        currentHookNameInDev = "useDeferredValue";
        mountHookTypesDev();
        return mountDeferredValue(value, initialValue);
      },
      useTransition: function() {
        currentHookNameInDev = "useTransition";
        mountHookTypesDev();
        return mountTransition();
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = "useSyncExternalStore";
        mountHookTypesDev();
        return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function() {
        currentHookNameInDev = "useId";
        mountHookTypesDev();
        return mountId();
      },
      useFormState: function(action, initialState) {
        currentHookNameInDev = "useFormState";
        mountHookTypesDev();
        warnOnUseFormStateInDev();
        return mountActionState(action, initialState);
      },
      useActionState: function(action, initialState) {
        currentHookNameInDev = "useActionState";
        mountHookTypesDev();
        return mountActionState(action, initialState);
      },
      useOptimistic: function(passthrough) {
        currentHookNameInDev = "useOptimistic";
        mountHookTypesDev();
        return mountOptimistic(passthrough);
      },
      useHostTransitionStatus,
      useMemoCache,
      useCacheRefresh: function() {
        currentHookNameInDev = "useCacheRefresh";
        mountHookTypesDev();
        return mountRefresh();
      }
    };
    HooksDispatcherOnMountWithHookTypesInDEV = {
      readContext: function(context) {
        return readContext(context);
      },
      use,
      useCallback: function(callback, deps) {
        currentHookNameInDev = "useCallback";
        updateHookTypesDev();
        return mountCallback(callback, deps);
      },
      useContext: function(context) {
        currentHookNameInDev = "useContext";
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function(create, createDeps) {
        currentHookNameInDev = "useEffect";
        updateHookTypesDev();
        return mountEffect(create, createDeps);
      },
      useImperativeHandle: function(ref, create, deps) {
        currentHookNameInDev = "useImperativeHandle";
        updateHookTypesDev();
        return mountImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function(create, deps) {
        currentHookNameInDev = "useInsertionEffect";
        updateHookTypesDev();
        mountEffectImpl(4, Insertion, create, deps);
      },
      useLayoutEffect: function(create, deps) {
        currentHookNameInDev = "useLayoutEffect";
        updateHookTypesDev();
        return mountLayoutEffect(create, deps);
      },
      useMemo: function(create, deps) {
        currentHookNameInDev = "useMemo";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountMemo(create, deps);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useReducer: function(reducer, initialArg, init) {
        currentHookNameInDev = "useReducer";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountReducer(reducer, initialArg, init);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useRef: function(initialValue) {
        currentHookNameInDev = "useRef";
        updateHookTypesDev();
        return mountRef(initialValue);
      },
      useState: function(initialState) {
        currentHookNameInDev = "useState";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountState(initialState);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useDebugValue: function() {
        currentHookNameInDev = "useDebugValue";
        updateHookTypesDev();
      },
      useDeferredValue: function(value, initialValue) {
        currentHookNameInDev = "useDeferredValue";
        updateHookTypesDev();
        return mountDeferredValue(value, initialValue);
      },
      useTransition: function() {
        currentHookNameInDev = "useTransition";
        updateHookTypesDev();
        return mountTransition();
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = "useSyncExternalStore";
        updateHookTypesDev();
        return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function() {
        currentHookNameInDev = "useId";
        updateHookTypesDev();
        return mountId();
      },
      useActionState: function(action, initialState) {
        currentHookNameInDev = "useActionState";
        updateHookTypesDev();
        return mountActionState(action, initialState);
      },
      useFormState: function(action, initialState) {
        currentHookNameInDev = "useFormState";
        updateHookTypesDev();
        warnOnUseFormStateInDev();
        return mountActionState(action, initialState);
      },
      useOptimistic: function(passthrough) {
        currentHookNameInDev = "useOptimistic";
        updateHookTypesDev();
        return mountOptimistic(passthrough);
      },
      useHostTransitionStatus,
      useMemoCache,
      useCacheRefresh: function() {
        currentHookNameInDev = "useCacheRefresh";
        updateHookTypesDev();
        return mountRefresh();
      }
    };
    HooksDispatcherOnUpdateInDEV = {
      readContext: function(context) {
        return readContext(context);
      },
      use,
      useCallback: function(callback, deps) {
        currentHookNameInDev = "useCallback";
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function(context) {
        currentHookNameInDev = "useContext";
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function(create, createDeps) {
        currentHookNameInDev = "useEffect";
        updateHookTypesDev();
        updateEffectImpl(2048, Passive, create, createDeps);
      },
      useImperativeHandle: function(ref, create, deps) {
        currentHookNameInDev = "useImperativeHandle";
        updateHookTypesDev();
        return updateImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function(create, deps) {
        currentHookNameInDev = "useInsertionEffect";
        updateHookTypesDev();
        return updateEffectImpl(4, Insertion, create, deps);
      },
      useLayoutEffect: function(create, deps) {
        currentHookNameInDev = "useLayoutEffect";
        updateHookTypesDev();
        return updateEffectImpl(4, Layout, create, deps);
      },
      useMemo: function(create, deps) {
        currentHookNameInDev = "useMemo";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return updateMemo(create, deps);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useReducer: function(reducer, initialArg, init) {
        currentHookNameInDev = "useReducer";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return updateReducer(reducer, initialArg, init);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useRef: function() {
        currentHookNameInDev = "useRef";
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      },
      useState: function() {
        currentHookNameInDev = "useState";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return updateReducer(basicStateReducer);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useDebugValue: function() {
        currentHookNameInDev = "useDebugValue";
        updateHookTypesDev();
      },
      useDeferredValue: function(value, initialValue) {
        currentHookNameInDev = "useDeferredValue";
        updateHookTypesDev();
        return updateDeferredValue(value, initialValue);
      },
      useTransition: function() {
        currentHookNameInDev = "useTransition";
        updateHookTypesDev();
        return updateTransition();
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = "useSyncExternalStore";
        updateHookTypesDev();
        return updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function() {
        currentHookNameInDev = "useId";
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      },
      useFormState: function(action) {
        currentHookNameInDev = "useFormState";
        updateHookTypesDev();
        warnOnUseFormStateInDev();
        return updateActionState(action);
      },
      useActionState: function(action) {
        currentHookNameInDev = "useActionState";
        updateHookTypesDev();
        return updateActionState(action);
      },
      useOptimistic: function(passthrough, reducer) {
        currentHookNameInDev = "useOptimistic";
        updateHookTypesDev();
        return updateOptimistic(passthrough, reducer);
      },
      useHostTransitionStatus,
      useMemoCache,
      useCacheRefresh: function() {
        currentHookNameInDev = "useCacheRefresh";
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      }
    };
    HooksDispatcherOnRerenderInDEV = {
      readContext: function(context) {
        return readContext(context);
      },
      use,
      useCallback: function(callback, deps) {
        currentHookNameInDev = "useCallback";
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function(context) {
        currentHookNameInDev = "useContext";
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function(create, createDeps) {
        currentHookNameInDev = "useEffect";
        updateHookTypesDev();
        updateEffectImpl(2048, Passive, create, createDeps);
      },
      useImperativeHandle: function(ref, create, deps) {
        currentHookNameInDev = "useImperativeHandle";
        updateHookTypesDev();
        return updateImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function(create, deps) {
        currentHookNameInDev = "useInsertionEffect";
        updateHookTypesDev();
        return updateEffectImpl(4, Insertion, create, deps);
      },
      useLayoutEffect: function(create, deps) {
        currentHookNameInDev = "useLayoutEffect";
        updateHookTypesDev();
        return updateEffectImpl(4, Layout, create, deps);
      },
      useMemo: function(create, deps) {
        currentHookNameInDev = "useMemo";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnRerenderInDEV;
        try {
          return updateMemo(create, deps);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useReducer: function(reducer, initialArg, init) {
        currentHookNameInDev = "useReducer";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnRerenderInDEV;
        try {
          return rerenderReducer(reducer, initialArg, init);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useRef: function() {
        currentHookNameInDev = "useRef";
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      },
      useState: function() {
        currentHookNameInDev = "useState";
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnRerenderInDEV;
        try {
          return rerenderReducer(basicStateReducer);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useDebugValue: function() {
        currentHookNameInDev = "useDebugValue";
        updateHookTypesDev();
      },
      useDeferredValue: function(value, initialValue) {
        currentHookNameInDev = "useDeferredValue";
        updateHookTypesDev();
        return rerenderDeferredValue(value, initialValue);
      },
      useTransition: function() {
        currentHookNameInDev = "useTransition";
        updateHookTypesDev();
        return rerenderTransition();
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = "useSyncExternalStore";
        updateHookTypesDev();
        return updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function() {
        currentHookNameInDev = "useId";
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      },
      useFormState: function(action) {
        currentHookNameInDev = "useFormState";
        updateHookTypesDev();
        warnOnUseFormStateInDev();
        return rerenderActionState(action);
      },
      useActionState: function(action) {
        currentHookNameInDev = "useActionState";
        updateHookTypesDev();
        return rerenderActionState(action);
      },
      useOptimistic: function(passthrough, reducer) {
        currentHookNameInDev = "useOptimistic";
        updateHookTypesDev();
        return rerenderOptimistic(passthrough, reducer);
      },
      useHostTransitionStatus,
      useMemoCache,
      useCacheRefresh: function() {
        currentHookNameInDev = "useCacheRefresh";
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      }
    };
    InvalidNestedHooksDispatcherOnMountInDEV = {
      readContext: function(context) {
        warnInvalidContextAccess();
        return readContext(context);
      },
      use: function(usable) {
        warnInvalidHookAccess();
        return use(usable);
      },
      useCallback: function(callback, deps) {
        currentHookNameInDev = "useCallback";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountCallback(callback, deps);
      },
      useContext: function(context) {
        currentHookNameInDev = "useContext";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return readContext(context);
      },
      useEffect: function(create, createDeps) {
        currentHookNameInDev = "useEffect";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountEffect(create, createDeps);
      },
      useImperativeHandle: function(ref, create, deps) {
        currentHookNameInDev = "useImperativeHandle";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function(create, deps) {
        currentHookNameInDev = "useInsertionEffect";
        warnInvalidHookAccess();
        mountHookTypesDev();
        mountEffectImpl(4, Insertion, create, deps);
      },
      useLayoutEffect: function(create, deps) {
        currentHookNameInDev = "useLayoutEffect";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountLayoutEffect(create, deps);
      },
      useMemo: function(create, deps) {
        currentHookNameInDev = "useMemo";
        warnInvalidHookAccess();
        mountHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountMemo(create, deps);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useReducer: function(reducer, initialArg, init) {
        currentHookNameInDev = "useReducer";
        warnInvalidHookAccess();
        mountHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountReducer(reducer, initialArg, init);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useRef: function(initialValue) {
        currentHookNameInDev = "useRef";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountRef(initialValue);
      },
      useState: function(initialState) {
        currentHookNameInDev = "useState";
        warnInvalidHookAccess();
        mountHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnMountInDEV;
        try {
          return mountState(initialState);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useDebugValue: function() {
        currentHookNameInDev = "useDebugValue";
        warnInvalidHookAccess();
        mountHookTypesDev();
      },
      useDeferredValue: function(value, initialValue) {
        currentHookNameInDev = "useDeferredValue";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountDeferredValue(value, initialValue);
      },
      useTransition: function() {
        currentHookNameInDev = "useTransition";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountTransition();
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = "useSyncExternalStore";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function() {
        currentHookNameInDev = "useId";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountId();
      },
      useFormState: function(action, initialState) {
        currentHookNameInDev = "useFormState";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountActionState(action, initialState);
      },
      useActionState: function(action, initialState) {
        currentHookNameInDev = "useActionState";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountActionState(action, initialState);
      },
      useOptimistic: function(passthrough) {
        currentHookNameInDev = "useOptimistic";
        warnInvalidHookAccess();
        mountHookTypesDev();
        return mountOptimistic(passthrough);
      },
      useMemoCache: function(size) {
        warnInvalidHookAccess();
        return useMemoCache(size);
      },
      useHostTransitionStatus,
      useCacheRefresh: function() {
        currentHookNameInDev = "useCacheRefresh";
        mountHookTypesDev();
        return mountRefresh();
      }
    };
    InvalidNestedHooksDispatcherOnUpdateInDEV = {
      readContext: function(context) {
        warnInvalidContextAccess();
        return readContext(context);
      },
      use: function(usable) {
        warnInvalidHookAccess();
        return use(usable);
      },
      useCallback: function(callback, deps) {
        currentHookNameInDev = "useCallback";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function(context) {
        currentHookNameInDev = "useContext";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function(create, createDeps) {
        currentHookNameInDev = "useEffect";
        warnInvalidHookAccess();
        updateHookTypesDev();
        updateEffectImpl(2048, Passive, create, createDeps);
      },
      useImperativeHandle: function(ref, create, deps) {
        currentHookNameInDev = "useImperativeHandle";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function(create, deps) {
        currentHookNameInDev = "useInsertionEffect";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateEffectImpl(4, Insertion, create, deps);
      },
      useLayoutEffect: function(create, deps) {
        currentHookNameInDev = "useLayoutEffect";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateEffectImpl(4, Layout, create, deps);
      },
      useMemo: function(create, deps) {
        currentHookNameInDev = "useMemo";
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return updateMemo(create, deps);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useReducer: function(reducer, initialArg, init) {
        currentHookNameInDev = "useReducer";
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return updateReducer(reducer, initialArg, init);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useRef: function() {
        currentHookNameInDev = "useRef";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      },
      useState: function() {
        currentHookNameInDev = "useState";
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return updateReducer(basicStateReducer);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useDebugValue: function() {
        currentHookNameInDev = "useDebugValue";
        warnInvalidHookAccess();
        updateHookTypesDev();
      },
      useDeferredValue: function(value, initialValue) {
        currentHookNameInDev = "useDeferredValue";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateDeferredValue(value, initialValue);
      },
      useTransition: function() {
        currentHookNameInDev = "useTransition";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateTransition();
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = "useSyncExternalStore";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function() {
        currentHookNameInDev = "useId";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      },
      useFormState: function(action) {
        currentHookNameInDev = "useFormState";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateActionState(action);
      },
      useActionState: function(action) {
        currentHookNameInDev = "useActionState";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateActionState(action);
      },
      useOptimistic: function(passthrough, reducer) {
        currentHookNameInDev = "useOptimistic";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateOptimistic(passthrough, reducer);
      },
      useMemoCache: function(size) {
        warnInvalidHookAccess();
        return useMemoCache(size);
      },
      useHostTransitionStatus,
      useCacheRefresh: function() {
        currentHookNameInDev = "useCacheRefresh";
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      }
    };
    InvalidNestedHooksDispatcherOnRerenderInDEV = {
      readContext: function(context) {
        warnInvalidContextAccess();
        return readContext(context);
      },
      use: function(usable) {
        warnInvalidHookAccess();
        return use(usable);
      },
      useCallback: function(callback, deps) {
        currentHookNameInDev = "useCallback";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateCallback(callback, deps);
      },
      useContext: function(context) {
        currentHookNameInDev = "useContext";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return readContext(context);
      },
      useEffect: function(create, createDeps) {
        currentHookNameInDev = "useEffect";
        warnInvalidHookAccess();
        updateHookTypesDev();
        updateEffectImpl(2048, Passive, create, createDeps);
      },
      useImperativeHandle: function(ref, create, deps) {
        currentHookNameInDev = "useImperativeHandle";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateImperativeHandle(ref, create, deps);
      },
      useInsertionEffect: function(create, deps) {
        currentHookNameInDev = "useInsertionEffect";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateEffectImpl(4, Insertion, create, deps);
      },
      useLayoutEffect: function(create, deps) {
        currentHookNameInDev = "useLayoutEffect";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateEffectImpl(4, Layout, create, deps);
      },
      useMemo: function(create, deps) {
        currentHookNameInDev = "useMemo";
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return updateMemo(create, deps);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useReducer: function(reducer, initialArg, init) {
        currentHookNameInDev = "useReducer";
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return rerenderReducer(reducer, initialArg, init);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useRef: function() {
        currentHookNameInDev = "useRef";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      },
      useState: function() {
        currentHookNameInDev = "useState";
        warnInvalidHookAccess();
        updateHookTypesDev();
        var prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = InvalidNestedHooksDispatcherOnUpdateInDEV;
        try {
          return rerenderReducer(basicStateReducer);
        } finally {
          ReactSharedInternals.H = prevDispatcher;
        }
      },
      useDebugValue: function() {
        currentHookNameInDev = "useDebugValue";
        warnInvalidHookAccess();
        updateHookTypesDev();
      },
      useDeferredValue: function(value, initialValue) {
        currentHookNameInDev = "useDeferredValue";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return rerenderDeferredValue(value, initialValue);
      },
      useTransition: function() {
        currentHookNameInDev = "useTransition";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return rerenderTransition();
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        currentHookNameInDev = "useSyncExternalStore";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
      },
      useId: function() {
        currentHookNameInDev = "useId";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      },
      useFormState: function(action) {
        currentHookNameInDev = "useFormState";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return rerenderActionState(action);
      },
      useActionState: function(action) {
        currentHookNameInDev = "useActionState";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return rerenderActionState(action);
      },
      useOptimistic: function(passthrough, reducer) {
        currentHookNameInDev = "useOptimistic";
        warnInvalidHookAccess();
        updateHookTypesDev();
        return rerenderOptimistic(passthrough, reducer);
      },
      useMemoCache: function(size) {
        warnInvalidHookAccess();
        return useMemoCache(size);
      },
      useHostTransitionStatus,
      useCacheRefresh: function() {
        currentHookNameInDev = "useCacheRefresh";
        updateHookTypesDev();
        return updateWorkInProgressHook().memoizedState;
      }
    };
    var callComponent = {
      "react-stack-bottom-frame": function(Component, props, secondArg) {
        var wasRendering = isRendering;
        isRendering = true;
        try {
          return Component(props, secondArg);
        } finally {
          isRendering = wasRendering;
        }
      }
    }, callComponentInDEV = callComponent["react-stack-bottom-frame"].bind(callComponent), callRender = {
      "react-stack-bottom-frame": function(instance) {
        var wasRendering = isRendering;
        isRendering = true;
        try {
          return instance.render();
        } finally {
          isRendering = wasRendering;
        }
      }
    }, callRenderInDEV = callRender["react-stack-bottom-frame"].bind(callRender), callComponentDidMount = {
      "react-stack-bottom-frame": function(finishedWork, instance) {
        try {
          instance.componentDidMount();
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }, callComponentDidMountInDEV = callComponentDidMount["react-stack-bottom-frame"].bind(callComponentDidMount), callComponentDidUpdate = {
      "react-stack-bottom-frame": function(finishedWork, instance, prevProps, prevState, snapshot) {
        try {
          instance.componentDidUpdate(prevProps, prevState, snapshot);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
    }, callComponentDidUpdateInDEV = callComponentDidUpdate["react-stack-bottom-frame"].bind(callComponentDidUpdate), callComponentDidCatch = {
      "react-stack-bottom-frame": function(instance, errorInfo) {
        var stack = errorInfo.stack;
        instance.componentDidCatch(errorInfo.value, {
          componentStack: stack !== null ? stack : ""
        });
      }
    }, callComponentDidCatchInDEV = callComponentDidCatch["react-stack-bottom-frame"].bind(callComponentDidCatch), callComponentWillUnmount = {
      "react-stack-bottom-frame": function(current2, nearestMountedAncestor, instance) {
        try {
          instance.componentWillUnmount();
        } catch (error) {
          captureCommitPhaseError(current2, nearestMountedAncestor, error);
        }
      }
    }, callComponentWillUnmountInDEV = callComponentWillUnmount["react-stack-bottom-frame"].bind(callComponentWillUnmount), callCreate = {
      "react-stack-bottom-frame": function(effect) {
        effect.resourceKind != null && console.error("Expected only SimpleEffects when enableUseEffectCRUDOverload is disabled, got %s", effect.resourceKind);
        var create = effect.create;
        effect = effect.inst;
        create = create();
        return effect.destroy = create;
      }
    }, callCreateInDEV = callCreate["react-stack-bottom-frame"].bind(callCreate), callDestroy = {
      "react-stack-bottom-frame": function(current2, nearestMountedAncestor, destroy) {
        try {
          destroy();
        } catch (error) {
          captureCommitPhaseError(current2, nearestMountedAncestor, error);
        }
      }
    }, callDestroyInDEV = callDestroy["react-stack-bottom-frame"].bind(callDestroy), callLazyInit = {
      "react-stack-bottom-frame": function(lazy) {
        var init = lazy._init;
        return init(lazy._payload);
      }
    }, callLazyInitInDEV = callLazyInit["react-stack-bottom-frame"].bind(callLazyInit), thenableState = null, thenableIndexCounter = 0, currentDebugInfo = null, didWarnAboutMaps;
    var didWarnAboutGenerators = didWarnAboutMaps = false;
    var ownerHasKeyUseWarning = {};
    var ownerHasFunctionTypeWarning = {};
    var ownerHasSymbolTypeWarning = {};
    warnForMissingKey = function(returnFiber, workInProgress2, child) {
      if (child !== null && typeof child === "object" && child._store && (!child._store.validated && child.key == null || child._store.validated === 2)) {
        if (typeof child._store !== "object")
          throw Error("React Component in warnForMissingKey should have a _store. This error is likely caused by a bug in React. Please file an issue.");
        child._store.validated = 1;
        var componentName2 = getComponentNameFromFiber(returnFiber), componentKey = componentName2 || "null";
        if (!ownerHasKeyUseWarning[componentKey]) {
          ownerHasKeyUseWarning[componentKey] = true;
          child = child._owner;
          returnFiber = returnFiber._debugOwner;
          var currentComponentErrorInfo = "";
          returnFiber && typeof returnFiber.tag === "number" && (componentKey = getComponentNameFromFiber(returnFiber)) && (currentComponentErrorInfo = `

Check the render method of \`` + componentKey + "`.");
          currentComponentErrorInfo || componentName2 && (currentComponentErrorInfo = `

Check the top-level render call using <` + componentName2 + ">.");
          var childOwnerAppendix = "";
          child != null && returnFiber !== child && (componentName2 = null, typeof child.tag === "number" ? componentName2 = getComponentNameFromFiber(child) : typeof child.name === "string" && (componentName2 = child.name), componentName2 && (childOwnerAppendix = " It was passed a child from " + componentName2 + "."));
          runWithFiberInDEV(workInProgress2, function() {
            console.error('Each child in a list should have a unique "key" prop.%s%s See https://react.dev/link/warning-keys for more information.', currentComponentErrorInfo, childOwnerAppendix);
          });
        }
      }
    };
    var reconcileChildFibers = createChildReconciler(true), mountChildFibers = createChildReconciler(false), suspenseHandlerStackCursor = createCursor(null), shellBoundary = null, SubtreeSuspenseContextMask = 1, ForceSuspenseFallback = 2, suspenseStackCursor = createCursor(0), fakeInternalInstance = {};
    var didWarnAboutStateAssignmentForComponent = new Set;
    var didWarnAboutUninitializedState = new Set;
    var didWarnAboutGetSnapshotBeforeUpdateWithoutDidUpdate = new Set;
    var didWarnAboutLegacyLifecyclesAndDerivedState = new Set;
    var didWarnAboutDirectlyAssigningPropsToState = new Set;
    var didWarnAboutUndefinedDerivedState = new Set;
    var didWarnAboutContextTypes$1 = new Set;
    var didWarnAboutChildContextTypes = new Set;
    var didWarnAboutInvalidateContextType = new Set;
    var didWarnOnInvalidCallback = new Set;
    Object.freeze(fakeInternalInstance);
    var classComponentUpdater = {
      enqueueSetState: function(inst, payload, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(inst), update = createUpdate(lane);
        update.payload = payload;
        callback !== undefined && callback !== null && (warnOnInvalidCallback(callback), update.callback = callback);
        payload = enqueueUpdate(inst, update, lane);
        payload !== null && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
        markStateUpdateScheduled(inst, lane);
      },
      enqueueReplaceState: function(inst, payload, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(inst), update = createUpdate(lane);
        update.tag = ReplaceState;
        update.payload = payload;
        callback !== undefined && callback !== null && (warnOnInvalidCallback(callback), update.callback = callback);
        payload = enqueueUpdate(inst, update, lane);
        payload !== null && (scheduleUpdateOnFiber(payload, inst, lane), entangleTransitions(payload, inst, lane));
        markStateUpdateScheduled(inst, lane);
      },
      enqueueForceUpdate: function(inst, callback) {
        inst = inst._reactInternals;
        var lane = requestUpdateLane(inst), update = createUpdate(lane);
        update.tag = ForceUpdate;
        callback !== undefined && callback !== null && (warnOnInvalidCallback(callback), update.callback = callback);
        callback = enqueueUpdate(inst, update, lane);
        callback !== null && (scheduleUpdateOnFiber(callback, inst, lane), entangleTransitions(callback, inst, lane));
        injectedProfilingHooks !== null && typeof injectedProfilingHooks.markForceUpdateScheduled === "function" && injectedProfilingHooks.markForceUpdateScheduled(inst, lane);
      }
    }, reportGlobalError = typeof reportError === "function" ? reportError : function(error) {
      if (typeof window === "object" && typeof window.ErrorEvent === "function") {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: typeof error === "object" && error !== null && typeof error.message === "string" ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event))
          return;
      } else if (typeof process === "object" && typeof process.emit === "function") {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    }, componentName = null, errorBoundaryName = null, SelectiveHydrationException = Error("This is not a real error. It's an implementation detail of React's selective hydration feature. If this leaks into userspace, it's a bug in React. Please file an issue."), didReceiveUpdate = false;
    var didWarnAboutBadClass = {};
    var didWarnAboutContextTypeOnFunctionComponent = {};
    var didWarnAboutContextTypes = {};
    var didWarnAboutGetDerivedStateOnFunctionComponent = {};
    var didWarnAboutReassigningProps = false;
    var didWarnAboutRevealOrder = {};
    var didWarnAboutTailOptions = {};
    var SUSPENDED_MARKER = {
      dehydrated: null,
      treeContext: null,
      retryLane: 0,
      hydrationErrors: null
    }, hasWarnedAboutUsingNoValuePropOnContextProvider = false, didWarnAboutUndefinedSnapshotBeforeUpdate = null;
    didWarnAboutUndefinedSnapshotBeforeUpdate = new Set;
    var offscreenSubtreeIsHidden = false, offscreenSubtreeWasHidden = false, needsFormReset = false, PossiblyWeakSet = typeof WeakSet === "function" ? WeakSet : Set, nextEffect = null, inProgressLanes = null, inProgressRoot = null, hostParent = null, hostParentIsContainer = false, currentHoistableRoot = null, suspenseyCommitFlag = 8192, DefaultAsyncDispatcher = {
      getCacheForType: function(resourceType) {
        var cache = readContext(CacheContext), cacheForType = cache.data.get(resourceType);
        cacheForType === undefined && (cacheForType = resourceType(), cache.data.set(resourceType, cacheForType));
        return cacheForType;
      },
      getOwner: function() {
        return current;
      }
    }, COMPONENT_TYPE = 0, HAS_PSEUDO_CLASS_TYPE = 1, ROLE_TYPE = 2, TEST_NAME_TYPE = 3, TEXT_TYPE = 4;
    if (typeof Symbol === "function" && Symbol.for) {
      var symbolFor = Symbol.for;
      COMPONENT_TYPE = symbolFor("selector.component");
      HAS_PSEUDO_CLASS_TYPE = symbolFor("selector.has_pseudo_class");
      ROLE_TYPE = symbolFor("selector.role");
      TEST_NAME_TYPE = symbolFor("selector.test_id");
      TEXT_TYPE = symbolFor("selector.text");
    }
    var commitHooks = [], PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map, NoContext = 0, RenderContext = 2, CommitContext = 4, RootInProgress = 0, RootFatalErrored = 1, RootErrored = 2, RootSuspended = 3, RootSuspendedWithDelay = 4, RootSuspendedAtTheShell = 6, RootCompleted = 5, executionContext = NoContext, workInProgressRoot = null, workInProgress = null, workInProgressRootRenderLanes = 0, NotSuspended = 0, SuspendedOnError = 1, SuspendedOnData = 2, SuspendedOnImmediate = 3, SuspendedOnInstance = 4, SuspendedOnInstanceAndReadyToContinue = 5, SuspendedOnDeprecatedThrowPromise = 6, SuspendedAndReadyToContinue = 7, SuspendedOnHydration = 8, SuspendedOnAction = 9, workInProgressSuspendedReason = NotSuspended, workInProgressThrownValue = null, workInProgressRootDidSkipSuspendedSiblings = false, workInProgressRootIsPrerendering = false, workInProgressRootDidAttachPingListener = false, entangledRenderLanes = 0, workInProgressRootExitStatus = RootInProgress, workInProgressRootSkippedLanes = 0, workInProgressRootInterleavedUpdatedLanes = 0, workInProgressRootPingedLanes = 0, workInProgressDeferredLane = 0, workInProgressSuspendedRetryLanes = 0, workInProgressRootConcurrentErrors = null, workInProgressRootRecoverableErrors = null, workInProgressRootDidIncludeRecursiveRenderUpdate = false, globalMostRecentFallbackTime = 0, FALLBACK_THROTTLE_MS = 300, workInProgressRootRenderTargetTime = Infinity, RENDER_TIMEOUT_MS = 500, workInProgressTransitions = null, legacyErrorBoundariesThatAlreadyFailed = null, IMMEDIATE_COMMIT = 0, SUSPENDED_COMMIT = 1, THROTTLED_COMMIT = 2, NO_PENDING_EFFECTS = 0, PENDING_MUTATION_PHASE = 1, PENDING_LAYOUT_PHASE = 2, PENDING_AFTER_MUTATION_PHASE = 3, PENDING_SPAWNED_WORK = 4, PENDING_PASSIVE_PHASE = 5, pendingEffectsStatus = 0, pendingEffectsRoot = null, pendingFinishedWork = null, pendingEffectsLanes = 0, pendingEffectsRemainingLanes = 0, pendingPassiveTransitions = null, pendingRecoverableErrors = null, NESTED_UPDATE_LIMIT = 50, nestedUpdateCount = 0, rootWithNestedUpdates = null, isFlushingPassiveEffects = false, didScheduleUpdateDuringPassiveEffects = false, NESTED_PASSIVE_UPDATE_LIMIT = 50, nestedPassiveUpdateCount = 0, rootWithPassiveNestedUpdates = null, isRunningInsertionEffect = false, didWarnStateUpdateForNotYetMountedComponent = null, didWarnAboutUpdateInRender = false;
    var didWarnAboutUpdateInRenderForAnotherComponent = new Set;
    var fakeActCallbackNode = {}, resolveFamily = null, failedBoundaries = null;
    var hasBadMapPolyfill = false;
    try {
      var nonExtensibleObject = Object.preventExtensions({});
      new Map([[nonExtensibleObject, null]]);
      new Set([nonExtensibleObject]);
    } catch (e) {
      hasBadMapPolyfill = true;
    }
    var didWarnAboutNestedUpdates = false;
    var didWarnAboutFindNodeInStrictMode = {};
    var overrideHookState = null, overrideHookStateDeletePath = null, overrideHookStateRenamePath = null, overrideProps = null, overridePropsDeletePath = null, overridePropsRenamePath = null, scheduleUpdate = null, setErrorHandler = null, setSuspenseHandler = null;
    overrideHookState = function(fiber, id, path, value) {
      id = findHook(fiber, id);
      id !== null && (path = copyWithSetImpl(id.memoizedState, path, 0, value), id.memoizedState = path, id.baseState = path, fiber.memoizedProps = assign({}, fiber.memoizedProps), path = enqueueConcurrentRenderForLane(fiber, 2), path !== null && scheduleUpdateOnFiber(path, fiber, 2));
    };
    overrideHookStateDeletePath = function(fiber, id, path) {
      id = findHook(fiber, id);
      id !== null && (path = copyWithDeleteImpl(id.memoizedState, path, 0), id.memoizedState = path, id.baseState = path, fiber.memoizedProps = assign({}, fiber.memoizedProps), path = enqueueConcurrentRenderForLane(fiber, 2), path !== null && scheduleUpdateOnFiber(path, fiber, 2));
    };
    overrideHookStateRenamePath = function(fiber, id, oldPath, newPath) {
      id = findHook(fiber, id);
      id !== null && (oldPath = copyWithRename(id.memoizedState, oldPath, newPath), id.memoizedState = oldPath, id.baseState = oldPath, fiber.memoizedProps = assign({}, fiber.memoizedProps), oldPath = enqueueConcurrentRenderForLane(fiber, 2), oldPath !== null && scheduleUpdateOnFiber(oldPath, fiber, 2));
    };
    overrideProps = function(fiber, path, value) {
      fiber.pendingProps = copyWithSetImpl(fiber.memoizedProps, path, 0, value);
      fiber.alternate && (fiber.alternate.pendingProps = fiber.pendingProps);
      path = enqueueConcurrentRenderForLane(fiber, 2);
      path !== null && scheduleUpdateOnFiber(path, fiber, 2);
    };
    overridePropsDeletePath = function(fiber, path) {
      fiber.pendingProps = copyWithDeleteImpl(fiber.memoizedProps, path, 0);
      fiber.alternate && (fiber.alternate.pendingProps = fiber.pendingProps);
      path = enqueueConcurrentRenderForLane(fiber, 2);
      path !== null && scheduleUpdateOnFiber(path, fiber, 2);
    };
    overridePropsRenamePath = function(fiber, oldPath, newPath) {
      fiber.pendingProps = copyWithRename(fiber.memoizedProps, oldPath, newPath);
      fiber.alternate && (fiber.alternate.pendingProps = fiber.pendingProps);
      oldPath = enqueueConcurrentRenderForLane(fiber, 2);
      oldPath !== null && scheduleUpdateOnFiber(oldPath, fiber, 2);
    };
    scheduleUpdate = function(fiber) {
      var root = enqueueConcurrentRenderForLane(fiber, 2);
      root !== null && scheduleUpdateOnFiber(root, fiber, 2);
    };
    setErrorHandler = function(newShouldErrorImpl) {
      shouldErrorImpl = newShouldErrorImpl;
    };
    setSuspenseHandler = function(newShouldSuspendImpl) {
      shouldSuspendImpl = newShouldSuspendImpl;
    };
    exports2.attemptContinuousHydration = function(fiber) {
      if (fiber.tag === 13) {
        var root = enqueueConcurrentRenderForLane(fiber, 67108864);
        root !== null && scheduleUpdateOnFiber(root, fiber, 67108864);
        markRetryLaneIfNotHydrated(fiber, 67108864);
      }
    };
    exports2.attemptHydrationAtCurrentPriority = function(fiber) {
      if (fiber.tag === 13) {
        var lane = requestUpdateLane(fiber);
        lane = getBumpedLaneForHydrationByLane(lane);
        var root = enqueueConcurrentRenderForLane(fiber, lane);
        root !== null && scheduleUpdateOnFiber(root, fiber, lane);
        markRetryLaneIfNotHydrated(fiber, lane);
      }
    };
    exports2.attemptSynchronousHydration = function(fiber) {
      switch (fiber.tag) {
        case 3:
          fiber = fiber.stateNode;
          if (fiber.current.memoizedState.isDehydrated) {
            var lanes = getHighestPriorityLanes(fiber.pendingLanes);
            if (lanes !== 0) {
              fiber.pendingLanes |= 2;
              for (fiber.entangledLanes |= 2;lanes; ) {
                var lane = 1 << 31 - clz32(lanes);
                fiber.entanglements[1] |= lane;
                lanes &= ~lane;
              }
              ensureRootIsScheduled(fiber);
              (executionContext & (RenderContext | CommitContext)) === NoContext && (workInProgressRootRenderTargetTime = now$1() + RENDER_TIMEOUT_MS, flushSyncWorkAcrossRoots_impl(0, false));
            }
          }
          break;
        case 13:
          lanes = enqueueConcurrentRenderForLane(fiber, 2), lanes !== null && scheduleUpdateOnFiber(lanes, fiber, 2), flushSyncWork(), markRetryLaneIfNotHydrated(fiber, 2);
      }
    };
    exports2.batchedUpdates = function(fn, a) {
      return fn(a);
    };
    exports2.createComponentSelector = function(component) {
      return { $$typeof: COMPONENT_TYPE, value: component };
    };
    exports2.createContainer = function(containerInfo, tag, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, transitionCallbacks) {
      return createFiberRoot(containerInfo, tag, false, null, hydrationCallbacks, isStrictMode, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, transitionCallbacks, null);
    };
    exports2.createHasPseudoClassSelector = function(selectors) {
      return { $$typeof: HAS_PSEUDO_CLASS_TYPE, value: selectors };
    };
    exports2.createHydrationContainer = function(initialChildren, callback, containerInfo, tag, hydrationCallbacks, isStrictMode, concurrentUpdatesByDefaultOverride, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, transitionCallbacks, formState) {
      initialChildren = createFiberRoot(containerInfo, tag, true, initialChildren, hydrationCallbacks, isStrictMode, identifierPrefix, onUncaughtError, onCaughtError, onRecoverableError, transitionCallbacks, formState);
      initialChildren.context = getContextForSubtree(null);
      containerInfo = initialChildren.current;
      tag = requestUpdateLane(containerInfo);
      tag = getBumpedLaneForHydrationByLane(tag);
      hydrationCallbacks = createUpdate(tag);
      hydrationCallbacks.callback = callback !== undefined && callback !== null ? callback : null;
      enqueueUpdate(containerInfo, hydrationCallbacks, tag);
      callback = tag;
      initialChildren.current.lanes = callback;
      markRootUpdated$1(initialChildren, callback);
      ensureRootIsScheduled(initialChildren);
      return initialChildren;
    };
    exports2.createPortal = function(children, containerInfo, implementation) {
      var key = 3 < arguments.length && arguments[3] !== undefined ? arguments[3] : null;
      try {
        testStringCoercion(key);
        var JSCompiler_inline_result = false;
      } catch (e$6) {
        JSCompiler_inline_result = true;
      }
      JSCompiler_inline_result && (console.error("The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", typeof Symbol === "function" && Symbol.toStringTag && key[Symbol.toStringTag] || key.constructor.name || "Object"), testStringCoercion(key));
      return {
        $$typeof: REACT_PORTAL_TYPE,
        key: key == null ? null : "" + key,
        children,
        containerInfo,
        implementation
      };
    };
    exports2.createRoleSelector = function(role) {
      return { $$typeof: ROLE_TYPE, value: role };
    };
    exports2.createTestNameSelector = function(id) {
      return { $$typeof: TEST_NAME_TYPE, value: id };
    };
    exports2.createTextSelector = function(text) {
      return { $$typeof: TEXT_TYPE, value: text };
    };
    exports2.defaultOnCaughtError = function(error) {
      var componentNameMessage = componentName ? "The above error occurred in the <" + componentName + "> component." : "The above error occurred in one of your React components.", recreateMessage = "React will try to recreate this component tree from scratch using the error boundary you provided, " + ((errorBoundaryName || "Anonymous") + ".");
      typeof error === "object" && error !== null && typeof error.environmentName === "string" ? bindToConsole("error", [`%o

%s

%s
`, error, componentNameMessage, recreateMessage], error.environmentName)() : console.error(`%o

%s

%s
`, error, componentNameMessage, recreateMessage);
    };
    exports2.defaultOnRecoverableError = function(error) {
      reportGlobalError(error);
    };
    exports2.defaultOnUncaughtError = function(error) {
      reportGlobalError(error);
      console.warn(`%s

%s
`, componentName ? "An error occurred in the <" + componentName + "> component." : "An error occurred in one of your React components.", `Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://react.dev/link/error-boundaries to learn more about error boundaries.`);
    };
    exports2.deferredUpdates = function(fn) {
      var prevTransition = ReactSharedInternals.T, previousPriority = getCurrentUpdatePriority();
      try {
        return setCurrentUpdatePriority(32), ReactSharedInternals.T = null, fn();
      } finally {
        setCurrentUpdatePriority(previousPriority), ReactSharedInternals.T = prevTransition;
      }
    };
    exports2.discreteUpdates = function(fn, a, b, c, d) {
      var prevTransition = ReactSharedInternals.T, previousPriority = getCurrentUpdatePriority();
      try {
        return setCurrentUpdatePriority(2), ReactSharedInternals.T = null, fn(a, b, c, d);
      } finally {
        setCurrentUpdatePriority(previousPriority), ReactSharedInternals.T = prevTransition, executionContext === NoContext && (workInProgressRootRenderTargetTime = now$1() + RENDER_TIMEOUT_MS);
      }
    };
    exports2.findAllNodes = findAllNodes;
    exports2.findBoundingRects = function(hostRoot, selectors) {
      if (!supportsTestSelectors)
        throw Error("Test selector API is not supported by this renderer.");
      selectors = findAllNodes(hostRoot, selectors);
      hostRoot = [];
      for (var i = 0;i < selectors.length; i++)
        hostRoot.push(getBoundingRect(selectors[i]));
      for (selectors = hostRoot.length - 1;0 < selectors; selectors--) {
        i = hostRoot[selectors];
        for (var targetLeft = i.x, targetRight = targetLeft + i.width, targetTop = i.y, targetBottom = targetTop + i.height, j = selectors - 1;0 <= j; j--)
          if (selectors !== j) {
            var otherRect = hostRoot[j], otherLeft = otherRect.x, otherRight = otherLeft + otherRect.width, otherTop = otherRect.y, otherBottom = otherTop + otherRect.height;
            if (targetLeft >= otherLeft && targetTop >= otherTop && targetRight <= otherRight && targetBottom <= otherBottom) {
              hostRoot.splice(selectors, 1);
              break;
            } else if (!(targetLeft !== otherLeft || i.width !== otherRect.width || otherBottom < targetTop || otherTop > targetBottom)) {
              otherTop > targetTop && (otherRect.height += otherTop - targetTop, otherRect.y = targetTop);
              otherBottom < targetBottom && (otherRect.height = targetBottom - otherTop);
              hostRoot.splice(selectors, 1);
              break;
            } else if (!(targetTop !== otherTop || i.height !== otherRect.height || otherRight < targetLeft || otherLeft > targetRight)) {
              otherLeft > targetLeft && (otherRect.width += otherLeft - targetLeft, otherRect.x = targetLeft);
              otherRight < targetRight && (otherRect.width = targetRight - otherLeft);
              hostRoot.splice(selectors, 1);
              break;
            }
          }
      }
      return hostRoot;
    };
    exports2.findHostInstance = function(component) {
      var fiber = component._reactInternals;
      if (fiber === undefined) {
        if (typeof component.render === "function")
          throw Error("Unable to find node on an unmounted component.");
        component = Object.keys(component).join(",");
        throw Error("Argument appears to not be a ReactComponent. Keys: " + component);
      }
      component = findCurrentHostFiber(fiber);
      return component === null ? null : getPublicInstance(component.stateNode);
    };
    exports2.findHostInstanceWithNoPortals = function(fiber) {
      fiber = findCurrentFiberUsingSlowPath(fiber);
      fiber = fiber !== null ? findCurrentHostFiberWithNoPortalsImpl(fiber) : null;
      return fiber === null ? null : getPublicInstance(fiber.stateNode);
    };
    exports2.findHostInstanceWithWarning = function(component, methodName) {
      var fiber = component._reactInternals;
      if (fiber === undefined) {
        if (typeof component.render === "function")
          throw Error("Unable to find node on an unmounted component.");
        component = Object.keys(component).join(",");
        throw Error("Argument appears to not be a ReactComponent. Keys: " + component);
      }
      component = findCurrentHostFiber(fiber);
      if (component === null)
        return null;
      if (component.mode & 8) {
        var componentName2 = getComponentNameFromFiber(fiber) || "Component";
        didWarnAboutFindNodeInStrictMode[componentName2] || (didWarnAboutFindNodeInStrictMode[componentName2] = true, runWithFiberInDEV(component, function() {
          fiber.mode & 8 ? console.error("%s is deprecated in StrictMode. %s was passed an instance of %s which is inside StrictMode. Instead, add a ref directly to the element you want to reference. Learn more about using refs safely here: https://react.dev/link/strict-mode-find-node", methodName, methodName, componentName2) : console.error("%s is deprecated in StrictMode. %s was passed an instance of %s which renders StrictMode children. Instead, add a ref directly to the element you want to reference. Learn more about using refs safely here: https://react.dev/link/strict-mode-find-node", methodName, methodName, componentName2);
        }));
      }
      return getPublicInstance(component.stateNode);
    };
    exports2.flushPassiveEffects = flushPendingEffects;
    exports2.flushSyncFromReconciler = function(fn) {
      var prevExecutionContext = executionContext;
      executionContext |= 1;
      var prevTransition = ReactSharedInternals.T, previousPriority = getCurrentUpdatePriority();
      try {
        if (setCurrentUpdatePriority(2), ReactSharedInternals.T = null, fn)
          return fn();
      } finally {
        setCurrentUpdatePriority(previousPriority), ReactSharedInternals.T = prevTransition, executionContext = prevExecutionContext, (executionContext & (RenderContext | CommitContext)) === NoContext && flushSyncWorkAcrossRoots_impl(0, false);
      }
    };
    exports2.flushSyncWork = flushSyncWork;
    exports2.focusWithin = function(hostRoot, selectors) {
      if (!supportsTestSelectors)
        throw Error("Test selector API is not supported by this renderer.");
      hostRoot = findFiberRootForHostRoot(hostRoot);
      selectors = findPaths(hostRoot, selectors);
      selectors = Array.from(selectors);
      for (hostRoot = 0;hostRoot < selectors.length; ) {
        var fiber = selectors[hostRoot++], tag = fiber.tag;
        if (!isHiddenSubtree(fiber)) {
          if ((tag === 5 || tag === 26 || tag === 27) && setFocusIfFocusable(fiber.stateNode))
            return true;
          for (fiber = fiber.child;fiber !== null; )
            selectors.push(fiber), fiber = fiber.sibling;
        }
      }
      return false;
    };
    exports2.getFindAllNodesFailureDescription = function(hostRoot, selectors) {
      if (!supportsTestSelectors)
        throw Error("Test selector API is not supported by this renderer.");
      var maxSelectorIndex = 0, matchedNames = [];
      hostRoot = [findFiberRootForHostRoot(hostRoot), 0];
      for (var index = 0;index < hostRoot.length; ) {
        var fiber = hostRoot[index++], tag = fiber.tag, selectorIndex = hostRoot[index++], selector = selectors[selectorIndex];
        if (tag !== 5 && tag !== 26 && tag !== 27 || !isHiddenSubtree(fiber)) {
          if (matchSelector(fiber, selector) && (matchedNames.push(selectorToString(selector)), selectorIndex++, selectorIndex > maxSelectorIndex && (maxSelectorIndex = selectorIndex)), selectorIndex < selectors.length)
            for (fiber = fiber.child;fiber !== null; )
              hostRoot.push(fiber, selectorIndex), fiber = fiber.sibling;
        }
      }
      if (maxSelectorIndex < selectors.length) {
        for (hostRoot = [];maxSelectorIndex < selectors.length; maxSelectorIndex++)
          hostRoot.push(selectorToString(selectors[maxSelectorIndex]));
        return `findAllNodes was able to match part of the selector:
  ` + (matchedNames.join(" > ") + `

No matching component was found for:
  `) + hostRoot.join(" > ");
      }
      return null;
    };
    exports2.getPublicRootInstance = function(container) {
      container = container.current;
      if (!container.child)
        return null;
      switch (container.child.tag) {
        case 27:
        case 5:
          return getPublicInstance(container.child.stateNode);
        default:
          return container.child.stateNode;
      }
    };
    exports2.injectIntoDevTools = function() {
      var internals = {
        bundleType: 1,
        version: rendererVersion,
        rendererPackageName,
        currentDispatcherRef: ReactSharedInternals,
        reconcilerVersion: "19.1.0"
      };
      extraDevToolsConfig !== null && (internals.rendererConfig = extraDevToolsConfig);
      internals.overrideHookState = overrideHookState;
      internals.overrideHookStateDeletePath = overrideHookStateDeletePath;
      internals.overrideHookStateRenamePath = overrideHookStateRenamePath;
      internals.overrideProps = overrideProps;
      internals.overridePropsDeletePath = overridePropsDeletePath;
      internals.overridePropsRenamePath = overridePropsRenamePath;
      internals.scheduleUpdate = scheduleUpdate;
      internals.setErrorHandler = setErrorHandler;
      internals.setSuspenseHandler = setSuspenseHandler;
      internals.scheduleRefresh = scheduleRefresh;
      internals.scheduleRoot = scheduleRoot;
      internals.setRefreshHandler = setRefreshHandler;
      internals.getCurrentFiber = getCurrentFiberForDevTools;
      internals.getLaneLabelMap = getLaneLabelMap;
      internals.injectProfilingHooks = injectProfilingHooks;
      return injectInternals(internals);
    };
    exports2.isAlreadyRendering = function() {
      return (executionContext & (RenderContext | CommitContext)) !== NoContext;
    };
    exports2.observeVisibleRects = function(hostRoot, selectors, callback, options) {
      function commitHook() {
        var nextInstanceRoots = findAllNodes(hostRoot, selectors);
        instanceRoots.forEach(function(target) {
          0 > nextInstanceRoots.indexOf(target) && unobserve(target);
        });
        nextInstanceRoots.forEach(function(target) {
          0 > instanceRoots.indexOf(target) && observe(target);
        });
      }
      if (!supportsTestSelectors)
        throw Error("Test selector API is not supported by this renderer.");
      var instanceRoots = findAllNodes(hostRoot, selectors);
      callback = setupIntersectionObserver(instanceRoots, callback, options);
      var { disconnect, observe, unobserve } = callback;
      commitHooks.push(commitHook);
      return {
        disconnect: function() {
          var index = commitHooks.indexOf(commitHook);
          0 <= index && commitHooks.splice(index, 1);
          disconnect();
        }
      };
    };
    exports2.shouldError = function(fiber) {
      return shouldErrorImpl(fiber);
    };
    exports2.shouldSuspend = function(fiber) {
      return shouldSuspendImpl(fiber);
    };
    exports2.startHostTransition = function(formFiber, pendingState, action, formData) {
      if (formFiber.tag !== 5)
        throw Error("Expected the form instance to be a HostComponent. This is a bug in React.");
      var queue = ensureFormComponentIsStateful(formFiber).queue;
      startTransition(formFiber, queue, pendingState, NotPendingTransition, action === null ? noop : function() {
        ReactSharedInternals.T === null && console.error("requestFormReset was called outside a transition or action. To fix, move to an action, or wrap with startTransition.");
        var resetStateQueue = ensureFormComponentIsStateful(formFiber).next.queue;
        dispatchSetStateInternal(formFiber, resetStateQueue, {}, requestUpdateLane(formFiber));
        return action(formData);
      });
    };
    exports2.updateContainer = function(element, container, parentComponent, callback) {
      var current2 = container.current, lane = requestUpdateLane(current2);
      updateContainerImpl(current2, lane, element, container, parentComponent, callback);
      return lane;
    };
    exports2.updateContainerSync = updateContainerSync;
    return exports2;
  }, module.exports.default = module.exports, Object.defineProperty(module.exports, "__esModule", { value: true });
});

// ../../node_modules/react-reconciler/index.js
var require_react_reconciler = __commonJS(function(exports, module) {
  if (false) {} else {
    module.exports = require_react_reconciler_development();
  }
});

// ../../node_modules/react/cjs/react-jsx-dev-runtime.development.js
var require_react_jsx_dev_runtime_development = __commonJS(function(exports) {
  var React2 = __toESM(require_react());
  (function() {
    function getComponentNameFromType(type) {
      if (type == null)
        return null;
      if (typeof type === "function")
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if (typeof type === "string")
        return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if (typeof type === "object")
        switch (typeof type.tag === "number" && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = type !== "" ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, innerType !== null ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {}
        }
      return null;
    }
    function testStringCoercion(value) {
      return "" + value;
    }
    function checkKeyStringCoercion(value) {
      try {
        testStringCoercion(value);
        var JSCompiler_inline_result = false;
      } catch (e) {
        JSCompiler_inline_result = true;
      }
      if (JSCompiler_inline_result) {
        JSCompiler_inline_result = console;
        var JSCompiler_temp_const = JSCompiler_inline_result.error;
        var JSCompiler_inline_result$jscomp$0 = typeof Symbol === "function" && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
        JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
        return testStringCoercion(value);
      }
    }
    function getTaskName(type) {
      if (type === REACT_FRAGMENT_TYPE)
        return "<>";
      if (typeof type === "object" && type !== null && type.$$typeof === REACT_LAZY_TYPE)
        return "<...>";
      try {
        var name = getComponentNameFromType(type);
        return name ? "<" + name + ">" : "<...>";
      } catch (x) {
        return "<...>";
      }
    }
    function getOwner() {
      var dispatcher = ReactSharedInternals.A;
      return dispatcher === null ? null : dispatcher.getOwner();
    }
    function UnknownOwner() {
      return Error("react-stack-top-frame");
    }
    function hasValidKey(config) {
      if (hasOwnProperty.call(config, "key")) {
        var getter = Object.getOwnPropertyDescriptor(config, "key").get;
        if (getter && getter.isReactWarning)
          return false;
      }
      return config.key !== undefined;
    }
    function defineKeyPropWarningGetter(props, displayName) {
      function warnAboutAccessingKey() {
        specialPropKeyWarningShown || (specialPropKeyWarningShown = true, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
      }
      warnAboutAccessingKey.isReactWarning = true;
      Object.defineProperty(props, "key", {
        get: warnAboutAccessingKey,
        configurable: true
      });
    }
    function elementRefGetterWithDeprecationWarning() {
      var componentName = getComponentNameFromType(this.type);
      didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = true, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
      componentName = this.props.ref;
      return componentName !== undefined ? componentName : null;
    }
    function ReactElement(type, key, props, owner, debugStack, debugTask) {
      var refProp = props.ref;
      type = {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        props,
        _owner: owner
      };
      (refProp !== undefined ? refProp : null) !== null ? Object.defineProperty(type, "ref", {
        enumerable: false,
        get: elementRefGetterWithDeprecationWarning
      }) : Object.defineProperty(type, "ref", { enumerable: false, value: null });
      type._store = {};
      Object.defineProperty(type._store, "validated", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: 0
      });
      Object.defineProperty(type, "_debugInfo", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: null
      });
      Object.defineProperty(type, "_debugStack", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugStack
      });
      Object.defineProperty(type, "_debugTask", {
        configurable: false,
        enumerable: false,
        writable: true,
        value: debugTask
      });
      Object.freeze && (Object.freeze(type.props), Object.freeze(type));
      return type;
    }
    function jsxDEVImpl(type, config, maybeKey, isStaticChildren, debugStack, debugTask) {
      var children = config.children;
      if (children !== undefined)
        if (isStaticChildren)
          if (isArrayImpl(children)) {
            for (isStaticChildren = 0;isStaticChildren < children.length; isStaticChildren++)
              validateChildKeys(children[isStaticChildren]);
            Object.freeze && Object.freeze(children);
          } else
            console.error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
        else
          validateChildKeys(children);
      if (hasOwnProperty.call(config, "key")) {
        children = getComponentNameFromType(type);
        var keys = Object.keys(config).filter(function(k) {
          return k !== "key";
        });
        isStaticChildren = 0 < keys.length ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
        didWarnAboutKeySpread[children + isStaticChildren] || (keys = 0 < keys.length ? "{" + keys.join(": ..., ") + ": ...}" : "{}", console.error(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, isStaticChildren, children, keys, children), didWarnAboutKeySpread[children + isStaticChildren] = true);
      }
      children = null;
      maybeKey !== undefined && (checkKeyStringCoercion(maybeKey), children = "" + maybeKey);
      hasValidKey(config) && (checkKeyStringCoercion(config.key), children = "" + config.key);
      if ("key" in config) {
        maybeKey = {};
        for (var propName in config)
          propName !== "key" && (maybeKey[propName] = config[propName]);
      } else
        maybeKey = config;
      children && defineKeyPropWarningGetter(maybeKey, typeof type === "function" ? type.displayName || type.name || "Unknown" : type);
      return ReactElement(type, children, maybeKey, getOwner(), debugStack, debugTask);
    }
    function validateChildKeys(node) {
      isValidElement(node) ? node._store && (node._store.validated = 1) : typeof node === "object" && node !== null && node.$$typeof === REACT_LAZY_TYPE && (node._payload.status === "fulfilled" ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
    }
    function isValidElement(object) {
      return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE, hasOwnProperty = Object.prototype.hasOwnProperty, isArrayImpl = Array.isArray, createTask = console.createTask ? console.createTask : function() {
      return null;
    };
    React2 = {
      react_stack_bottom_frame: function(callStackForError) {
        return callStackForError();
      }
    };
    var specialPropKeyWarningShown;
    var didWarnAboutElementRef = {};
    var unknownOwnerDebugStack = React2.react_stack_bottom_frame.bind(React2, UnknownOwner)();
    var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
    var didWarnAboutKeySpread = {};
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsxDEV = function(type, config, maybeKey, isStaticChildren) {
      var trackActualOwner = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++;
      return jsxDEVImpl(type, config, maybeKey, isStaticChildren, trackActualOwner ? Error("react-stack-top-frame") : unknownOwnerDebugStack, trackActualOwner ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
    };
  })();
});

// ../../node_modules/react/jsx-dev-runtime.js
var require_jsx_dev_runtime = __commonJS(function(exports, module) {
  var react_jsx_dev_runtime_development = __toESM(require_react_jsx_dev_runtime_development());
  if (false) {} else {
    module.exports = react_jsx_dev_runtime_development;
  }
});

// src/runtime/bridge.ts
class NativeBridgeManager {
  eventHandlers = new Map;
  textValidationHandlers = new Map;
  nextId = 100;
  generateId() {
    return this.nextId++;
  }
  get bridge() {
    const b = globalThis.__nativeBridge;
    if (!b) {
      return {
        createView: (type, id) => console.log(`[BridgeMock] createView ${type} #${id}`),
        setProp: (id, key, value) => console.log(`[BridgeMock] setProp #${id} ${key}=`, value),
        appendChild: (p, c) => console.log(`[BridgeMock] appendChild #${c} -> #${p}`),
        removeChild: (p, c) => console.log(`[BridgeMock] removeChild #${c} from #${p}`),
        insertBefore: (p, c, b2) => console.log(`[BridgeMock] insertBefore #${c} -> #${p} before #${b2}`),
        calculateLayout: (r, w, h) => console.log(`[BridgeMock] calculateLayout #${r} (${w}x${h})`)
      };
    }
    return b;
  }
  registerEventHandler(nodeId, eventName, handler) {
    this.eventHandlers.set(`${nodeId}:${eventName}`, handler);
  }
  unregisterEventHandler(nodeId, eventName) {
    this.eventHandlers.delete(`${nodeId}:${eventName}`);
  }
  registerTextValidation(nodeId, handler) {
    this.textValidationHandlers.set(nodeId, handler);
  }
  unregisterTextValidation(nodeId) {
    this.textValidationHandlers.delete(nodeId);
  }
  dispatchNativeEvent(nodeId, eventName, payload) {
    const handler = this.eventHandlers.get(`${nodeId}:${eventName}`);
    if (handler) {
      handler(payload);
    }
  }
  shouldChangeText(nodeId, location, length, replacement) {
    const validator = this.textValidationHandlers.get(nodeId);
    if (validator) {
      return validator(location, length, replacement);
    }
    return true;
  }
}
var Bridge = new NativeBridgeManager;
globalThis.__dispatchNativeEvent = (nodeId, eventName, payload) => {
  Bridge.dispatchNativeEvent(nodeId, eventName, payload);
};
globalThis.__shouldChangeText = (nodeId, location, length, replacement) => {
  return Bridge.shouldChangeText(nodeId, location, length, replacement);
};
// src/runtime/components.tsx
var import_react = __toESM(require_react(), 1);
var View = (props) => {
  return import_react.default.createElement("view", props, props.children);
};
var Text = (props) => {
  return import_react.default.createElement("text", props, props.children);
};
var Button = (props) => {
  return import_react.default.createElement("button", props);
};
var TextInput = (props) => {
  return import_react.default.createElement("textinput", props);
};
// src/runtime/hostConfig.ts
var import_react_reconciler = __toESM(require_react_reconciler(), 1);
function updateInstanceProps(instance, oldProps, newProps) {
  const id = instance.id;
  if (oldProps.onPress !== newProps.onPress) {
    if (newProps.onPress) {
      Bridge.registerEventHandler(id, "press", newProps.onPress);
    } else {
      Bridge.unregisterEventHandler(id, "press");
    }
  }
  if (oldProps.onChangeText !== newProps.onChangeText) {
    if (newProps.onChangeText) {
      Bridge.registerEventHandler(id, "changeText", newProps.onChangeText);
    } else {
      Bridge.unregisterEventHandler(id, "changeText");
    }
  }
  if (oldProps.filterRegex !== newProps.filterRegex) {
    if (newProps.filterRegex) {
      const regex = new RegExp(newProps.filterRegex);
      Bridge.registerTextValidation(id, (_loc, _len, replacement) => {
        if (replacement === "")
          return true;
        return regex.test(replacement);
      });
    } else {
      Bridge.unregisterTextValidation(id);
    }
  }
  for (const key of Object.keys(newProps)) {
    if (key === "children" || key === "onPress" || key === "onChangeText")
      continue;
    if (oldProps[key] !== newProps[key]) {
      Bridge.bridge.setProp(id, key, newProps[key]);
    }
  }
  instance.props = newProps;
}
var currentUpdatePriority = 0;
var hostConfig = {
  supportsMutation: true,
  supportsPersistence: false,
  isPrimaryRenderer: true,
  supportsHydration: false,
  createInstance(type, props) {
    const id = Bridge.generateId();
    Bridge.bridge.createView(type, id);
    const instance = {
      id,
      type,
      props: {},
      children: []
    };
    updateInstanceProps(instance, {}, props);
    return instance;
  },
  createTextInstance(text) {
    const id = Bridge.generateId();
    Bridge.bridge.createView("text", id);
    Bridge.bridge.setProp(id, "text", text);
    return {
      id,
      type: "text",
      props: { text },
      children: []
    };
  },
  appendInitialChild(parent, child) {
    parent.children.push(child);
    child.parent = parent;
    Bridge.bridge.appendChild(parent.id, child.id);
  },
  appendChild(parent, child) {
    parent.children.push(child);
    child.parent = parent;
    Bridge.bridge.appendChild(parent.id, child.id);
  },
  appendChildToContainer(container, child) {
    container.children.push(child);
    child.parent = container;
    Bridge.bridge.appendChild(container.id, child.id);
  },
  insertBefore(parent, child, beforeChild) {
    const idx = parent.children.indexOf(beforeChild);
    if (idx !== -1) {
      parent.children.splice(idx, 0, child);
    } else {
      parent.children.push(child);
    }
    child.parent = parent;
    Bridge.bridge.insertBefore(parent.id, child.id, beforeChild.id);
  },
  insertInContainerBefore(container, child, beforeChild) {
    const idx = container.children.indexOf(beforeChild);
    if (idx !== -1) {
      container.children.splice(idx, 0, child);
    } else {
      container.children.push(child);
    }
    child.parent = container;
    Bridge.bridge.insertBefore(container.id, child.id, beforeChild.id);
  },
  removeChild(parent, child) {
    const idx = parent.children.indexOf(child);
    if (idx !== -1) {
      parent.children.splice(idx, 1);
    }
    Bridge.unregisterEventHandler(child.id, "press");
    Bridge.unregisterEventHandler(child.id, "changeText");
    Bridge.unregisterTextValidation(child.id);
    Bridge.bridge.removeChild(parent.id, child.id);
  },
  removeChildFromContainer(container, child) {
    const idx = container.children.indexOf(child);
    if (idx !== -1) {
      container.children.splice(idx, 1);
    }
    Bridge.unregisterEventHandler(child.id, "press");
    Bridge.unregisterEventHandler(child.id, "changeText");
    Bridge.unregisterTextValidation(child.id);
    Bridge.bridge.removeChild(container.id, child.id);
  },
  clearContainer(container) {
    container.children = [];
  },
  finalizeInitialChildren() {
    return false;
  },
  prepareUpdate() {
    return true;
  },
  commitUpdate(instance, _updatePayload, _type, oldProps, newProps) {
    updateInstanceProps(instance, oldProps, newProps);
  },
  commitTextUpdate(textInstance, _oldText, newText) {
    textInstance.props.text = newText;
    Bridge.bridge.setProp(textInstance.id, "text", newText);
  },
  getRootHostContext() {
    return {};
  },
  getChildHostContext() {
    return {};
  },
  getPublicInstance(instance) {
    return instance;
  },
  prepareForCommit() {
    return null;
  },
  resetAfterCommit(containerInfo) {
    Bridge.bridge.calculateLayout(containerInfo.id, -1, -1);
  },
  shouldSetTextContent() {
    return false;
  },
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  noTimeout: -1,
  setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority;
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority;
  },
  resolveUpdatePriority() {
    if (currentUpdatePriority !== 0) {
      return currentUpdatePriority;
    }
    return 32;
  },
  shouldAttemptEagerTransition() {
    return false;
  },
  trackSchedulerEvent() {},
  resolveEventType() {
    return null;
  },
  resolveEventTimeStamp() {
    return -1.1;
  },
  maySuspendCommit() {
    return false;
  },
  preloadInstance() {
    return true;
  },
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady() {
    return null;
  },
  NotPendingTransition: null,
  resetFormInstance() {},
  supportsMicrotasks: true,
  scheduleMicrotask: queueMicrotask,
  getInstanceFromNode() {
    return null;
  },
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope() {
    return null;
  },
  detachDeletedInstance() {}
};
var reconciler = import_react_reconciler.default(hostConfig);

// src/runtime/render.ts
var roots = new Map;
function render(element, containerId = 1) {
  let root = roots.get(containerId);
  if (!root) {
    const container = {
      id: containerId,
      type: "root",
      props: {},
      children: []
    };
    root = reconciler.createContainer(container, 1, null, false, null, "", (error) => console.error("[OneNative:UncaughtError]", error), (error) => console.error("[OneNative:CaughtError]", error), (error) => console.error("[OneNative:RecoverableError]", error), null);
    roots.set(containerId, root);
  }
  reconciler.updateContainer(element, root, null);
}
// src/demo/App.tsx
var import_react2 = __toESM(require_react(), 1);
var jsx_dev_runtime = __toESM(require_jsx_dev_runtime(), 1);
function App() {
  const [count, setCount] = import_react2.useState(0);
  const [text, setText] = import_react2.useState("Hello from React on Main Thread!");
  const [pin, setPin] = import_react2.useState("");
  return /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
    style: {
      flex: 1,
      backgroundColor: "#090d16",
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 40,
      flexDirection: "column",
      justifyContent: "flex-start"
    },
    children: [
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
        style: { marginBottom: 20 },
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
            style: {
              fontSize: 26,
              fontWeight: "bold",
              color: "#38bdf8",
              marginBottom: 4
            },
            children: "One Native Prototype"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
            style: {
              fontSize: 14,
              color: "#94a3b8"
            },
            children: "React 19 running directly on iOS CFRunLoopMain"
          }, undefined, false, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
        style: {
          backgroundColor: "#131c2e",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#1e293b"
        },
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
            style: {
              fontSize: 12,
              fontWeight: "700",
              color: "#38bdf8",
              marginBottom: 8
            },
            children: "1. INTERACTIVE BUTTON & SYNC STATE"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
            style: {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12
            },
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 16, color: "#f1f5f9" },
                children: "Current Count:"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
                style: {
                  backgroundColor: "#1e293b",
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 4
                },
                children: /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                  style: {
                    fontSize: 20,
                    fontWeight: "bold",
                    color: "#22c55e"
                  },
                  children: String(count)
                }, undefined, false, undefined, this)
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
            style: { flexDirection: "row", gap: 10 },
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Button, {
                title: "Increment (+1)",
                onPress: () => setCount((c) => c + 1),
                style: {
                  flex: 1,
                  height: 44,
                  backgroundColor: "#2563eb",
                  borderRadius: 10,
                  justifyContent: "center",
                  alignItems: "center"
                },
                titleStyle: { color: "#ffffff", fontWeight: "bold", fontSize: 15 }
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Button, {
                title: "Reset",
                onPress: () => setCount(0),
                style: {
                  width: 80,
                  height: 44,
                  backgroundColor: "#334155",
                  borderRadius: 10,
                  justifyContent: "center",
                  alignItems: "center"
                },
                titleStyle: { color: "#cbd5e1", fontWeight: "600", fontSize: 14 }
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
        style: {
          backgroundColor: "#131c2e",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#1e293b"
        },
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
            style: {
              fontSize: 12,
              fontWeight: "700",
              color: "#a855f7",
              marginBottom: 8
            },
            children: "2. CONTROLLED TEXTINPUT (ZERO CURSOR LAG)"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(TextInput, {
            value: text,
            onChangeText: setText,
            placeholder: "Type message here...",
            placeholderTextColor: "#64748b",
            style: {
              height: 46,
              backgroundColor: "#0f172a",
              borderRadius: 10,
              paddingHorizontal: 12,
              color: "#ffffff",
              fontSize: 15,
              borderWidth: 1,
              borderColor: "#334155",
              marginBottom: 10
            }
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
            style: {
              backgroundColor: "#0b1120",
              borderRadius: 8,
              padding: 10
            },
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 12, color: "#64748b" },
                children: "Live State Value:"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: {
                  fontSize: 14,
                  color: "#38bdf8",
                  marginTop: 2
                },
                children: text || "(empty)"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
        style: {
          backgroundColor: "#131c2e",
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#1e293b"
        },
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
            style: {
              fontSize: 12,
              fontWeight: "700",
              color: "#f59e0b",
              marginBottom: 4
            },
            children: "3. SYNC UIKIT DELEGATE VALIDATION"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
            style: {
              fontSize: 12,
              color: "#94a3b8",
              marginBottom: 10
            },
            children: "Only digits allowed. UITextFieldDelegate asks JS synchronously before inserting:"
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(TextInput, {
            value: pin,
            onChangeText: setPin,
            placeholder: "Enter numeric PIN (rejects letters)",
            placeholderTextColor: "#64748b",
            filterRegex: "^[0-9]*$",
            keyboardType: "number-pad",
            style: {
              height: 46,
              backgroundColor: "#0f172a",
              borderRadius: 10,
              paddingHorizontal: 12,
              color: "#f59e0b",
              fontSize: 16,
              fontWeight: "bold",
              borderWidth: 1,
              borderColor: "#334155",
              marginBottom: 8
            }
          }, undefined, false, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
            style: { flexDirection: "row", justifyContent: "space-between" },
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 12, color: "#64748b" },
                children: [
                  "PIN State: ",
                  pin || "(none)"
                ]
              }, undefined, true, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 12, color: "#10b981" },
                children: "Synchronous: YES"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this),
      /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
        style: {
          backgroundColor: "#0f172a",
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: "#1e293b",
          flexDirection: "row",
          justifyContent: "space-around"
        },
        children: [
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
            style: { alignItems: "center" },
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 11, color: "#64748b" },
                children: "THREAD"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 13, fontWeight: "bold", color: "#38bdf8" },
                children: "Main Loop"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
            style: { alignItems: "center" },
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 11, color: "#64748b" },
                children: "REFRESH"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 13, fontWeight: "bold", color: "#a855f7" },
                children: "DisplayLink"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this),
          /* @__PURE__ */ jsx_dev_runtime.jsxDEV(View, {
            style: { alignItems: "center" },
            children: [
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 11, color: "#64748b" },
                children: "BRIDGE"
              }, undefined, false, undefined, this),
              /* @__PURE__ */ jsx_dev_runtime.jsxDEV(Text, {
                style: { fontSize: 13, fontWeight: "bold", color: "#22c55e" },
                children: "Direct JSI"
              }, undefined, false, undefined, this)
            ]
          }, undefined, true, undefined, this)
        ]
      }, undefined, true, undefined, this)
    ]
  }, undefined, true, undefined, this);
}

// src/demo/index.tsx
var jsx_dev_runtime2 = __toESM(require_jsx_dev_runtime(), 1);
console.log("[OneNative] Booting application on Main Thread...");
render(/* @__PURE__ */ jsx_dev_runtime2.jsxDEV(App, {}, undefined, false, undefined, this), 1);
console.log("[OneNative] Initial render complete.");
