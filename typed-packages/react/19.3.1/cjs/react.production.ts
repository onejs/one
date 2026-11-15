/**
 * @license React
 * react.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";
var REACT_ELEMENT_TYPE: symbol = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE: symbol = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE: symbol = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE: symbol = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE: symbol = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE: symbol = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE: symbol = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE: symbol = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE: symbol = Symbol.for("react.suspense"),
  REACT_MEMO_TYPE: symbol = Symbol.for("react.memo"),
  REACT_LAZY_TYPE: symbol = Symbol.for("react.lazy"),
  REACT_ACTIVITY_TYPE: symbol = Symbol.for("react.activity"),
  REACT_VIEW_TRANSITION_TYPE: symbol = Symbol.for("react.view_transition"),
  MAYBE_ITERATOR_SYMBOL: typeof Symbol.iterator = Symbol.iterator;
function getIteratorFn(maybeIterable: any): (() => Iterator<any>) | null {
  if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var ReactNoopUpdateQueue: ReactTypes.Updater = {
    isMounted: function (): boolean {
      return !1;
    },
    enqueueForceUpdate: function (): void {},
    enqueueReplaceState: function (): void {},
    enqueueSetState: function (): void {}
  },
  assign: typeof Object.assign = Object.assign,
  emptyObject: ReactTypes.Props = {};
function Component(this: ReactTypes.ComponentInstance, props: ReactTypes.Props, context: unknown, updater?: ReactTypes.Updater): void {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}
Component.prototype.isReactComponent = {};
Component.prototype.setState = function (this: ReactTypes.ComponentInstance, partialState: unknown, callback?: () => void): void {
  if (
    "object" !== typeof partialState &&
    "function" !== typeof partialState &&
    null != partialState
  )
    throw Error(
      "takes an object of state variables to update or a function which returns an object of state variables."
    );
  this.updater.enqueueSetState(this, partialState, callback, "setState");
};
Component.prototype.forceUpdate = function (this: ReactTypes.ComponentInstance, callback?: () => void): void {
  this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
};
function ComponentDummy(): void {}
ComponentDummy.prototype = Component.prototype;
function PureComponent(this: ReactTypes.ComponentInstance, props: ReactTypes.Props, context: unknown, updater?: ReactTypes.Updater): void {
  this.props = props;
  this.context = context;
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}
var pureComponentPrototype: any = (PureComponent.prototype = new (ComponentDummy as any)());
pureComponentPrototype.constructor = PureComponent;
assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = !0;
var isArrayImpl: (value: unknown) => value is unknown[] = Array.isArray;
function noop(): void {}
var ReactSharedInternals: ReactTypes.SharedInternals = { H: null, A: null, T: null, S: null },
  hasOwnProperty: typeof Object.prototype.hasOwnProperty = Object.prototype.hasOwnProperty;
function ReactElement(type: ReactTypes.ElementType, key: string | null, props: ReactTypes.Props): ReactTypes.Element {
  var refProp: unknown = props.ref;
  return {
    $$typeof: REACT_ELEMENT_TYPE,
    type: type,
    key: key,
    ref: void 0 !== refProp ? refProp : null,
    props: props
  };
}
function cloneAndReplaceKey(oldElement: ReactTypes.Element, newKey: string | null): ReactTypes.Element {
  return ReactElement(oldElement.type, newKey, oldElement.props);
}
function isValidElement(object: any): object is ReactTypes.Element {
  return (
    "object" === typeof object &&
    null !== object &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}
function escape(key: string): string {
  var escaperLookup: Record<string, string> = { "=": "=0", ":": "=2" };
  return (
    "$" +
    key.replace(/[=:]/g, function (match: string): string {
      return escaperLookup[match];
    })
  );
}
var userProvidedKeyEscapeRegex: RegExp = /\/+/g;
function getElementKey(element: any, index: number): string {
  return "object" === typeof element && null !== element && null != element.key
    ? escape("" + element.key)
    : index.toString(36);
}
function resolveThenable(thenable: ReactTypes.Thenable): any {
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      throw thenable.reason;
    default:
      switch (
        ("string" === typeof thenable.status
          ? thenable.then(noop, noop)
          : ((thenable.status = "pending"),
            thenable.then(
              function (fulfilledValue: unknown): void {
                "pending" === thenable.status &&
                  ((thenable.status = "fulfilled"),
                  (thenable.value = fulfilledValue));
              },
              function (error: unknown): void {
                "pending" === thenable.status &&
                  ((thenable.status = "rejected"), (thenable.reason = error));
              }
            )),
        thenable.status)
      ) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
      }
  }
  throw thenable;
}
function mapIntoArray(children: any, array: any, escapedPrefix: any, nameSoFar: any, callback: any): number {
  var type: string = typeof children;
  if ("undefined" === type || "boolean" === type) children = null;
  var invokeCallback: any = !1;
  if (null === children) invokeCallback = !0;
  else
    switch (type) {
      case "bigint":
      case "string":
      case "number":
        invokeCallback = !0;
        break;
      case "object":
        switch (children.$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = !0;
            break;
          case REACT_LAZY_TYPE:
            return (
              (invokeCallback = children._init),
              mapIntoArray(
                invokeCallback(children._payload),
                array,
                escapedPrefix,
                nameSoFar,
                callback
              )
            );
        }
    }
  if (invokeCallback)
    return (
      (callback = callback(children)),
      (invokeCallback =
        "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar),
      isArrayImpl(callback)
        ? ((escapedPrefix = ""),
          null != invokeCallback &&
            (escapedPrefix =
              invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"),
          mapIntoArray(callback, array, escapedPrefix, "", function (c: any): any {
            return c;
          }))
        : null != callback &&
          (isValidElement(callback) &&
            (callback = cloneAndReplaceKey(
              callback,
              escapedPrefix +
                (null == callback.key ||
                (children && children.key === callback.key)
                  ? ""
                  : ("" + callback.key).replace(
                      userProvidedKeyEscapeRegex,
                      "$&/"
                    ) + "/") +
                invokeCallback
            )),
          array.push(callback)),
      1
    );
  invokeCallback = 0;
  var nextNamePrefix: string = "" === nameSoFar ? "." : nameSoFar + ":";
  if (isArrayImpl(children))
    for (var i: any = 0; i < children.length; i++)
      (nameSoFar = children[i]),
        (type = nextNamePrefix + getElementKey(nameSoFar, i)),
        (invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        ));
  else if (((i = getIteratorFn(children)), "function" === typeof i))
    for (
      children = i.call(children), i = 0;
      !(nameSoFar = children.next()).done;

    )
      (nameSoFar = nameSoFar.value),
        (type = nextNamePrefix + getElementKey(nameSoFar, i++)),
        (invokeCallback += mapIntoArray(
          nameSoFar,
          array,
          escapedPrefix,
          type,
          callback
        ));
  else if ("object" === type) {
    if ("function" === typeof children.then)
      return mapIntoArray(
        resolveThenable(children),
        array,
        escapedPrefix,
        nameSoFar,
        callback
      );
    array = String(children);
    throw Error(
      "Objects are not valid as a React child (found: " +
        ("[object Object]" === array
          ? "object with keys {" + Object.keys(children).join(", ") + "}"
          : array) +
        "). If you meant to render a collection of children, use an array instead."
    );
  }
  return invokeCallback;
}
function mapChildren(children: any, func: (this: unknown, child: any, index: number) => any, context?: unknown): any {
  if (null == children) return children;
  var result: unknown[] = [],
    count: number = 0;
  mapIntoArray(children, result, "", "", function (child: any): any {
    return func.call(context, child, count++);
  });
  return result;
}
function lazyInitializer(payload: ReactTypes.LazyPayload): any {
  if (-1 === payload._status) {
    var ctor: () => ReactTypes.Thenable = payload._result,
      thenable: ReactTypes.Thenable = ctor();
    thenable.then(
      function (moduleObject: any): void {
        if (0 === payload._status || -1 === payload._status)
          (payload._status = 1),
            (payload._result = moduleObject),
            void 0 === thenable.status &&
              ((thenable.status = "fulfilled"),
              (thenable.value = moduleObject));
      },
      function (error: unknown): void {
        if (0 === payload._status || -1 === payload._status)
          (payload._status = 2),
            (payload._result = error),
            void 0 === thenable.status &&
              ((thenable.status = "rejected"), (thenable.reason = error));
      }
    );
    -1 === payload._status &&
      ((payload._status = 0), (payload._result = thenable));
  }
  if (1 === payload._status) return payload._result.default;
  throw payload._result;
}
var reportGlobalError: (error: any) => void =
  "function" === typeof reportError
    ? reportError
    : function (error: any): void {
        if (
          "object" === typeof window &&
          "function" === typeof window.ErrorEvent
        ) {
          var event: any = new window.ErrorEvent("error", {
            bubbles: !0,
            cancelable: !0,
            message:
              "object" === typeof error &&
              null !== error &&
              "string" === typeof error.message
                ? String(error.message)
                : String(error),
            error: error
          });
          if (!window.dispatchEvent(event)) return;
        } else if (
          "object" === typeof process &&
          "function" === typeof process.emit
        ) {
          process.emit("uncaughtException", error);
          return;
        }
        console.error(error);
      };
function startTransition(scope: () => unknown): void {
  var prevTransition: ReactTypes.Transition | null = ReactSharedInternals.T,
    currentTransition: ReactTypes.Transition = ({} as ReactTypes.Transition);
  currentTransition.types =
    null !== prevTransition ? prevTransition.types : null;
  ReactSharedInternals.T = currentTransition;
  try {
    var returnValue: any = scope(),
      onStartTransitionFinish: ReactTypes.SharedInternals["S"] = ReactSharedInternals.S;
    null !== onStartTransitionFinish &&
      onStartTransitionFinish(currentTransition, returnValue);
    "object" === typeof returnValue &&
      null !== returnValue &&
      "function" === typeof returnValue.then &&
      returnValue.then(noop, reportGlobalError);
  } catch (error) {
    reportGlobalError(error);
  } finally {
    null !== prevTransition &&
      null !== currentTransition.types &&
      (prevTransition.types = currentTransition.types),
      (ReactSharedInternals.T = prevTransition);
  }
}
function addTransitionType(type: string): void {
  var transition: ReactTypes.Transition | null = ReactSharedInternals.T;
  if (null !== transition) {
    var transitionTypes: string[] | null = transition.types;
    null === transitionTypes
      ? (transition.types = [type])
      : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
  } else startTransition(addTransitionType.bind(null, type));
}
var Children: ReactTypes.ChildrenApi = {
  map: mapChildren,
  forEach: function (children: any, forEachFunc: (this: unknown, child: any, index: number) => void, forEachContext?: unknown): void {
    mapChildren(
      children,
      function (this: unknown): void {
        forEachFunc.apply(this, (arguments as any));
      },
      forEachContext
    );
  },
  count: function (children: any): number {
    var n: number = 0;
    mapChildren(children, function (): void {
      n++;
    });
    return n;
  },
  toArray: function (children: any): unknown[] {
    return (
      mapChildren(children, function (child: any): any {
        return child;
      }) || []
    );
  },
  only: function (children: unknown): ReactTypes.Element {
    if (!isValidElement(children))
      throw Error(
        "React.Children.only expected to receive a single React element child."
      );
    return children;
  }
};
exports.Activity = REACT_ACTIVITY_TYPE;
exports.Children = Children;
exports.Component = Component;
exports.Fragment = REACT_FRAGMENT_TYPE;
exports.Profiler = REACT_PROFILER_TYPE;
exports.PureComponent = PureComponent;
exports.StrictMode = REACT_STRICT_MODE_TYPE;
exports.Suspense = REACT_SUSPENSE_TYPE;
exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE =
  ReactSharedInternals;
exports.__COMPILER_RUNTIME = {
  __proto__: null,
  c: function (size: number): unknown[] {
    return ReactSharedInternals.H!.useMemoCache(size);
  }
};
exports.addTransitionType = addTransitionType;
exports.cache = function (fn: Function): () => any {
  return function (): any {
    return fn.apply(null, (arguments as any));
  };
};
exports.cacheSignal = function (): null {
  return null;
};
exports.cloneElement = function (element: ReactTypes.Element, config?: ReactTypes.Props | null, children?: unknown): ReactTypes.Element {
  if (null === element || void 0 === element)
    throw Error(
      "The argument must be a React element, but you passed " + element + "."
    );
  var props: ReactTypes.Props = assign({}, element.props),
    key: string | null = element.key;
  if (null != config)
    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
      !hasOwnProperty.call(config, propName) ||
        "key" === propName ||
        "__self" === propName ||
        "__source" === propName ||
        ("ref" === propName && void 0 === config.ref) ||
        (props[propName] = config[propName]);
  var propName: any = arguments.length - 2;
  if (1 === propName) props.children = children;
  else if (1 < propName) {
    for (var childArray: unknown[] = Array(propName), i: number = 0; i < propName; i++)
      childArray[i] = arguments[i + 2];
    props.children = childArray;
  }
  return ReactElement(element.type, key, props);
};
exports.createContext = function (defaultValue: any): ReactTypes.Context {
  defaultValue = ({
    $$typeof: REACT_CONTEXT_TYPE,
    _currentValue: defaultValue,
    _currentValue2: defaultValue,
    _threadCount: 0,
    Provider: null,
    Consumer: null
  } as any);
  defaultValue.Provider = defaultValue;
  defaultValue.Consumer = {
    $$typeof: REACT_CONSUMER_TYPE,
    _context: defaultValue
  };
  return defaultValue;
};
exports.createElement = function (type: ReactTypes.ElementType, config?: ReactTypes.Props | null, children?: unknown): ReactTypes.Element {
  var propName: any,
    props: ReactTypes.Props = {},
    key: string | null = null;
  if (null != config)
    for (propName in (void 0 !== config.key && (key = "" + config.key), config))
      hasOwnProperty.call(config, propName) &&
        "key" !== propName &&
        "__self" !== propName &&
        "__source" !== propName &&
        (props[propName] = config[propName]);
  var childrenLength: any = arguments.length - 2;
  if (1 === childrenLength) props.children = children;
  else if (1 < childrenLength) {
    for (var childArray: unknown[] = Array(childrenLength), i: number = 0; i < childrenLength; i++)
      childArray[i] = arguments[i + 2];
    props.children = childArray;
  }
  if (type && type.defaultProps)
    for (propName in ((childrenLength = type.defaultProps), childrenLength))
      void 0 === props[propName] &&
        (props[propName] = childrenLength[propName]);
  return ReactElement(type, key, props);
};
exports.createRef = function (): { current: unknown } {
  return { current: null };
};
exports.forwardRef = function (render: Function): { $$typeof: symbol; render: Function } {
  return { $$typeof: REACT_FORWARD_REF_TYPE, render: render };
};
exports.isValidElement = isValidElement;
exports.lazy = function (ctor: () => ReactTypes.Thenable): { $$typeof: symbol; _payload: ReactTypes.LazyPayload; _init: (payload: ReactTypes.LazyPayload) => any } {
  return {
    $$typeof: REACT_LAZY_TYPE,
    _payload: { _status: -1, _result: ctor },
    _init: lazyInitializer
  };
};
exports.memo = function (type: ReactTypes.ElementType, compare?: ((prev: any, next: any) => boolean) | null): { $$typeof: symbol; type: ReactTypes.ElementType; compare: ((prev: any, next: any) => boolean) | null } {
  return {
    $$typeof: REACT_MEMO_TYPE,
    type: type,
    compare: void 0 === compare ? null : compare
  };
};
exports.startTransition = startTransition;
exports.unstable_useCacheRefresh = function (): any {
  return ReactSharedInternals.H!.useCacheRefresh();
};
exports.use = function (usable: any): any {
  return ReactSharedInternals.H!.use(usable);
};
exports.useActionState = function (action: any, initialState: any, permalink?: any): any {
  return ReactSharedInternals.H!.useActionState(action, initialState, permalink);
};
exports.useCallback = function (callback: any, deps?: any): any {
  return ReactSharedInternals.H!.useCallback(callback, deps);
};
exports.useContext = function (Context: any): any {
  return ReactSharedInternals.H!.useContext(Context);
};
exports.useDebugValue = function (): void {};
exports.useDeferredValue = function (value: any, initialValue?: any): any {
  return ReactSharedInternals.H!.useDeferredValue(value, initialValue);
};
exports.useEffect = function (create: any, deps?: any): any {
  return ReactSharedInternals.H!.useEffect(create, deps);
};
exports.useEffectEvent = function (callback: any): any {
  return ReactSharedInternals.H!.useEffectEvent(callback);
};
exports.useId = function (): any {
  return ReactSharedInternals.H!.useId();
};
exports.useImperativeHandle = function (ref: any, create: any, deps?: any): any {
  return ReactSharedInternals.H!.useImperativeHandle(ref, create, deps);
};
exports.useInsertionEffect = function (create: any, deps?: any): any {
  return ReactSharedInternals.H!.useInsertionEffect(create, deps);
};
exports.useLayoutEffect = function (create: any, deps?: any): any {
  return ReactSharedInternals.H!.useLayoutEffect(create, deps);
};
exports.useMemo = function (create: any, deps?: any): any {
  return ReactSharedInternals.H!.useMemo(create, deps);
};
exports.useOptimistic = function (passthrough: any, reducer?: any): any {
  return ReactSharedInternals.H!.useOptimistic(passthrough, reducer);
};
exports.useReducer = function (reducer: any, initialArg: any, init?: any): any {
  return ReactSharedInternals.H!.useReducer(reducer, initialArg, init);
};
exports.useRef = function (initialValue: any): any {
  return ReactSharedInternals.H!.useRef(initialValue);
};
exports.useState = function (initialState: any): any {
  return ReactSharedInternals.H!.useState(initialState);
};
exports.useSyncExternalStore = function (
  subscribe: any,
  getSnapshot: any,
  getServerSnapshot?: any
): any {
  return ReactSharedInternals.H!.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );
};
exports.useTransition = function (): any {
  return ReactSharedInternals.H!.useTransition();
};
exports.version = "19.3.1";
declare var exports: any;
declare var reportError: (error: any) => void;
declare var window: ReactTypes.WindowLike;
declare var process: ReactTypes.ProcessLike;
declare var console: { error(...data: any[]): void };
declare namespace ReactTypes {
  type ElementType = any;
  interface Props { key?: unknown; ref?: unknown; children?: unknown; [name: string]: any }
  interface Element { $$typeof: symbol; type: ElementType; key: string | null; ref: unknown; props: Props }
  interface Thenable { status?: string; value?: unknown; reason?: unknown; then(onFulfilled: (value: any) => unknown, onRejected?: (reason: any) => unknown): unknown }
  interface LazyPayload { _status: number; _result: any }
  interface Transition { types: string[] | null }
  interface Context { $$typeof: symbol; _currentValue: any; _currentValue2: any; _threadCount: number; Provider: Context | null; Consumer: { $$typeof: symbol; _context: Context } | null }
  interface Dispatcher {
    use(usable: any): any;
    useActionState(action: any, initialState: any, permalink?: any): any;
    useCallback(callback: any, deps?: any): any;
    useContext(context: any): any;
    useDeferredValue(value: any, initialValue?: any): any;
    useEffect(create: any, deps?: any): any;
    useEffectEvent(callback: any): any;
    useId(): any;
    useImperativeHandle(ref: any, create: any, deps?: any): any;
    useInsertionEffect(create: any, deps?: any): any;
    useLayoutEffect(create: any, deps?: any): any;
    useMemo(create: any, deps?: any): any;
    useMemoCache(size: number): unknown[];
    useCacheRefresh(): any;
    useOptimistic(passthrough: any, reducer?: any): any;
    useReducer(reducer: any, initialArg: any, init?: any): any;
    useRef(initialValue: any): any;
    useState(initialState: any): any;
    useSyncExternalStore(subscribe: any, getSnapshot: any, getServerSnapshot?: any): any;
    useTransition(): any;
  }
  interface SharedInternals {
    H: Dispatcher | null;
    A: unknown | null;
    T: Transition | null;
    S: ((transition: Transition, returnValue: unknown) => void) | null;
  }
  interface Updater {
    isMounted(component?: unknown): boolean;
    enqueueForceUpdate(component?: unknown, callback?: unknown, name?: string): void;
    enqueueReplaceState(component?: unknown, state?: unknown, callback?: unknown, name?: string): void;
    enqueueSetState(component?: unknown, partialState?: unknown, callback?: unknown, name?: string): void;
  }
  interface ComponentInstance { props: Props; context: unknown; refs: Props; updater: Updater }
  interface ChildrenApi {
    map(children: any, func: (this: unknown, child: any, index: number) => any, context?: unknown): any;
    forEach(children: any, forEachFunc: (this: unknown, child: any, index: number) => void, forEachContext?: unknown): void;
    count(children: any): number;
    toArray(children: any): unknown[];
    only(children: unknown): Element;
  }
  interface WindowLike { ErrorEvent: new (type: string, init: any) => any; dispatchEvent(event: any): boolean }
  interface ProcessLike { emit(event: string, error: unknown): void }
}
