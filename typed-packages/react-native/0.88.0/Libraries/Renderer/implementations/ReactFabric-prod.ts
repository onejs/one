/**
 * @license React
 * react-reconciler.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";
require("react-native/setup-env");
var reactPrivateInterface = require("react-native/react-private-interface"),
  React: RR.ReactModule = require("react"),
  Scheduler: RR.SchedulerModule = require("scheduler"),
  isArrayImpl = Array.isArray,
  ReactSharedInternals: RR.SharedInternals =
    React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,
  assign = Object.assign,
  prefix,
  suffix;
function describeBuiltInComponentFrame(name: string): string {
  if (void 0 === prefix)
    try {
      throw Error();
    } catch (x: RR.Thrown) {
      var match: RegExpMatchArray | null = x.stack.trim().match(/\n( *(at )?)/);
      prefix = (match && match[1]) || "";
      suffix =
        -1 < x.stack.indexOf("\n    at")
          ? " (<anonymous>)"
          : -1 < x.stack.indexOf("@")
            ? "@unknown:0:0"
            : "";
    }
  return "\n" + prefix + name + suffix;
}
var reentry = !1;
function describeNativeComponentFrame(fn: RR.ComponentFunction, construct: boolean): string {
  if (!fn || reentry) return "";
  reentry = !0;
  var previousPrepareStackTrace: RR.PrepareStackTrace | string | null | undefined = (Error as any).prepareStackTrace;
  (Error as any).prepareStackTrace = void 0;
  try {
    var RunInRootFrame: RR.RootFrameRunner | number = {
      DetermineComponentFrameRoot: function () {
        try {
          if (construct) {
            var Fake: RR.FakeOrResult = function () {
              throw Error();
            };
            Object.defineProperty(Fake.prototype, "props", {
              set: function () {
                throw Error();
              }
            });
            if ("object" === typeof Reflect && Reflect.construct) {
              try {
                Reflect.construct(Fake, []);
              } catch (x: RR.Thrown) {
                var control: Error | undefined = x;
              }
              Reflect.construct(fn, [], Fake);
            } else {
              try {
                Fake.call();
              } catch (x$1) {
                control = x$1;
              }
              Fake = !1;
              try {
                var prevProps = Object.getOwnPropertyDescriptor(
                  fn.prototype,
                  "props"
                );
                Object.defineProperty(fn.prototype, "props", {
                  configurable: !0,
                  set: function () {
                    throw Error();
                  }
                });
                Fake = !0;
                new (fn as any)();
              } finally {
                Fake &&
                  (void 0 !== prevProps
                    ? Object.defineProperty(fn.prototype, "props", prevProps)
                    : delete fn.prototype.props);
              }
            }
          } else {
            try {
              throw Error();
            } catch (x$2) {
              control = x$2;
            }
            (Fake = fn()) &&
              "function" === typeof Fake.catch &&
              Fake.catch(function () {});
          }
        } catch (sample: RR.Thrown) {
          if (sample && control && "string" === typeof sample.stack)
            return [sample.stack, control.stack];
        }
        return [null, null];
      }
    };
    RunInRootFrame.DetermineComponentFrameRoot.displayName =
      "DetermineComponentFrameRoot";
    var namePropDescriptor: PropertyDescriptor | number | undefined = Object.getOwnPropertyDescriptor(
      RunInRootFrame.DetermineComponentFrameRoot,
      "name"
    );
    namePropDescriptor &&
      namePropDescriptor.configurable &&
      Object.defineProperty(
        RunInRootFrame.DetermineComponentFrameRoot,
        "name",
        { value: "DetermineComponentFrameRoot" }
      );
    var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(),
      sampleStack = _RunInRootFrame$Deter[0],
      controlStack = _RunInRootFrame$Deter[1];
    if (sampleStack && controlStack) {
      var sampleLines = sampleStack.split("\n"),
        controlLines = controlStack.split("\n");
      for (
        namePropDescriptor = RunInRootFrame = 0;
        RunInRootFrame < sampleLines.length &&
        !sampleLines[RunInRootFrame]!.includes("DetermineComponentFrameRoot");

      )
        RunInRootFrame++;
      for (
        ;
        namePropDescriptor < controlLines.length &&
        !controlLines[namePropDescriptor]!.includes(
          "DetermineComponentFrameRoot"
        );

      )
        namePropDescriptor++;
      if (
        RunInRootFrame === sampleLines.length ||
        namePropDescriptor === controlLines.length
      )
        for (
          RunInRootFrame = sampleLines.length - 1,
            namePropDescriptor = controlLines.length - 1;
          1 <= RunInRootFrame &&
          0 <= namePropDescriptor &&
          sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor];

        )
          namePropDescriptor--;
      for (
        ;
        1 <= RunInRootFrame && 0 <= namePropDescriptor;
        RunInRootFrame--, namePropDescriptor--
      )
        if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
          if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
            do
              if (
                (RunInRootFrame--,
                namePropDescriptor--,
                0 > namePropDescriptor ||
                  sampleLines[RunInRootFrame] !==
                    controlLines[namePropDescriptor])
              ) {
                var frame =
                  "\n" +
                  sampleLines[RunInRootFrame]!.replace(" at new ", " at ");
                fn.displayName &&
                  frame.includes("<anonymous>") &&
                  (frame = frame.replace("<anonymous>", fn.displayName));
                return frame;
              }
            while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
          }
          break;
        }
    }
  } finally {
    (reentry = !1), ((Error as any).prepareStackTrace = previousPrepareStackTrace);
  }
  return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "")
    ? describeBuiltInComponentFrame(previousPrepareStackTrace as string)
    : "";
}
function describeFiber(fiber: RR.Fiber, childFiber: RR.Fiber | null): string {
  switch (fiber.tag) {
    case 26:
    case 27:
    case 5:
      return describeBuiltInComponentFrame(fiber.type as string);
    case 16:
      return describeBuiltInComponentFrame("Lazy");
    case 13:
      return fiber.child !== childFiber && null !== childFiber
        ? describeBuiltInComponentFrame("Suspense Fallback")
        : describeBuiltInComponentFrame("Suspense");
    case 19:
      return describeBuiltInComponentFrame("SuspenseList");
    case 0:
    case 15:
      return describeNativeComponentFrame(fiber.type as RR.FunctionComponent, !1);
    case 11:
      return describeNativeComponentFrame((fiber.type as RR.ForwardRefType).render, !1);
    case 1:
      return describeNativeComponentFrame(fiber.type as RR.ClassComponent, !0);
    case 31:
      return describeBuiltInComponentFrame("Activity");
    case 30:
      return describeBuiltInComponentFrame("ViewTransition");
    default:
      return "";
  }
}
function getStackByFiberInDevAndProd(workInProgress: RR.Fiber | null): string {
  try {
    var info = "",
      previous: RR.Fiber | null = null;
    do
      (info += describeFiber((workInProgress as RR.Fiber), previous)),
        (previous = workInProgress!),
        (workInProgress = workInProgress!.return);
    while (workInProgress);
    return info;
  } catch (x: RR.Thrown) {
    return "\nError generating stack: " + x.message + "\n" + x.stack;
  }
}
var REACT_LEGACY_ELEMENT_TYPE = Symbol.for("react.element"),
  REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"),
  REACT_PORTAL_TYPE = Symbol.for("react.portal"),
  REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"),
  REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"),
  REACT_PROFILER_TYPE = Symbol.for("react.profiler"),
  REACT_CONSUMER_TYPE = Symbol.for("react.consumer"),
  REACT_CONTEXT_TYPE = Symbol.for("react.context"),
  REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"),
  REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"),
  REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"),
  REACT_MEMO_TYPE = Symbol.for("react.memo"),
  REACT_LAZY_TYPE = Symbol.for("react.lazy");
Symbol.for("react.scope");
var REACT_ACTIVITY_TYPE = Symbol.for("react.activity"),
  REACT_LEGACY_HIDDEN_TYPE = Symbol.for("react.legacy_hidden");
Symbol.for("react.tracing_marker");
var REACT_MEMO_CACHE_SENTINEL = Symbol.for("react.memo_cache_sentinel"),
  REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"),
  REACT_RECOVERABLE_TYPE = Symbol.for("react.recoverable"),
  MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
function getIteratorFn(maybeIterable: RR.ReactNode): RR.IteratorFn | null {
  if (null === maybeIterable || "object" !== typeof maybeIterable)
    return null;
  maybeIterable =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable["@@iterator"];
  return "function" === typeof maybeIterable ? maybeIterable : null;
}
var REACT_OPTIMISTIC_KEY = Symbol.for("react.optimistic_key"),
  REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference");
function getComponentNameFromType(type: RR.AnyElementType): string | null {
  if (null == type) return null;
  if ("function" === typeof type)
    return type.$$typeof === REACT_CLIENT_REFERENCE
      ? null
      : type.displayName || type.name || null;
  if ("string" === typeof type) return type;
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
    case REACT_VIEW_TRANSITION_TYPE:
      return "ViewTransition";
  }
  if ("object" === typeof type)
    switch (type.$$typeof) {
      case REACT_PORTAL_TYPE:
        return "Portal";
      case REACT_CONTEXT_TYPE:
        return type.displayName || "Context";
      case REACT_CONSUMER_TYPE:
        return (type._context.displayName || "Context") + ".Consumer";
      case REACT_FORWARD_REF_TYPE:
        var innerType = type.render;
        type = type.displayName;
        type ||
          ((type = innerType.displayName || innerType.name || ""),
          (type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef"));
        return type;
      case REACT_MEMO_TYPE:
        return (
          (innerType = type.displayName || null),
          null !== innerType
            ? innerType
            : getComponentNameFromType(type.type) || "Memo"
        );
      case REACT_LAZY_TYPE:
        innerType = type._payload;
        type = type._init;
        try {
          return getComponentNameFromType(type(innerType));
        } catch (x) {}
    }
  return null;
}
var hasError = !1,
  caughtError = null,
  getFiberCurrentPropsFromNode$1 = null,
  getInstanceFromNode$1 = null,
  getNodeFromInstance$1 = null;
function executeDispatch(event, listener, inst) {
  event.currentTarget = getNodeFromInstance$1(inst);
  inst = global.event;
  global.event = event;
  try {
    listener(event);
  } catch (error) {
    hasError || ((hasError = !0), (caughtError = error));
  }
  global.event = inst;
  event.currentTarget = null;
}
function executeDirectDispatch(event) {
  var dispatchListener = event._dispatchListeners,
    dispatchInstance = event._dispatchInstances;
  if (isArrayImpl(dispatchListener)) throw Error("Invalid `event`.");
  event.currentTarget = dispatchListener
    ? getNodeFromInstance$1(dispatchInstance)
    : null;
  dispatchListener = dispatchListener ? dispatchListener(event) : null;
  event.currentTarget = null;
  event._dispatchListeners = null;
  event._dispatchInstances = null;
  return dispatchListener;
}
function currentTimeStamp() {
  currentTimeStamp =
    "object" === typeof performance &&
    null !== performance &&
    "function" === typeof performance.now
      ? function () {
          return performance.now();
        }
      : function () {
          return Date.now();
        };
  return currentTimeStamp();
}
function functionThatReturnsTrue() {
  return !0;
}
function functionThatReturnsFalse() {
  return !1;
}
function SyntheticEvent(
  dispatchConfig,
  targetInst,
  nativeEvent,
  nativeEventTarget
) {
  this.dispatchConfig = dispatchConfig;
  this._targetInst = targetInst;
  this.nativeEvent = nativeEvent;
  this._dispatchInstances = this._dispatchListeners = null;
  dispatchConfig = this.constructor.Interface;
  for (var propName in dispatchConfig)
    dispatchConfig.hasOwnProperty(propName) &&
      ((targetInst = dispatchConfig[propName])
        ? (this[propName] = targetInst(nativeEvent))
        : "target" === propName
          ? (this.target = nativeEventTarget)
          : (this[propName] = nativeEvent[propName]));
  this.isDefaultPrevented = (
    null != nativeEvent.defaultPrevented
      ? nativeEvent.defaultPrevented
      : !1 === nativeEvent.returnValue
  )
    ? functionThatReturnsTrue
    : functionThatReturnsFalse;
  this.isPropagationStopped = functionThatReturnsFalse;
  return this;
}
assign(SyntheticEvent.prototype, {
  preventDefault: function () {
    this.defaultPrevented = !0;
    var event = this.nativeEvent;
    event &&
      (event.preventDefault
        ? event.preventDefault()
        : "unknown" !== typeof event.returnValue && (event.returnValue = !1),
      (this.isDefaultPrevented = functionThatReturnsTrue));
  },
  stopPropagation: function () {
    var event = this.nativeEvent;
    event &&
      (event.stopPropagation
        ? event.stopPropagation()
        : "unknown" !== typeof event.cancelBubble && (event.cancelBubble = !0),
      (this.isPropagationStopped = functionThatReturnsTrue));
  },
  persist: function () {
    this.isPersistent = functionThatReturnsTrue;
  },
  isPersistent: functionThatReturnsFalse,
  destructor: function () {
    var Interface = this.constructor.Interface,
      propName;
    for (propName in Interface) this[propName] = null;
    this.nativeEvent = this._targetInst = this.dispatchConfig = null;
    this.isPropagationStopped = this.isDefaultPrevented =
      functionThatReturnsFalse;
    this._dispatchInstances = this._dispatchListeners = null;
  }
});
SyntheticEvent.Interface = {
  type: null,
  target: null,
  currentTarget: function () {
    return null;
  },
  eventPhase: null,
  bubbles: null,
  cancelable: null,
  timeStamp: function (event) {
    return event.timeStamp || event.timestamp || currentTimeStamp();
  },
  defaultPrevented: null,
  isTrusted: null
};
SyntheticEvent.extend = function (Interface) {
  function E() {}
  function Class() {
    return Super.apply(this, arguments);
  }
  var Super = this;
  E.prototype = Super.prototype;
  var prototype = new E();
  assign(prototype, Class.prototype);
  Class.prototype = prototype;
  Class.prototype.constructor = Class;
  Class.Interface = assign({}, Super.Interface, Interface);
  Class.extend = Super.extend;
  addEventPoolingTo(Class);
  return Class;
};
addEventPoolingTo(SyntheticEvent);
function createOrGetPooledEvent(
  dispatchConfig,
  targetInst,
  nativeEvent,
  nativeInst
) {
  if (this.eventPool.length) {
    var instance = this.eventPool.pop();
    this.call(instance, dispatchConfig, targetInst, nativeEvent, nativeInst);
    return instance;
  }
  return new this(dispatchConfig, targetInst, nativeEvent, nativeInst);
}
function releasePooledEvent(event) {
  if (!(event instanceof this))
    throw Error(
      "Trying to release an event instance into a pool of a different type."
    );
  event.destructor();
  10 > this.eventPool.length && this.eventPool.push(event);
}
function addEventPoolingTo(EventConstructor) {
  EventConstructor.getPooled = createOrGetPooledEvent;
  EventConstructor.eventPool = [];
  EventConstructor.release = releasePooledEvent;
}
var ResponderSyntheticEvent = SyntheticEvent.extend({
  touchHistory: function () {
    return null;
  }
});
function isStartish(topLevelType) {
  return "topTouchStart" === topLevelType;
}
function isMoveish(topLevelType) {
  return "topTouchMove" === topLevelType;
}
var startDependencies = ["topTouchStart"],
  moveDependencies = ["topTouchMove"],
  endDependencies = ["topTouchCancel", "topTouchEnd"],
  touchBank = [],
  touchHistory = {
    touchBank: touchBank,
    numberActiveTouches: 0,
    indexOfSingleActiveTouch: -1,
    mostRecentTimeStamp: 0
  };
function timestampForTouch(touch) {
  return touch.timeStamp || touch.timestamp;
}
function getTouchIdentifier(_ref) {
  _ref = _ref.identifier;
  if (null == _ref) throw Error("Touch object is missing identifier.");
  return _ref;
}
function recordTouchStart(touch) {
  var identifier = getTouchIdentifier(touch),
    touchRecord = touchBank[identifier];
  touchRecord
    ? ((touchRecord.touchActive = !0),
      (touchRecord.startPageX = touch.pageX),
      (touchRecord.startPageY = touch.pageY),
      (touchRecord.startTimeStamp = timestampForTouch(touch)),
      (touchRecord.currentPageX = touch.pageX),
      (touchRecord.currentPageY = touch.pageY),
      (touchRecord.currentTimeStamp = timestampForTouch(touch)),
      (touchRecord.previousPageX = touch.pageX),
      (touchRecord.previousPageY = touch.pageY),
      (touchRecord.previousTimeStamp = timestampForTouch(touch)))
    : ((touchRecord = {
        touchActive: !0,
        startPageX: touch.pageX,
        startPageY: touch.pageY,
        startTimeStamp: timestampForTouch(touch),
        currentPageX: touch.pageX,
        currentPageY: touch.pageY,
        currentTimeStamp: timestampForTouch(touch),
        previousPageX: touch.pageX,
        previousPageY: touch.pageY,
        previousTimeStamp: timestampForTouch(touch)
      }),
      (touchBank[identifier] = touchRecord));
  touchHistory.mostRecentTimeStamp = timestampForTouch(touch);
}
function recordTouchMove(touch) {
  var touchRecord = touchBank[getTouchIdentifier(touch)];
  touchRecord &&
    ((touchRecord.touchActive = !0),
    (touchRecord.previousPageX = touchRecord.currentPageX),
    (touchRecord.previousPageY = touchRecord.currentPageY),
    (touchRecord.previousTimeStamp = touchRecord.currentTimeStamp),
    (touchRecord.currentPageX = touch.pageX),
    (touchRecord.currentPageY = touch.pageY),
    (touchRecord.currentTimeStamp = timestampForTouch(touch)),
    (touchHistory.mostRecentTimeStamp = timestampForTouch(touch)));
}
function recordTouchEnd(touch) {
  var touchRecord = touchBank[getTouchIdentifier(touch)];
  touchRecord &&
    ((touchRecord.touchActive = !1),
    (touchRecord.previousPageX = touchRecord.currentPageX),
    (touchRecord.previousPageY = touchRecord.currentPageY),
    (touchRecord.previousTimeStamp = touchRecord.currentTimeStamp),
    (touchRecord.currentPageX = touch.pageX),
    (touchRecord.currentPageY = touch.pageY),
    (touchRecord.currentTimeStamp = timestampForTouch(touch)),
    (touchHistory.mostRecentTimeStamp = timestampForTouch(touch)));
}
var instrumentationCallback,
  ResponderTouchHistoryStore = {
    instrument: function (callback) {
      instrumentationCallback = callback;
    },
    recordTouchTrack: function (topLevelType, nativeEvent) {
      null != instrumentationCallback &&
        instrumentationCallback(topLevelType, nativeEvent);
      if (isMoveish(topLevelType))
        nativeEvent.changedTouches.forEach(recordTouchMove);
      else if (isStartish(topLevelType))
        nativeEvent.changedTouches.forEach(recordTouchStart),
          (touchHistory.numberActiveTouches = nativeEvent.touches.length),
          1 === touchHistory.numberActiveTouches &&
            (touchHistory.indexOfSingleActiveTouch =
              nativeEvent.touches[0].identifier);
      else if (
        "topTouchEnd" === topLevelType ||
        "topTouchCancel" === topLevelType
      )
        if (
          (nativeEvent.changedTouches.forEach(recordTouchEnd),
          (touchHistory.numberActiveTouches = nativeEvent.touches.length),
          1 === touchHistory.numberActiveTouches)
        )
          for (
            topLevelType = 0;
            topLevelType < touchBank.length;
            topLevelType++
          )
            if (
              ((nativeEvent = touchBank[topLevelType]),
              null != nativeEvent && nativeEvent.touchActive)
            ) {
              touchHistory.indexOfSingleActiveTouch = topLevelType;
              break;
            }
    },
    touchHistory: touchHistory
  };
function accumulate(current, next) {
  if (null == next)
    throw Error("Accumulated items must not be null or undefined.");
  return null == current
    ? next
    : isArrayImpl(current)
      ? current.concat(next)
      : isArrayImpl(next)
        ? [current].concat(next)
        : [current, next];
}
function accumulateInto(current, next) {
  if (null == next)
    throw Error("Accumulated items must not be null or undefined.");
  if (null == current) return next;
  if (isArrayImpl(current)) {
    if (isArrayImpl(next)) return current.push.apply(current, next), current;
    current.push(next);
    return current;
  }
  return isArrayImpl(next) ? [current].concat(next) : [current, next];
}
function forEachAccumulated(arr, cb, scope) {
  Array.isArray(arr) ? arr.forEach(cb, scope) : arr && cb.call(scope, arr);
}
var responderInst = null,
  trackedTouchCount = 0;
function changeResponder(nextResponderInst, blockHostResponder) {
  var oldResponderInst = responderInst;
  responderInst = nextResponderInst;
  if (null !== ResponderEventPlugin.GlobalResponderHandler)
    ResponderEventPlugin.GlobalResponderHandler.onChange(
      oldResponderInst,
      nextResponderInst,
      blockHostResponder
    );
}
var eventTypes = {
  startShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: "onStartShouldSetResponder",
      captured: "onStartShouldSetResponderCapture"
    },
    dependencies: startDependencies
  },
  scrollShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: "onScrollShouldSetResponder",
      captured: "onScrollShouldSetResponderCapture"
    },
    dependencies: ["topScroll"]
  },
  selectionChangeShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: "onSelectionChangeShouldSetResponder",
      captured: "onSelectionChangeShouldSetResponderCapture"
    },
    dependencies: ["topSelectionChange"]
  },
  moveShouldSetResponder: {
    phasedRegistrationNames: {
      bubbled: "onMoveShouldSetResponder",
      captured: "onMoveShouldSetResponderCapture"
    },
    dependencies: moveDependencies
  },
  responderStart: {
    registrationName: "onResponderStart",
    dependencies: startDependencies
  },
  responderMove: {
    registrationName: "onResponderMove",
    dependencies: moveDependencies
  },
  responderEnd: {
    registrationName: "onResponderEnd",
    dependencies: endDependencies
  },
  responderRelease: {
    registrationName: "onResponderRelease",
    dependencies: endDependencies
  },
  responderTerminationRequest: {
    registrationName: "onResponderTerminationRequest",
    dependencies: []
  },
  responderGrant: { registrationName: "onResponderGrant", dependencies: [] },
  responderReject: { registrationName: "onResponderReject", dependencies: [] },
  responderTerminate: {
    registrationName: "onResponderTerminate",
    dependencies: []
  }
};
function getParent$1(inst) {
  do inst = inst.return;
  while (inst && 5 !== inst.tag);
  return inst ? inst : null;
}
function traverseTwoPhase$1(inst, fn, arg) {
  for (var path = []; inst; ) path.push(inst), (inst = getParent$1(inst));
  for (inst = path.length; 0 < inst--; ) fn(path[inst], "captured", arg);
  for (inst = 0; inst < path.length; inst++) fn(path[inst], "bubbled", arg);
}
function getListener$1(inst, registrationName) {
  inst = inst.stateNode;
  if (null === inst) return null;
  inst = getFiberCurrentPropsFromNode$1(inst);
  if (null === inst) return null;
  if ((inst = inst[registrationName]) && "function" !== typeof inst)
    throw Error(
      "Expected `" +
        registrationName +
        "` listener to be a function, instead got a value of `" +
        typeof inst +
        "` type."
    );
  return inst;
}
function accumulateDirectionalDispatches$1(inst, phase, event) {
  if (
    (phase = getListener$1(
      inst,
      event.dispatchConfig.phasedRegistrationNames[phase]
    ))
  )
    (event._dispatchListeners = accumulateInto(
      event._dispatchListeners,
      phase
    )),
      (event._dispatchInstances = accumulateInto(
        event._dispatchInstances,
        inst
      ));
}
function accumulateDirectDispatchesSingle$1(event) {
  if (event && event.dispatchConfig.registrationName) {
    var inst = event._targetInst;
    if (inst && event && event.dispatchConfig.registrationName) {
      var listener = getListener$1(inst, event.dispatchConfig.registrationName);
      listener &&
        ((event._dispatchListeners = accumulateInto(
          event._dispatchListeners,
          listener
        )),
        (event._dispatchInstances = accumulateInto(
          event._dispatchInstances,
          inst
        )));
    }
  }
}
function accumulateTwoPhaseDispatchesSingleSkipTarget(event) {
  if (event && event.dispatchConfig.phasedRegistrationNames) {
    var targetInst = event._targetInst;
    targetInst = targetInst ? getParent$1(targetInst) : null;
    traverseTwoPhase$1(targetInst, accumulateDirectionalDispatches$1, event);
  }
}
function accumulateTwoPhaseDispatchesSingle$1(event) {
  event &&
    event.dispatchConfig.phasedRegistrationNames &&
    traverseTwoPhase$1(
      event._targetInst,
      accumulateDirectionalDispatches$1,
      event
    );
}
var ResponderEventPlugin = {
    _getResponder: function () {
      return responderInst;
    },
    eventTypes: eventTypes,
    extractEvents: function (
      topLevelType,
      targetInst,
      nativeEvent,
      nativeEventTarget
    ) {
      if (isStartish(topLevelType)) trackedTouchCount += 1;
      else if (
        "topTouchEnd" === topLevelType ||
        "topTouchCancel" === topLevelType
      )
        if (0 <= trackedTouchCount) --trackedTouchCount;
        else return null;
      ResponderTouchHistoryStore.recordTouchTrack(topLevelType, nativeEvent);
      if (
        targetInst &&
        (("topScroll" === topLevelType && !nativeEvent.responderIgnoreScroll) ||
          (0 < trackedTouchCount && "topSelectionChange" === topLevelType) ||
          isStartish(topLevelType) ||
          isMoveish(topLevelType))
      ) {
        var shouldSetEventType = isStartish(topLevelType)
          ? eventTypes.startShouldSetResponder
          : isMoveish(topLevelType)
            ? eventTypes.moveShouldSetResponder
            : "topSelectionChange" === topLevelType
              ? eventTypes.selectionChangeShouldSetResponder
              : eventTypes.scrollShouldSetResponder;
        if (responderInst)
          b: {
            var JSCompiler_temp = responderInst;
            for (
              var depthA = 0, tempA = JSCompiler_temp;
              tempA;
              tempA = getParent$1(tempA)
            )
              depthA++;
            tempA = 0;
            for (var tempB = targetInst; tempB; tempB = getParent$1(tempB))
              tempA++;
            for (; 0 < depthA - tempA; )
              (JSCompiler_temp = getParent$1(JSCompiler_temp)), depthA--;
            for (; 0 < tempA - depthA; )
              (targetInst = getParent$1(targetInst)), tempA--;
            for (; depthA--; ) {
              if (
                JSCompiler_temp === targetInst ||
                JSCompiler_temp === targetInst.alternate
              )
                break b;
              JSCompiler_temp = getParent$1(JSCompiler_temp);
              targetInst = getParent$1(targetInst);
            }
            JSCompiler_temp = null;
          }
        else JSCompiler_temp = targetInst;
        targetInst = JSCompiler_temp;
        JSCompiler_temp = targetInst === responderInst;
        shouldSetEventType = ResponderSyntheticEvent.getPooled(
          shouldSetEventType,
          targetInst,
          nativeEvent,
          nativeEventTarget
        );
        shouldSetEventType.touchHistory =
          ResponderTouchHistoryStore.touchHistory;
        JSCompiler_temp
          ? forEachAccumulated(
              shouldSetEventType,
              accumulateTwoPhaseDispatchesSingleSkipTarget
            )
          : forEachAccumulated(
              shouldSetEventType,
              accumulateTwoPhaseDispatchesSingle$1
            );
        b: {
          JSCompiler_temp = shouldSetEventType._dispatchListeners;
          targetInst = shouldSetEventType._dispatchInstances;
          if (isArrayImpl(JSCompiler_temp))
            for (
              depthA = 0;
              depthA < JSCompiler_temp.length &&
              !shouldSetEventType.isPropagationStopped();
              depthA++
            ) {
              if (
                JSCompiler_temp[depthA](shouldSetEventType, targetInst[depthA])
              ) {
                JSCompiler_temp = targetInst[depthA];
                break b;
              }
            }
          else if (
            JSCompiler_temp &&
            JSCompiler_temp(shouldSetEventType, targetInst)
          ) {
            JSCompiler_temp = targetInst;
            break b;
          }
          JSCompiler_temp = null;
        }
        shouldSetEventType._dispatchInstances = null;
        shouldSetEventType._dispatchListeners = null;
        shouldSetEventType.isPersistent() ||
          shouldSetEventType.constructor.release(shouldSetEventType);
        if (JSCompiler_temp && JSCompiler_temp !== responderInst)
          if (
            ((shouldSetEventType = ResponderSyntheticEvent.getPooled(
              eventTypes.responderGrant,
              JSCompiler_temp,
              nativeEvent,
              nativeEventTarget
            )),
            (shouldSetEventType.touchHistory =
              ResponderTouchHistoryStore.touchHistory),
            forEachAccumulated(
              shouldSetEventType,
              accumulateDirectDispatchesSingle$1
            ),
            (targetInst = !0 === executeDirectDispatch(shouldSetEventType)),
            responderInst)
          )
            if (
              ((depthA = ResponderSyntheticEvent.getPooled(
                eventTypes.responderTerminationRequest,
                responderInst,
                nativeEvent,
                nativeEventTarget
              )),
              (depthA.touchHistory = ResponderTouchHistoryStore.touchHistory),
              forEachAccumulated(depthA, accumulateDirectDispatchesSingle$1),
              (tempA =
                !depthA._dispatchListeners || executeDirectDispatch(depthA)),
              depthA.isPersistent() || depthA.constructor.release(depthA),
              tempA)
            ) {
              depthA = ResponderSyntheticEvent.getPooled(
                eventTypes.responderTerminate,
                responderInst,
                nativeEvent,
                nativeEventTarget
              );
              depthA.touchHistory = ResponderTouchHistoryStore.touchHistory;
              forEachAccumulated(depthA, accumulateDirectDispatchesSingle$1);
              var JSCompiler_temp$jscomp$0 = accumulate(
                JSCompiler_temp$jscomp$0,
                [shouldSetEventType, depthA]
              );
              changeResponder(JSCompiler_temp, targetInst);
            } else
              (shouldSetEventType = ResponderSyntheticEvent.getPooled(
                eventTypes.responderReject,
                JSCompiler_temp,
                nativeEvent,
                nativeEventTarget
              )),
                (shouldSetEventType.touchHistory =
                  ResponderTouchHistoryStore.touchHistory),
                forEachAccumulated(
                  shouldSetEventType,
                  accumulateDirectDispatchesSingle$1
                ),
                (JSCompiler_temp$jscomp$0 = accumulate(
                  JSCompiler_temp$jscomp$0,
                  shouldSetEventType
                ));
          else
            (JSCompiler_temp$jscomp$0 = accumulate(
              JSCompiler_temp$jscomp$0,
              shouldSetEventType
            )),
              changeResponder(JSCompiler_temp, targetInst);
        else JSCompiler_temp$jscomp$0 = null;
      } else JSCompiler_temp$jscomp$0 = null;
      shouldSetEventType = responderInst && isStartish(topLevelType);
      JSCompiler_temp = responderInst && isMoveish(topLevelType);
      targetInst =
        responderInst &&
        ("topTouchEnd" === topLevelType || "topTouchCancel" === topLevelType);
      if (
        (shouldSetEventType = shouldSetEventType
          ? eventTypes.responderStart
          : JSCompiler_temp
            ? eventTypes.responderMove
            : targetInst
              ? eventTypes.responderEnd
              : null)
      )
        (shouldSetEventType = ResponderSyntheticEvent.getPooled(
          shouldSetEventType,
          responderInst,
          nativeEvent,
          nativeEventTarget
        )),
          (shouldSetEventType.touchHistory =
            ResponderTouchHistoryStore.touchHistory),
          forEachAccumulated(
            shouldSetEventType,
            accumulateDirectDispatchesSingle$1
          ),
          (JSCompiler_temp$jscomp$0 = accumulate(
            JSCompiler_temp$jscomp$0,
            shouldSetEventType
          ));
      shouldSetEventType = responderInst && "topTouchCancel" === topLevelType;
      if (
        (topLevelType =
          responderInst &&
          !shouldSetEventType &&
          ("topTouchEnd" === topLevelType || "topTouchCancel" === topLevelType))
      )
        a: {
          if ((topLevelType = nativeEvent.touches) && 0 !== topLevelType.length)
            for (
              JSCompiler_temp = 0;
              JSCompiler_temp < topLevelType.length;
              JSCompiler_temp++
            )
              if (
                ((targetInst = topLevelType[JSCompiler_temp].target),
                null !== targetInst &&
                  void 0 !== targetInst &&
                  0 !== targetInst)
              ) {
                depthA = getInstanceFromNode$1(targetInst);
                b: {
                  for (targetInst = responderInst; depthA; ) {
                    if (
                      targetInst === depthA ||
                      targetInst === depthA.alternate
                    ) {
                      targetInst = !0;
                      break b;
                    }
                    depthA = getParent$1(depthA);
                  }
                  targetInst = !1;
                }
                if (targetInst) {
                  topLevelType = !1;
                  break a;
                }
              }
          topLevelType = !0;
        }
      if (
        (topLevelType = shouldSetEventType
          ? eventTypes.responderTerminate
          : topLevelType
            ? eventTypes.responderRelease
            : null)
      )
        (nativeEvent = ResponderSyntheticEvent.getPooled(
          topLevelType,
          responderInst,
          nativeEvent,
          nativeEventTarget
        )),
          (nativeEvent.touchHistory = ResponderTouchHistoryStore.touchHistory),
          forEachAccumulated(nativeEvent, accumulateDirectDispatchesSingle$1),
          (JSCompiler_temp$jscomp$0 = accumulate(
            JSCompiler_temp$jscomp$0,
            nativeEvent
          )),
          changeResponder(null);
      return JSCompiler_temp$jscomp$0;
    },
    GlobalResponderHandler: null,
    injection: {
      injectGlobalResponderHandler: function (GlobalResponderHandler) {
        ResponderEventPlugin.GlobalResponderHandler = GlobalResponderHandler;
      }
    }
  },
  eventPluginOrder = null,
  namesToPlugins = {};
function recomputePluginOrdering() {
  if (eventPluginOrder)
    for (var pluginName in namesToPlugins) {
      var pluginModule = namesToPlugins[pluginName],
        pluginIndex = eventPluginOrder.indexOf(pluginName);
      if (-1 >= pluginIndex)
        throw Error(
          "EventPluginRegistry: Cannot inject event plugins that do not exist in the plugin ordering, `" +
            (pluginName + "`.")
        );
      if (!plugins[pluginIndex]) {
        if (!pluginModule.extractEvents)
          throw Error(
            "EventPluginRegistry: Event plugins must implement an `extractEvents` method, but `" +
              (pluginName + "` does not.")
          );
        plugins[pluginIndex] = pluginModule;
        pluginIndex = pluginModule.eventTypes;
        for (var eventName in pluginIndex) {
          var JSCompiler_inline_result = void 0;
          var dispatchConfig = pluginIndex[eventName];
          if (eventNameDispatchConfigs.hasOwnProperty(eventName))
            throw Error(
              "EventPluginRegistry: More than one plugin attempted to publish the same event name, `" +
                (eventName + "`.")
            );
          eventNameDispatchConfigs[eventName] = dispatchConfig;
          var phasedRegistrationNames = dispatchConfig.phasedRegistrationNames;
          if (phasedRegistrationNames) {
            for (JSCompiler_inline_result in phasedRegistrationNames)
              phasedRegistrationNames.hasOwnProperty(
                JSCompiler_inline_result
              ) &&
                publishRegistrationName(
                  phasedRegistrationNames[JSCompiler_inline_result],
                  pluginModule
                );
            JSCompiler_inline_result = !0;
          } else
            dispatchConfig.registrationName
              ? (publishRegistrationName(
                  dispatchConfig.registrationName,
                  pluginModule
                ),
                (JSCompiler_inline_result = !0))
              : (JSCompiler_inline_result = !1);
          if (!JSCompiler_inline_result)
            throw Error(
              "EventPluginRegistry: Failed to publish event `" +
                eventName +
                "` for plugin `" +
                pluginName +
                "`."
            );
        }
      }
    }
}
function publishRegistrationName(registrationName, pluginModule) {
  if (registrationNameModules[registrationName])
    throw Error(
      "EventPluginRegistry: More than one plugin attempted to publish the same registration name, `" +
        (registrationName + "`.")
    );
  registrationNameModules[registrationName] = pluginModule;
}
var plugins = [],
  eventNameDispatchConfigs = {},
  registrationNameModules = {};
function getListener(inst, registrationName) {
  inst = inst.stateNode;
  if (null === inst) return null;
  inst = getFiberCurrentPropsFromNode$1(inst);
  if (null === inst) return null;
  if ((inst = inst[registrationName]) && "function" !== typeof inst)
    throw Error(
      "Expected `" +
        registrationName +
        "` listener to be a function, instead got a value of `" +
        typeof inst +
        "` type."
    );
  return inst;
}
var customBubblingEventTypes =
    reactPrivateInterface.ReactNativeViewConfigRegistry
      .customBubblingEventTypes,
  customDirectEventTypes =
    reactPrivateInterface.ReactNativeViewConfigRegistry.customDirectEventTypes;
function accumulateDirectionalDispatches(inst, phase, event) {
  if (
    (phase = getListener(
      inst,
      event.dispatchConfig.phasedRegistrationNames[phase]
    ))
  )
    (event._dispatchListeners = accumulateInto(
      event._dispatchListeners,
      phase
    )),
      (event._dispatchInstances = accumulateInto(
        event._dispatchInstances,
        inst
      ));
}
function traverseTwoPhase(inst, fn, arg, skipBubbling) {
  for (var path = []; inst; ) {
    path.push(inst);
    do inst = inst.return;
    while (inst && 5 !== inst.tag);
    inst = inst ? inst : null;
  }
  for (inst = path.length; 0 < inst--; ) fn(path[inst], "captured", arg);
  if (skipBubbling) fn(path[0], "bubbled", arg);
  else
    for (inst = 0; inst < path.length; inst++) fn(path[inst], "bubbled", arg);
}
function accumulateTwoPhaseDispatchesSingle(event) {
  event &&
    event.dispatchConfig.phasedRegistrationNames &&
    traverseTwoPhase(
      event._targetInst,
      accumulateDirectionalDispatches,
      event,
      !1
    );
}
function accumulateDirectDispatchesSingle(event) {
  if (event && event.dispatchConfig.registrationName) {
    var inst = event._targetInst;
    if (inst && event && event.dispatchConfig.registrationName) {
      var listener = getListener(inst, event.dispatchConfig.registrationName);
      listener &&
        ((event._dispatchListeners = accumulateInto(
          event._dispatchListeners,
          listener
        )),
        (event._dispatchInstances = accumulateInto(
          event._dispatchInstances,
          inst
        )));
    }
  }
}
if (eventPluginOrder)
  throw Error(
    "EventPluginRegistry: Cannot inject event plugin ordering more than once. You are likely trying to load more than one copy of React."
  );
eventPluginOrder = Array.prototype.slice.call([
  "ResponderEventPlugin",
  "ReactNativeBridgeEventPlugin"
]);
recomputePluginOrdering();
var injectedNamesToPlugins$jscomp$inline_294 = {
    ResponderEventPlugin: ResponderEventPlugin,
    ReactNativeBridgeEventPlugin: {
      eventTypes: {},
      extractEvents: function (
        topLevelType,
        targetInst,
        nativeEvent,
        nativeEventTarget
      ) {
        if (null == targetInst) return null;
        var bubbleDispatchConfig = customBubblingEventTypes[topLevelType],
          directDispatchConfig = customDirectEventTypes[topLevelType];
        if (!bubbleDispatchConfig && !directDispatchConfig)
          throw Error(
            'Unsupported top level event type "' + topLevelType + '" dispatched'
          );
        topLevelType = SyntheticEvent.getPooled(
          bubbleDispatchConfig || directDispatchConfig,
          targetInst,
          nativeEvent,
          nativeEventTarget
        );
        if (bubbleDispatchConfig)
          null != topLevelType &&
          null != topLevelType.dispatchConfig.phasedRegistrationNames &&
          topLevelType.dispatchConfig.phasedRegistrationNames.skipBubbling
            ? topLevelType &&
              topLevelType.dispatchConfig.phasedRegistrationNames &&
              traverseTwoPhase(
                topLevelType._targetInst,
                accumulateDirectionalDispatches,
                topLevelType,
                !0
              )
            : forEachAccumulated(
                topLevelType,
                accumulateTwoPhaseDispatchesSingle
              );
        else if (directDispatchConfig)
          forEachAccumulated(topLevelType, accumulateDirectDispatchesSingle);
        else return null;
        return topLevelType;
      }
    }
  },
  isOrderingDirty$jscomp$inline_295 = !1,
  pluginName$jscomp$inline_296;
for (pluginName$jscomp$inline_296 in injectedNamesToPlugins$jscomp$inline_294)
  if (
    injectedNamesToPlugins$jscomp$inline_294.hasOwnProperty(
      pluginName$jscomp$inline_296
    )
  ) {
    var pluginModule$jscomp$inline_297 =
      injectedNamesToPlugins$jscomp$inline_294[pluginName$jscomp$inline_296];
    if (
      !namesToPlugins.hasOwnProperty(pluginName$jscomp$inline_296) ||
      namesToPlugins[pluginName$jscomp$inline_296] !==
        pluginModule$jscomp$inline_297
    ) {
      if (namesToPlugins[pluginName$jscomp$inline_296])
        throw Error(
          "EventPluginRegistry: Cannot inject two different event plugins using the same name, `" +
            (pluginName$jscomp$inline_296 + "`.")
        );
      namesToPlugins[pluginName$jscomp$inline_296] =
        pluginModule$jscomp$inline_297;
      isOrderingDirty$jscomp$inline_295 = !0;
    }
  }
isOrderingDirty$jscomp$inline_295 && recomputePluginOrdering();
function batchedUpdatesImpl(fn, bookkeeping) {
  return fn(bookkeeping);
}
var isInsideEventHandler = !1;
function batchedUpdates$1(fn, bookkeeping) {
  if (isInsideEventHandler) return fn(bookkeeping);
  isInsideEventHandler = !0;
  try {
    return batchedUpdatesImpl(fn, bookkeeping);
  } finally {
    isInsideEventHandler = !1;
  }
}
var eventQueue = null;
function executeDispatchesAndReleaseTopLevel(e) {
  if (e) {
    var dispatchListeners = e._dispatchListeners,
      dispatchInstances = e._dispatchInstances;
    if (isArrayImpl(dispatchListeners))
      for (
        var i = 0;
        i < dispatchListeners.length && !e.isPropagationStopped();
        i++
      )
        executeDispatch(e, dispatchListeners[i], dispatchInstances[i]);
    else
      dispatchListeners &&
        executeDispatch(e, dispatchListeners, dispatchInstances);
    e._dispatchListeners = null;
    e._dispatchInstances = null;
    e.isPersistent() || e.constructor.release(e);
  }
}
var _enableNativeEventTargetEventDispatching = null;
function dispatchEvent(target, topLevelType, nativeEventParam) {
  var nativeEvent =
      null != nativeEventParam && "object" === typeof nativeEventParam
        ? nativeEventParam
        : {},
    eventTarget = null;
  null != target &&
    ((nativeEventParam = target.stateNode),
    null != nativeEventParam &&
      (eventTarget = getPublicInstance(nativeEventParam)));
  batchedUpdates$1(function () {
    var event = { eventName: topLevelType, nativeEvent: nativeEvent };
    reactPrivateInterface.RawEventEmitter.emit(topLevelType, event);
    reactPrivateInterface.RawEventEmitter.emit("*", event);
    null == _enableNativeEventTargetEventDispatching &&
      ((event =
        null != reactPrivateInterface.ReactNativeFeatureFlags
          ? reactPrivateInterface.ReactNativeFeatureFlags
              .enableNativeEventTargetEventDispatching
          : null),
      (_enableNativeEventTargetEventDispatching =
        "function" === typeof event && event()));
    if (_enableNativeEventTargetEventDispatching)
      null != eventTarget &&
        reactPrivateInterface.dispatchNativeEvent(
          eventTarget,
          topLevelType,
          nativeEvent
        );
    else {
      event = eventTarget;
      for (
        var events = null, legacyPlugins = plugins, i = 0;
        i < legacyPlugins.length;
        i++
      ) {
        var possiblePlugin = legacyPlugins[i];
        possiblePlugin &&
          (possiblePlugin = possiblePlugin.extractEvents(
            topLevelType,
            target,
            nativeEvent,
            event
          )) &&
          (events = accumulateInto(events, possiblePlugin));
      }
      event = events;
      null !== event && (eventQueue = accumulateInto(eventQueue, event));
      event = eventQueue;
      eventQueue = null;
      if (event) {
        forEachAccumulated(event, executeDispatchesAndReleaseTopLevel);
        if (eventQueue)
          throw Error(
            "processEventQueue(): Additional events were enqueued while processing an event queue. Support for this has not yet been implemented."
          );
        if (hasError)
          throw (
            ((event = caughtError),
            (hasError = !1),
            (caughtError = null),
            event)
          );
      }
    }
  });
}
var scheduleCallback$3 = Scheduler.unstable_scheduleCallback,
  cancelCallback$1 = Scheduler.unstable_cancelCallback,
  shouldYield = Scheduler.unstable_shouldYield,
  requestPaint = Scheduler.unstable_requestPaint,
  now = Scheduler.unstable_now,
  ImmediatePriority = Scheduler.unstable_ImmediatePriority,
  UserBlockingPriority = Scheduler.unstable_UserBlockingPriority,
  NormalPriority$1 = Scheduler.unstable_NormalPriority,
  IdlePriority = Scheduler.unstable_IdlePriority,
  log$1 = Scheduler.log,
  unstable_setDisableYieldValue = Scheduler.unstable_setDisableYieldValue,
  rendererID = null,
  injectedHook = null;
function setIsStrictModeForDevtools(newIsStrictMode: boolean): void {
  "function" === typeof log$1 && unstable_setDisableYieldValue!(newIsStrictMode);
  if (injectedHook && "function" === typeof injectedHook.setStrictMode)
    try {
      injectedHook.setStrictMode(rendererID, newIsStrictMode);
    } catch (err) {}
}
var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback,
  log = Math.log,
  LN2 = Math.LN2;
function clz32Fallback(x: number): number {
  x >>>= 0;
  return 0 === x ? 32 : (31 - ((log(x) / LN2) | 0)) | 0;
}
var nextTransitionUpdateLane = 256,
  nextTransitionDeferredLane = 262144,
  nextRetryLane = 4194304;
function getHighestPriorityLanes(lanes: RR.Lanes): RR.Lanes {
  var pendingSyncLanes: RR.Lanes = lanes & 42;
  if (0 !== pendingSyncLanes) return pendingSyncLanes;
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
      return lanes & -lanes;
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return lanes & 3932160;
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
      return lanes;
  }
}
function getNextLanes(root: RR.FiberRoot | RR.Lanes, wipLanes: RR.Lanes, rootHasPendingCommit: boolean | RR.Lanes | RR.Lane): RR.Lanes {
  var pendingLanes: RR.Lanes = (root as RR.FiberRoot).pendingLanes;
  if (0 === pendingLanes) return 0;
  var nextLanes: RR.Lanes = 0,
    suspendedLanes: RR.Lanes = (root as RR.FiberRoot).suspendedLanes,
    pingedLanes: RR.Lanes = (root as RR.FiberRoot).pingedLanes;
  root = (root as RR.FiberRoot).warmLanes;
  var nonIdlePendingLanes: RR.Lanes = pendingLanes & 134217727;
  0 !== nonIdlePendingLanes
    ? ((pendingLanes = nonIdlePendingLanes & ~suspendedLanes),
      0 !== pendingLanes
        ? (nextLanes = getHighestPriorityLanes(pendingLanes))
        : ((pingedLanes &= nonIdlePendingLanes),
          0 !== pingedLanes
            ? (nextLanes = getHighestPriorityLanes(pingedLanes))
            : (rootHasPendingCommit as boolean) ||
              ((rootHasPendingCommit = nonIdlePendingLanes & ~root),
              0 !== rootHasPendingCommit &&
                (nextLanes = getHighestPriorityLanes(rootHasPendingCommit)))))
    : ((nonIdlePendingLanes = pendingLanes & ~suspendedLanes),
      0 !== nonIdlePendingLanes
        ? (nextLanes = getHighestPriorityLanes(nonIdlePendingLanes))
        : 0 !== pingedLanes
          ? (nextLanes = getHighestPriorityLanes(pingedLanes))
          : (rootHasPendingCommit as boolean) ||
            ((rootHasPendingCommit = pendingLanes & ~root),
            0 !== rootHasPendingCommit &&
              (nextLanes = getHighestPriorityLanes(rootHasPendingCommit))));
  return 0 === nextLanes
    ? 0
    : 0 !== wipLanes &&
        wipLanes !== nextLanes &&
        0 === (wipLanes & suspendedLanes) &&
        ((suspendedLanes = nextLanes & -nextLanes),
        (rootHasPendingCommit = wipLanes & -wipLanes),
        suspendedLanes >= rootHasPendingCommit ||
          (32 === suspendedLanes && 0 !== (rootHasPendingCommit & 4194048)))
      ? wipLanes
      : nextLanes;
}
function checkIfRootIsPrerendering(root: RR.FiberRoot, renderLanes: RR.Lanes): boolean {
  return (
    0 ===
    (root.pendingLanes &
      ~(root.suspendedLanes & ~root.pingedLanes) &
      renderLanes)
  );
}
function getEntangledLanes(root: RR.FiberRoot | RR.LaneMap<RR.Lanes>, renderLanes: RR.Lanes): RR.Lanes {
  0 !== (renderLanes & 8) && (renderLanes |= renderLanes & 32);
  var allEntangledLanes: RR.Lanes = (root as RR.FiberRoot).entangledLanes;
  if (0 !== allEntangledLanes)
    for (
      root = (root as RR.FiberRoot).entanglements, allEntangledLanes &= renderLanes;
      0 < allEntangledLanes;

    ) {
      var index$6 = 31 - clz32(allEntangledLanes),
        lane: RR.Lane = 1 << index$6;
      renderLanes |= (root as RR.LaneMap<RR.Lanes>)[index$6];
      allEntangledLanes &= ~lane;
    }
  return renderLanes;
}
function computeExpirationTime(lane: RR.Lane, currentTime: RR.Milliseconds): RR.Milliseconds {
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
      return currentTime + 5e3;
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
      return -1;
  }
}
function claimNextRetryLane(): RR.Lane {
  var lane: RR.Lane = nextRetryLane;
  nextRetryLane <<= 1;
  0 === (nextRetryLane & 62914560) && (nextRetryLane = 4194304);
  return lane;
}
function createLaneMap<T>(initial: T): RR.LaneMap<T> {
  for (var laneMap: RR.LaneMap<T> = [], i = 0; 31 > i; i++) laneMap.push(initial);
  return laneMap;
}
function markRootUpdated$1(root: RR.FiberRoot, updateLane: RR.Lane): void {
  root.pendingLanes |= updateLane;
  268435456 !== updateLane &&
    ((root.suspendedLanes = 0), (root.pingedLanes = 0), (root.warmLanes = 0));
}
function markRootFinished(
  root: RR.FiberRoot,
  finishedLanes: RR.Lanes,
  remainingLanes: RR.Lanes,
  spawnedLane: RR.Lane,
  updatedLanes: RR.Lanes,
  suspendedRetryLanes: RR.Lanes
): void {
  var previouslyPendingLanes: RR.Lanes = root.pendingLanes;
  root.pendingLanes = remainingLanes;
  root.suspendedLanes = 0;
  root.pingedLanes = 0;
  root.warmLanes = 0;
  root.expiredLanes &= remainingLanes;
  root.entangledLanes &= remainingLanes;
  root.errorRecoveryDisabledLanes &= remainingLanes;
  root.shellSuspendCounter = 0;
  var entanglements = root.entanglements,
    expirationTimes = root.expirationTimes,
    hiddenUpdates = root.hiddenUpdates;
  for (
    remainingLanes = previouslyPendingLanes & ~remainingLanes;
    0 < remainingLanes;

  ) {
    var index$9 = 31 - clz32(remainingLanes),
      lane = 1 << index$9;
    entanglements[index$9] = 0;
    expirationTimes[index$9] = -1;
    var hiddenUpdatesForLane = hiddenUpdates[index$9]!;
    if (null !== hiddenUpdatesForLane)
      for (
        hiddenUpdates[index$9] = null, index$9 = 0;
        index$9 < hiddenUpdatesForLane.length;
        index$9++
      ) {
        var update = hiddenUpdatesForLane[index$9]!;
        null !== update && (update.lane &= -536870913);
      }
    remainingLanes &= ~lane;
  }
  0 !== spawnedLane && markSpawnedDeferredLane(root, spawnedLane, 0);
  0 !== suspendedRetryLanes &&
    0 === updatedLanes &&
    (root.suspendedLanes |=
      suspendedRetryLanes & ~(previouslyPendingLanes & ~finishedLanes));
}
function markSpawnedDeferredLane(root: RR.FiberRoot, spawnedLane: RR.Lane, entangledLanes: RR.Lanes): void {
  root.pendingLanes |= spawnedLane;
  root.suspendedLanes &= ~spawnedLane;
  var spawnedLaneIndex = 31 - clz32(spawnedLane);
  root.entangledLanes |= spawnedLane;
  root.entanglements[spawnedLaneIndex] =
    root.entanglements[spawnedLaneIndex]! |
    1073741824 |
    (entangledLanes & 261930);
}
function markRootEntangled(root: RR.FiberRoot | RR.FiberRoot["entanglements"], entangledLanes: RR.Lanes): void {
  var rootEntangledLanes: RR.Lanes = ((root as RR.FiberRoot).entangledLanes |= entangledLanes);
  for (root = (root as RR.FiberRoot).entanglements; rootEntangledLanes; ) {
    var index$10 = 31 - clz32(rootEntangledLanes),
      lane = 1 << index$10;
    (lane & entangledLanes) | ((root as RR.FiberRoot["entanglements"])[index$10]! & entangledLanes) &&
      ((root as RR.FiberRoot["entanglements"])[index$10]! |= entangledLanes);
    rootEntangledLanes &= ~lane;
  }
}
function getBumpedLaneForHydration(root: RR.FiberRoot, renderLanes: RR.Lanes): RR.Lane {
  var renderLane: RR.Lane = renderLanes & -renderLanes;
  if (0 !== (renderLane & 42)) renderLane = 1;
  else
    switch (renderLane) {
      case 2:
        renderLane = 1;
        break;
      case 8:
        renderLane = 4;
        break;
      case 32:
        renderLane = 16;
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
        renderLane = 128;
        break;
      case 268435456:
        renderLane = 134217728;
        break;
      default:
        renderLane = 0;
    }
  return 0 !== (renderLane & (root.suspendedLanes | renderLanes))
    ? 0
    : renderLane;
}
function lanesToEventPriority(lanes: RR.Lanes): RR.EventPriority {
  lanes &= -lanes;
  return 2 < lanes
    ? 8 < lanes
      ? 0 !== (lanes & 134217727)
        ? 32
        : 268435456
      : 8
    : 2;
}
function getNearestMountedFiber(fiber: RR.Fiber | null): RR.Fiber | null {
  for (var node: RR.Fiber = (fiber as RR.Fiber), nextNode: RR.Fiber | null = node; nextNode && !nextNode.alternate; )
    (node = nextNode),
      0 !== (node.flags & 4098) && (fiber = node.return),
      (nextNode = node.return);
  for (; node.return; ) node = node.return;
  return 3 === node.tag ? fiber : null;
}
function assertIsMounted(fiber: RR.Fiber): void {
  if (getNearestMountedFiber(fiber) !== fiber)
    throw Error("Unable to find node on an unmounted component.");
}
function findCurrentFiberUsingSlowPath(fiber: RR.Fiber): RR.Fiber | null {
  var alternate: RR.Fiber | null = fiber.alternate;
  if (!alternate) {
    alternate = getNearestMountedFiber(fiber);
    if (null === alternate)
      throw Error("Unable to find node on an unmounted component.");
    return alternate !== fiber ? null : fiber;
  }
  for (var a: RR.Fiber = fiber, b: RR.Fiber | null = alternate; ; ) {
    var parentA: RR.Fiber | null = a.return;
    if (null === parentA) break;
    var parentB: RR.Fiber | null = parentA.alternate;
    if (null === parentB) {
      b = parentA.return;
      if (null !== b) {
        a = b;
        continue;
      }
      break;
    }
    if (parentA.child === parentB.child) {
      for (parentB = parentA.child; parentB; ) {
        if (parentB === a) return assertIsMounted(parentA), fiber;
        if (parentB === b) return assertIsMounted(parentA), alternate;
        parentB = parentB.sibling;
      }
      throw Error("Unable to find node on an unmounted component.");
    }
    if (a.return !== b.return) (a = parentA), (b = parentB);
    else {
      for (var didFindChild = !1, child$11 = parentA.child; child$11; ) {
        if (child$11 === a) {
          didFindChild = !0;
          a = parentA;
          b = parentB;
          break;
        }
        if (child$11 === b) {
          didFindChild = !0;
          b = parentA;
          a = parentB;
          break;
        }
        child$11 = child$11.sibling;
      }
      if (!didFindChild) {
        for (child$11 = parentB.child; child$11; ) {
          if (child$11 === a) {
            didFindChild = !0;
            a = parentB;
            b = parentA;
            break;
          }
          if (child$11 === b) {
            didFindChild = !0;
            b = parentB;
            a = parentA;
            break;
          }
          child$11 = child$11.sibling;
        }
        if (!didFindChild)
          throw Error(
            "Child was not found in either parent set. This indicates a bug in React related to the return pointer. Please file an issue."
          );
      }
    }
    if (a.alternate !== b)
      throw Error(
        "Return fibers should always be each others' alternates. This error is likely caused by a bug in React. Please file an issue."
      );
  }
  if (3 !== a.tag)
    throw Error("Unable to find node on an unmounted component.");
  return (a.stateNode as RR.FiberRoot).current === a ? fiber : alternate;
}
function findCurrentHostFiberImpl(node: RR.Fiber | null): RR.Fiber | null {
  var tag: RR.WorkTag | RR.Fiber | null = node!.tag;
  if (5 === tag || 26 === tag || 27 === tag || 6 === tag) return node!;
  for (node = node!.child; null !== node; ) {
    tag = findCurrentHostFiberImpl(node);
    if (null !== tag) return tag;
    node = node.sibling;
  }
  return null;
}
function traverseVisibleInstancesAndTextInstances(
  child,
  searchWithinHosts,
  fn,
  a,
  b,
  c
) {
  for (; null !== child; ) {
    if (
      ((5 === child.tag || 27 === child.tag || 6 === child.tag) &&
        fn(child, a, b, c)) ||
      ((22 !== child.tag || null === child.memoizedState) &&
        (searchWithinHosts || (5 !== child.tag && 27 !== child.tag)) &&
        traverseVisibleInstancesAndTextInstances(
          child.child,
          searchWithinHosts,
          fn,
          a,
          b,
          c
        ))
    )
      return !0;
    child = child.sibling;
  }
  return !1;
}
function getFragmentParentInstanceOrContainerFiber(fiber) {
  for (fiber = fiber.return; null !== fiber; ) {
    if (3 === fiber.tag || 5 === fiber.tag || 27 === fiber.tag) return fiber;
    fiber = fiber.return;
  }
  return null;
}
function findFragmentInstanceOrTextInstanceSiblings(
  result,
  self,
  child,
  state
) {
  for (; null !== child; ) {
    if (child === self) state.foundSelf = !0;
    else if (5 === child.tag || 27 === child.tag || 6 === child.tag) {
      if (state.foundSelf) return (result[1] = child), !0;
      result[0] = child;
    } else if (
      (22 !== child.tag || null === child.memoizedState) &&
      findFragmentInstanceOrTextInstanceSiblings(
        result,
        self,
        child.child,
        state
      )
    )
      return !0;
    child = child.sibling;
  }
  return !1;
}
var valueStack = [],
  index = -1;
function createCursor<T>(defaultValue: T): RR.StackCursor<T> {
  return { current: defaultValue };
}
function pop<T>(cursor: RR.StackCursor<T>): void {
  0 > index ||
    ((cursor.current = valueStack[index]), (valueStack[index] = null), index--);
}
function push<T>(cursor: RR.StackCursor<T>, value: T): void {
  index++;
  valueStack[index] = cursor.current;
  cursor.current = value;
}
var emptyContextObject = {},
  globalClientIdCounter$1 = 0;
function getViewTransitionName(props: RR.ViewTransitionProps | string, instance: RR.ViewTransitionState): string {
  if (null != (props as RR.ViewTransitionProps).name && "auto" !== (props as RR.ViewTransitionProps).name) return (props as RR.ViewTransitionProps).name!;
  if (null !== instance.autoName) return instance.autoName;
  props = pendingEffectsRoot!.identifierPrefix;
  var globalClientId: number = globalClientIdCounter$1++;
  props = "_" + props + "t_" + globalClientId.toString(32) + "_";
  return (instance.autoName = props);
}
function getClassNameByType(classByType: RR.ViewTransitionClass): string | null | undefined {
  if (null == classByType || "string" === typeof classByType)
    return classByType;
  var className: string | null = null,
    activeTypes: string[] | null = pendingTransitionTypes;
  if (null !== activeTypes)
    for (var i = 0; i < activeTypes.length; i++) {
      var match: string | undefined = classByType[activeTypes[i]];
      if (null != match) {
        if ("none" === match) return "none";
        className = null == className ? match : className + (" " + match);
      }
    }
  return null == className ? classByType.default : className;
}
function getViewTransitionClassName(defaultClass: RR.ViewTransitionClass, eventClass: RR.ViewTransitionClass): string | null | undefined {
  defaultClass = getClassNameByType(defaultClass);
  eventClass = getClassNameByType(eventClass);
  return null == eventClass
    ? "auto" === defaultClass
      ? null
      : defaultClass
    : "auto" === eventClass
      ? null
      : eventClass;
}
function is(x: unknown, y: any): boolean {
  return (x === y && (0 !== x || 1 / x === 1 / y)) || (x !== x && y !== y);
}
var objectIs = "function" === typeof Object.is ? Object.is : is,
  reportGlobalError =
    "function" === typeof reportError
      ? reportError
      : function (error) {
          if (
            "object" === typeof window &&
            "function" === typeof window.ErrorEvent
          ) {
            var event = new window.ErrorEvent("error", {
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
        },
  hasOwnProperty = Object.prototype.hasOwnProperty,
  CapturedStacks = new WeakMap();
function createCapturedValueAtFiber(value: RR.Thrown, source: RR.Fiber | RR.CapturedValue): RR.CapturedValue {
  if ("object" === typeof value && null !== value) {
    var existing = CapturedStacks.get(value);
    if (void 0 !== existing) return existing;
    source = {
      value: value,
      source: (source as RR.Fiber),
      stack: getStackByFiberInDevAndProd((source as RR.Fiber))
    } as RR.CapturedValue;
    CapturedStacks.set(value, source);
    return source;
  }
  return {
    value: value,
    source: (source as RR.Fiber),
    stack: getStackByFiberInDevAndProd((source as RR.Fiber))
  };
}
var contextStackCursor = createCursor(null),
  contextFiberStackCursor = createCursor(null),
  rootInstanceStackCursor = createCursor(null),
  hostTransitionProviderCursor = createCursor(null);
function pushHostContainer(fiber: RR.Fiber | RR.HostContext, nextRootInstance: RR.Container): void {
  push(rootInstanceStackCursor, nextRootInstance);
  push(contextFiberStackCursor, (fiber as RR.Fiber));
  push(contextStackCursor, null);
  fiber = PROD_HOST_CONTEXT;
  pop(contextStackCursor);
  push(contextStackCursor, fiber);
}
function popHostContainer(): void {
  pop(contextStackCursor);
  pop(contextFiberStackCursor);
  pop(rootInstanceStackCursor);
}
function pushHostContext(fiber: RR.Fiber): void {
  var stateHook: RR.Hook | RR.HostContext | RR.MemoizedState = fiber.memoizedState;
  null !== stateHook &&
    ((HostTransitionContext._currentValue2 = stateHook.memoizedState),
    push(hostTransitionProviderCursor, fiber));
  stateHook = contextStackCursor.current;
  stateHook !== stateHook &&
    (push(contextFiberStackCursor, fiber), push(contextStackCursor, stateHook));
}
function popHostContext(fiber: RR.Fiber): void {
  contextFiberStackCursor.current === fiber &&
    (pop(contextStackCursor), pop(contextFiberStackCursor));
  hostTransitionProviderCursor.current === fiber &&
    (pop(hostTransitionProviderCursor),
    (HostTransitionContext._currentValue2 = null));
}
var hydrationErrors = null;
function upgradeHydrationErrorsToRecoverable(): RR.CapturedValue[] | null {
  var queuedErrors = hydrationErrors;
  null !== queuedErrors &&
    (null === workInProgressRootRecoverableErrors
      ? (workInProgressRootRecoverableErrors = queuedErrors)
      : workInProgressRootRecoverableErrors.push.apply(
          workInProgressRootRecoverableErrors,
          queuedErrors
        ),
    (hydrationErrors = null));
  return queuedErrors;
}
var valueCursor = createCursor(null),
  currentlyRenderingFiber$1 = null,
  lastContextDependency = null;
function pushProvider<T>(providerFiber: RR.Fiber, context: RR.ReactContext<T>, nextValue: T): void {
  push(valueCursor, context._currentValue2);
  context._currentValue2 = nextValue;
}
function popProvider(context: RR.ReactContext): void {
  context._currentValue2 = valueCursor.current;
  pop(valueCursor);
}
function scheduleContextWorkOnParentPath(
  parent: RR.Fiber | null,
  renderLanes: RR.Lanes,
  propagationRoot: RR.Fiber
): void {
  for (; null !== parent; ) {
    var alternate = parent.alternate;
    (parent.childLanes & renderLanes) !== renderLanes
      ? ((parent.childLanes |= renderLanes),
        null !== alternate && (alternate.childLanes |= renderLanes))
      : null !== alternate &&
        (alternate.childLanes & renderLanes) !== renderLanes &&
        (alternate.childLanes |= renderLanes);
    if (parent === propagationRoot) break;
    parent = parent.return;
  }
}
function propagateContextChanges(
  workInProgress: RR.Fiber,
  contexts: RR.ReactContext[],
  renderLanes: RR.Lanes,
  forcePropagateEntireTree: boolean
): void {
  var fiber = workInProgress.child;
  null !== fiber && (fiber.return = workInProgress);
  for (; null !== fiber; ) {
    var list: RR.Dependencies | RR.ContextDependency | RR.Fiber | null = fiber.dependencies;
    if (null !== list) {
      var nextFiber = fiber.child;
      list = list.firstContext;
      a: for (; null !== list; ) {
        var dependency: RR.ContextDependency | RR.Fiber | null = list;
        list = fiber;
        for (var i = 0; i < contexts.length; i++)
          if (dependency.context === contexts[i]) {
            list.lanes |= renderLanes;
            dependency = list.alternate;
            null !== dependency && (dependency.lanes |= renderLanes);
            scheduleContextWorkOnParentPath(
              list.return,
              renderLanes,
              workInProgress
            );
            forcePropagateEntireTree || (nextFiber = null);
            break a;
          }
        list = dependency.next;
      }
    } else if (18 === fiber.tag) {
      nextFiber = fiber.return;
      if (null === nextFiber)
        throw Error(
          "We just came from a parent so we must have had a parent. This is a bug in React."
        );
      nextFiber.lanes |= renderLanes;
      list = nextFiber.alternate;
      null !== list && (list.lanes |= renderLanes);
      scheduleContextWorkOnParentPath(nextFiber, renderLanes, workInProgress);
      nextFiber = null;
    } else
      13 === fiber.tag &&
      null !== fiber.memoizedState &&
      null === fiber.memoizedState.dehydrated
        ? ((fiber.lanes |= renderLanes),
          (nextFiber = fiber.alternate),
          null !== nextFiber && (nextFiber.lanes |= renderLanes),
          scheduleContextWorkOnParentPath(
            fiber.return,
            renderLanes,
            workInProgress
          ),
          (nextFiber = fiber.child),
          (nextFiber = null !== nextFiber ? nextFiber.sibling : null))
        : (nextFiber = fiber.child);
    if (null !== nextFiber) nextFiber.return = fiber;
    else
      for (nextFiber = fiber; null !== nextFiber; ) {
        if (nextFiber === workInProgress) {
          nextFiber = null;
          break;
        }
        fiber = nextFiber.sibling;
        if (null !== fiber) {
          fiber.return = nextFiber.return;
          nextFiber = fiber;
          break;
        }
        nextFiber = nextFiber.return;
      }
    fiber = nextFiber;
  }
}
function propagateParentContextChanges(
  current: RR.Fiber | RR.ReactContext[] | null,
  workInProgress: RR.Fiber,
  renderLanes: RR.Lanes,
  forcePropagateEntireTree: boolean
): void {
  current = null;
  for (
    var parent: RR.Fiber | null = workInProgress, isInsidePropagationBailout = !1;
    null !== parent;

  ) {
    if (!isInsidePropagationBailout)
      if (0 !== (parent.flags & 524288)) isInsidePropagationBailout = !0;
      else if (0 !== (parent.flags & 262144)) break;
    if (10 === parent.tag) {
      var currentParent: RR.Fiber | RR.ProviderProps | null = parent.alternate;
      if (null === currentParent)
        throw Error("Should have a current fiber. This is a bug in React.");
      currentParent = currentParent.memoizedProps as RR.ProviderProps | null;
      if (null !== currentParent) {
        var context: RR.ReactContext = parent.type as RR.ReactContext;
        objectIs(parent.pendingProps.value, currentParent.value) ||
          (null !== current ? current.push(context) : (current = [context]));
      }
    } else if (parent === hostTransitionProviderCursor.current) {
      currentParent = parent.alternate;
      if (null === currentParent)
        throw Error("Should have a current fiber. This is a bug in React.");
      (currentParent.memoizedState as RR.Hook).memoizedState !==
        (parent.memoizedState as RR.Hook).memoizedState &&
        (null !== current
          ? current.push(HostTransitionContext)
          : (current = [HostTransitionContext]));
    }
    parent = parent.return;
  }
  null !== current &&
    propagateContextChanges(
      workInProgress,
      current,
      renderLanes,
      forcePropagateEntireTree
    );
  workInProgress.flags |= 262144;
  return null !== current;
}
function checkIfContextChanged(currentDependencies: RR.Dependencies | RR.ContextDependency | null): boolean {
  for (
    currentDependencies = (currentDependencies as RR.Dependencies).firstContext;
    null !== currentDependencies;

  ) {
    if (
      !objectIs(
        currentDependencies.context._currentValue2,
        (currentDependencies as RR.ContextDependency | null)!.memoizedValue
      )
    )
      return !0;
    currentDependencies = (currentDependencies as RR.ContextDependency | null)!.next;
  }
  return !1;
}
function prepareToReadContext(workInProgress: RR.Fiber | RR.Dependencies | null): void {
  currentlyRenderingFiber$1 = (workInProgress as RR.Fiber);
  lastContextDependency = null;
  workInProgress = (workInProgress as RR.Fiber).dependencies;
  null !== workInProgress && ((workInProgress as RR.Dependencies | null)!.firstContext = null);
}
function readContext<T>(context: RR.ReactContext<T>): T {
  return readContextForConsumer(currentlyRenderingFiber$1, context);
}
function readContextDuringReconciliation<T>(consumer: RR.Fiber, context: RR.ReactContext<T>): T {
  null === currentlyRenderingFiber$1 && prepareToReadContext(consumer);
  return readContextForConsumer(consumer, context);
}
function readContextForConsumer<T>(consumer: RR.Fiber | null, context: RR.ReactContext<T> | RR.ContextDependency): T {
  var value = context._currentValue2;
  context = { context: context, memoizedValue: value, next: null };
  if (null === lastContextDependency) {
    if (null === consumer)
      throw Error(
        "Context can only be read while React is rendering. In classes, you can read it in the render method or getDerivedStateFromProps. In function components, you can read it directly in the function body, but not inside Hooks like useReducer() or useMemo()."
      );
    lastContextDependency = context;
    consumer.dependencies = { lanes: 0, firstContext: context };
    consumer.flags |= 524288;
  } else lastContextDependency = lastContextDependency.next = context;
  return value;
}
var AbortControllerLocal =
    "undefined" !== typeof AbortController
      ? AbortController
      : function () {
          var listeners = [],
            signal = (this.signal = {
              aborted: !1,
              addEventListener: function (type, listener) {
                listeners.push(listener);
              }
            });
          this.abort = function () {
            signal.aborted = !0;
            listeners.forEach(function (listener) {
              return listener();
            });
          };
        },
  scheduleCallback$2 = Scheduler.unstable_scheduleCallback,
  NormalPriority = Scheduler.unstable_NormalPriority,
  CacheContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Consumer: null,
    Provider: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  };
function createCache(): RR.Cache {
  return {
    controller: new AbortControllerLocal(),
    data: new Map(),
    refCount: 0
  };
}
function releaseCache(cache: RR.Cache): void {
  cache.refCount--;
  0 === cache.refCount &&
    scheduleCallback$2(NormalPriority, function () {
      cache.controller.abort();
    });
}
function queueTransitionTypes(root: RR.FiberRoot | number, transitionTypes: string[]): void {
  if (0 !== ((root as RR.FiberRoot).pendingLanes & 4194048)) {
    var queued: string[] | null = (root as RR.FiberRoot).transitionTypes;
    null === queued && (queued = (root as RR.FiberRoot).transitionTypes = []);
    for (root = 0; root < transitionTypes.length; root++) {
      var transitionType: string = transitionTypes[root];
      -1 === queued.indexOf(transitionType) && queued.push(transitionType);
    }
  }
}
var entangledTransitionTypes = null;
function claimQueuedTransitionTypes(root: RR.FiberRoot): string[] | null {
  var claimed: string[] | null = root.transitionTypes;
  root.transitionTypes = null;
  return claimed;
}
function noop(): void {}
var firstScheduledRoot = null,
  lastScheduledRoot = null,
  didScheduleMicrotask = !1,
  mightHavePendingSyncWork = !1,
  isFlushingWork = !1,
  currentEventTransitionLane = 0;
function ensureRootIsScheduled(root: RR.FiberRoot): void {
  root !== lastScheduledRoot &&
    null === root.next &&
    (null === lastScheduledRoot
      ? (firstScheduledRoot = lastScheduledRoot = root)
      : (lastScheduledRoot = lastScheduledRoot.next = root));
  mightHavePendingSyncWork = !0;
  didScheduleMicrotask ||
    ((didScheduleMicrotask = !0), scheduleImmediateRootScheduleTask());
}
function flushSyncWorkAcrossRoots_impl(syncTransitionLanes: RR.Lanes, onlyLegacy: boolean): void {
  if (!isFlushingWork && mightHavePendingSyncWork) {
    isFlushingWork = !0;
    do {
      var didPerformSomeWork = !1;
      for (var root: RR.FiberRoot | null = firstScheduledRoot; null !== root; ) {
        if (!onlyLegacy || 0 === root.tag)
          if (0 !== syncTransitionLanes) {
            var pendingLanes = root.pendingLanes;
            if (0 === pendingLanes) var JSCompiler_inline_result: RR.Lanes = 0;
            else {
              var suspendedLanes = root.suspendedLanes,
                pingedLanes = root.pingedLanes;
              JSCompiler_inline_result =
                ((1 << (31 - clz32(42 | syncTransitionLanes) + 1)) - 1) as RR.Lanes;
              JSCompiler_inline_result &=
                pendingLanes & ~(suspendedLanes & ~pingedLanes);
              JSCompiler_inline_result =
                JSCompiler_inline_result & 201326741
                  ? (JSCompiler_inline_result & 201326741) | 1
                  : JSCompiler_inline_result
                    ? JSCompiler_inline_result | 2
                    : 0;
            }
            0 !== JSCompiler_inline_result &&
              ((didPerformSomeWork = !0),
              performSyncWorkOnRoot(root, JSCompiler_inline_result));
          } else
            (JSCompiler_inline_result = workInProgressRootRenderLanes),
              (JSCompiler_inline_result = getNextLanes(
                root,
                root === workInProgressRoot ? JSCompiler_inline_result : 0,
                null !== root.cancelPendingCommit || -1 !== root.timeoutHandle
              )),
              0 === (JSCompiler_inline_result & 3) ||
                checkIfRootIsPrerendering(root, JSCompiler_inline_result) ||
                ((didPerformSomeWork = !0),
                performSyncWorkOnRoot(root, JSCompiler_inline_result));
        root = root.next;
      }
    } while (didPerformSomeWork);
    isFlushingWork = !1;
  }
}
function processRootScheduleInImmediateTask(): void {
  processRootScheduleInMicrotask();
}
function processRootScheduleInMicrotask(): void {
  mightHavePendingSyncWork = didScheduleMicrotask = !1;
  for (
    var currentTime = now(), prev: RR.FiberRoot | null = null, root: RR.FiberRoot | null = firstScheduledRoot;
    null !== root;

  ) {
    var next = root.next,
      nextLanes = scheduleTaskForRootDuringMicrotask(root, currentTime);
    0 === nextLanes
      ? ((root.next = null),
        null === prev ? (firstScheduledRoot = next) : (prev.next = next),
        null === next && (lastScheduledRoot = prev))
      : ((prev = root),
        0 !== (nextLanes & 3) && (mightHavePendingSyncWork = !0));
    root = next;
  }
  (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus) ||
    flushSyncWorkAcrossRoots_impl(0, !1);
  0 !== currentEventTransitionLane && (currentEventTransitionLane = 0);
}
function scheduleTaskForRootDuringMicrotask(root: RR.FiberRoot, currentTime: RR.Milliseconds | RR.FiberRoot | RR.Lane | null): RR.Lane {
  for (
    var suspendedLanes: RR.Lanes | RR.SchedulerPriority | RR.SchedulerTask = root.suspendedLanes,
      pingedLanes: RR.Lanes | RR.SchedulerTask | RR.SchedulerCallback | null = root.pingedLanes,
      expirationTimes = root.expirationTimes,
      lanes = root.pendingLanes & -62914561;
    0 < lanes;

  ) {
    var index$7 = 31 - clz32(lanes),
      lane = 1 << index$7,
      expirationTime = expirationTimes[index$7]!;
    if (-1 === expirationTime) {
      if (0 === (lane & suspendedLanes) || 0 !== (lane & pingedLanes))
        expirationTimes[index$7] = computeExpirationTime(lane, (currentTime as RR.Milliseconds));
    } else expirationTime <= (currentTime as RR.Milliseconds) && (root.expiredLanes |= lane);
    lanes &= ~lane;
  }
  currentTime = workInProgressRoot;
  suspendedLanes = workInProgressRootRenderLanes;
  suspendedLanes = getNextLanes(
    root,
    root === currentTime ? suspendedLanes : 0,
    null !== root.cancelPendingCommit || -1 !== root.timeoutHandle
  );
  pingedLanes = ((root.callbackNode as RR.SchedulerTask | null | RR.Lanes) as RR.SchedulerTask | null);
  if (
    0 === suspendedLanes ||
    (root === currentTime &&
      (2 === workInProgressSuspendedReason ||
        9 === workInProgressSuspendedReason)) ||
    null !== root.cancelPendingCommit
  )
    return (
      null !== pingedLanes &&
        null !== pingedLanes &&
        cancelCallback$1(pingedLanes),
      (root.callbackNode = null),
      (root.callbackPriority = 0)
    );
  if (
    0 === (suspendedLanes & 3) ||
    checkIfRootIsPrerendering(root, suspendedLanes)
  ) {
    currentTime = suspendedLanes & -suspendedLanes;
    if (currentTime === root.callbackPriority) return currentTime;
    null !== pingedLanes && cancelCallback$1(pingedLanes);
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
    pingedLanes = ((performWorkOnRootViaSchedulerTask.bind(null, root) as RR.SchedulerCallback | RR.Lanes) as RR.SchedulerCallback);
    suspendedLanes = scheduleCallback$3(suspendedLanes, pingedLanes);
    root.callbackPriority = currentTime;
    root.callbackNode = suspendedLanes;
    return currentTime;
  }
  null !== pingedLanes && null !== pingedLanes && cancelCallback$1(pingedLanes);
  root.callbackPriority = 2;
  root.callbackNode = null;
  return 2;
}
function performWorkOnRootViaSchedulerTask(root: RR.FiberRoot, didTimeout: boolean): RR.SchedulerCallback | null {
  if (0 !== pendingEffectsStatus && 5 !== pendingEffectsStatus)
    return (root.callbackNode = null), (root.callbackPriority = 0), null;
  var originalCallbackNode = root.callbackNode;
  if (flushPendingEffects() && root.callbackNode !== originalCallbackNode)
    return null;
  var workInProgressRootRenderLanes$jscomp$0 = workInProgressRootRenderLanes;
  workInProgressRootRenderLanes$jscomp$0 = getNextLanes(
    root,
    root === workInProgressRoot ? workInProgressRootRenderLanes$jscomp$0 : 0,
    null !== root.cancelPendingCommit || -1 !== root.timeoutHandle
  );
  if (0 === workInProgressRootRenderLanes$jscomp$0) return null;
  performWorkOnRoot(root, workInProgressRootRenderLanes$jscomp$0, didTimeout);
  scheduleTaskForRootDuringMicrotask(root, now());
  return null != root.callbackNode && root.callbackNode === originalCallbackNode
    ? performWorkOnRootViaSchedulerTask.bind(null, root)
    : null;
}
function performSyncWorkOnRoot(root: RR.FiberRoot, lanes: RR.Lanes): null | undefined {
  if (flushPendingEffects()) return null;
  performWorkOnRoot(root, lanes, !0);
}
function scheduleImmediateRootScheduleTask(): void {
  scheduleMicrotask!(function () {
    0 !== (executionContext & 6)
      ? scheduleCallback$3(
          ImmediatePriority,
          processRootScheduleInImmediateTask
        )
      : processRootScheduleInMicrotask();
  });
}
function requestTransitionLane(): RR.Lane {
  if (0 === currentEventTransitionLane) {
    var actionScopeLane = currentEntangledLane;
    0 === actionScopeLane &&
      ((actionScopeLane = nextTransitionUpdateLane),
      (nextTransitionUpdateLane <<= 1),
      0 === (nextTransitionUpdateLane & 261888) &&
        (nextTransitionUpdateLane = 256));
    currentEventTransitionLane = actionScopeLane;
  }
  return currentEventTransitionLane;
}
var currentEntangledListeners = null,
  currentEntangledPendingCount = 0,
  currentEntangledLane = 0,
  currentEntangledActionThenable = null;
function entangleAsyncAction(transition: RR.Transition, thenable: RR.Wakeable): RR.Wakeable {
  if (null === currentEntangledListeners) {
    var entangledListeners: Array<() => unknown> = (currentEntangledListeners = []);
    currentEntangledPendingCount = 0;
    currentEntangledLane = requestTransitionLane();
    currentEntangledActionThenable = {
      status: "pending",
      value: void 0,
      then: function (resolve) {
        entangledListeners.push(resolve);
      }
    };
  }
  currentEntangledPendingCount++;
  thenable.then(pingEngtangledActionScope, pingEngtangledActionScope);
  return thenable;
}
function pingEngtangledActionScope(): void {
  if (
    0 === --currentEntangledPendingCount &&
    ((entangledTransitionTypes = null), null !== currentEntangledListeners)
  ) {
    null !== currentEntangledActionThenable &&
      (currentEntangledActionThenable.status = "fulfilled");
    var listeners: Array<() => unknown> = currentEntangledListeners;
    currentEntangledListeners = null;
    currentEntangledLane = 0;
    currentEntangledActionThenable = null;
    for (var i = 0; i < listeners.length; i++) (0, (listeners as any)[i])();
  }
}
function chainThenableValue<T>(thenable: RR.Thenable<unknown>, result: T): RR.ChainedThenable<T> {
  var listeners: Array<(value?: T) => unknown> = [],
    thenableWithOverride: RR.ChainedThenable<T> = {
      status: "pending",
      value: null,
      reason: null,
      then: function (resolve) {
        listeners.push(resolve);
      }
    };
  thenable.then(
    function () {
      thenableWithOverride.status = "fulfilled";
      thenableWithOverride.value = result;
      for (var i = 0; i < listeners.length; i++) (0, (listeners as any)[i])(result);
    },
    function (error: RR.Thrown | number) {
      thenableWithOverride.status = "rejected";
      thenableWithOverride.reason = error;
      for (error = 0; (error as number) < listeners.length; error++)
        (0, (listeners as any)[(error as number)])(void 0);
    }
  );
  return thenableWithOverride;
}
var prevOnStartTransitionFinish = ReactSharedInternals.S;
ReactSharedInternals.S = function (transition, returnValue) {
  globalMostRecentTransitionTime = now();
  "object" === typeof returnValue &&
    null !== returnValue &&
    "function" === typeof returnValue.then &&
    entangleAsyncAction(transition, returnValue);
  if (null !== entangledTransitionTypes)
    for (var root = firstScheduledRoot; null !== root; )
      queueTransitionTypes(root, entangledTransitionTypes), (root = root.next);
  root = transition.types;
  if (null !== root) {
    for (var root$18 = firstScheduledRoot; null !== root$18; )
      queueTransitionTypes(root$18, root), (root$18 = root$18.next);
    if (0 !== currentEntangledLane) {
      root$18 = entangledTransitionTypes;
      null === root$18 && (root$18 = entangledTransitionTypes = []);
      for (var i = 0; i < root.length; i++) {
        var transitionType = root[i];
        -1 === root$18.indexOf(transitionType) && root$18.push(transitionType);
      }
    }
  }
  null !== prevOnStartTransitionFinish &&
    prevOnStartTransitionFinish(transition, returnValue);
};
var resumedCache: RR.StackCursor<RR.Cache | null> = createCursor(null);
function peekCacheFromPool(): RR.Cache | null {
  var cacheResumedFromPreviousRender = resumedCache.current;
  return null !== cacheResumedFromPreviousRender
    ? cacheResumedFromPreviousRender
    : workInProgressRoot!.pooledCache;
}
function pushTransition(offscreenWorkInProgress: RR.Fiber, prevCachePool: RR.SpawnedCachePool | null): void {
  null === prevCachePool
    ? push(resumedCache, resumedCache.current)
    : push(resumedCache, prevCachePool.pool);
}
function getSuspendedCache(): RR.SpawnedCachePool | null {
  var cacheFromPool = peekCacheFromPool();
  return null === cacheFromPool
    ? null
    : { parent: CacheContext._currentValue2, pool: cacheFromPool };
}
function shallowEqual(objA: RR.Comparand, objB: RR.Comparand): boolean {
  if (objectIs(objA, objB)) return !0;
  if (
    "object" !== typeof objA ||
    null === objA ||
    "object" !== typeof objB ||
    null === objB
  )
    return !1;
  var keysA = Object.keys(objA),
    keysB: string[] | number = Object.keys(objB);
  if (keysA.length !== keysB.length) return !1;
  for (keysB = 0; keysB < keysA.length; keysB++) {
    var currentKey = keysA[keysB]!;
    if (
      !hasOwnProperty.call(objB, currentKey) ||
      !objectIs(objA[currentKey]!, objB[currentKey]!)
    )
      return !1;
  }
  return !0;
}
var SuspenseException = Error(
    "Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."
  ),
  SuspenseyCommitException = Error(
    "Suspense Exception: This is not a real error, and should not leak into userspace. If you're seeing this, it's likely a bug in React."
  ),
  SuspenseActionException = Error(
    "Suspense Exception: This is not a real error! It's an implementation detail of `useActionState` to interrupt the current render. You must either rethrow it immediately, or move the `useActionState` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary."
  ),
  noopSuspenseyCommitThenable = { then: function () {} };
function isThenableResolved(thenable: RR.Thenable<unknown> | string | undefined): boolean {
  thenable = (thenable as RR.Thenable<unknown>).status;
  return "fulfilled" === thenable || "rejected" === thenable;
}
function trackUsedThenable<T>(thenableState: RR.ThenableState | RR.Thrown | RR.FiberRoot | RR.Thenable<T> | null, thenable: RR.Thenable<T>, index: number | RR.ThenableState[number] | undefined): T | undefined {
  index = (thenableState as RR.ThenableState)[(index as number)];
  void 0 === index
    ? (thenableState as RR.ThenableState).push(thenable)
    : index !== thenable && (thenable.then(noop, noop), (thenable = (index as RR.ThenableState[number] | undefined)!));
  switch (thenable.status) {
    case "fulfilled":
      return thenable.value;
    case "rejected":
      thenableState = thenable.reason;
      checkIfUseWrappedInAsyncCatch(thenableState);
      if (void 0 === thenableState && !("reason" in thenable))
        throw Error(
          "A rejected Promise was passed to React without a `reason` property. React threw a generic error from where the Promise was used to assist in identifying the problematic Promise. Make sure that instrumented Promises correctly set the `reason` property when setting `status` to `'rejected'`."
        );
      throw thenableState;
    default:
      if ("string" === typeof thenable.status) thenable.then(noop, noop);
      else {
        thenableState = workInProgressRoot;
        if (null !== (thenableState as RR.FiberRoot | null) && 100 < (thenableState as RR.FiberRoot | null)!.shellSuspendCounter)
          throw Error(
            "An unknown Component is an async Client Component. Only Server Components can be async at the moment. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server."
          );
        thenableState = thenable;
        (thenableState as RR.Thenable<T>).status = "pending";
        (thenableState as RR.Thenable<T>).then(
          function (fulfilledValue: RR.UsedValue) {
            if ("pending" === thenable.status) {
              var fulfilledThenable = thenable;
              fulfilledThenable.status = "fulfilled";
              fulfilledThenable.value = fulfilledValue;
            }
          },
          function (error: RR.Thrown) {
            if ("pending" === thenable.status) {
              var rejectedThenable = thenable;
              rejectedThenable.status = "rejected";
              rejectedThenable.reason = error;
            }
          }
        );
      }
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw (
            ((thenableState = thenable.reason),
            checkIfUseWrappedInAsyncCatch(thenableState),
            thenableState)
          );
      }
      suspendedThenable = thenable;
      throw SuspenseException;
  }
}
function resolveLazy(lazyType: RR.LazyComponent): RR.LazyResult {
  try {
    var init = lazyType._init;
    return init(lazyType._payload);
  } catch (x: RR.Thrown) {
    if (null !== x && "object" === typeof x && "function" === typeof x.then)
      throw ((suspendedThenable = x), SuspenseException);
    throw x;
  }
}
var suspendedThenable = null;
function getSuspendedThenable(): RR.Thenable | RR.NoopThenable {
  if (null === suspendedThenable)
    throw Error(
      "Expected a suspended thenable. This is a bug in React. Please file an issue."
    );
  var thenable = suspendedThenable;
  suspendedThenable = null;
  return thenable;
}
function checkIfUseWrappedInAsyncCatch(rejectedReason: RR.Thrown): void {
  if (
    rejectedReason === SuspenseException ||
    rejectedReason === SuspenseActionException
  )
    throw Error(
      "Hooks are not supported inside an async component. This error is often caused by accidentally adding `'use client'` to a module that was originally written for the server."
    );
}
var thenableState$1 = null,
  thenableIndexCounter$1 = 0;
function unwrapThenable(thenable: RR.Thenable<RR.ReactNode>): RR.ReactNode {
  var index = thenableIndexCounter$1;
  thenableIndexCounter$1 += 1;
  null === thenableState$1 && (thenableState$1 = []);
  return trackUsedThenable(thenableState$1, thenable, index);
}
function coerceRef(workInProgress: RR.Fiber, element: RR.ReactElement | RR.Ref | undefined): void {
  element = (element as RR.ReactElement).props.ref as RR.Ref | undefined;
  workInProgress.ref = void 0 !== element ? element : null;
}
function throwOnInvalidObjectTypeImpl(returnFiber: RR.Fiber | string, newChild: RR.ReactNode): never {
  if (newChild.$$typeof === REACT_LEGACY_ELEMENT_TYPE)
    throw Error(
      'A React Element from an older version of React was rendered. This is not supported. It can happen if:\n- Multiple copies of the "react" package is used.\n- A library pre-bundled an old copy of "react" or "react/jsx-runtime".\n- A compiler tries to "inline" JSX instead of using the runtime.'
    );
  returnFiber = Object.prototype.toString.call(newChild);
  throw Error(
    "Objects are not valid as a React child (found: " +
      ("[object Object]" === returnFiber
        ? "object with keys {" + Object.keys(newChild).join(", ") + "}"
        : returnFiber) +
      "). If you meant to render a collection of children, use an array instead."
  );
}
function createChildReconciler(shouldTrackSideEffects: boolean): RR.ChildReconciler {
  function deleteChild(returnFiber: RR.Fiber, childToDelete: RR.Fiber): void {
    if (shouldTrackSideEffects) {
      var deletions = returnFiber.deletions;
      null === deletions
        ? ((returnFiber.deletions = [childToDelete]), (returnFiber.flags |= 16))
        : deletions.push(childToDelete);
    }
  }
  function deleteRemainingChildren(returnFiber: RR.Fiber, currentFirstChild: RR.Fiber | null): null {
    if (!shouldTrackSideEffects) return null;
    for (; null !== currentFirstChild; )
      deleteChild(returnFiber, currentFirstChild),
        (currentFirstChild = currentFirstChild.sibling);
    return null;
  }
  function mapRemainingChildren(currentFirstChild: RR.Fiber | null): RR.ExistingChildren {
    for (var existingChildren: RR.ExistingChildren = new Map(); null !== currentFirstChild; )
      null === currentFirstChild.key
        ? existingChildren.set(currentFirstChild.index, currentFirstChild)
        : existingChildren.set(currentFirstChild.key, currentFirstChild),
        (currentFirstChild = currentFirstChild.sibling);
    return existingChildren;
  }
  function useFiber(fiber: RR.Fiber, pendingProps: RR.Fiber["pendingProps"]): RR.Fiber {
    fiber = createWorkInProgress(fiber, pendingProps);
    fiber.index = 0;
    fiber.sibling = null;
    return fiber;
  }
  function placeChild(newFiber: RR.Fiber, lastPlacedIndex: number, newIndex: number | RR.Fiber | null): number {
    newFiber.index = (newIndex as number);
    if (!shouldTrackSideEffects)
      return (newFiber.flags |= 1048576), lastPlacedIndex;
    newIndex = newFiber.alternate;
    if (null !== newIndex)
      return (
        (newIndex = newIndex.index),
        newIndex < lastPlacedIndex
          ? ((newFiber.flags |= 2), lastPlacedIndex)
          : newIndex
      );
    newFiber.flags |= 134217730;
    return lastPlacedIndex;
  }
  function placeSingleChild(newFiber: RR.Fiber): RR.Fiber {
    shouldTrackSideEffects &&
      null === newFiber.alternate &&
      (newFiber.flags |= 134217730);
    return newFiber;
  }
  function updateTextNode(returnFiber: RR.Fiber, current: RR.Fiber | null, textContent: string, lanes: RR.Lanes): RR.Fiber {
    if (null === current || 6 !== current.tag)
      return (
        (current = createFiberFromText(textContent, returnFiber.mode, lanes)),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, textContent);
    current.return = returnFiber;
    return current;
  }
  function updateElement(returnFiber: RR.Fiber, current: RR.Fiber | null, element: RR.ReactElement, lanes: RR.Lanes): RR.Fiber {
    var elementType = element.type;
    if (elementType === REACT_FRAGMENT_TYPE)
      return (
        (returnFiber = updateFragment(
          returnFiber,
          current,
          element.props.children,
          lanes,
          element.key
        )),
        coerceRef(returnFiber, element),
        returnFiber
      );
    if (
      null !== current &&
      (current.elementType === elementType ||
        ("object" === typeof elementType &&
          null !== elementType &&
          elementType.$$typeof === REACT_LAZY_TYPE &&
          resolveLazy(elementType) === current.type))
    )
      return (
        (current = useFiber(current, element.props)),
        coerceRef(current, element),
        (current.return = returnFiber),
        current
      );
    current = createFiberFromTypeAndProps(
      element.type,
      element.key,
      element.props,
      null,
      returnFiber.mode,
      lanes
    );
    coerceRef(current, element);
    current.return = returnFiber;
    return current;
  }
  function updatePortal(returnFiber: RR.Fiber, current: RR.Fiber | null, portal: RR.ReactPortal, lanes: RR.Lanes): RR.Fiber {
    if (
      null === current ||
      4 !== current.tag ||
      (current.stateNode as RR.PortalState).containerInfo !== portal.containerInfo ||
      (current.stateNode as RR.PortalState).implementation !== portal.implementation
    )
      return (
        (current = createFiberFromPortal(portal, returnFiber.mode, lanes)),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, portal.children || []);
    current.return = returnFiber;
    return current;
  }
  function updateFragment(returnFiber: RR.Fiber, current: RR.Fiber | null, fragment: RR.ReactNode, lanes: RR.Lanes, key: string | null): RR.Fiber {
    if (null === current || 7 !== current.tag)
      return (
        (current = createFiberFromFragment(
          fragment,
          returnFiber.mode,
          lanes,
          key
        )),
        (current.return = returnFiber),
        current
      );
    current = useFiber(current, fragment);
    current.return = returnFiber;
    return current;
  }
  function createChild(returnFiber: RR.Fiber, newChild: RR.ReactNode | RR.Fiber | RR.ReactElement, lanes: RR.Lanes | RR.Fiber): RR.Fiber | null {
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return (
        (newChild = createFiberFromText(
          "" + newChild,
          returnFiber.mode,
          (lanes as RR.Lanes)
        )),
        ((newChild as RR.Fiber).return = returnFiber),
        (newChild as RR.Fiber)
      );
    if ("object" === typeof newChild && null !== newChild) {
      switch ((newChild as RR.ReactElement).$$typeof) {
        case REACT_ELEMENT_TYPE:
          return (
            (lanes = createFiberFromTypeAndProps(
              (newChild as RR.ReactElement).type,
              (newChild as RR.ReactElement).key,
              (newChild as RR.ReactElement).props,
              null,
              returnFiber.mode,
              (lanes as RR.Lanes)
            )),
            coerceRef(lanes, (newChild as RR.ReactElement)),
            (lanes.return = returnFiber),
            lanes
          );
        case REACT_PORTAL_TYPE:
          return (
            (newChild = createFiberFromPortal(
              newChild,
              returnFiber.mode,
              (lanes as RR.Lanes)
            )),
            ((newChild as RR.Fiber).return = returnFiber),
            (newChild as RR.Fiber)
          );
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            createChild(returnFiber, newChild, (lanes as RR.Lanes))
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return (
          (newChild = createFiberFromFragment(
            newChild,
            returnFiber.mode,
            (lanes as RR.Lanes),
            null
          )),
          ((newChild as RR.Fiber).return = returnFiber),
          (newChild as RR.Fiber)
        );
      if ("function" === typeof newChild.then)
        return createChild(returnFiber, unwrapThenable(newChild), (lanes as RR.Lanes));
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return createChild(
          returnFiber,
          readContextDuringReconciliation(returnFiber, newChild),
          (lanes as RR.Lanes)
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function updateSlot(returnFiber: RR.Fiber, oldFiber: RR.Fiber | null, newChild: RR.ReactNode | RR.ReactElement, lanes: RR.Lanes): RR.Fiber | null {
    var key = null !== oldFiber ? oldFiber.key : null;
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return null !== key
        ? null
        : updateTextNode(returnFiber, oldFiber, "" + newChild, lanes);
    if ("object" === typeof newChild && null !== newChild) {
      switch ((newChild as RR.ReactElement).$$typeof) {
        case REACT_ELEMENT_TYPE:
          return (newChild as RR.ReactElement).key === key
            ? updateElement(returnFiber, oldFiber, (newChild as RR.ReactElement), lanes)
            : null;
        case REACT_PORTAL_TYPE:
          return newChild.key === key
            ? updatePortal(returnFiber, oldFiber, newChild, lanes)
            : null;
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            updateSlot(returnFiber, oldFiber, newChild, lanes)
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return null !== key
          ? null
          : updateFragment(returnFiber, oldFiber, newChild, lanes, null);
      if ("function" === typeof newChild.then)
        return updateSlot(
          returnFiber,
          oldFiber,
          unwrapThenable(newChild),
          lanes
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return updateSlot(
          returnFiber,
          oldFiber,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function updateFromMap(
    existingChildren: RR.ExistingChildren | RR.Fiber | null,
    returnFiber: RR.Fiber,
    newIdx: number,
    newChild: RR.ReactNode | RR.ReactElement,
    lanes: RR.Lanes
  ): RR.Fiber | null {
    if (
      ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
    )
      return (
        (existingChildren = (existingChildren as RR.ExistingChildren).get(newIdx) || null),
        updateTextNode(returnFiber, (existingChildren as RR.Fiber | null), "" + newChild, lanes)
      );
    if ("object" === typeof newChild && null !== newChild) {
      switch ((newChild as RR.ReactElement).$$typeof) {
        case REACT_ELEMENT_TYPE:
          return (
            (existingChildren =
              (existingChildren as RR.ExistingChildren).get(
                null === (newChild as RR.ReactElement).key ? newIdx : (newChild as RR.ReactElement).key!
              ) || null),
            updateElement(returnFiber, (existingChildren as RR.Fiber | null), (newChild as RR.ReactElement), lanes)
          );
        case REACT_PORTAL_TYPE:
          return (
            (existingChildren =
              (existingChildren as RR.ExistingChildren).get(
                null === newChild.key ? newIdx : newChild.key
              ) || null),
            updatePortal(returnFiber, (existingChildren as RR.Fiber | null), newChild, lanes)
          );
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            updateFromMap(
              (existingChildren as RR.ExistingChildren),
              returnFiber,
              newIdx,
              newChild,
              lanes
            )
          );
      }
      if (isArrayImpl(newChild) || getIteratorFn(newChild))
        return (
          (existingChildren = (existingChildren as RR.ExistingChildren).get(newIdx) || null),
          updateFragment(returnFiber, (existingChildren as RR.Fiber | null), newChild, lanes, null)
        );
      if ("function" === typeof newChild.then)
        return updateFromMap(
          (existingChildren as RR.ExistingChildren),
          returnFiber,
          newIdx,
          unwrapThenable(newChild),
          lanes
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return updateFromMap(
          (existingChildren as RR.ExistingChildren),
          returnFiber,
          newIdx,
          readContextDuringReconciliation(returnFiber, newChild),
          lanes
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return null;
  }
  function reconcileChildrenArray(
    returnFiber: RR.Fiber,
    currentFirstChild: RR.Fiber | number | null,
    newChildren: RR.ReactNode[],
    lanes: RR.Lanes
  ): RR.Fiber | null {
    for (
      var resultingFirstChild: RR.Fiber | null = null,
        previousNewFiber: RR.Fiber | null = null,
        oldFiber: RR.Fiber | RR.ExistingChildren | null = (currentFirstChild as RR.Fiber | null),
        newIdx: number = (currentFirstChild = 0),
        nextOldFiber: RR.Fiber | null = null;
      null !== oldFiber && newIdx < newChildren.length;
      newIdx++
    ) {
      (oldFiber as RR.Fiber | null)!.index > newIdx
        ? ((nextOldFiber = (oldFiber as RR.Fiber | null)), (oldFiber = null))
        : (nextOldFiber = (oldFiber as RR.Fiber | null)!.sibling);
      var newFiber = updateSlot(
        returnFiber,
        (oldFiber as RR.Fiber | null),
        newChildren[newIdx],
        lanes
      );
      if (null === newFiber) {
        null === oldFiber && (oldFiber = nextOldFiber);
        break;
      }
      shouldTrackSideEffects &&
        oldFiber &&
        null === newFiber.alternate &&
        deleteChild(returnFiber, (oldFiber as RR.Fiber | null)!);
      currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
      null === previousNewFiber
        ? (resultingFirstChild = newFiber)
        : (previousNewFiber.sibling = newFiber);
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    if (newIdx === newChildren.length)
      return (
        deleteRemainingChildren(returnFiber, (oldFiber as RR.Fiber | null)), resultingFirstChild
      );
    if (null === oldFiber) {
      for (; newIdx < newChildren.length; newIdx++)
        (oldFiber = createChild(returnFiber, newChildren[newIdx], lanes)),
          null !== oldFiber &&
            ((currentFirstChild = placeChild(
              oldFiber,
              currentFirstChild,
              newIdx
            )),
            null === previousNewFiber
              ? (resultingFirstChild = oldFiber)
              : (previousNewFiber.sibling = oldFiber),
            (previousNewFiber = oldFiber));
      return resultingFirstChild;
    }
    for (
      oldFiber = mapRemainingChildren((oldFiber as RR.Fiber | null));
      newIdx < newChildren.length;
      newIdx++
    )
      (nextOldFiber = updateFromMap(
        oldFiber,
        returnFiber,
        newIdx,
        newChildren[newIdx],
        lanes
      )),
        null !== nextOldFiber &&
          (shouldTrackSideEffects &&
            ((newFiber = nextOldFiber.alternate),
            null !== newFiber &&
              oldFiber.delete(null === newFiber.key ? newIdx : newFiber.key)),
          (currentFirstChild = placeChild(
            nextOldFiber,
            currentFirstChild,
            newIdx
          )),
          null === previousNewFiber
            ? (resultingFirstChild = nextOldFiber)
            : (previousNewFiber.sibling = nextOldFiber),
          (previousNewFiber = nextOldFiber));
    shouldTrackSideEffects &&
      oldFiber.forEach(function (child) {
        return deleteChild(returnFiber, child);
      });
    return resultingFirstChild;
  }
  function reconcileChildrenIterator(
    returnFiber: RR.Fiber,
    currentFirstChild: RR.Fiber | number | null,
    newChildren: RR.ChildIterator | null | undefined,
    lanes: RR.Lanes
  ): RR.Fiber | null {
    if (null == newChildren)
      throw Error("An iterable object provided no iterator.");
    for (
      var resultingFirstChild: RR.Fiber | null = null,
        previousNewFiber: RR.Fiber | null = null,
        oldFiber: RR.Fiber | RR.ExistingChildren | null = (currentFirstChild as RR.Fiber | null),
        newIdx: number = (currentFirstChild = 0),
        nextOldFiber: RR.Fiber | null = null,
        step: RR.ChildIteratorResult | RR.Fiber | null = newChildren.next();
      null !== oldFiber && !step.done;
      newIdx++, step = newChildren.next()
    ) {
      (oldFiber as RR.Fiber | null)!.index > newIdx
        ? ((nextOldFiber = (oldFiber as RR.Fiber | null)), (oldFiber = null))
        : (nextOldFiber = (oldFiber as RR.Fiber | null)!.sibling);
      var newFiber = updateSlot(returnFiber, (oldFiber as RR.Fiber | null), step.value, lanes);
      if (null === newFiber) {
        null === oldFiber && (oldFiber = nextOldFiber);
        break;
      }
      shouldTrackSideEffects &&
        oldFiber &&
        null === newFiber.alternate &&
        deleteChild(returnFiber, (oldFiber as RR.Fiber | null)!);
      currentFirstChild = placeChild(newFiber, currentFirstChild, newIdx);
      null === previousNewFiber
        ? (resultingFirstChild = newFiber)
        : (previousNewFiber.sibling = newFiber);
      previousNewFiber = newFiber;
      oldFiber = nextOldFiber;
    }
    if (step.done)
      return (
        deleteRemainingChildren(returnFiber, (oldFiber as RR.Fiber | null)), resultingFirstChild
      );
    if (null === oldFiber) {
      for (; !step.done; newIdx++, step = newChildren.next())
        (step = createChild(returnFiber, step.value, lanes)),
          null !== step &&
            ((currentFirstChild = placeChild(step, currentFirstChild, newIdx)),
            null === previousNewFiber
              ? (resultingFirstChild = step)
              : (previousNewFiber.sibling = step),
            (previousNewFiber = step));
      return resultingFirstChild;
    }
    for (
      oldFiber = mapRemainingChildren((oldFiber as RR.Fiber | null));
      !step.done;
      newIdx++, step = newChildren.next()
    )
      (step = updateFromMap(oldFiber, returnFiber, newIdx, step.value, lanes)),
        null !== step &&
          (shouldTrackSideEffects &&
            ((nextOldFiber = step.alternate),
            null !== nextOldFiber &&
              oldFiber.delete(
                null === nextOldFiber.key ? newIdx : nextOldFiber.key
              )),
          (currentFirstChild = placeChild(step, currentFirstChild, newIdx)),
          null === previousNewFiber
            ? (resultingFirstChild = step)
            : (previousNewFiber.sibling = step),
          (previousNewFiber = step));
    shouldTrackSideEffects &&
      oldFiber.forEach(function (child) {
        return deleteChild(returnFiber, child);
      });
    return resultingFirstChild;
  }
  function reconcileChildFibersImpl(
    returnFiber: RR.Fiber,
    currentFirstChild: RR.Fiber | null,
    newChild: RR.ReactNode | RR.ChildIterator | string | RR.ReactElement | null | undefined,
    lanes: RR.Lanes | RR.Fiber
  ): RR.Fiber | null {
    "object" === typeof newChild &&
      null !== newChild &&
      (newChild as RR.ReactElement).type === REACT_FRAGMENT_TYPE &&
      null === (newChild as RR.ReactElement).key &&
      void 0 === newChild.props.ref &&
      (newChild = (newChild as RR.ReactElement).props.children);
    if ("object" === typeof newChild && null !== newChild) {
      switch ((newChild as RR.ReactElement).$$typeof) {
        case REACT_ELEMENT_TYPE:
          a: {
            for (var key: string | RR.ReactElement["type"] | RR.IteratorFn | null = (newChild as RR.ReactElement).key; null !== currentFirstChild; ) {
              if (currentFirstChild.key === key) {
                key = (newChild as RR.ReactElement).type;
                if (key === REACT_FRAGMENT_TYPE) {
                  if (7 === currentFirstChild.tag) {
                    deleteRemainingChildren(
                      returnFiber,
                      currentFirstChild.sibling
                    );
                    lanes = useFiber(
                      currentFirstChild,
                      (newChild as RR.ReactElement).props.children
                    );
                    coerceRef(lanes, newChild);
                    lanes.return = returnFiber;
                    returnFiber = lanes;
                    break a;
                  }
                } else if (
                  currentFirstChild.elementType === key ||
                  ("object" === typeof key &&
                    null !== key &&
                    key.$$typeof === REACT_LAZY_TYPE &&
                    resolveLazy(key) === currentFirstChild.type)
                ) {
                  deleteRemainingChildren(
                    returnFiber,
                    currentFirstChild.sibling
                  );
                  lanes = useFiber(currentFirstChild, (newChild as RR.ReactElement).props);
                  coerceRef(lanes, (newChild as RR.ReactElement));
                  lanes.return = returnFiber;
                  returnFiber = lanes;
                  break a;
                }
                deleteRemainingChildren(returnFiber, currentFirstChild);
                break;
              } else deleteChild(returnFiber, currentFirstChild);
              currentFirstChild = currentFirstChild.sibling;
            }
            (newChild as RR.ReactElement).type === REACT_FRAGMENT_TYPE
              ? ((lanes = createFiberFromFragment(
                  (newChild as RR.ReactElement).props.children,
                  returnFiber.mode,
                  (lanes as RR.Lanes),
                  (newChild as RR.ReactElement).key
                )),
                coerceRef(lanes, newChild),
                (lanes.return = returnFiber),
                (returnFiber = lanes))
              : ((lanes = createFiberFromTypeAndProps(
                  (newChild as RR.ReactElement).type,
                  (newChild as RR.ReactElement).key,
                  (newChild as RR.ReactElement).props,
                  null,
                  returnFiber.mode,
                  (lanes as RR.Lanes)
                )),
                coerceRef(lanes, (newChild as RR.ReactElement)),
                (lanes.return = returnFiber),
                (returnFiber = lanes));
          }
          return placeSingleChild(returnFiber);
        case REACT_PORTAL_TYPE:
          a: {
            for (key = newChild.key; null !== currentFirstChild; ) {
              if (currentFirstChild.key === key)
                if (
                  4 === currentFirstChild.tag &&
                  (currentFirstChild.stateNode as RR.PortalState).containerInfo ===
                    newChild.containerInfo &&
                  (currentFirstChild.stateNode as RR.PortalState).implementation ===
                    newChild.implementation
                ) {
                  deleteRemainingChildren(
                    returnFiber,
                    currentFirstChild.sibling
                  );
                  lanes = useFiber(currentFirstChild, newChild.children || []);
                  lanes.return = returnFiber;
                  returnFiber = lanes;
                  break a;
                } else {
                  deleteRemainingChildren(returnFiber, currentFirstChild);
                  break;
                }
              else deleteChild(returnFiber, currentFirstChild);
              currentFirstChild = currentFirstChild.sibling;
            }
            lanes = createFiberFromPortal(newChild, returnFiber.mode, (lanes as RR.Lanes));
            lanes.return = returnFiber;
            returnFiber = lanes;
          }
          return placeSingleChild(returnFiber);
        case REACT_LAZY_TYPE:
          return (
            (newChild = resolveLazy(newChild)),
            reconcileChildFibersImpl(
              returnFiber,
              currentFirstChild,
              newChild,
              (lanes as RR.Lanes)
            )
          );
      }
      if (isArrayImpl(newChild))
        return reconcileChildrenArray(
          returnFiber,
          currentFirstChild,
          newChild,
          (lanes as RR.Lanes)
        );
      if (getIteratorFn(newChild)) {
        key = getIteratorFn(newChild);
        if ("function" !== typeof key)
          throw Error(
            "An object is not an iterable. This error is likely caused by a bug in React. Please file an issue."
          );
        newChild = key.call(newChild);
        return reconcileChildrenIterator(
          returnFiber,
          currentFirstChild,
          (newChild as RR.ChildIterator | null | undefined),
          (lanes as RR.Lanes)
        );
      }
      if ("function" === typeof newChild.then)
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          unwrapThenable(newChild),
          (lanes as RR.Lanes)
        );
      if (newChild.$$typeof === REACT_CONTEXT_TYPE)
        return reconcileChildFibersImpl(
          returnFiber,
          currentFirstChild,
          readContextDuringReconciliation(returnFiber, newChild),
          (lanes as RR.Lanes)
        );
      throwOnInvalidObjectTypeImpl(returnFiber, newChild);
    }
    return ("string" === typeof newChild && "" !== newChild) ||
      "number" === typeof newChild ||
      "bigint" === typeof newChild
      ? ((newChild = "" + newChild),
        null !== currentFirstChild && 6 === currentFirstChild.tag
          ? (deleteRemainingChildren(returnFiber, currentFirstChild.sibling),
            (lanes = useFiber(currentFirstChild, (newChild as string))),
            (lanes.return = returnFiber),
            (returnFiber = lanes))
          : (deleteRemainingChildren(returnFiber, currentFirstChild),
            (lanes = createFiberFromText((newChild as string), returnFiber.mode, (lanes as RR.Lanes))),
            (lanes.return = returnFiber),
            (returnFiber = lanes)),
        placeSingleChild(returnFiber))
      : deleteRemainingChildren(returnFiber, currentFirstChild);
  }
  return function (returnFiber, currentFirstChild, newChild, lanes) {
    try {
      thenableIndexCounter$1 = 0;
      var firstChildFiber = reconcileChildFibersImpl(
        returnFiber,
        currentFirstChild,
        newChild,
        lanes as RR.Lanes
      );
      thenableState$1 = null;
      return firstChildFiber;
    } catch (x) {
      if (
        x === SuspenseException ||
        x === SuspenseActionException ||
        (0 === (returnFiber.mode & 1) &&
          "object" === typeof x &&
          null !== x &&
          "function" === typeof x.then)
      )
        throw x;
      var fiber = createFiberImplClass(29, x, null, returnFiber.mode);
      fiber.lanes = lanes as RR.Lanes;
      fiber.return = returnFiber;
      return fiber;
    } finally {
    }
  };
}
var reconcileChildFibers = createChildReconciler(!0),
  mountChildFibers = createChildReconciler(!1),
  concurrentQueues = [],
  concurrentQueuesIndex = 0,
  concurrentlyUpdatedLanes = 0;
function finishQueueingConcurrentUpdates(): void {
  for (
    var endIndex = concurrentQueuesIndex,
      i = (concurrentlyUpdatedLanes = concurrentQueuesIndex = 0);
    i < endIndex;

  ) {
    var fiber: RR.Fiber = concurrentQueues[i] as RR.Fiber;
    concurrentQueues[i++] = null;
    var queue: RR.ConcurrentQueue | null = concurrentQueues[i] as RR.ConcurrentQueue | null;
    concurrentQueues[i++] = null;
    var update: RR.ConcurrentUpdate | null = concurrentQueues[i] as RR.ConcurrentUpdate | null;
    concurrentQueues[i++] = null;
    var lane: RR.Lane = concurrentQueues[i] as RR.Lane;
    concurrentQueues[i++] = null;
    if (null !== queue && null !== update) {
      var pending = queue.pending;
      null === pending
        ? (update.next = update)
        : ((update.next = pending.next), (pending.next = update));
      queue.pending = update;
    }
    0 !== lane && markUpdateLaneFromFiberToRoot(fiber, update, lane);
  }
}
function enqueueUpdate$1(fiber: RR.Fiber | null, queue: RR.ConcurrentQueue | null, update: RR.ConcurrentUpdate | null, lane: RR.Lane): void {
  concurrentQueues[concurrentQueuesIndex++] = fiber!;
  concurrentQueues[concurrentQueuesIndex++] = queue;
  concurrentQueues[concurrentQueuesIndex++] = update;
  concurrentQueues[concurrentQueuesIndex++] = lane;
  concurrentlyUpdatedLanes |= lane;
  fiber!.lanes |= lane;
  fiber = fiber!.alternate;
  null !== fiber && (fiber.lanes |= lane);
}
function enqueueConcurrentHookUpdate(fiber: RR.Fiber, queue: RR.HookQueue, update: RR.HookUpdate, lane: RR.Lane): RR.FiberRoot | null {
  enqueueUpdate$1(fiber, queue, update, lane);
  return getRootForUpdatedFiber(fiber);
}
function enqueueConcurrentRenderForLane(fiber: RR.Fiber, lane: RR.Lane): RR.FiberRoot | null {
  enqueueUpdate$1(fiber, null, null, lane);
  return getRootForUpdatedFiber(fiber);
}
function markUpdateLaneFromFiberToRoot(sourceFiber: RR.Fiber | RR.OffscreenInstance | RR.FiberRoot["hiddenUpdates"] | null, update: RR.ConcurrentUpdate | null, lane: RR.Lane): RR.FiberRoot | null {
  (sourceFiber as RR.Fiber).lanes |= lane;
  var alternate: RR.Fiber | RR.ConcurrentUpdate[] | null = (sourceFiber as RR.Fiber).alternate;
  null !== alternate && ((alternate as RR.Fiber | null)!.lanes |= lane);
  for (var isHidden: boolean | number = !1, parent: RR.Fiber | RR.FiberRoot | null = (sourceFiber as RR.Fiber).return; null !== parent; )
    ((parent as RR.Fiber | null)!.childLanes |= lane),
      (alternate = (parent as RR.Fiber | null)!.alternate),
      null !== alternate && ((alternate as RR.Fiber | null)!.childLanes |= lane),
      22 === parent.tag &&
        ((sourceFiber = (parent as RR.Fiber | null)!.stateNode as RR.OffscreenInstance | null),
        null === sourceFiber ||
          sourceFiber._visibility & 1 ||
          (isHidden = !0)),
      (sourceFiber = (parent as RR.Fiber | null)),
      (parent = (parent as RR.Fiber | null)!.return);
  return 3 === (sourceFiber as RR.Fiber).tag
    ? ((parent = (sourceFiber as RR.Fiber).stateNode as RR.FiberRoot),
      isHidden &&
        null !== update &&
        ((isHidden = 31 - clz32(lane)),
        (sourceFiber = parent.hiddenUpdates),
        (alternate = sourceFiber[isHidden]!),
        null === alternate
          ? (sourceFiber[isHidden] = [update])
          : alternate.push(update),
        (update.lane = lane | 536870912)),
      parent)
    : null;
}
function getRootForUpdatedFiber(sourceFiber: RR.Fiber): RR.FiberRoot | null {
  if (50 < nestedUpdateCount)
    throw (
      ((nestedUpdateCount = 0),
      (rootWithNestedUpdates = null),
      Error(
        "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops."
      ))
    );
  for (var parent = sourceFiber.return; null !== parent; )
    (sourceFiber = parent), (parent = sourceFiber.return);
  return 3 === sourceFiber.tag ? sourceFiber.stateNode as RR.FiberRoot : null;
}
var hasForceUpdate = !1;
function initializeUpdateQueue(fiber: RR.Fiber): void {
  fiber.updateQueue = {
    baseState: fiber.memoizedState,
    firstBaseUpdate: null,
    lastBaseUpdate: null,
    shared: { pending: null, lanes: 0, hiddenCallbacks: null },
    callbacks: null
  } as RR.UpdateQueue;
}
function cloneUpdateQueue(current: RR.Fiber | RR.UpdateQueue, workInProgress: RR.Fiber): void {
  current = (current as RR.Fiber).updateQueue as RR.UpdateQueue;
  workInProgress.updateQueue === current &&
    (workInProgress.updateQueue = {
      baseState: current.baseState,
      firstBaseUpdate: current.firstBaseUpdate,
      lastBaseUpdate: current.lastBaseUpdate,
      shared: current.shared,
      callbacks: null
    } as RR.UpdateQueue);
}
function createUpdate(lane: RR.Lane): RR.Update {
  return { lane: lane, tag: 0, payload: null, callback: null, next: null };
}
function enqueueUpdate(fiber: RR.Fiber, update: RR.Update | RR.FiberRoot | null, lane: RR.Lane): RR.FiberRoot | null {
  var updateQueue: RR.UpdateQueue | RR.SharedQueue | null = fiber.updateQueue as RR.UpdateQueue | null;
  if (null === updateQueue) return null;
  updateQueue = updateQueue.shared;
  if (0 !== (executionContext & 2)) {
    var pending = updateQueue.pending;
    null === pending
      ? ((update as RR.Update).next = (update as RR.Update))
      : (((update as RR.Update).next = pending.next), (pending.next = (update as RR.Update)));
    (updateQueue as RR.SharedQueue).pending = (update as RR.Update);
    update = getRootForUpdatedFiber(fiber);
    markUpdateLaneFromFiberToRoot(fiber, null, lane);
    return update;
  }
  enqueueUpdate$1(fiber, updateQueue, (update as RR.Update), lane);
  return getRootForUpdatedFiber(fiber);
}
function entangleTransitions(root: RR.FiberRoot, fiber: RR.Fiber | RR.UpdateQueue | RR.SharedQueue | null, lane: RR.Lane): void {
  fiber = (fiber as RR.Fiber).updateQueue as RR.UpdateQueue | null;
  if (null !== fiber && ((fiber = fiber.shared), 0 !== (lane & 4194048))) {
    var queueLanes = fiber.lanes;
    queueLanes &= root.pendingLanes;
    lane |= queueLanes;
    fiber.lanes = lane;
    markRootEntangled(root, lane);
  }
}
function enqueueCapturedUpdate(workInProgress: RR.Fiber | RR.Update | null, capturedUpdate: RR.Update): void {
  var queue: RR.UpdateQueue | RR.Update | null = (workInProgress as RR.Fiber).updateQueue as RR.UpdateQueue,
    current: RR.Fiber | RR.FiberUpdateQueue | null = (workInProgress as RR.Fiber).alternate;
  if (
    null !== current &&
    ((current = (current as RR.Fiber | null)!.updateQueue), queue === current)
  ) {
    var newFirst: RR.Update | null = null,
      newLast: RR.Update | null = null as RR.Update | null;
    queue = queue.firstBaseUpdate;
    if (null !== queue) {
      do {
        var clone: RR.Update = {
          lane: queue.lane,
          tag: queue.tag,
          payload: queue.payload,
          callback: null,
          next: null
        };
        null === newLast
          ? (newFirst = newLast = clone)
          : (newLast = newLast.next = clone);
        queue = queue.next;
      } while (null !== queue);
      null === newLast
        ? (newFirst = newLast = capturedUpdate)
        : (newLast = newLast.next = capturedUpdate);
    } else newFirst = newLast = capturedUpdate;
    queue = {
      baseState: current.baseState,
      firstBaseUpdate: newFirst,
      lastBaseUpdate: newLast,
      shared: current.shared,
      callbacks: current.callbacks
    } as RR.UpdateQueue;
    (workInProgress as RR.Fiber).updateQueue = queue;
    return;
  }
  workInProgress = queue.lastBaseUpdate;
  null === workInProgress
    ? (queue.firstBaseUpdate = capturedUpdate)
    : (workInProgress.next = capturedUpdate);
  queue.lastBaseUpdate = capturedUpdate;
}
var didReadFromEntangledAsyncAction = !1;
function suspendIfUpdateReadFromEntangledAsyncAction(): void {
  if (didReadFromEntangledAsyncAction) {
    var entangledActionThenable = currentEntangledActionThenable;
    if (null !== entangledActionThenable) throw entangledActionThenable;
  }
}
function processUpdateQueue(
  workInProgress$jscomp$0: RR.Fiber,
  props: RR.Props | null,
  instance$jscomp$0: RR.ClassInstance | null,
  renderLanes: RR.Lanes
): void {
  didReadFromEntangledAsyncAction = !1;
  var queue: RR.UpdateQueue = workInProgress$jscomp$0.updateQueue as RR.UpdateQueue;
  hasForceUpdate = !1;
  var firstBaseUpdate: RR.Update | null = queue.firstBaseUpdate,
    lastBaseUpdate: RR.Update | RR.Lanes | null = ((queue.lastBaseUpdate as RR.Update | null | RR.Lanes) as RR.Update | null),
    pendingQueue: RR.Update | null = queue.shared.pending;
  if (null !== pendingQueue) {
    queue.shared.pending = null;
    var lastPendingUpdate: RR.Update | RR.State = pendingQueue,
      firstPendingUpdate: RR.Update | null = lastPendingUpdate.next;
    lastPendingUpdate.next = null;
    null === lastBaseUpdate
      ? (firstBaseUpdate = firstPendingUpdate)
      : (lastBaseUpdate.next = firstPendingUpdate);
    lastBaseUpdate = lastPendingUpdate;
    var current: RR.Fiber | RR.UpdateQueue | RR.Update | null = workInProgress$jscomp$0.alternate;
    null !== current &&
      ((current = current.updateQueue as RR.UpdateQueue),
      (pendingQueue = current.lastBaseUpdate),
      pendingQueue !== lastBaseUpdate &&
        (null === pendingQueue
          ? (current.firstBaseUpdate = firstPendingUpdate)
          : (pendingQueue.next = firstPendingUpdate),
        (current.lastBaseUpdate = lastPendingUpdate)));
  }
  if (null !== firstBaseUpdate) {
    var newState: RR.State = queue.baseState;
    lastBaseUpdate = 0;
    current = (firstPendingUpdate = lastPendingUpdate = null) as RR.Update | null;
    pendingQueue = firstBaseUpdate;
    do {
      var updateLane: RR.Lane | RR.Props | RR.Carried | RR.UpdateCallback | null = pendingQueue.lane & -536870913,
        isHiddenUpdate: boolean | RR.UpdateCallback[] | RR.Update | null = updateLane !== pendingQueue.lane;
      if (
        isHiddenUpdate
          ? (workInProgressRootRenderLanes & updateLane) === updateLane
          : (renderLanes & updateLane) === updateLane
      ) {
        0 !== updateLane &&
          updateLane === currentEntangledLane &&
          (didReadFromEntangledAsyncAction = !0);
        null !== current &&
          (current = current.next =
            {
              lane: 0,
              tag: pendingQueue.tag,
              payload: pendingQueue.payload,
              callback: null,
              next: null
            });
        a: {
          var workInProgress: RR.Fiber | RR.StateUpdater | RR.Carried = workInProgress$jscomp$0,
            update: RR.Update = pendingQueue;
          updateLane = props;
          var instance: RR.ClassInstance | null = instance$jscomp$0;
          switch (update.tag) {
            case 1:
              workInProgress = update.payload;
              if ("function" === typeof workInProgress) {
                newState = workInProgress.call(
                  instance,
                  newState,
                  (updateLane as RR.Props | null)
                );
                break a;
              }
              newState = (workInProgress as RR.StateUpdater | RR.Carried) as RR.State;
              break a;
            case 3:
              workInProgress.flags = (workInProgress.flags & -65537) | 128;
            case 0:
              workInProgress = update.payload;
              updateLane =
                "function" === typeof workInProgress
                  ? workInProgress.call(instance, newState, (updateLane as RR.Props | null))
                  : (workInProgress as RR.StateUpdater | RR.Carried);
              if (null === (updateLane as RR.Carried) || void 0 === (updateLane as RR.Carried)) break a;
              newState = assign({}, newState, (updateLane as RR.Carried));
              break a;
            case 2:
              hasForceUpdate = !0;
          }
        }
        updateLane = pendingQueue.callback;
        null !== updateLane &&
          ((workInProgress$jscomp$0.flags |= 64),
          isHiddenUpdate && (workInProgress$jscomp$0.flags |= 8192),
          (isHiddenUpdate = queue.callbacks),
          null === isHiddenUpdate
            ? (queue.callbacks = [updateLane])
            : isHiddenUpdate.push(updateLane));
      } else
        (isHiddenUpdate = {
          lane: updateLane,
          tag: pendingQueue.tag,
          payload: pendingQueue.payload,
          callback: pendingQueue.callback,
          next: null
        } as RR.Update),
          null === current
            ? ((firstPendingUpdate = current = isHiddenUpdate),
              (lastPendingUpdate = newState))
            : (current = current.next = isHiddenUpdate),
          (lastBaseUpdate |= updateLane);
      pendingQueue = pendingQueue.next;
      if (null === pendingQueue)
        if (((pendingQueue = queue.shared.pending), null === pendingQueue))
          break;
        else
          (isHiddenUpdate = pendingQueue),
            (pendingQueue = isHiddenUpdate.next!),
            (isHiddenUpdate.next = null),
            (queue.lastBaseUpdate = isHiddenUpdate),
            (queue.shared.pending = null);
    } while (1);
    null === current && (lastPendingUpdate = newState);
    queue.baseState = lastPendingUpdate;
    queue.firstBaseUpdate = firstPendingUpdate;
    queue.lastBaseUpdate = current;
    null === firstBaseUpdate && (queue.shared.lanes = 0);
    workInProgressRootSkippedLanes |= lastBaseUpdate;
    workInProgress$jscomp$0.lanes = lastBaseUpdate;
    workInProgress$jscomp$0.memoizedState = newState;
  }
}
function callCallback(callback: RR.UpdateCallback, context: RR.StateNode): void {
  if ("function" !== typeof callback)
    throw Error(
      "Invalid argument passed as callback. Expected a function. Instead received: " +
        callback
    );
  callback.call(context);
}
function commitCallbacks(updateQueue: RR.UpdateQueue | number, context: RR.StateNode): void {
  var callbacks = (updateQueue as RR.UpdateQueue).callbacks;
  if (null !== callbacks)
    for (
      (updateQueue as RR.UpdateQueue).callbacks = null, updateQueue = 0;
      updateQueue < callbacks.length;
      updateQueue++
    )
      callCallback(callbacks[updateQueue]!, context);
}
var currentTreeHiddenStackCursor = createCursor(null),
  prevEntangledRenderLanesCursor = createCursor(0);
function pushHiddenContext(fiber: RR.Fiber | RR.Lanes, context: RR.HiddenContext): void {
  fiber = entangledRenderLanes;
  push(prevEntangledRenderLanesCursor, fiber);
  push(currentTreeHiddenStackCursor, context);
  entangledRenderLanes = fiber | context.baseLanes;
}
function reuseHiddenContextOnStack(): void {
  push(prevEntangledRenderLanesCursor, entangledRenderLanes);
  push(currentTreeHiddenStackCursor, currentTreeHiddenStackCursor.current);
}
function popHiddenContext(): void {
  entangledRenderLanes = prevEntangledRenderLanesCursor.current as RR.Lanes;
  pop(currentTreeHiddenStackCursor);
  pop(prevEntangledRenderLanesCursor);
}
var suspenseHandlerStackCursor = createCursor(null),
  shellBoundary = null;
function pushPrimaryTreeSuspenseHandler(handler: RR.Fiber): void {
  var current = handler.alternate;
  push(suspenseStackCursor, suspenseStackCursor.current & 1);
  push(suspenseHandlerStackCursor, handler);
  null === shellBoundary &&
    (null === current || null !== currentTreeHiddenStackCursor.current
      ? (shellBoundary = handler)
      : null !== current.memoizedState && (shellBoundary = handler));
}
function pushDehydratedActivitySuspenseHandler(fiber: RR.Fiber): void {
  push(suspenseStackCursor, suspenseStackCursor.current);
  push(suspenseHandlerStackCursor, fiber);
  null === shellBoundary && (shellBoundary = fiber);
}
function pushOffscreenSuspenseHandler(fiber: RR.Fiber): void {
  22 === fiber.tag
    ? (push(suspenseStackCursor, suspenseStackCursor.current),
      push(suspenseHandlerStackCursor, fiber),
      null === shellBoundary && (shellBoundary = fiber))
    : reuseSuspenseHandlerOnStack();
}
function reuseSuspenseHandlerOnStack(fiber?: RR.Fiber): void; function reuseSuspenseHandlerOnStack(): void {
  push(suspenseStackCursor, suspenseStackCursor.current);
  push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
}
function popSuspenseHandler(fiber: RR.Fiber): void {
  pop(suspenseHandlerStackCursor);
  shellBoundary === fiber && (shellBoundary = null);
  pop(suspenseStackCursor);
}
var suspenseStackCursor = createCursor(0);
function pushSuspenseListContext(fiber: RR.Fiber, newContext: RR.SuspenseContext): void {
  push(suspenseHandlerStackCursor, suspenseHandlerStackCursor.current);
  push(suspenseStackCursor, newContext);
}
function popSuspenseListContext(fiber: RR.Fiber): void {
  pop(suspenseStackCursor);
  pop(suspenseHandlerStackCursor);
  shellBoundary === fiber && (shellBoundary = null);
}
function findFirstSuspended(row: RR.Fiber): RR.Fiber | null {
  for (var node = row; null !== node; ) {
    if (13 === node.tag) {
      var state: RR.SuspenseState | RR.SuspenseInstance | null = node.memoizedState as RR.SuspenseState | null;
      if (null !== state && (null === state.dehydrated || shim$1() || shim$1()))
        return node;
    } else if (
      19 === node.tag &&
      "independent" !== node.memoizedProps.revealOrder
    ) {
      if (0 !== (node.flags & 128)) return node;
    } else if (null !== node.child) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === row) break;
    for (; null === node.sibling; ) {
      if (null === node.return || node.return === row) return null;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  return null;
}
var renderLanes = 0,
  currentlyRenderingFiber = null,
  currentHook = null,
  workInProgressHook = null,
  didScheduleRenderPhaseUpdate = !1,
  didScheduleRenderPhaseUpdateDuringThisPass = !1,
  shouldDoubleInvokeUserFnsInHooksDEV = !1,
  thenableIndexCounter = 0,
  thenableState = null,
  globalClientIdCounter = 0;
function throwInvalidHookError(): never {
  throw Error(
    "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
  );
}
function areHookInputsEqual(nextDeps: RR.HookDeps, prevDeps: RR.HookDeps | null): boolean {
  if (null === prevDeps) return !1;
  for (var i = 0; i < prevDeps.length && i < nextDeps.length; i++)
    if (!objectIs(nextDeps[i], prevDeps[i])) return !1;
  return !0;
}
function renderWithHooks(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  Component: RR.FunctionComponent,
  props: RR.Props | null,
  secondArg: RR.Ref | undefined,
  nextRenderLanes: RR.Lanes | RR.ReactNode
): RR.ReactNode {
  renderLanes = (nextRenderLanes as RR.Lanes);
  currentlyRenderingFiber = workInProgress;
  workInProgress.memoizedState = null;
  workInProgress.updateQueue = null;
  workInProgress.lanes = 0;
  ReactSharedInternals.H =
    null === current || null === current.memoizedState
      ? HooksDispatcherOnMount
      : HooksDispatcherOnUpdate;
  shouldDoubleInvokeUserFnsInHooksDEV = !1;
  nextRenderLanes = Component(props, secondArg);
  shouldDoubleInvokeUserFnsInHooksDEV = !1;
  didScheduleRenderPhaseUpdateDuringThisPass &&
    (nextRenderLanes = renderWithHooksAgain(
      workInProgress,
      Component,
      props,
      secondArg
    ));
  finishRenderingHooks(current);
  return nextRenderLanes;
}
function finishRenderingHooks(current: RR.Fiber | RR.Dependencies | null): void {
  ReactSharedInternals.H = ContextOnlyDispatcher;
  var didRenderTooFewHooks = null !== currentHook && null !== currentHook.next;
  renderLanes = 0;
  workInProgressHook = currentHook = currentlyRenderingFiber = null;
  didScheduleRenderPhaseUpdate = !1;
  thenableIndexCounter = 0;
  thenableState = null;
  if (didRenderTooFewHooks)
    throw Error(
      "Rendered fewer hooks than expected. This may be caused by an accidental early return statement."
    );
  null === (current as RR.Fiber | null) ||
    didReceiveUpdate ||
    ((current = (current as RR.Fiber | null)!.dependencies),
    null !== current &&
      checkIfContextChanged((current as RR.Dependencies | null)) &&
      (didReceiveUpdate = !0));
}
function renderWithHooksAgain(workInProgress: RR.Fiber, Component: RR.FunctionComponent, props: RR.Props | null, secondArg: RR.Ref | undefined): RR.ReactNode {
  currentlyRenderingFiber = workInProgress;
  var numberOfReRenders = 0;
  do {
    didScheduleRenderPhaseUpdateDuringThisPass && (thenableState = null);
    thenableIndexCounter = 0;
    didScheduleRenderPhaseUpdateDuringThisPass = !1;
    if (25 <= numberOfReRenders)
      throw Error(
        "Too many re-renders. React limits the number of renders to prevent an infinite loop."
      );
    numberOfReRenders += 1;
    workInProgressHook = currentHook = null;
    if (null != workInProgress.updateQueue) {
      var children: RR.FunctionComponentUpdateQueue | RR.ReactNode = workInProgress.updateQueue as RR.FunctionComponentUpdateQueue;
      (children as RR.FunctionComponentUpdateQueue).lastEffect = null;
      (children as RR.FunctionComponentUpdateQueue).events = null;
      (children as RR.FunctionComponentUpdateQueue).stores = null;
      null != (children as RR.FunctionComponentUpdateQueue).memoCache && ((children as RR.FunctionComponentUpdateQueue).memoCache!.index = 0);
    }
    ReactSharedInternals.H = HooksDispatcherOnRerender;
    children = Component(props, secondArg);
  } while (didScheduleRenderPhaseUpdateDuringThisPass);
  return children;
}
function TransitionAwareHostComponent(): RR.TransitionStatus {
  var dispatcher: RR.Dispatcher | RR.HookState | null = ReactSharedInternals.H,
    maybeThenable = (dispatcher as RR.Dispatcher | null)!.useState()[0];
  maybeThenable =
    "function" === typeof maybeThenable.then
      ? useThenable(maybeThenable)
      : maybeThenable;
  dispatcher = (dispatcher as RR.Dispatcher | null)!.useState()[0];
  (null !== currentHook ? currentHook.memoizedState : null) !== dispatcher &&
    (currentlyRenderingFiber!.flags |= 1024);
  return maybeThenable;
}
function bailoutHooks(current: RR.Fiber, workInProgress: RR.Fiber, lanes: RR.Lanes): void {
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.flags &= -2053;
  current.lanes &= ~lanes;
}
function resetHooksOnUnwind(workInProgress: RR.Fiber | RR.Hook | null): void {
  if (didScheduleRenderPhaseUpdate) {
    for (
      workInProgress = (workInProgress as RR.Fiber).memoizedState as RR.Hook | null;
      null !== workInProgress;

    ) {
      var queue = workInProgress.queue;
      null !== queue && (queue.pending = null);
      workInProgress = workInProgress.next;
    }
    didScheduleRenderPhaseUpdate = !1;
  }
  renderLanes = 0;
  workInProgressHook = currentHook = currentlyRenderingFiber = null;
  didScheduleRenderPhaseUpdateDuringThisPass = !1;
  thenableIndexCounter = 0;
  thenableState = null;
}
function mountWorkInProgressHook(): RR.Hook {
  var hook: RR.Hook = {
    memoizedState: null,
    baseState: null,
    baseQueue: null,
    queue: null,
    next: null
  };
  null === workInProgressHook
    ? (currentlyRenderingFiber!.memoizedState = workInProgressHook = hook)
    : (workInProgressHook = workInProgressHook.next = hook);
  return workInProgressHook;
}
function updateWorkInProgressHook(): RR.Hook {
  if (null === currentHook) {
    var nextCurrentHook: RR.Fiber | RR.Hook | null = currentlyRenderingFiber!.alternate;
    nextCurrentHook =
      null !== nextCurrentHook ? nextCurrentHook.memoizedState as RR.Hook | null : null;
  } else nextCurrentHook = currentHook.next;
  var nextWorkInProgressHook: RR.Hook | null =
    null === workInProgressHook
      ? currentlyRenderingFiber!.memoizedState as RR.Hook | null
      : workInProgressHook.next;
  if (null !== nextWorkInProgressHook)
    (workInProgressHook = nextWorkInProgressHook),
      (currentHook = nextCurrentHook);
  else {
    if (null === nextCurrentHook) {
      if (null === currentlyRenderingFiber!.alternate)
        throw Error(
          "Update hook called on initial render. This is likely a bug in React. Please file an issue."
        );
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
    null === workInProgressHook
      ? (currentlyRenderingFiber!.memoizedState = workInProgressHook =
          nextCurrentHook)
      : (workInProgressHook = workInProgressHook.next = nextCurrentHook);
  }
  return workInProgressHook;
}
function createFunctionComponentUpdateQueue(): RR.FunctionComponentUpdateQueue {
  return { lastEffect: null, events: null, stores: null, memoCache: null };
}
function useThenable(thenable: RR.Thenable | RR.UsedValue): RR.UsedValue {
  var index: number | RR.Fiber | null = thenableIndexCounter;
  thenableIndexCounter += 1;
  null === thenableState && (thenableState = []);
  thenable = trackUsedThenable(thenableState, (thenable as RR.Thenable), index);
  index = currentlyRenderingFiber;
  null ===
    (null === workInProgressHook
      ? index!.memoizedState
      : workInProgressHook.next) &&
    ((index = index!.alternate),
    (ReactSharedInternals.H =
      null === index || null === index.memoizedState
        ? HooksDispatcherOnMount
        : HooksDispatcherOnUpdate));
  return thenable;
}
function use(usable: RR.UsableGiven): RR.UsedValue {
  if (null !== usable && "object" === typeof usable) {
    if ("function" === typeof usable.then) return useThenable(usable as RR.UsableThenable);
    if (usable.$$typeof === REACT_RECOVERABLE_TYPE) return;
    if (usable.$$typeof === REACT_CONTEXT_TYPE) return readContext(usable as RR.UsableContext);
  }
  throw Error("An unsupported type was passed to use(): " + String(usable));
}
function useMemoCache(size: number): any[] {
  var memoCache: RR.MemoCache | null = null,
    updateQueue: RR.FunctionComponentUpdateQueue | any[] | null | undefined = currentlyRenderingFiber!.updateQueue as RR.FunctionComponentUpdateQueue | null;
  null !== updateQueue && (memoCache = updateQueue.memoCache);
  if (null == memoCache) {
    var current: RR.Fiber | RR.FunctionComponentUpdateQueue | RR.MemoCache | number | null = currentlyRenderingFiber!.alternate;
    null !== current &&
      ((current = current.updateQueue as RR.FunctionComponentUpdateQueue | null),
      null !== current &&
        ((current = current.memoCache),
        null != current &&
          (memoCache = {
            data: current.data.map(function (array) {
              return array.slice();
            }),
            index: 0
          })));
  }
  null == memoCache && (memoCache = { data: [], index: 0 });
  null === updateQueue &&
    ((updateQueue = createFunctionComponentUpdateQueue()),
    (currentlyRenderingFiber!.updateQueue = updateQueue));
  updateQueue.memoCache = memoCache;
  updateQueue = memoCache.data[memoCache.index];
  if (void 0 === updateQueue)
    for (
      updateQueue = memoCache.data[memoCache.index] = Array(size),
        current = 0;
      current < size;
      current++
    )
      updateQueue[current] = REACT_MEMO_CACHE_SENTINEL;
  memoCache.index++;
  return updateQueue;
}
function basicStateReducer(state: RR.HookState, action: RR.HookState): RR.HookState {
  return "function" === typeof action ? action(state) : action;
}
function updateReducer(reducer: RR.Reducer): RR.DispatchTuple {
  var hook = updateWorkInProgressHook();
  return updateReducerImpl(hook, currentHook!, reducer);
}
function updateReducerImpl(hook: RR.Hook, current: RR.Hook | RR.HookUpdate, reducer: RR.Reducer | RR.EntangledActionThenable | null): RR.DispatchTuple {
  var queue = hook.queue as RR.HookQueue | null;
  if (null === queue)
    throw Error(
      "Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)"
    );
  queue.lastRenderedReducer = (reducer as RR.Reducer);
  var baseQueue = hook.baseQueue,
    pendingQueue: RR.HookUpdate | RR.HookState | null = queue.pending;
  if (null !== (pendingQueue as RR.HookUpdate | null)) {
    if (null !== baseQueue) {
      var baseFirst: RR.HookUpdate | RR.HookState | null = baseQueue.next;
      baseQueue.next = (pendingQueue as RR.HookUpdate | null)!.next;
      (pendingQueue as RR.HookUpdate | null)!.next = (baseFirst as RR.HookUpdate | null);
    }
    (current as RR.Hook).baseQueue = baseQueue = (pendingQueue as RR.HookUpdate | null);
    queue.pending = null;
  }
  pendingQueue = hook.baseState;
  if (null === baseQueue) hook.memoizedState = pendingQueue;
  else {
    current = baseQueue.next!;
    var newBaseQueueFirst: RR.HookUpdate | null = (baseFirst = null),
      newBaseQueueLast: RR.HookUpdate | null = null as RR.HookUpdate | null,
      update: RR.HookUpdate | null = current,
      didReadFromEntangledAsyncAction$48 = !1;
    do {
      var updateLane: RR.Lane | RR.HookUpdate | RR.HookState = update.lane & -536870913;
      if (
        (updateLane as RR.Lane) !== update.lane
          ? (workInProgressRootRenderLanes & (updateLane as RR.Lane)) === (updateLane as RR.Lane)
          : (renderLanes & (updateLane as RR.Lane)) === (updateLane as RR.Lane)
      ) {
        var revertLane: RR.Lane | RR.HookUpdate = update.revertLane;
        if (0 === revertLane)
          null !== newBaseQueueLast &&
            (newBaseQueueLast = newBaseQueueLast.next =
              {
                lane: 0,
                revertLane: 0,
                gesture: null,
                action: update.action,
                hasEagerState: update.hasEagerState,
                eagerState: update.eagerState,
                next: null
              }),
            (updateLane as RR.Lane) === currentEntangledLane &&
              (didReadFromEntangledAsyncAction$48 = !0);
        else if ((renderLanes & revertLane) === revertLane) {
          update = update.next;
          revertLane === currentEntangledLane &&
            (didReadFromEntangledAsyncAction$48 = !0);
          continue;
        } else
          (updateLane = {
            lane: 0,
            revertLane: update.revertLane,
            gesture: null,
            action: update.action,
            hasEagerState: update.hasEagerState,
            eagerState: update.eagerState,
            next: null
          } as RR.HookUpdate),
            null === newBaseQueueLast
              ? ((newBaseQueueFirst = newBaseQueueLast = (updateLane as RR.HookUpdate)),
                (baseFirst = pendingQueue))
              : (newBaseQueueLast = newBaseQueueLast.next = (updateLane as RR.HookUpdate)),
            (currentlyRenderingFiber!.lanes |= revertLane),
            (workInProgressRootSkippedLanes |= revertLane);
        updateLane = update.action;
        shouldDoubleInvokeUserFnsInHooksDEV &&
          (reducer as RR.Reducer)(pendingQueue, updateLane);
        pendingQueue = update.hasEagerState
          ? update.eagerState
          : (reducer as RR.Reducer)(pendingQueue, updateLane);
      } else
        (revertLane = {
          lane: (updateLane as RR.Lane),
          revertLane: update.revertLane,
          gesture: update.gesture,
          action: update.action,
          hasEagerState: update.hasEagerState,
          eagerState: update.eagerState,
          next: null
        }),
          null === newBaseQueueLast
            ? ((newBaseQueueFirst = newBaseQueueLast = revertLane),
              (baseFirst = pendingQueue))
            : (newBaseQueueLast = newBaseQueueLast.next = revertLane),
          (currentlyRenderingFiber!.lanes |= (updateLane as RR.Lane)),
          (workInProgressRootSkippedLanes |= (updateLane as RR.Lane));
      update = update.next;
    } while (null !== update && update !== current);
    null === newBaseQueueLast
      ? (baseFirst = pendingQueue)
      : (newBaseQueueLast.next = newBaseQueueFirst);
    if (
      !objectIs(pendingQueue, hook.memoizedState) &&
      ((didReceiveUpdate = !0),
      didReadFromEntangledAsyncAction$48 &&
        ((reducer = currentEntangledActionThenable), null !== reducer))
    )
      throw reducer;
    hook.memoizedState = pendingQueue;
    hook.baseState = baseFirst;
    hook.baseQueue = newBaseQueueLast;
    queue.lastRenderedState = pendingQueue;
  }
  null === baseQueue && (queue.lanes = 0);
  return [hook.memoizedState, queue.dispatch];
}
function rerenderReducer(reducer: RR.Reducer): RR.DispatchTuple {
  var hook = updateWorkInProgressHook(),
    queue = hook.queue as RR.HookQueue | null;
  if (null === queue)
    throw Error(
      "Should have a queue. You are likely calling Hooks conditionally, which is not allowed. (https://react.dev/link/invalid-hook-call)"
    );
  queue.lastRenderedReducer = reducer;
  var dispatch = queue.dispatch,
    lastRenderPhaseUpdate = queue.pending,
    newState = hook.memoizedState;
  if (null !== lastRenderPhaseUpdate) {
    queue.pending = null;
    var update = (lastRenderPhaseUpdate = lastRenderPhaseUpdate.next);
    do (newState = reducer(newState, update!.action)), (update = update!.next);
    while (update !== lastRenderPhaseUpdate);
    objectIs(newState, hook.memoizedState) || (didReceiveUpdate = !0);
    hook.memoizedState = newState;
    null === hook.baseQueue && (hook.baseState = newState);
    queue.lastRenderedState = newState;
  }
  return [newState, dispatch];
}
function updateSyncExternalStore(subscribe: RR.StoreSubscribe, getSnapshot): RR.HookState {
  var fiber = currentlyRenderingFiber!,
    hook: RR.Hook | RR.StoreInstance = updateWorkInProgressHook();
  var nextSnapshot = getSnapshot();
  var snapshotChanged = !objectIs(
    (currentHook || hook).memoizedState,
    nextSnapshot
  );
  snapshotChanged &&
    ((hook.memoizedState = nextSnapshot), (didReceiveUpdate = !0));
  hook = hook.queue as RR.StoreInstance;
  updateEffect(subscribeToStore.bind(null, fiber, hook, subscribe), [
    subscribe
  ]);
  subscribe =
    hook.getSnapshot !== getSnapshot ||
    snapshotChanged ||
    (null !== workInProgressHook &&
      0 !== (workInProgressHook.memoizedState.tag & 1));
  pushSimpleEffect(
    subscribe ? 9 : 8,
    { destroy: void 0 },
    updateStoreInstance.bind(null, fiber, hook, nextSnapshot, getSnapshot),
    null
  );
  if (subscribe) {
    fiber.flags |= 2048;
    if (null === workInProgressRoot)
      throw Error(
        "Expected a work-in-progress root. This is a bug in React. Please file an issue."
      );
    0 !== (renderLanes & 127) ||
      pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
  }
  return nextSnapshot;
}
function pushStoreConsistencyCheck(fiber: RR.Fiber | RR.StoreConsistencyCheck, getSnapshot: RR.GetSnapshot | RR.FunctionComponentUpdateQueue | null, renderedSnapshot: RR.HookState | RR.StoreConsistencyCheck[] | null): void {
  (fiber as RR.Fiber).flags |= 16384;
  fiber = { getSnapshot: (getSnapshot as RR.GetSnapshot), value: renderedSnapshot } as RR.StoreConsistencyCheck;
  getSnapshot = currentlyRenderingFiber!.updateQueue as RR.FunctionComponentUpdateQueue | null;
  null === getSnapshot
    ? ((getSnapshot = createFunctionComponentUpdateQueue()),
      (currentlyRenderingFiber!.updateQueue = getSnapshot),
      (getSnapshot.stores = [fiber]))
    : ((renderedSnapshot = getSnapshot.stores),
      null === (renderedSnapshot as RR.StoreConsistencyCheck[] | null)
        ? (getSnapshot.stores = [fiber])
        : (renderedSnapshot as RR.StoreConsistencyCheck[] | null)!.push(fiber));
}
function updateStoreInstance(fiber: RR.Fiber, inst: RR.StoreInstance, nextSnapshot: RR.HookState, getSnapshot: RR.GetSnapshot): void {
  inst.value = nextSnapshot;
  inst.getSnapshot = getSnapshot;
  checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
}
function subscribeToStore(fiber: RR.Fiber, inst: RR.StoreInstance, subscribe: RR.StoreSubscribe): () => void {
  return subscribe(function () {
    checkIfSnapshotChanged(inst) && forceStoreRerender(fiber);
  });
}
function checkIfSnapshotChanged(inst: RR.StoreInstance | RR.HookState): boolean {
  var latestGetSnapshot = (inst as RR.StoreInstance).getSnapshot;
  inst = (inst as RR.StoreInstance).value;
  try {
    var nextValue = latestGetSnapshot();
    return !objectIs(inst, nextValue);
  } catch (error) {
    return !0;
  }
}
function forceStoreRerender(fiber: RR.Fiber): void {
  var root = enqueueConcurrentRenderForLane(fiber, 2);
  null !== root && scheduleUpdateOnFiber(root, fiber, 2);
}
function mountStateImpl(initialState: RR.HookState): RR.Hook {
  var hook = mountWorkInProgressHook();
  if ("function" === typeof initialState) {
    var initialStateInitializer = initialState;
    initialState = initialStateInitializer();
    if (shouldDoubleInvokeUserFnsInHooksDEV) {
      setIsStrictModeForDevtools(!0);
      try {
        initialStateInitializer();
      } finally {
        setIsStrictModeForDevtools(!1);
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
  } as RR.HookQueue;
  return hook;
}
function updateOptimisticImpl(hook: RR.Hook, current: RR.Hook | null, passthrough: RR.HookState, reducer: RR.Reducer | null | undefined): RR.DispatchTuple {
  hook.baseState = passthrough;
  return updateReducerImpl(
    hook,
    currentHook!,
    "function" === typeof reducer ? reducer : basicStateReducer
  );
}
function dispatchActionState(
  fiber: RR.Fiber | RR.ActionFn | null,
  actionQueue: RR.ActionStateQueue,
  setPendingState: RR.Dispatch | RR.ActionStateQueueNode | null,
  setState: RR.Dispatch,
  payload: RR.ActionPayload
): void {
  if (isRenderPhaseUpdate((fiber as RR.Fiber)))
    throw Error("Cannot update action state while rendering.");
  fiber = actionQueue.action;
  if (null !== fiber) {
    var actionNode: RR.ActionStateQueueNode = {
      payload: payload,
      action: fiber,
      next: null,
      isTransition: !0,
      status: "pending",
      value: null,
      reason: null,
      listeners: [],
      then: function (listener) {
        actionNode.listeners.push(listener);
      }
    };
    null !== ReactSharedInternals.T
      ? (setPendingState as RR.Dispatch)(!0)
      : (actionNode.isTransition = !1);
    setState(actionNode);
    setPendingState = actionQueue.pending;
    null === setPendingState
      ? ((actionNode.next = actionQueue.pending = actionNode),
        runActionStateAction(actionQueue, actionNode))
      : ((actionNode.next = setPendingState.next),
        (actionQueue.pending = setPendingState.next = actionNode));
  }
}
function runActionStateAction(actionQueue: RR.ActionStateQueue, node: RR.ActionStateQueueNode): void {
  var action = node.action,
    payload = node.payload,
    prevState = actionQueue.state;
  if (node.isTransition) {
    var prevTransition: RR.Transition | RR.HookState | null = ReactSharedInternals.T,
      currentTransition: RR.Transition = {};
    currentTransition.types =
      null !== prevTransition ? prevTransition.types : null;
    ReactSharedInternals.T = currentTransition;
    try {
      var returnValue = action(prevState, payload),
        onStartTransitionFinish = ReactSharedInternals.S;
      null !== onStartTransitionFinish &&
        onStartTransitionFinish(currentTransition, returnValue);
      handleActionReturnValue(actionQueue, node, returnValue);
    } catch (error) {
      onActionError(actionQueue, node, error);
    } finally {
      null !== (prevTransition as RR.Transition | null) &&
        null !== currentTransition.types &&
        ((prevTransition as RR.Transition | null)!.types = currentTransition.types),
        (ReactSharedInternals.T = (prevTransition as RR.Transition | null));
    }
  } else
    try {
      (prevTransition = action(prevState, payload)),
        handleActionReturnValue(actionQueue, node, prevTransition);
    } catch (error$52) {
      onActionError(actionQueue, node, error$52);
    }
}
function handleActionReturnValue(actionQueue: RR.ActionStateQueue, node: RR.ActionStateQueueNode, returnValue: RR.HookState): void {
  null !== returnValue &&
  "object" === typeof returnValue &&
  "function" === typeof returnValue.then
    ? returnValue.then(
        function (nextState: RR.HookState) {
          onActionSuccess(actionQueue, node, nextState);
        },
        function (error: RR.Thrown) {
          return onActionError(actionQueue, node, error);
        }
      )
    : onActionSuccess(actionQueue, node, returnValue);
}
function onActionSuccess(actionQueue: RR.ActionStateQueue, actionNode: RR.ActionStateQueueNode | null, nextState: RR.HookState | RR.ActionStateQueueNode | null): void {
  actionNode!.status = "fulfilled";
  actionNode!.value = nextState;
  notifyActionListeners((actionNode as RR.ActionStateQueueNode));
  actionQueue.state = nextState;
  actionNode = actionQueue.pending;
  null !== actionNode &&
    ((nextState = actionNode.next),
    (nextState as RR.ActionStateQueueNode | null) === actionNode
      ? (actionQueue.pending = null)
      : ((nextState = (nextState as RR.ActionStateQueueNode | null)!.next),
        (actionNode.next = (nextState as RR.ActionStateQueueNode | null)),
        runActionStateAction(actionQueue, (nextState as RR.ActionStateQueueNode | null)!)));
}
function onActionError(actionQueue: RR.ActionStateQueue, actionNode: RR.ActionStateQueueNode, error: RR.Thrown): void {
  var last = actionQueue.pending;
  actionQueue.pending = null;
  if (null !== last) {
    last = last.next;
    do
      (actionNode.status = "rejected"),
        (actionNode.reason = error),
        notifyActionListeners(actionNode),
        (actionNode = actionNode.next!);
    while (actionNode !== last);
  }
  actionQueue.action = null;
}
function notifyActionListeners(actionNode: RR.ActionStateQueueNode | RR.ActionStateQueueNode["listeners"]): void {
  actionNode = (actionNode as RR.ActionStateQueueNode).listeners;
  for (var i = 0; i < (actionNode as RR.ActionStateQueueNode["listeners"]).length; i++) (0, (actionNode as any)[i])();
}
function actionStateReducer<S>(oldState: S, newState: S): S {
  return newState;
}
function mountActionState(action: RR.ActionFn, initialStateProp: RR.HookState): RR.ActionStateTuple {
  var stateHook = mountWorkInProgressHook();
  stateHook.memoizedState = stateHook.baseState = initialStateProp;
  var stateQueue = {
    pending: null,
    lanes: 0,
    dispatch: null,
    lastRenderedReducer: actionStateReducer,
    lastRenderedState: initialStateProp
  };
  stateHook.queue = stateQueue;
  stateHook = dispatchSetState.bind(null, currentlyRenderingFiber!, stateQueue);
  stateQueue.dispatch = stateHook;
  stateQueue = mountStateImpl(!1);
  var setPendingState: RR.Dispatch = dispatchOptimisticSetState.bind(
    null,
    currentlyRenderingFiber!,
    !1,
    stateQueue.queue as RR.HookQueue
  );
  stateQueue = mountWorkInProgressHook();
  var actionQueue = {
    state: initialStateProp,
    dispatch: null,
    action: action,
    pending: null
  } as RR.ActionStateQueue;
  stateQueue.queue = actionQueue;
  stateHook = dispatchActionState.bind(
    null,
    currentlyRenderingFiber!,
    actionQueue,
    setPendingState,
    stateHook
  );
  actionQueue.dispatch = stateHook;
  stateQueue.memoizedState = action;
  return [initialStateProp, stateHook, !1];
}
function updateActionState(action: RR.ActionFn): RR.ActionStateTuple {
  var stateHook: RR.Hook = updateWorkInProgressHook();
  return updateActionStateImpl(stateHook, currentHook!, action);
}
function updateActionStateImpl(stateHook: RR.Hook | boolean, currentStateHook: RR.Hook | RR.HookState, action: RR.ActionFn): RR.ActionStateTuple {
  currentStateHook = updateReducerImpl(
    (stateHook as RR.Hook),
    (currentStateHook as RR.Hook),
    actionStateReducer
  )[0];
  stateHook = updateReducer(basicStateReducer)[0];
  if (
    "object" === typeof currentStateHook &&
    null !== currentStateHook &&
    "function" === typeof currentStateHook.then
  )
    try {
      var state: RR.HookState = useThenable(currentStateHook);
    } catch (x) {
      if (x === SuspenseException) throw SuspenseActionException;
      throw x;
    }
  else state = currentStateHook;
  currentStateHook = updateWorkInProgressHook();
  var actionQueue: RR.ActionStateQueue = (currentStateHook as RR.Hook).queue as RR.ActionStateQueue,
    dispatch = actionQueue.dispatch;
  action !== (currentStateHook as RR.Hook).memoizedState &&
    ((currentlyRenderingFiber!.flags |= 2048),
    pushSimpleEffect(
      9,
      { destroy: void 0 },
      actionStateActionEffect.bind(null, actionQueue, action),
      null
    ));
  return [state, dispatch, (stateHook as boolean) as boolean];
}
function actionStateActionEffect(actionQueue: RR.ActionStateQueue, action: RR.ActionFn): void {
  actionQueue.action = action;
}
function rerenderActionState<S>(action: RR.ActionFn): RR.ActionStateTuple {
  var stateHook: RR.Hook | S = updateWorkInProgressHook(),
    currentStateHook: RR.Hook | null = currentHook;
  if (null !== currentStateHook)
    return updateActionStateImpl(stateHook, currentStateHook, action);
  updateWorkInProgressHook();
  stateHook = stateHook.memoizedState;
  currentStateHook = updateWorkInProgressHook();
  var dispatch: RR.Dispatch | null = (currentStateHook.queue as RR.ActionStateQueue).dispatch;
  currentStateHook.memoizedState = action;
  return [(stateHook as S), dispatch, !1];
}
function pushSimpleEffect(tag: RR.HookFlags | RR.Effect, inst: RR.EffectInstance | RR.FunctionComponentUpdateQueue | null, create: RR.EffectCreate | RR.Effect | null, deps: RR.HookDeps | RR.Effect | null): RR.Effect {
  tag = { tag: (tag as RR.HookFlags), create: (create as RR.EffectCreate), deps: (deps as RR.HookDeps | null), inst: (inst as RR.EffectInstance), next: null } as RR.Effect;
  inst = currentlyRenderingFiber!.updateQueue as RR.FunctionComponentUpdateQueue | null;
  null === inst &&
    ((inst = createFunctionComponentUpdateQueue()),
    (currentlyRenderingFiber!.updateQueue = inst));
  create = inst.lastEffect;
  null === create
    ? (inst.lastEffect = tag.next = tag)
    : ((deps = create.next),
      (create.next = tag),
      (tag.next = deps),
      (inst.lastEffect = tag));
  return tag;
}
function updateRef(): RR.RefObject {
  return updateWorkInProgressHook().memoizedState;
}
function mountEffectImpl(fiberFlags: RR.Flags, hookFlags: RR.HookFlags, create: RR.EffectCreate, deps: RR.HookDeps | null | undefined): void {
  var hook: RR.Hook = mountWorkInProgressHook();
  currentlyRenderingFiber!.flags |= fiberFlags;
  hook.memoizedState = pushSimpleEffect(
    1 | hookFlags,
    { destroy: void 0 },
    create,
    void 0 === deps ? null : deps
  );
}
function updateEffectImpl(fiberFlags: RR.Flags, hookFlags: RR.HookFlags, create: RR.EffectCreate, deps: RR.HookDeps | null | undefined): void {
  var hook: RR.Hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var inst: RR.EffectInstance = (hook.memoizedState as RR.Effect).inst;
  null !== currentHook &&
  null !== deps &&
  areHookInputsEqual(deps, (currentHook.memoizedState as RR.Effect).deps)
    ? (hook.memoizedState = pushSimpleEffect(hookFlags, inst, create, deps))
    : ((currentlyRenderingFiber!.flags |= fiberFlags),
      (hook.memoizedState = pushSimpleEffect(
        1 | hookFlags,
        inst,
        create,
        deps
      )));
}
function mountEffect(create: RR.EffectCreate, deps: RR.HookDeps | null | undefined): void {
  mountEffectImpl(8390656, 8, create, deps);
}
function updateEffect(create: RR.EffectCreate, deps: RR.HookDeps | null | undefined): void {
  updateEffectImpl(2048, 8, create, deps);
}
function useEffectEventImpl(payload: RR.EventFunctionPayload): void {
  currentlyRenderingFiber!.flags |= 4;
  var componentUpdateQueue: RR.FunctionComponentUpdateQueue | null = currentlyRenderingFiber!.updateQueue as RR.FunctionComponentUpdateQueue | null;
  if (null === componentUpdateQueue)
    (componentUpdateQueue = createFunctionComponentUpdateQueue()),
      (currentlyRenderingFiber!.updateQueue = componentUpdateQueue),
      (componentUpdateQueue.events = [payload]);
  else {
    var events = componentUpdateQueue.events;
    null === events
      ? (componentUpdateQueue.events = [payload])
      : events.push(payload);
  }
}
function updateEvent(callback: RR.EventFunctionRef["impl"]): RR.EventFunctionRef["impl"] {
  var ref: RR.EventFunctionRef = updateWorkInProgressHook().memoizedState;
  useEffectEventImpl({ ref: ref, nextImpl: callback });
  return function () {
    if (0 !== (executionContext & 2))
      throw Error(
        "A function wrapped in useEffectEvent can't be called during rendering."
      );
    return ref.impl.apply(void 0, arguments as any);
  };
}
function updateInsertionEffect(create: RR.EffectCreate, deps: RR.HookDeps | null | undefined): void {
  return updateEffectImpl(4, 2, create, deps);
}
function updateLayoutEffect(create: RR.EffectCreate, deps: RR.HookDeps | null | undefined): void {
  return updateEffectImpl(4, 4, create, deps);
}
function imperativeHandleEffect<T>(create: (() => T) | T, ref: RR.Ref | undefined): void | (() => void) {
  if ("function" === typeof ref) {
    create = (create as (() => T))();
    var refCleanup = ref(create);
    return function () {
      "function" === typeof refCleanup ? refCleanup() : ref(null);
    };
  }
  if (null !== ref && void 0 !== ref)
    return (
      (create = (create as (() => T))()),
      (ref.current = create),
      function () {
        ref.current = null;
      }
    );
}
function updateImperativeHandle<T>(ref: RR.Ref | undefined, create: () => T, deps: RR.HookDeps | null | undefined): void {
  deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
  updateEffectImpl(
    4,
    4,
    imperativeHandleEffect.bind(null, create, ref),
    deps
  );
}
function mountDebugValue(): void {}
function updateCallback<T>(callback: T, deps: RR.HookDeps | null | undefined): T {
  var hook: RR.Hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var prevState: RR.MemoizedPair<T> = hook.memoizedState;
  if (null !== deps && areHookInputsEqual(deps, prevState[1]))
    return prevState[0];
  hook.memoizedState = [callback, deps];
  return callback;
}
function updateMemo<T>(nextCreate: () => T, deps: RR.HookDeps | null | undefined): T {
  var hook: RR.Hook = updateWorkInProgressHook();
  deps = void 0 === deps ? null : deps;
  var prevState: RR.MemoizedPair<T> | T = hook.memoizedState as RR.MemoizedPair<T>;
  if (null !== deps && areHookInputsEqual(deps, prevState[1]))
    return prevState[0];
  prevState = nextCreate();
  if (shouldDoubleInvokeUserFnsInHooksDEV) {
    setIsStrictModeForDevtools(!0);
    try {
      nextCreate();
    } finally {
      setIsStrictModeForDevtools(!1);
    }
  }
  hook.memoizedState = [prevState, deps];
  return prevState;
}
function mountDeferredValueImpl<T>(hook: RR.Hook | RR.Lane, value: T, initialValue: T | undefined): T {
  if (
    void 0 === initialValue ||
    (0 !== (renderLanes & 1073741824) &&
      0 === (workInProgressRootRenderLanes & 261930))
  )
    return ((hook as RR.Hook).memoizedState = value);
  (hook as RR.Hook).memoizedState = initialValue;
  hook = requestDeferredLane();
  currentlyRenderingFiber!.lanes |= hook;
  workInProgressRootSkippedLanes |= hook;
  return initialValue;
}
function updateDeferredValueImpl<T>(hook: RR.Hook | T | number, prevValue: T, value: T, initialValue: T | undefined): T {
  if (objectIs(value, prevValue)) return value;
  if (null !== currentTreeHiddenStackCursor.current)
    return (
      (hook = mountDeferredValueImpl((hook as RR.Hook), value, initialValue)),
      objectIs(hook, prevValue) || (didReceiveUpdate = !0),
      hook
    );
  if (
    0 === (renderLanes & 106) ||
    (0 !== (renderLanes & 1073741824) &&
      0 === (workInProgressRootRenderLanes & 261930))
  )
    return (didReceiveUpdate = !0), ((hook as RR.Hook).memoizedState = value);
  hook = requestDeferredLane();
  currentlyRenderingFiber!.lanes |= hook;
  workInProgressRootSkippedLanes |= hook;
  return prevValue;
}
function startTransition(fiber: RR.Fiber, queue: RR.HookQueue, pendingState: RR.HookState, finishedState: RR.HookState, callback): void {
  var previousPriority: RR.EventPriority = currentUpdatePriority;
  currentUpdatePriority =
    0 !== previousPriority && 8 > previousPriority ? previousPriority : 8;
  var prevTransition: RR.Transition | null = ReactSharedInternals.T,
    currentTransition: RR.Transition = {};
  currentTransition.types =
    null !== prevTransition ? prevTransition.types : null;
  ReactSharedInternals.T = currentTransition;
  dispatchOptimisticSetState(fiber, !1, queue, pendingState);
  try {
    var returnValue: any = callback(),
      onStartTransitionFinish: RR.SharedInternals["S"] = ReactSharedInternals.S;
    null !== onStartTransitionFinish &&
      onStartTransitionFinish(currentTransition, returnValue);
    if (
      null !== returnValue &&
      "object" === typeof returnValue &&
      "function" === typeof returnValue.then
    ) {
      var thenableForFinishedState: RR.ChainedThenable = chainThenableValue(
        returnValue,
        finishedState
      );
      dispatchSetStateInternal(
        fiber,
        queue,
        thenableForFinishedState,
        requestUpdateLane(fiber)
      );
    } else
      dispatchSetStateInternal(
        fiber,
        queue,
        finishedState,
        requestUpdateLane(fiber)
      );
  } catch (error) {
    dispatchSetStateInternal<RR.RejectedThenable>(
      fiber,
      queue,
      { then: function () {}, status: "rejected", reason: error },
      requestUpdateLane(fiber)
    );
  } finally {
    (currentUpdatePriority = previousPriority),
      null !== prevTransition &&
        null !== currentTransition.types &&
        (prevTransition.types = currentTransition.types),
      (ReactSharedInternals.T = prevTransition);
  }
}
function useHostTransitionStatus(): RR.TransitionStatus {
  return readContext(HostTransitionContext);
}
function updateId(): string {
  return updateWorkInProgressHook().memoizedState;
}
function updateRefresh(): () => void {
  return updateWorkInProgressHook().memoizedState;
}
function refreshCache(fiber: RR.Fiber | RR.Update): void {
  for (var provider: RR.Fiber | RR.CacheUpdatePayload | null = (fiber as RR.Fiber).return; null !== provider; ) {
    switch ((provider as RR.Fiber | null)!.tag) {
      case 24:
      case 3:
        var lane: RR.Lane = requestUpdateLane(provider);
        fiber = createUpdate(lane);
        var root: RR.FiberRoot | null = enqueueUpdate((provider as RR.Fiber | null)!, fiber, lane);
        null !== root &&
          (scheduleUpdateOnFiber(root, (provider as RR.Fiber | null)!, lane),
          entangleTransitions(root, (provider as RR.Fiber | null), lane));
        provider = { cache: createCache() };
        fiber.payload = provider;
        return;
    }
    provider = (provider as RR.Fiber | null)!.return;
  }
}
function dispatchReducerAction<A>(fiber: RR.Fiber, queue: RR.HookQueue, action: A | RR.HookUpdate | RR.FiberRoot | null): void {
  var lane: RR.Lane = requestUpdateLane(fiber);
  action = {
    lane: lane,
    revertLane: 0,
    gesture: null,
    action: (action as A),
    hasEagerState: !1,
    eagerState: null,
    next: null
  } as RR.HookUpdate;
  isRenderPhaseUpdate(fiber)
    ? enqueueRenderPhaseUpdate(queue, action)
    : ((action = enqueueConcurrentHookUpdate(fiber, queue, action, lane)),
      null !== action &&
        (scheduleUpdateOnFiber(action, fiber, lane),
        entangleTransitionUpdate(action, queue, lane)));
}
function dispatchSetState(fiber: RR.Fiber, queue: RR.HookQueue, action: RR.HookState): void {
  var lane: RR.Lane = requestUpdateLane(fiber);
  dispatchSetStateInternal(fiber, queue, action, lane);
}
function dispatchSetStateInternal<A>(fiber: RR.Fiber, queue: RR.HookQueue, action: A | RR.FiberRoot | null, lane: RR.Lane): boolean {
  var update: RR.HookUpdate = {
    lane: lane,
    revertLane: 0,
    gesture: null,
    action: (action as A),
    hasEagerState: !1,
    eagerState: null,
    next: null
  };
  if (isRenderPhaseUpdate(fiber)) enqueueRenderPhaseUpdate(queue, update);
  else {
    var alternate: RR.Fiber | RR.Reducer | null = fiber.alternate;
    if (
      0 === fiber.lanes &&
      (null === alternate || 0 === alternate.lanes) &&
      ((alternate = queue.lastRenderedReducer), null !== alternate)
    )
      try {
        var currentState: RR.HookState = queue.lastRenderedState,
          eagerState: RR.HookState = alternate(currentState, (action as A));
        update.hasEagerState = !0;
        update.eagerState = eagerState;
        if (objectIs(eagerState, currentState))
          return (
            enqueueUpdate$1(fiber, queue, update, 0),
            null === workInProgressRoot && finishQueueingConcurrentUpdates(),
            !1
          );
      } catch (error) {
      } finally {
      }
    action = enqueueConcurrentHookUpdate(fiber, queue, update, lane);
    if (null !== action)
      return (
        scheduleUpdateOnFiber(action, fiber, lane),
        entangleTransitionUpdate(action, queue, lane),
        !0
      );
  }
  return !1;
}
function dispatchOptimisticSetState<A>(fiber: RR.Fiber, throwIfDuringRender: boolean | RR.FiberRoot | null, queue: RR.HookQueue, action): void {
  action = {
    lane: 2,
    revertLane: requestTransitionLane(),
    gesture: null,
    action: (action as A),
    hasEagerState: !1,
    eagerState: null,
    next: null
  } as RR.HookUpdate;
  if (isRenderPhaseUpdate(fiber)) {
    if ((throwIfDuringRender as boolean))
      throw Error("Cannot update optimistic state while rendering.");
  } else
    (throwIfDuringRender = enqueueConcurrentHookUpdate(
      fiber,
      queue,
      action,
      2
    )),
      null !== throwIfDuringRender &&
        scheduleUpdateOnFiber(throwIfDuringRender, fiber, 2);
}
function isRenderPhaseUpdate(fiber: RR.Fiber): boolean {
  var alternate = fiber.alternate;
  return (
    fiber === currentlyRenderingFiber ||
    (null !== alternate && alternate === currentlyRenderingFiber)
  );
}
function enqueueRenderPhaseUpdate(queue: RR.HookQueue, update: RR.HookUpdate): void {
  didScheduleRenderPhaseUpdateDuringThisPass = didScheduleRenderPhaseUpdate =
    !0;
  var pending = queue.pending;
  null === pending
    ? (update.next = update)
    : ((update.next = pending.next), (pending.next = update));
  queue.pending = update;
}
function entangleTransitionUpdate(root: RR.FiberRoot, queue: RR.HookQueue, lane: RR.Lanes): void {
  if (0 !== (lane & 4194048)) {
    var queueLanes = queue.lanes;
    queueLanes &= root.pendingLanes;
    lane |= queueLanes;
    queue.lanes = lane;
    markRootEntangled(root, lane);
  }
}
var ContextOnlyDispatcher = {
    readContext: readContext,
    use: use,
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
    useCacheRefresh: throwInvalidHookError,
    useEffectEvent: throwInvalidHookError
  },
  HooksDispatcherOnMount = {
    readContext: readContext,
    use: use,
    useCallback: function (callback, deps) {
      mountWorkInProgressHook().memoizedState = [
        callback,
        void 0 === deps ? null : deps
      ];
      return callback;
    },
    useContext: readContext,
    useEffect: mountEffect,
    useImperativeHandle: function (ref, create, deps) {
      deps = null !== deps && void 0 !== deps ? deps.concat([ref]) : null;
      mountEffectImpl(
        4194308,
        4,
        imperativeHandleEffect.bind(null, create, ref),
        deps
      );
    },
    useLayoutEffect: function (create, deps) {
      return mountEffectImpl(4194308, 4, create, deps);
    },
    useInsertionEffect: function (create, deps) {
      mountEffectImpl(4, 2, create, deps);
    },
    useMemo: function (nextCreate, deps) {
      var hook = mountWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      var nextValue = nextCreate();
      if (shouldDoubleInvokeUserFnsInHooksDEV) {
        setIsStrictModeForDevtools(!0);
        try {
          nextCreate();
        } finally {
          setIsStrictModeForDevtools(!1);
        }
      }
      hook.memoizedState = [nextValue, deps];
      return nextValue;
    },
    useReducer: function (reducer, initialArg, init) {
      var hook = mountWorkInProgressHook();
      if (void 0 !== init) {
        var initialState = init(initialArg);
        if (shouldDoubleInvokeUserFnsInHooksDEV) {
          setIsStrictModeForDevtools(!0);
          try {
            init(initialArg);
          } finally {
            setIsStrictModeForDevtools(!1);
          }
        }
      } else initialState = initialArg;
      hook.memoizedState = hook.baseState = initialState;
      reducer = {
        pending: null,
        lanes: 0,
        dispatch: null,
        lastRenderedReducer: reducer,
        lastRenderedState: initialState
      };
      hook.queue = reducer;
      reducer = reducer.dispatch = dispatchReducerAction.bind(
        null,
        currentlyRenderingFiber,
        reducer
      );
      return [hook.memoizedState, reducer];
    },
    useRef: function (initialValue) {
      var hook = mountWorkInProgressHook();
      initialValue = { current: initialValue };
      return (hook.memoizedState = initialValue);
    },
    useState: function (initialState) {
      initialState = mountStateImpl(initialState);
      var queue = initialState.queue,
        dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
      queue.dispatch = dispatch;
      return [initialState.memoizedState, dispatch];
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = mountWorkInProgressHook();
      return mountDeferredValueImpl(hook, value, initialValue);
    },
    useTransition: function () {
      var stateHook = mountStateImpl(!1);
      stateHook = startTransition.bind(
        null,
        currentlyRenderingFiber,
        stateHook.queue,
        !0,
        !1
      );
      mountWorkInProgressHook().memoizedState = stateHook;
      return [!1, stateHook];
    },
    useSyncExternalStore: function (subscribe, getSnapshot) {
      var fiber = currentlyRenderingFiber,
        hook = mountWorkInProgressHook();
      var nextSnapshot = getSnapshot();
      if (null === workInProgressRoot)
        throw Error(
          "Expected a work-in-progress root. This is a bug in React. Please file an issue."
        );
      0 !== (workInProgressRootRenderLanes & 127) ||
        pushStoreConsistencyCheck(fiber, getSnapshot, nextSnapshot);
      hook.memoizedState = nextSnapshot;
      var inst = { value: nextSnapshot, getSnapshot: getSnapshot };
      hook.queue = inst;
      mountEffect(subscribeToStore.bind(null, fiber, inst, subscribe), [
        subscribe
      ]);
      fiber.flags |= 2048;
      pushSimpleEffect(
        9,
        { destroy: void 0 },
        updateStoreInstance.bind(null, fiber, inst, nextSnapshot, getSnapshot),
        null
      );
      return nextSnapshot;
    },
    useId: function () {
      var hook = mountWorkInProgressHook(),
        identifierPrefix = workInProgressRoot.identifierPrefix,
        globalClientId = globalClientIdCounter++;
      identifierPrefix =
        "_" + identifierPrefix + "r_" + globalClientId.toString(32) + "_";
      return (hook.memoizedState = identifierPrefix);
    },
    useHostTransitionStatus: useHostTransitionStatus,
    useFormState: mountActionState,
    useActionState: mountActionState,
    useOptimistic: function (passthrough) {
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
      hook = dispatchOptimisticSetState.bind(
        null,
        currentlyRenderingFiber,
        !0,
        queue
      );
      queue.dispatch = hook;
      return [passthrough, hook];
    },
    useMemoCache: useMemoCache,
    useCacheRefresh: function () {
      return (mountWorkInProgressHook().memoizedState = refreshCache.bind(
        null,
        currentlyRenderingFiber
      ));
    },
    useEffectEvent: function (callback) {
      var hook = mountWorkInProgressHook(),
        ref = { impl: callback };
      hook.memoizedState = ref;
      return function () {
        if (0 !== (executionContext & 2))
          throw Error(
            "A function wrapped in useEffectEvent can't be called during rendering."
          );
        return ref.impl.apply(void 0, arguments);
      };
    }
  },
  HooksDispatcherOnUpdate = {
    readContext: readContext,
    use: use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: updateReducer,
    useRef: updateRef,
    useState: function () {
      return updateReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = updateWorkInProgressHook();
      return updateDeferredValueImpl(
        hook,
        currentHook.memoizedState,
        value,
        initialValue
      );
    },
    useTransition: function () {
      var booleanOrThenable = updateReducer(basicStateReducer)[0],
        start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable
          ? booleanOrThenable
          : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus: useHostTransitionStatus,
    useFormState: updateActionState,
    useActionState: updateActionState,
    useOptimistic: function (passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
    },
    useMemoCache: useMemoCache,
    useCacheRefresh: updateRefresh,
    useEffectEvent: updateEvent
  },
  HooksDispatcherOnRerender = {
    readContext: readContext,
    use: use,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useImperativeHandle: updateImperativeHandle,
    useInsertionEffect: updateInsertionEffect,
    useLayoutEffect: updateLayoutEffect,
    useMemo: updateMemo,
    useReducer: rerenderReducer,
    useRef: updateRef,
    useState: function () {
      return rerenderReducer(basicStateReducer);
    },
    useDebugValue: mountDebugValue,
    useDeferredValue: function (value, initialValue) {
      var hook = updateWorkInProgressHook();
      return null === currentHook
        ? mountDeferredValueImpl(hook, value, initialValue)
        : updateDeferredValueImpl(
            hook,
            currentHook.memoizedState,
            value,
            initialValue
          );
    },
    useTransition: function () {
      var booleanOrThenable = rerenderReducer(basicStateReducer)[0],
        start = updateWorkInProgressHook().memoizedState;
      return [
        "boolean" === typeof booleanOrThenable
          ? booleanOrThenable
          : useThenable(booleanOrThenable),
        start
      ];
    },
    useSyncExternalStore: updateSyncExternalStore,
    useId: updateId,
    useHostTransitionStatus: useHostTransitionStatus,
    useFormState: rerenderActionState,
    useActionState: rerenderActionState,
    useOptimistic: function (passthrough, reducer) {
      var hook = updateWorkInProgressHook();
      if (null !== currentHook)
        return updateOptimisticImpl(hook, currentHook, passthrough, reducer);
      hook.baseState = passthrough;
      return [passthrough, hook.queue.dispatch];
    },
    useMemoCache: useMemoCache,
    useCacheRefresh: updateRefresh,
    useEffectEvent: updateEvent
  };
function applyDerivedStateFromProps(
  workInProgress: RR.Fiber,
  ctor: RR.ClassComponent | RR.State,
  getDerivedStateFromProps: RR.DeriveStateFromProps | RR.ClassState | RR.State | null | undefined,
  nextProps: RR.Props
): void {
  ctor = workInProgress.memoizedState;
  getDerivedStateFromProps = (getDerivedStateFromProps as RR.DeriveStateFromProps)(nextProps, ctor);
  getDerivedStateFromProps =
    null === getDerivedStateFromProps || void 0 === getDerivedStateFromProps
      ? ctor
      : assign({}, ctor, getDerivedStateFromProps);
  workInProgress.memoizedState = getDerivedStateFromProps;
  0 === workInProgress.lanes &&
    ((workInProgress.updateQueue as RR.UpdateQueue).baseState = getDerivedStateFromProps);
}
var classComponentUpdater = {
  enqueueSetState: function (inst, payload, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(inst),
      update = createUpdate(lane);
    update.payload = payload;
    void 0 !== callback && null !== callback && (update.callback = callback);
    payload = enqueueUpdate(inst, update, lane);
    null !== payload &&
      (scheduleUpdateOnFiber(payload, inst, lane),
      entangleTransitions(payload, inst, lane));
  },
  enqueueReplaceState: function (inst, payload, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(inst),
      update = createUpdate(lane);
    update.tag = 1;
    update.payload = payload;
    void 0 !== callback && null !== callback && (update.callback = callback);
    payload = enqueueUpdate(inst, update, lane);
    null !== payload &&
      (scheduleUpdateOnFiber(payload, inst, lane),
      entangleTransitions(payload, inst, lane));
  },
  enqueueForceUpdate: function (inst, callback) {
    inst = inst._reactInternals;
    var lane = requestUpdateLane(inst),
      update = createUpdate(lane);
    update.tag = 2;
    void 0 !== callback && null !== callback && (update.callback = callback);
    callback = enqueueUpdate(inst, update, lane);
    null !== callback &&
      (scheduleUpdateOnFiber(callback, inst, lane),
      entangleTransitions(callback, inst, lane));
  }
};
function checkShouldComponentUpdate(
  workInProgress: RR.Fiber | RR.ClassInstance,
  ctor: RR.ClassComponent,
  oldProps: RR.Props,
  newProps: RR.Props,
  oldState: RR.State,
  newState: RR.State,
  nextContext: RR.ContextValue
): boolean {
  workInProgress = (workInProgress as RR.Fiber).stateNode as RR.ClassInstance;
  return "function" === typeof workInProgress.shouldComponentUpdate
    ? (workInProgress as RR.ClassInstance).shouldComponentUpdate!(newProps, newState, nextContext)
    : ctor.prototype && ctor.prototype.isPureReactComponent
      ? !shallowEqual(oldProps, newProps) || !shallowEqual(oldState, newState)
      : !0;
}
function constructClassInstance(workInProgress, ctor, props) {
  var context = emptyContextObject,
    contextType = ctor.contextType;
  "object" === typeof contextType &&
    null !== contextType &&
    (context = readContext(contextType));
  ctor = new ctor(props, context);
  workInProgress.memoizedState =
    null !== ctor.state && void 0 !== ctor.state ? ctor.state : null;
  ctor.updater = classComponentUpdater;
  workInProgress.stateNode = ctor;
  ctor._reactInternals = workInProgress;
  return ctor;
}
function callComponentWillReceiveProps(
  workInProgress: RR.Fiber | RR.ClassInstance["state"],
  instance: RR.ClassInstance,
  newProps: RR.Props,
  nextContext: RR.ContextValue
): void {
  workInProgress = instance.state;
  "function" === typeof instance.componentWillReceiveProps &&
    instance.componentWillReceiveProps(newProps, nextContext);
  "function" === typeof instance.UNSAFE_componentWillReceiveProps &&
    instance.UNSAFE_componentWillReceiveProps(newProps, nextContext);
  instance.state !== workInProgress &&
    classComponentUpdater.enqueueReplaceState(instance, instance.state, null);
}
function mountClassInstance(workInProgress, ctor, newProps, renderLanes) {
  var instance = workInProgress.stateNode;
  instance.props = newProps;
  instance.state = workInProgress.memoizedState;
  instance.refs = {};
  initializeUpdateQueue(workInProgress);
  var contextType = ctor.contextType;
  instance.context =
    "object" === typeof contextType && null !== contextType
      ? readContext(contextType)
      : emptyContextObject;
  instance.state = workInProgress.memoizedState;
  contextType = ctor.getDerivedStateFromProps;
  "function" === typeof contextType &&
    (applyDerivedStateFromProps(workInProgress, ctor, contextType, newProps),
    (instance.state = workInProgress.memoizedState));
  "function" === typeof ctor.getDerivedStateFromProps ||
    "function" === typeof instance.getSnapshotBeforeUpdate ||
    ("function" !== typeof instance.UNSAFE_componentWillMount &&
      "function" !== typeof instance.componentWillMount) ||
    ((ctor = instance.state),
    "function" === typeof instance.componentWillMount &&
      instance.componentWillMount(),
    "function" === typeof instance.UNSAFE_componentWillMount &&
      instance.UNSAFE_componentWillMount(),
    ctor !== instance.state &&
      classComponentUpdater.enqueueReplaceState(instance, instance.state, null),
    processUpdateQueue(workInProgress, newProps, instance, renderLanes),
    suspendIfUpdateReadFromEntangledAsyncAction(),
    (instance.state = workInProgress.memoizedState));
  "function" === typeof instance.componentDidMount &&
    (workInProgress.flags |= 4194308);
}
function resolveClassComponentProps(Component: RR.ClassComponent | RR.ClassComponent["defaultProps"], baseProps: RR.Props): RR.Props {
  var newProps: RR.Props = baseProps;
  if ("ref" in baseProps) {
    newProps = {};
    for (var propName in baseProps)
      "ref" !== propName && (newProps[propName] = baseProps[propName]);
  }
  if ((Component = (Component as RR.ClassComponent).defaultProps)) {
    newProps === baseProps && (newProps = assign({}, newProps));
    for (var propName$54 in Component)
      void 0 === newProps[propName$54] &&
        (newProps[propName$54] = (Component as RR.ClassComponent["defaultProps"])![propName$54]);
  }
  return newProps;
}
function defaultOnRecoverableError(error) {
  reportGlobalError(error);
}
function logUncaughtError(root: RR.FiberRoot, errorInfo: RR.CapturedValue): void {
  try {
    var onUncaughtError = root.onUncaughtError;
    onUncaughtError(errorInfo.value, { componentStack: errorInfo.stack });
  } catch (e) {
    setTimeout(function () {
      throw e;
    });
  }
}
function logCaughtError(root: RR.FiberRoot, boundary: RR.Fiber, errorInfo: RR.CapturedValue): void {
  try {
    var onCaughtError = root.onCaughtError;
    onCaughtError(errorInfo.value, {
      componentStack: errorInfo.stack,
      errorBoundary: 1 === boundary.tag ? boundary.stateNode : null
    });
  } catch (e) {
    setTimeout(function () {
      throw e;
    });
  }
}
function createRootErrorUpdate(root: RR.FiberRoot, errorInfo: RR.CapturedValue, lane: RR.Lane | RR.Update): RR.Update {
  lane = createUpdate((lane as RR.Lane));
  lane.tag = 3;
  lane.payload = { element: null } as RR.RootUpdatePayload;
  lane.callback = function () {
    logUncaughtError(root, errorInfo);
  };
  return lane;
}
function createClassErrorUpdate(lane: RR.Lane | RR.Update): RR.Update {
  lane = createUpdate((lane as RR.Lane));
  lane.tag = 3;
  return lane;
}
function initializeClassErrorUpdate(update: RR.Update, root: RR.FiberRoot, fiber: RR.Fiber, errorInfo: RR.CapturedValue): void {
  var getDerivedStateFromError = (fiber.type as RR.ClassComponent).getDerivedStateFromError;
  if ("function" === typeof getDerivedStateFromError) {
    var error = errorInfo.value;
    update.payload = function () {
      return getDerivedStateFromError!(error);
    };
    update.callback = function () {
      logCaughtError(root, fiber, errorInfo);
    };
  }
  var inst: RR.ClassInstance | null = fiber.stateNode as RR.ClassInstance | null;
  null !== inst &&
    "function" === typeof inst.componentDidCatch &&
    (update.callback = function (this: RR.ClassInstance) {
      logCaughtError(root, fiber, errorInfo);
      "function" !== typeof getDerivedStateFromError &&
        (null === legacyErrorBoundariesThatAlreadyFailed
          ? (legacyErrorBoundariesThatAlreadyFailed = new Set([this]))
          : legacyErrorBoundariesThatAlreadyFailed.add(this));
      var stack = errorInfo.stack;
      this.componentDidCatch!(errorInfo.value, {
        componentStack: null !== stack ? stack : ""
      });
    });
}
function throwException(
  root: RR.FiberRoot | Error | RR.Fiber | RR.Lane | RR.Update,
  returnFiber: RR.Fiber | RR.RetryQueue | RR.OffscreenQueue | Error | RR.ClassComponent | null,
  sourceFiber: RR.Fiber | RR.RetryQueue | null,
  value: RR.Thrown | RR.CapturedValue,
  rootRenderLanes: RR.Lanes | RR.Update | any
): boolean {
  (sourceFiber as RR.Fiber).flags |= 32768;
  if (
    null !== value &&
    "object" === typeof value &&
    "function" === typeof value.then
  ) {
    var currentSourceFiber = (sourceFiber as RR.Fiber).alternate;
    null !== currentSourceFiber &&
      propagateParentContextChanges(
        currentSourceFiber,
        (sourceFiber as RR.Fiber),
        (rootRenderLanes as RR.Lanes),
        !0
      );
    currentSourceFiber = sourceFiber.tag;
    0 !== (sourceFiber.mode & 1) ||
      (0 !== currentSourceFiber &&
        11 !== currentSourceFiber &&
        15 !== currentSourceFiber) ||
      ((currentSourceFiber = sourceFiber.alternate)
        ? ((sourceFiber.updateQueue = currentSourceFiber.updateQueue),
          (sourceFiber.memoizedState = currentSourceFiber.memoizedState),
          (sourceFiber.lanes = currentSourceFiber.lanes))
        : ((sourceFiber.updateQueue = null),
          (sourceFiber.memoizedState = null)));
    currentSourceFiber = suspenseHandlerStackCursor.current;
    if (null !== currentSourceFiber) {
      switch (currentSourceFiber.tag) {
        case 31:
        case 13:
        case 19:
          return (
            sourceFiber.mode & 1 &&
              (null === shellBoundary
                ? renderDidSuspendDelayIfPossible()
                : null === currentSourceFiber.alternate &&
                  0 === workInProgressRootExitStatus &&
                  (workInProgressRootExitStatus = 3)),
            (currentSourceFiber.flags &= -257),
            0 === (currentSourceFiber.mode & 1)
              ? currentSourceFiber === returnFiber
                ? (currentSourceFiber.flags |= 65536)
                : ((currentSourceFiber.flags |= 128),
                  (sourceFiber.flags |= 131072),
                  (sourceFiber.flags &= -52805),
                  1 === sourceFiber.tag
                    ? null === sourceFiber.alternate
                      ? (sourceFiber.tag = 17)
                      : ((returnFiber = createUpdate(2)),
                        (returnFiber.tag = 2),
                        enqueueUpdate(sourceFiber, returnFiber, 2))
                    : 0 === sourceFiber.tag &&
                      null === sourceFiber.alternate &&
                      (sourceFiber.tag = 28),
                  (sourceFiber.lanes |= 2))
              : ((currentSourceFiber.flags |= 65536),
                (currentSourceFiber.lanes = (rootRenderLanes as RR.Lanes))),
            value === noopSuspenseyCommitThenable
              ? (currentSourceFiber.flags |= 16384)
              : ((returnFiber = currentSourceFiber.updateQueue as RR.RetryQueue | null),
                null === returnFiber
                  ? (currentSourceFiber.updateQueue = new Set([value]))
                  : returnFiber.add(value),
                currentSourceFiber.mode & 1 &&
                  attachPingListener((root as RR.FiberRoot), value, (rootRenderLanes as RR.Lanes))),
            !1
          );
        case 22:
          if (currentSourceFiber.mode & 1)
            return (
              (currentSourceFiber.flags |= 65536),
              value === noopSuspenseyCommitThenable
                ? (currentSourceFiber.flags |= 16384)
                : ((returnFiber = currentSourceFiber.updateQueue as RR.OffscreenQueue | null),
                  null === returnFiber
                    ? ((returnFiber = {
                        transitions: null,
                        markerInstances: null,
                        retryQueue: new Set([value])
                      } as RR.OffscreenQueue),
                      (currentSourceFiber.updateQueue = returnFiber))
                    : ((sourceFiber = returnFiber.retryQueue),
                      null === sourceFiber
                        ? (returnFiber.retryQueue = new Set([value]))
                        : sourceFiber.add(value)),
                  attachPingListener((root as RR.FiberRoot), value, (rootRenderLanes as RR.Lanes))),
              !1
            );
      }
      throw Error(
        "Unexpected Suspense handler tag (" +
          currentSourceFiber.tag +
          "). This is a bug in React."
      );
    }
    if (1 === root.tag)
      return (
        attachPingListener((root as RR.FiberRoot), value, (rootRenderLanes as RR.Lanes)),
        renderDidSuspendDelayIfPossible(),
        !1
      );
    value = Error(
      "A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition."
    );
  }
  currentSourceFiber = createCapturedValueAtFiber(
    Error(
      "There was an error during concurrent rendering but React was able to recover by instead synchronously rendering the entire root.",
      { cause: value }
    ),
    sourceFiber
  );
  null === workInProgressRootConcurrentErrors
    ? (workInProgressRootConcurrentErrors = [currentSourceFiber])
    : workInProgressRootConcurrentErrors.push(currentSourceFiber);
  4 !== workInProgressRootExitStatus && (workInProgressRootExitStatus = 2);
  if (null === (returnFiber as RR.Fiber | null)) return !0;
  value = createCapturedValueAtFiber(value, (sourceFiber as RR.Fiber));
  do {
    switch (returnFiber.tag) {
      case 3:
        return (
          (returnFiber.flags |= 65536),
          (root = (rootRenderLanes as RR.Lanes) & -(rootRenderLanes as RR.Lanes)),
          (returnFiber.lanes |= root),
          (root = createRootErrorUpdate(returnFiber.stateNode as RR.FiberRoot, (value as RR.CapturedValue), root)),
          enqueueCapturedUpdate(returnFiber, root),
          !1
        );
      case 1:
        sourceFiber = returnFiber.type;
        currentSourceFiber = returnFiber.stateNode;
        if (
          0 === (returnFiber.flags & 128) &&
          ("function" === typeof sourceFiber.getDerivedStateFromError ||
            (null !== currentSourceFiber &&
              "function" === typeof currentSourceFiber.componentDidCatch &&
              (null === legacyErrorBoundariesThatAlreadyFailed ||
                !legacyErrorBoundariesThatAlreadyFailed.has(
                  currentSourceFiber
                ))))
        )
          return (
            (returnFiber.flags |= 65536),
            (rootRenderLanes &= -(rootRenderLanes as RR.Lanes)),
            (returnFiber.lanes |= (rootRenderLanes as RR.Lanes)),
            (rootRenderLanes = createClassErrorUpdate((rootRenderLanes as RR.Lanes))),
            initializeClassErrorUpdate(
              (rootRenderLanes as RR.Update),
              (root as RR.FiberRoot),
              returnFiber,
              (value as RR.CapturedValue)
            ),
            enqueueCapturedUpdate(returnFiber, (rootRenderLanes as RR.Update)),
            !1
          );
        break;
      case 22:
        if (null !== returnFiber.memoizedState)
          return (returnFiber.flags |= 65536), !1;
    }
    returnFiber = returnFiber.return;
  } while (null !== returnFiber);
  return !1;
}
var SelectiveHydrationException = Error(
    "This is not a real error. It's an implementation detail of React's selective hydration feature. If this leaks into userspace, it's a bug in React. Please file an issue."
  ),
  didReceiveUpdate = !1;
function reconcileChildren(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  nextChildren: RR.ReactNode,
  renderLanes: RR.Lanes
): void {
  workInProgress.child =
    null === current
      ? mountChildFibers(workInProgress, null, nextChildren, renderLanes)
      : reconcileChildFibers(
          workInProgress,
          current.child,
          nextChildren,
          renderLanes
        );
}
function updateForwardRef(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  Component: RR.ForwardRefType | RR.FunctionComponent,
  nextProps: RR.PropsWithRef | RR.ReactNode,
  renderLanes: RR.Lanes
): RR.Fiber | null {
  Component = (Component as RR.ForwardRefType).render;
  var ref = workInProgress.ref;
  if ("ref" in (nextProps as RR.PropsWithRef)) {
    var propsWithoutRef: RR.Props = {};
    for (var key in (nextProps as RR.PropsWithRef))
      "ref" !== key && (propsWithoutRef[key] = (nextProps as RR.PropsWithRef)[key]);
  } else propsWithoutRef = (nextProps as RR.PropsWithRef);
  prepareToReadContext(workInProgress);
  nextProps = renderWithHooks(
    current,
    workInProgress,
    (Component as RR.FunctionComponent),
    propsWithoutRef,
    ref,
    renderLanes
  );
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, nextProps, renderLanes);
  return workInProgress.child;
}
function updateMemoComponent(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  Component: RR.MemoType | RR.MemoCompare | null,
  nextProps: RR.Props,
  renderLanes: RR.Lanes
): RR.Fiber | null {
  if (null === current) {
    var type: RR.ElementType | RR.Fiber = (Component as RR.MemoType).type;
    if (
      "function" === typeof type &&
      !shouldConstruct(type) &&
      void 0 === type.defaultProps &&
      null === (Component as RR.MemoType).compare
    )
      return (
        (workInProgress.tag = 15),
        (workInProgress.type = type),
        updateSimpleMemoComponent(
          current,
          workInProgress,
          type as RR.FunctionComponent,
          nextProps,
          renderLanes
        )
      );
    current = createFiberFromTypeAndProps(
      (Component as RR.MemoType).type,
      null,
      nextProps,
      workInProgress,
      workInProgress.mode,
      renderLanes
    );
    current.ref = workInProgress.ref;
    current.return = workInProgress;
    return (workInProgress.child = current);
  }
  type = current.child!;
  if (!checkScheduledUpdateOrContext(current, renderLanes)) {
    var prevProps = type.memoizedProps;
    Component = (Component as RR.MemoType).compare;
    Component = null !== Component ? Component : shallowEqual;
    if ((Component as RR.MemoCompare)(prevProps, nextProps) && current.ref === workInProgress.ref)
      return bailoutOnAlreadyFinishedWork(
        current,
        workInProgress,
        renderLanes
      );
  }
  workInProgress.flags |= 1;
  current = createWorkInProgress(type, nextProps);
  current.ref = workInProgress.ref;
  current.return = workInProgress;
  return (workInProgress.child = current);
}
function updateSimpleMemoComponent(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  Component: RR.FunctionComponent,
  nextProps: RR.Props,
  renderLanes: RR.Lanes
): RR.Fiber | null {
  if (null !== current) {
    var prevProps = current.memoizedProps;
    if (
      shallowEqual(prevProps, nextProps) &&
      current.ref === workInProgress.ref
    )
      if (
        ((didReceiveUpdate = !1),
        (workInProgress.pendingProps = nextProps = prevProps),
        checkScheduledUpdateOrContext(current, renderLanes))
      )
        0 !== (current.flags & 131072) && (didReceiveUpdate = !0);
      else
        return (
          (workInProgress.lanes = current.lanes),
          bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
        );
  }
  return updateFunctionComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    renderLanes
  );
}
function updateOffscreenComponent(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  renderLanes: RR.Lanes,
  nextProps: RR.OffscreenProps | RR.Fiber | RR.Lanes | null
): RR.Fiber | null {
  var nextChildren: RR.Carried | RR.Lanes = (nextProps as RR.OffscreenProps).children,
    prevState: RR.OffscreenState | RR.Lanes | null = null !== current ? current.memoizedState as RR.OffscreenState | null : null;
  null === current &&
    null === workInProgress.stateNode &&
    (workInProgress.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    } as RR.OffscreenInstance);
  if ("hidden" === (nextProps as RR.OffscreenProps).mode) {
    if (0 !== (workInProgress.flags & 128)) {
      prevState =
        null !== prevState ? prevState.baseLanes | renderLanes : renderLanes;
      if (null !== current) {
        nextProps = workInProgress.child = current.child;
        for (nextChildren = 0; null !== nextProps; )
          (nextChildren =
            nextChildren | nextProps.lanes | nextProps.childLanes),
            (nextProps = ((nextProps.sibling as RR.Fiber | null | RR.Lanes) as RR.Fiber | null));
        nextProps = nextChildren & ~prevState;
      } else (nextProps = 0), (workInProgress.child = null);
      return deferHiddenOffscreenComponent(
        current,
        workInProgress,
        prevState,
        renderLanes,
        nextProps
      );
    }
    if (0 === (workInProgress.mode & 1))
      (workInProgress.memoizedState = { baseLanes: 0, cachePool: null }),
        null !== current && pushTransition(workInProgress, null),
        reuseHiddenContextOnStack(),
        pushOffscreenSuspenseHandler(workInProgress);
    else if (0 !== (renderLanes & 536870912))
      (workInProgress.memoizedState = { baseLanes: 0, cachePool: null } as RR.OffscreenState),
        null !== current &&
          pushTransition(
            workInProgress,
            null !== prevState ? prevState.cachePool : null
          ),
        null !== prevState
          ? pushHiddenContext(workInProgress, prevState)
          : reuseHiddenContextOnStack(),
        pushOffscreenSuspenseHandler(workInProgress);
    else
      return (
        (nextProps = workInProgress.lanes = 536870912),
        deferHiddenOffscreenComponent(
          current,
          workInProgress,
          null !== prevState ? prevState.baseLanes | renderLanes : renderLanes,
          renderLanes,
          nextProps
        )
      );
  } else
    null !== prevState
      ? (pushTransition(workInProgress, prevState.cachePool),
        pushHiddenContext(workInProgress, prevState),
        reuseSuspenseHandlerOnStack(),
        (workInProgress.memoizedState = null))
      : (null !== current && pushTransition(workInProgress, null),
        reuseHiddenContextOnStack(),
        reuseSuspenseHandlerOnStack());
  reconcileChildren(current, workInProgress, nextChildren, renderLanes);
  return workInProgress.child;
}
function bailoutOffscreenComponent(current: RR.Fiber | null, workInProgress: RR.Fiber): RR.Fiber | null {
  (null !== current && 22 === current.tag) ||
    null !== workInProgress.stateNode ||
    (workInProgress.stateNode = {
      _visibility: 1,
      _pendingMarkers: null,
      _retryCache: null,
      _transitions: null
    } as RR.OffscreenInstance);
  return workInProgress.sibling;
}
function deferHiddenOffscreenComponent(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  nextBaseLanes: RR.Lanes,
  renderLanes: RR.Lanes,
  remainingChildLanes: RR.Lanes
): null {
  var JSCompiler_inline_result: RR.Cache | RR.SpawnedCachePool | null = peekCacheFromPool();
  JSCompiler_inline_result =
    null === JSCompiler_inline_result
      ? null
      : { parent: CacheContext._currentValue2, pool: JSCompiler_inline_result };
  workInProgress.memoizedState = {
    baseLanes: nextBaseLanes,
    cachePool: JSCompiler_inline_result
  } as RR.OffscreenState;
  null !== current && pushTransition(workInProgress, null);
  reuseHiddenContextOnStack();
  pushOffscreenSuspenseHandler(workInProgress);
  null !== current &&
    propagateParentContextChanges(current, workInProgress, renderLanes, !0);
  workInProgress.childLanes = remainingChildLanes;
  return null;
}
function mountActivityChildren(workInProgress: RR.Fiber, nextProps: RR.Props | RR.Fiber): RR.Fiber {
  nextProps = mountWorkInProgressOffscreenFiber(
    { mode: (nextProps as RR.Props).mode, children: (nextProps as RR.Props).children },
    workInProgress.mode
  );
  nextProps.ref = workInProgress.ref;
  workInProgress.child = nextProps;
  nextProps.return = workInProgress;
  return nextProps;
}
function retryActivityComponentWithoutHydrating(
  current: RR.Fiber,
  workInProgress: RR.Fiber,
  renderLanes: RR.Lanes
): RR.Fiber {
  reconcileChildFibers(workInProgress, current.child, null, renderLanes);
  current = mountActivityChildren(
    workInProgress,
    workInProgress.pendingProps
  );
  current.flags |= 2;
  popSuspenseHandler(workInProgress);
  workInProgress.memoizedState = null;
  return current;
}
function markRef(current: RR.Fiber | null, workInProgress: RR.Fiber): void {
  var ref = workInProgress.ref;
  if (null === ref)
    null !== current &&
      null !== current.ref &&
      (workInProgress.flags |= 4194816);
  else {
    if ("function" !== typeof ref && "object" !== typeof ref)
      throw Error(
        "Expected ref to be a function, an object returned by React.createRef(), or undefined/null."
      );
    if (null === current || current.ref !== ref)
      workInProgress.flags |= 4194816;
  }
}
function updateFunctionComponent(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  Component: RR.FunctionComponent | RR.ReactNode,
  nextProps: RR.Props | boolean,
  renderLanes: RR.Lanes
): RR.Fiber | null {
  prepareToReadContext(workInProgress);
  Component = renderWithHooks(
    current,
    workInProgress,
    (Component as RR.FunctionComponent),
    (nextProps as RR.Props),
    void 0,
    renderLanes
  );
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, Component, renderLanes);
  return workInProgress.child;
}
function replayFunctionComponent(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  nextProps: RR.Props | RR.ReactNode,
  Component: RR.FunctionComponent | boolean,
  secondArg: RR.Ref | undefined,
  renderLanes: RR.Lanes
): RR.Fiber | null {
  prepareToReadContext(workInProgress);
  workInProgress.updateQueue = null;
  nextProps = renderWithHooksAgain(
    workInProgress,
    (Component as RR.FunctionComponent),
    (nextProps as RR.Props),
    secondArg
  );
  finishRenderingHooks(current);
  if (null !== current && !didReceiveUpdate)
    return (
      bailoutHooks(current, workInProgress, renderLanes),
      bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes)
    );
  workInProgress.flags |= 1;
  reconcileChildren(current, workInProgress, nextProps, renderLanes);
  return workInProgress.child;
}
function updateClassComponent(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  Component: RR.ClassComponent | RR.ReactNode,
  nextProps: RR.Props | boolean,
  renderLanes: RR.Lanes
): RR.Fiber | null {
  prepareToReadContext(workInProgress);
  if (null === workInProgress.stateNode)
    resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
      constructClassInstance(workInProgress, Component, nextProps),
      mountClassInstance(workInProgress, Component, nextProps, renderLanes),
      (nextProps = !0);
  else if (null === current) {
    var instance = workInProgress.stateNode,
      unresolvedOldProps = workInProgress.memoizedProps,
      oldProps = resolveClassComponentProps(Component, unresolvedOldProps);
    instance.props = oldProps;
    var oldContext = instance.context,
      contextType = Component.contextType,
      nextContext = emptyContextObject;
    "object" === typeof contextType &&
      null !== contextType &&
      (nextContext = readContext(contextType));
    var getDerivedStateFromProps = Component.getDerivedStateFromProps;
    contextType =
      "function" === typeof getDerivedStateFromProps ||
      "function" === typeof instance.getSnapshotBeforeUpdate;
    unresolvedOldProps = workInProgress.pendingProps !== unresolvedOldProps;
    contextType ||
      ("function" !== typeof instance.UNSAFE_componentWillReceiveProps &&
        "function" !== typeof instance.componentWillReceiveProps) ||
      ((unresolvedOldProps || oldContext !== nextContext) &&
        callComponentWillReceiveProps(
          workInProgress,
          instance,
          nextProps,
          nextContext
        ));
    hasForceUpdate = !1;
    var oldState = workInProgress.memoizedState;
    instance.state = oldState;
    processUpdateQueue(workInProgress, nextProps, instance, renderLanes);
    suspendIfUpdateReadFromEntangledAsyncAction();
    oldContext = workInProgress.memoizedState;
    unresolvedOldProps || oldState !== oldContext || hasForceUpdate
      ? ("function" === typeof getDerivedStateFromProps &&
          (applyDerivedStateFromProps(
            workInProgress,
            Component,
            getDerivedStateFromProps,
            nextProps
          ),
          (oldContext = workInProgress.memoizedState)),
        (oldProps =
          hasForceUpdate ||
          checkShouldComponentUpdate(
            workInProgress,
            Component,
            oldProps,
            nextProps,
            oldState,
            oldContext,
            nextContext
          ))
          ? (contextType ||
              ("function" !== typeof instance.UNSAFE_componentWillMount &&
                "function" !== typeof instance.componentWillMount) ||
              ("function" === typeof instance.componentWillMount &&
                instance.componentWillMount(),
              "function" === typeof instance.UNSAFE_componentWillMount &&
                instance.UNSAFE_componentWillMount()),
            "function" === typeof instance.componentDidMount &&
              (workInProgress.flags |= 4194308))
          : ("function" === typeof instance.componentDidMount &&
              (workInProgress.flags |= 4194308),
            (workInProgress.memoizedProps = nextProps),
            (workInProgress.memoizedState = oldContext)),
        (instance.props = nextProps),
        (instance.state = oldContext),
        (instance.context = nextContext),
        (nextProps = oldProps))
      : ("function" === typeof instance.componentDidMount &&
          (workInProgress.flags |= 4194308),
        (nextProps = !1));
  } else {
    instance = workInProgress.stateNode;
    cloneUpdateQueue(current, workInProgress);
    nextContext = workInProgress.memoizedProps;
    contextType = resolveClassComponentProps(Component, nextContext);
    instance.props = contextType;
    getDerivedStateFromProps = workInProgress.pendingProps;
    oldState = instance.context;
    oldContext = Component.contextType;
    oldProps = emptyContextObject;
    "object" === typeof oldContext &&
      null !== oldContext &&
      (oldProps = readContext(oldContext));
    unresolvedOldProps = Component.getDerivedStateFromProps;
    (oldContext =
      "function" === typeof unresolvedOldProps ||
      "function" === typeof instance.getSnapshotBeforeUpdate) ||
      ("function" !== typeof instance.UNSAFE_componentWillReceiveProps &&
        "function" !== typeof instance.componentWillReceiveProps) ||
      ((nextContext !== getDerivedStateFromProps || oldState !== oldProps) &&
        callComponentWillReceiveProps(
          workInProgress,
          instance,
          nextProps,
          oldProps
        ));
    hasForceUpdate = !1;
    oldState = workInProgress.memoizedState;
    instance.state = oldState;
    processUpdateQueue(workInProgress, nextProps, instance, renderLanes);
    suspendIfUpdateReadFromEntangledAsyncAction();
    var newState = workInProgress.memoizedState;
    nextContext !== getDerivedStateFromProps ||
    oldState !== newState ||
    hasForceUpdate ||
    (null !== current &&
      null !== current.dependencies &&
      checkIfContextChanged(current.dependencies))
      ? ("function" === typeof unresolvedOldProps &&
          (applyDerivedStateFromProps(
            workInProgress,
            Component,
            unresolvedOldProps,
            nextProps
          ),
          (newState = workInProgress.memoizedState)),
        (contextType =
          hasForceUpdate ||
          checkShouldComponentUpdate(
            workInProgress,
            Component,
            contextType,
            nextProps,
            oldState,
            newState,
            oldProps
          ) ||
          (null !== current &&
            null !== current.dependencies &&
            checkIfContextChanged(current.dependencies)))
          ? (oldContext ||
              ("function" !== typeof instance.UNSAFE_componentWillUpdate &&
                "function" !== typeof instance.componentWillUpdate) ||
              ("function" === typeof instance.componentWillUpdate &&
                instance.componentWillUpdate(nextProps, newState, oldProps),
              "function" === typeof instance.UNSAFE_componentWillUpdate &&
                instance.UNSAFE_componentWillUpdate(
                  nextProps,
                  newState,
                  oldProps
                )),
            "function" === typeof instance.componentDidUpdate &&
              (workInProgress.flags |= 4),
            "function" === typeof instance.getSnapshotBeforeUpdate &&
              (workInProgress.flags |= 1024))
          : ("function" !== typeof instance.componentDidUpdate ||
              (nextContext === current.memoizedProps &&
                oldState === current.memoizedState) ||
              (workInProgress.flags |= 4),
            "function" !== typeof instance.getSnapshotBeforeUpdate ||
              (nextContext === current.memoizedProps &&
                oldState === current.memoizedState) ||
              (workInProgress.flags |= 1024),
            (workInProgress.memoizedProps = nextProps),
            (workInProgress.memoizedState = newState)),
        (instance.props = nextProps),
        (instance.state = newState),
        (instance.context = oldProps),
        (nextProps = contextType))
      : ("function" !== typeof instance.componentDidUpdate ||
          (nextContext === current.memoizedProps &&
            oldState === current.memoizedState) ||
          (workInProgress.flags |= 4),
        "function" !== typeof instance.getSnapshotBeforeUpdate ||
          (nextContext === current.memoizedProps &&
            oldState === current.memoizedState) ||
          (workInProgress.flags |= 1024),
        (nextProps = !1));
  }
  return finishClassComponent(
    current,
    workInProgress,
    Component,
    nextProps,
    !1,
    renderLanes
  );
}
function finishClassComponent(
  current,
  workInProgress,
  Component,
  shouldUpdate,
  hasContext,
  renderLanes
) {
  markRef(current, workInProgress);
  hasContext = 0 !== (workInProgress.flags & 128);
  if (!shouldUpdate && !hasContext)
    return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
  shouldUpdate = workInProgress.stateNode;
  Component =
    hasContext && "function" !== typeof Component.getDerivedStateFromError
      ? null
      : shouldUpdate.render();
  workInProgress.flags |= 1;
  null !== current && hasContext
    ? ((workInProgress.child = reconcileChildFibers(
        workInProgress,
        current.child,
        null,
        renderLanes
      )),
      (workInProgress.child = reconcileChildFibers(
        workInProgress,
        null,
        Component,
        renderLanes
      )))
    : reconcileChildren(current, workInProgress, Component, renderLanes);
  workInProgress.memoizedState = shouldUpdate.state;
  return workInProgress.child;
}
var SUSPENDED_MARKER = {
  dehydrated: null,
  treeContext: null,
  retryLane: 0,
  hydrationErrors: null
};
function mountSuspenseOffscreenState(renderLanes: RR.Lanes): RR.OffscreenState {
  return { baseLanes: renderLanes, cachePool: getSuspendedCache() };
}
function getRemainingWorkInPrimaryTree(
  current: RR.Fiber | RR.Lanes | null,
  primaryTreeDidDefer: boolean,
  renderLanes: RR.Lanes
): RR.Lanes {
  current = null !== (current as RR.Fiber | null) ? (current as RR.Fiber | null)!.childLanes & ~renderLanes : 0;
  primaryTreeDidDefer && (current |= workInProgressDeferredLane);
  return current;
}
function updateSuspenseComponent(current: RR.Fiber | RR.HydratableInstance | RR.SuspenseInstance | RR.TreeContext | null, workInProgress: RR.Fiber | null, renderLanes: RR.Lanes | RR.Fiber): RR.Fiber | null {
  var nextProps = workInProgress.pendingProps,
    showFallback = !1,
    didSuspend = 0 !== (workInProgress.flags & 128),
    JSCompiler_temp;
  (JSCompiler_temp = didSuspend) ||
    (JSCompiler_temp =
      null !== current && null === current.memoizedState
        ? !1
        : 0 !== (suspenseStackCursor.current & 2));
  JSCompiler_temp && ((showFallback = !0), (workInProgress.flags &= -129));
  JSCompiler_temp = 0 !== (workInProgress.flags & 32);
  workInProgress.flags &= -33;
  if (null === current) {
    didSuspend = nextProps.children;
    nextProps = nextProps.fallback;
    if (showFallback) {
      reuseSuspenseHandlerOnStack();
      showFallback = workInProgress.mode;
      var progressedPrimaryFragment = workInProgress.child;
      didSuspend = { mode: "hidden", children: didSuspend };
      0 === (showFallback & 1) && null !== progressedPrimaryFragment
        ? ((progressedPrimaryFragment.childLanes = 0),
          (progressedPrimaryFragment.pendingProps = didSuspend))
        : (progressedPrimaryFragment = mountWorkInProgressOffscreenFiber(
            didSuspend,
            showFallback
          ));
      nextProps = createFiberFromFragment(
        nextProps,
        showFallback,
        renderLanes,
        null
      );
      progressedPrimaryFragment.return = workInProgress;
      nextProps.return = workInProgress;
      progressedPrimaryFragment.sibling = nextProps;
      workInProgress.child = progressedPrimaryFragment;
      nextProps = workInProgress.child;
      nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes);
      nextProps.childLanes = getRemainingWorkInPrimaryTree(
        current,
        JSCompiler_temp,
        renderLanes
      );
      workInProgress.memoizedState = SUSPENDED_MARKER;
      return bailoutOffscreenComponent(null, nextProps);
    }
    pushPrimaryTreeSuspenseHandler(workInProgress);
    return mountSuspensePrimaryChildren(workInProgress, didSuspend);
  }
  progressedPrimaryFragment = current.memoizedState;
  if (null !== progressedPrimaryFragment) {
    var dehydrated = progressedPrimaryFragment.dehydrated;
    if (null !== dehydrated)
      return updateDehydratedSuspenseComponent(
        current,
        workInProgress,
        didSuspend,
        JSCompiler_temp,
        nextProps,
        dehydrated,
        progressedPrimaryFragment,
        renderLanes
      );
  }
  if (showFallback) {
    reuseSuspenseHandlerOnStack();
    showFallback = nextProps.fallback;
    didSuspend = workInProgress.mode;
    progressedPrimaryFragment = current.child;
    dehydrated = progressedPrimaryFragment.sibling;
    var primaryChildProps = { mode: "hidden", children: nextProps.children };
    0 === (didSuspend & 1) && workInProgress.child !== progressedPrimaryFragment
      ? ((nextProps = workInProgress.child),
        (nextProps.childLanes = 0),
        (nextProps.pendingProps = primaryChildProps),
        (workInProgress.deletions = null))
      : ((nextProps = createWorkInProgress(
          progressedPrimaryFragment,
          primaryChildProps
        )),
        (nextProps.subtreeFlags =
          progressedPrimaryFragment.subtreeFlags & 1206910976));
    null !== dehydrated
      ? (showFallback = createWorkInProgress(dehydrated, showFallback))
      : ((showFallback = createFiberFromFragment(
          showFallback,
          didSuspend,
          renderLanes,
          null
        )),
        (showFallback.flags |= 2));
    showFallback.return = workInProgress;
    nextProps.return = workInProgress;
    nextProps.sibling = showFallback;
    workInProgress.child = nextProps;
    bailoutOffscreenComponent(null, nextProps);
    nextProps = workInProgress.child;
    showFallback = current.child.memoizedState;
    null === showFallback
      ? (showFallback = mountSuspenseOffscreenState(renderLanes))
      : ((didSuspend = showFallback.cachePool),
        null !== didSuspend
          ? ((progressedPrimaryFragment = CacheContext._currentValue2),
            (didSuspend =
              didSuspend.parent !== progressedPrimaryFragment
                ? {
                    parent: progressedPrimaryFragment,
                    pool: progressedPrimaryFragment
                  }
                : didSuspend))
          : (didSuspend = getSuspendedCache()),
        (showFallback = {
          baseLanes: showFallback.baseLanes | renderLanes,
          cachePool: didSuspend
        }));
    nextProps.memoizedState = showFallback;
    nextProps.childLanes = getRemainingWorkInPrimaryTree(
      current,
      JSCompiler_temp,
      renderLanes
    );
    workInProgress.memoizedState = SUSPENDED_MARKER;
    return bailoutOffscreenComponent(current.child, nextProps);
  }
  pushPrimaryTreeSuspenseHandler(workInProgress);
  JSCompiler_temp = current.child;
  current = JSCompiler_temp.sibling;
  JSCompiler_temp = createWorkInProgress(JSCompiler_temp, {
    mode: "visible",
    children: nextProps.children
  });
  0 === (workInProgress.mode & 1) && (JSCompiler_temp.lanes = renderLanes);
  JSCompiler_temp.return = workInProgress;
  JSCompiler_temp.sibling = null;
  null !== current &&
    ((renderLanes = workInProgress.deletions),
    null === renderLanes
      ? ((workInProgress.deletions = [current]), (workInProgress.flags |= 16))
      : renderLanes.push(current));
  workInProgress.child = JSCompiler_temp;
  workInProgress.memoizedState = null;
  return JSCompiler_temp;
}
function mountSuspensePrimaryChildren(workInProgress: RR.Fiber, primaryChildren: RR.ReactNode | RR.Fiber): RR.Fiber {
  primaryChildren = mountWorkInProgressOffscreenFiber(
    { mode: "visible", children: primaryChildren },
    workInProgress.mode
  );
  (primaryChildren as RR.Fiber).return = workInProgress;
  return (workInProgress.child = (primaryChildren as RR.Fiber));
}
function mountWorkInProgressOffscreenFiber(offscreenProps: RR.OffscreenProps | RR.Fiber, mode: RR.TypeOfMode): RR.Fiber {
  offscreenProps = createFiberImplClass(22, (offscreenProps as RR.OffscreenProps), null, mode);
  offscreenProps.lanes = 0;
  return offscreenProps;
}
function retrySuspenseComponentWithoutHydrating(
  current: RR.Fiber,
  workInProgress: RR.Fiber,
  renderLanes: RR.Lanes
): RR.Fiber {
  reconcileChildFibers(workInProgress, current.child, null, renderLanes);
  current = mountSuspensePrimaryChildren(
    workInProgress,
    workInProgress.pendingProps.children
  );
  current.flags |= 2;
  workInProgress.memoizedState = null;
  return current;
}
function updateDehydratedSuspenseComponent(
  current: any,
  workInProgress: RR.Fiber,
  didSuspend: any,
  didPrimaryChildrenDefer: any,
  nextProps: any,
  suspenseInstance: any,
  suspenseState: any,
  renderLanes: RR.Lanes
): RR.Fiber | null {
  if (didSuspend) {
    if (workInProgress.flags & 256)
      return (
        pushPrimaryTreeSuspenseHandler(workInProgress),
        (workInProgress.flags &= -257),
        retrySuspenseComponentWithoutHydrating(
          current,
          workInProgress,
          renderLanes
        )
      );
    if (null !== workInProgress.memoizedState)
      return (
        reuseSuspenseHandlerOnStack(),
        (workInProgress.child = current.child),
        (workInProgress.flags |= 128),
        null
      );
    reuseSuspenseHandlerOnStack();
    suspenseState = nextProps.fallback;
    didSuspend = workInProgress.mode;
    nextProps = mountWorkInProgressOffscreenFiber(
      { mode: "visible", children: nextProps.children },
      didSuspend
    );
    suspenseState = createFiberFromFragment(
      suspenseState,
      didSuspend,
      renderLanes,
      null
    );
    suspenseState.flags |= 2;
    nextProps.return = workInProgress;
    suspenseState.return = workInProgress;
    nextProps.sibling = suspenseState;
    workInProgress.child = nextProps;
    0 !== (workInProgress.mode & 1) &&
      reconcileChildFibers(workInProgress, current.child, null, renderLanes);
    nextProps = workInProgress.child;
    nextProps.memoizedState = mountSuspenseOffscreenState(renderLanes);
    nextProps.childLanes = getRemainingWorkInPrimaryTree(
      current,
      didPrimaryChildrenDefer,
      renderLanes
    );
    workInProgress.memoizedState = SUSPENDED_MARKER;
    return bailoutOffscreenComponent(null, nextProps);
  }
  pushPrimaryTreeSuspenseHandler(workInProgress);
  if (shim$1())
    return (
      (didPrimaryChildrenDefer = shim$1().digest),
      "" !== didPrimaryChildrenDefer &&
        ((nextProps = Error(
          "The server could not finish this Suspense boundary, likely due to an error during server rendering. Switched to client rendering."
        )),
        (nextProps.stack = ""),
        (nextProps.digest = didPrimaryChildrenDefer),
        (didPrimaryChildrenDefer = {
          value: nextProps,
          source: null,
          stack: null
        }),
        null === hydrationErrors
          ? (hydrationErrors = [didPrimaryChildrenDefer])
          : hydrationErrors.push(didPrimaryChildrenDefer)),
      retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes
      )
    );
  didReceiveUpdate ||
    propagateParentContextChanges(current, workInProgress, renderLanes, !1);
  didPrimaryChildrenDefer = 0 !== (renderLanes & current.childLanes);
  if (didReceiveUpdate || didPrimaryChildrenDefer) {
    if (null !== currentTreeHiddenStackCursor.current)
      return retrySuspenseComponentWithoutHydrating(
        current,
        workInProgress,
        renderLanes
      );
    didPrimaryChildrenDefer = workInProgressRoot;
    if (
      null !== didPrimaryChildrenDefer &&
      ((nextProps = getBumpedLaneForHydration(
        didPrimaryChildrenDefer,
        renderLanes
      )),
      0 !== nextProps && nextProps !== suspenseState.retryLane)
    )
      throw (
        ((suspenseState.retryLane = nextProps),
        enqueueConcurrentRenderForLane(current, nextProps),
        scheduleUpdateOnFiber(didPrimaryChildrenDefer, current, nextProps),
        SelectiveHydrationException)
      );
    shim$1() || renderDidSuspendDelayIfPossible();
    return retrySuspenseComponentWithoutHydrating(
      current,
      workInProgress,
      renderLanes
    );
  }
  if (shim$1())
    return (
      (workInProgress.flags |= 192),
      (workInProgress.child = current.child),
      null
    );
  current = mountSuspensePrimaryChildren(workInProgress, nextProps.children);
  current.flags |= 134221824;
  return current;
}
function scheduleSuspenseWorkOnFiber(fiber: RR.Fiber, renderLanes: RR.Lanes, propagationRoot: RR.Fiber): void {
  fiber.lanes |= renderLanes;
  var alternate = fiber.alternate;
  null !== alternate && (alternate.lanes |= renderLanes);
  scheduleContextWorkOnParentPath(fiber.return, renderLanes, propagationRoot);
}
function findLastContentRow(firstChild: RR.Fiber | null): RR.Fiber | null {
  for (var lastContentRow: RR.Fiber | null = null; null !== firstChild; ) {
    var currentRow = firstChild.alternate;
    null !== currentRow &&
      null === findFirstSuspended(currentRow) &&
      (lastContentRow = firstChild);
    firstChild = firstChild.sibling;
  }
  return lastContentRow;
}
function initSuspenseListRenderState(
  workInProgress: RR.Fiber,
  isBackwards: boolean,
  tail: RR.Fiber | null,
  lastContentRow: RR.Fiber | null,
  tailMode: RR.SuspenseListTailMode,
  treeForkCount: number
): void {
  var renderState: RR.SuspenseListRenderState | null = workInProgress.memoizedState as RR.SuspenseListRenderState | null;
  null === renderState
    ? (workInProgress.memoizedState = {
        isBackwards: isBackwards,
        rendering: null,
        renderingStartTime: 0,
        last: lastContentRow,
        tail: tail,
        tailMode: tailMode,
        treeForkCount: treeForkCount
      } as RR.SuspenseListRenderState)
    : ((renderState.isBackwards = isBackwards),
      (renderState.rendering = null),
      (renderState.renderingStartTime = 0),
      (renderState.last = lastContentRow),
      (renderState.tail = tail),
      (renderState.tailMode = tailMode),
      (renderState.treeForkCount = treeForkCount));
}
function reverseChildren(fiber: RR.Fiber): void {
  var row = fiber.child;
  for (fiber.child = null; null !== row; ) {
    var nextRow = row.sibling;
    row.sibling = fiber.child;
    fiber.child = row;
    row = nextRow;
  }
}
function updateSuspenseListComponent(current: RR.Fiber | null, workInProgress: RR.Fiber, renderLanes: RR.Lanes | RR.Fiber | null): RR.Fiber | null {
  var nextProps = workInProgress.pendingProps,
    revealOrder = nextProps.revealOrder,
    tailMode = nextProps.tail;
  nextProps = nextProps.children;
  var suspenseContext = suspenseStackCursor.current;
  if (workInProgress.flags & 128)
    return pushSuspenseListContext(workInProgress, suspenseContext), null;
  var shouldForceFallback = 0 !== (suspenseContext & 2);
  shouldForceFallback
    ? ((suspenseContext = (suspenseContext & 1) | 2),
      (workInProgress.flags |= 128))
    : (suspenseContext &= 1);
  pushSuspenseListContext(workInProgress, suspenseContext);
  "backwards" === revealOrder && null !== current
    ? (reverseChildren(current),
      reconcileChildren(current, workInProgress, nextProps, renderLanes),
      reverseChildren(current))
    : reconcileChildren(current, workInProgress, nextProps, renderLanes);
  if (!shouldForceFallback && null !== current && 0 !== (current.flags & 128))
    a: for (current = workInProgress.child; null !== current; ) {
      if (13 === current.tag)
        null !== current.memoizedState &&
          scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
      else if (19 === current.tag)
        scheduleSuspenseWorkOnFiber(current, renderLanes, workInProgress);
      else if (null !== current.child) {
        current.child.return = current;
        current = current.child;
        continue;
      }
      if (current === workInProgress) break a;
      for (; null === current.sibling; ) {
        if (null === current.return || current.return === workInProgress)
          break a;
        current = current.return;
      }
      current.sibling.return = current.return;
      current = current.sibling;
    }
  if (0 === (workInProgress.mode & 1)) workInProgress.memoizedState = null;
  else
    switch (revealOrder) {
      case "backwards":
        renderLanes = findLastContentRow(workInProgress.child);
        null === renderLanes
          ? ((revealOrder = workInProgress.child),
            (workInProgress.child = null))
          : ((revealOrder = renderLanes.sibling),
            (renderLanes.sibling = null),
            reverseChildren(workInProgress));
        initSuspenseListRenderState(
          workInProgress,
          !0,
          revealOrder,
          null,
          tailMode,
          0
        );
        break;
      case "unstable_legacy-backwards":
        renderLanes = null;
        revealOrder = workInProgress.child;
        for (workInProgress.child = null; null !== revealOrder; ) {
          current = revealOrder.alternate;
          if (null !== current && null === findFirstSuspended(current)) {
            workInProgress.child = revealOrder;
            break;
          }
          current = revealOrder.sibling;
          revealOrder.sibling = renderLanes;
          renderLanes = revealOrder;
          revealOrder = current;
        }
        initSuspenseListRenderState(
          workInProgress,
          !0,
          renderLanes,
          null,
          tailMode,
          0
        );
        break;
      case "together":
        initSuspenseListRenderState(workInProgress, !1, null, null, void 0, 0);
        break;
      case "independent":
        workInProgress.memoizedState = null;
        break;
      default:
        (renderLanes = findLastContentRow(workInProgress.child)),
          null === renderLanes
            ? ((revealOrder = workInProgress.child),
              (workInProgress.child = null))
            : ((revealOrder = renderLanes.sibling),
              (renderLanes.sibling = null)),
          initSuspenseListRenderState(
            workInProgress,
            !1,
            revealOrder,
            renderLanes,
            tailMode,
            0
          );
    }
  return workInProgress.child;
}
function updateContextProvider(current: RR.Fiber | null, workInProgress: RR.Fiber, renderLanes: RR.Lanes): RR.Fiber | null {
  var newProps: RR.ProviderProps = workInProgress.pendingProps;
  pushProvider(workInProgress, workInProgress.type as RR.ReactContext<any>, newProps.value);
  reconcileChildren(current, workInProgress, newProps.children, renderLanes);
  return workInProgress.child;
}
function resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress) {
  0 === (workInProgress.mode & 1) &&
    null !== current &&
    ((current.alternate = null),
    (workInProgress.alternate = null),
    (workInProgress.flags |= 2));
}
function bailoutOnAlreadyFinishedWork(current: RR.Fiber | null, workInProgress: RR.Fiber, renderLanes: RR.Lanes | RR.Fiber): RR.Fiber | null {
  null !== current && (workInProgress.dependencies = current.dependencies);
  workInProgressRootSkippedLanes |= workInProgress.lanes;
  if (0 === ((renderLanes as RR.Lanes) & workInProgress.childLanes))
    if (null !== current) {
      if (
        (propagateParentContextChanges(
          current,
          workInProgress,
          (renderLanes as RR.Lanes),
          !1
        ),
        0 === ((renderLanes as RR.Lanes) & workInProgress.childLanes))
      )
        return null;
    } else return null;
  if (null !== current && workInProgress.child !== current.child)
    throw Error("Resuming work not yet implemented.");
  if (null !== workInProgress.child) {
    current = workInProgress.child;
    renderLanes = createWorkInProgress(current, current.pendingProps);
    workInProgress.child = renderLanes;
    for (renderLanes.return = workInProgress; null !== current!.sibling; )
      (current = current!.sibling),
        (renderLanes = renderLanes.sibling =
          createWorkInProgress(current, current.pendingProps)),
        (renderLanes.return = workInProgress);
    renderLanes.sibling = null;
  }
  return workInProgress.child;
}
function checkScheduledUpdateOrContext(current: RR.Fiber | RR.Dependencies | null, renderLanes: RR.Lanes): boolean {
  if (0 !== ((current as RR.Fiber).lanes & renderLanes)) return !0;
  current = (current as RR.Fiber).dependencies;
  return null !== current && checkIfContextChanged((current as RR.Dependencies | null)) ? !0 : !1;
}
function attemptEarlyBailoutIfNoScheduledUpdate(
  current: RR.Fiber | null,
  workInProgress: RR.Fiber,
  renderLanes: RR.Lanes
): RR.Fiber | null {
  switch (workInProgress.tag) {
    case 3:
      pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
      pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
      break;
    case 27:
    case 5:
      pushHostContext(workInProgress);
      break;
    case 4:
      pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
      break;
    case 10:
      pushProvider(
        workInProgress,
        workInProgress.type,
        workInProgress.memoizedProps.value
      );
      break;
    case 31:
      if (null !== workInProgress.memoizedState)
        return (
          (workInProgress.flags |= 128),
          pushDehydratedActivitySuspenseHandler(workInProgress),
          null
        );
      break;
    case 13:
      var state$76 = workInProgress.memoizedState;
      if (null !== state$76) {
        if (null !== state$76.dehydrated)
          return (
            pushPrimaryTreeSuspenseHandler(workInProgress),
            (workInProgress.flags |= 128),
            null
          );
        state$76 = propagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
          !1
        );
        var primaryChildLanes = workInProgress.child.childLanes;
        if (state$76 || 0 !== (renderLanes & primaryChildLanes))
          return updateSuspenseComponent(current, workInProgress, renderLanes);
        pushPrimaryTreeSuspenseHandler(workInProgress);
        current = bailoutOnAlreadyFinishedWork(
          current,
          workInProgress,
          renderLanes
        );
        return null !== current ? current.sibling : null;
      }
      pushPrimaryTreeSuspenseHandler(workInProgress);
      break;
    case 19:
      if (workInProgress.flags & 128)
        return updateSuspenseListComponent(
          current,
          workInProgress,
          renderLanes
        );
      primaryChildLanes = 0 !== (current.flags & 128);
      state$76 = 0 !== (renderLanes & workInProgress.childLanes);
      state$76 ||
        (propagateParentContextChanges(
          current,
          workInProgress,
          renderLanes,
          !1
        ),
        (state$76 = 0 !== (renderLanes & workInProgress.childLanes)));
      if (primaryChildLanes) {
        if (state$76)
          return updateSuspenseListComponent(
            current,
            workInProgress,
            renderLanes
          );
        workInProgress.flags |= 128;
      }
      primaryChildLanes = workInProgress.memoizedState;
      null !== primaryChildLanes &&
        ((primaryChildLanes.rendering = null),
        (primaryChildLanes.tail = null),
        (primaryChildLanes.lastEffect = null));
      pushSuspenseListContext(workInProgress, suspenseStackCursor.current);
      if (state$76) break;
      else return null;
    case 22:
      return (
        (workInProgress.lanes = 0),
        updateOffscreenComponent(
          current,
          workInProgress,
          renderLanes,
          workInProgress.pendingProps
        )
      );
    case 24:
      pushProvider(workInProgress, CacheContext, current.memoizedState.cache);
  }
  return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
}
function beginWork(current: RR.Fiber | RR.ResolvedLazy | RR.HydratableInstance | boolean | null, workInProgress: RR.Fiber | RR.ElementType | null, renderLanes: RR.Lanes | RR.Fiber | RR.Resource | RR.HydratableInstance | RR.TextInstance | null): RR.Fiber | null {
  if (null !== current)
    if (current.memoizedProps !== workInProgress.pendingProps)
      didReceiveUpdate = !0;
    else {
      if (
        !checkScheduledUpdateOrContext(current, renderLanes) &&
        0 === (workInProgress.flags & 128)
      )
        return (
          (didReceiveUpdate = !1),
          attemptEarlyBailoutIfNoScheduledUpdate(
            current,
            workInProgress,
            renderLanes
          )
        );
      didReceiveUpdate = 0 !== (current.flags & 131072) ? !0 : !1;
    }
  else didReceiveUpdate = !1;
  workInProgress.lanes = 0;
  switch (workInProgress.tag) {
    case 16:
      var elementType = workInProgress.elementType;
      a: if (
        (resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
        (current = workInProgress.pendingProps),
        (elementType = resolveLazy(elementType)),
        (workInProgress.type = elementType),
        "function" === typeof elementType)
      )
        shouldConstruct(elementType)
          ? ((current = resolveClassComponentProps(elementType, current)),
            (workInProgress.tag = 1),
            (workInProgress = updateClassComponent(
              null,
              workInProgress,
              elementType,
              current,
              renderLanes
            )))
          : ((workInProgress.tag = 0),
            (workInProgress = updateFunctionComponent(
              null,
              workInProgress,
              elementType,
              current,
              renderLanes
            )));
      else {
        if (void 0 !== elementType && null !== elementType) {
          var $$typeof = elementType.$$typeof;
          if ($$typeof === REACT_FORWARD_REF_TYPE) {
            workInProgress.tag = 11;
            workInProgress = updateForwardRef(
              null,
              workInProgress,
              elementType,
              current,
              renderLanes
            );
            break a;
          } else if ($$typeof === REACT_MEMO_TYPE) {
            workInProgress.tag = 14;
            workInProgress = updateMemoComponent(
              null,
              workInProgress,
              elementType,
              current,
              renderLanes
            );
            break a;
          } else if ($$typeof === REACT_CONTEXT_TYPE) {
            workInProgress.tag = 10;
            workInProgress.type = elementType;
            workInProgress = updateContextProvider(
              null,
              workInProgress,
              renderLanes
            );
            break a;
          }
        }
        workInProgress = getComponentNameFromType(elementType) || elementType;
        throw Error(
          "Element type is invalid. Received a promise that resolves to: " +
            workInProgress +
            ". Lazy element type must resolve to a class or function."
        );
      }
      return workInProgress;
    case 0:
      return updateFunctionComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 1:
      return (
        (elementType = workInProgress.type),
        ($$typeof = resolveClassComponentProps(
          elementType,
          workInProgress.pendingProps
        )),
        updateClassComponent(
          current,
          workInProgress,
          elementType,
          $$typeof,
          renderLanes
        )
      );
    case 3:
      pushHostContainer(workInProgress, workInProgress.stateNode.containerInfo);
      if (null === current)
        throw Error("Should have a current fiber. This is a bug in React.");
      var nextProps = workInProgress.pendingProps;
      $$typeof = workInProgress.memoizedState;
      elementType = $$typeof.element;
      cloneUpdateQueue(current, workInProgress);
      processUpdateQueue(workInProgress, nextProps, null, renderLanes);
      nextProps = workInProgress.memoizedState;
      var nextCache = nextProps.cache;
      pushProvider(workInProgress, CacheContext, nextCache);
      nextCache !== $$typeof.cache &&
        propagateContextChanges(
          workInProgress,
          [CacheContext],
          renderLanes,
          !0
        );
      suspendIfUpdateReadFromEntangledAsyncAction();
      $$typeof = nextProps.element;
      $$typeof === elementType
        ? (workInProgress = bailoutOnAlreadyFinishedWork(
            current,
            workInProgress,
            renderLanes
          ))
        : (reconcileChildren(current, workInProgress, $$typeof, renderLanes),
          (workInProgress = workInProgress.child));
      return workInProgress;
    case 26:
    case 27:
    case 5:
      return (
        pushHostContext(workInProgress),
        (elementType = workInProgress.pendingProps.children),
        null !== workInProgress.memoizedState &&
          (($$typeof = renderWithHooks(
            current,
            workInProgress,
            TransitionAwareHostComponent,
            null,
            null,
            renderLanes
          )),
          (HostTransitionContext._currentValue2 = $$typeof)),
        markRef(current, workInProgress),
        reconcileChildren(current, workInProgress, elementType, renderLanes),
        workInProgress.child
      );
    case 6:
      return null;
    case 13:
      return updateSuspenseComponent(current, workInProgress, renderLanes);
    case 4:
      return (
        pushHostContainer(
          workInProgress,
          workInProgress.stateNode.containerInfo
        ),
        (elementType = workInProgress.pendingProps),
        null === current
          ? (workInProgress.child = reconcileChildFibers(
              workInProgress,
              null,
              elementType,
              renderLanes
            ))
          : reconcileChildren(
              current,
              workInProgress,
              elementType,
              renderLanes
            ),
        workInProgress.child
      );
    case 11:
      return updateForwardRef(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 7:
      return (
        (elementType = workInProgress.pendingProps),
        markRef(current, workInProgress),
        reconcileChildren(current, workInProgress, elementType, renderLanes),
        workInProgress.child
      );
    case 8:
      return (
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 12:
      return (
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 10:
      return updateContextProvider(current, workInProgress, renderLanes);
    case 9:
      return (
        ($$typeof = workInProgress.type._context),
        (elementType = workInProgress.pendingProps.children),
        prepareToReadContext(workInProgress),
        ($$typeof = readContext($$typeof)),
        (elementType = elementType($$typeof)),
        (workInProgress.flags |= 1),
        reconcileChildren(current, workInProgress, elementType, renderLanes),
        workInProgress.child
      );
    case 14:
      return updateMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 15:
      return updateSimpleMemoComponent(
        current,
        workInProgress,
        workInProgress.type,
        workInProgress.pendingProps,
        renderLanes
      );
    case 17:
      return (
        (elementType = workInProgress.type),
        ($$typeof = resolveClassComponentProps(
          elementType,
          workInProgress.pendingProps
        )),
        resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
        (workInProgress.tag = 1),
        prepareToReadContext(workInProgress),
        constructClassInstance(workInProgress, elementType, $$typeof),
        mountClassInstance(workInProgress, elementType, $$typeof, renderLanes),
        finishClassComponent(
          null,
          workInProgress,
          elementType,
          !0,
          !1,
          renderLanes
        )
      );
    case 28:
      return (
        (elementType = workInProgress.type),
        ($$typeof = resolveClassComponentProps(
          elementType,
          workInProgress.pendingProps
        )),
        resetSuspendedCurrentOnMountInLegacyMode(current, workInProgress),
        (workInProgress.tag = 0),
        updateFunctionComponent(
          null,
          workInProgress,
          elementType,
          $$typeof,
          renderLanes
        )
      );
    case 19:
      return updateSuspenseListComponent(current, workInProgress, renderLanes);
    case 31:
      $$typeof = workInProgress.pendingProps;
      nextProps = 0 !== (workInProgress.flags & 128);
      workInProgress.flags &= -129;
      if (null === current)
        workInProgress = mountActivityChildren(workInProgress, $$typeof);
      else if (((elementType = current.memoizedState), null !== elementType))
        b: {
          pushDehydratedActivitySuspenseHandler(workInProgress);
          if (nextProps) {
            if (workInProgress.flags & 256) {
              workInProgress.flags &= -257;
              workInProgress = retryActivityComponentWithoutHydrating(
                current,
                workInProgress,
                renderLanes
              );
              break b;
            }
            if (null !== workInProgress.memoizedState) {
              workInProgress.child = current.child;
              workInProgress.flags |= 128;
              workInProgress = null;
              break b;
            }
            throw Error(
              "Client rendering an Activity suspended it again. This is a bug in React."
            );
          }
          didReceiveUpdate ||
            propagateParentContextChanges(
              current,
              workInProgress,
              renderLanes,
              !1
            );
          nextProps = 0 !== (renderLanes & current.childLanes);
          if (didReceiveUpdate || nextProps) {
            if (null === currentTreeHiddenStackCursor.current) {
              $$typeof = workInProgressRoot;
              if (
                null !== $$typeof &&
                ((nextProps = getBumpedLaneForHydration($$typeof, renderLanes)),
                0 !== nextProps && nextProps !== elementType.retryLane)
              )
                throw (
                  ((elementType.retryLane = nextProps),
                  enqueueConcurrentRenderForLane(current, nextProps),
                  scheduleUpdateOnFiber($$typeof, current, nextProps),
                  SelectiveHydrationException)
                );
              renderDidSuspendDelayIfPossible();
            }
            workInProgress = retryActivityComponentWithoutHydrating(
              current,
              workInProgress,
              renderLanes
            );
          } else
            (workInProgress = mountActivityChildren(workInProgress, $$typeof)),
              (workInProgress.flags |= 134221824);
        }
      else
        (renderLanes = createWorkInProgress(current.child, {
          mode: $$typeof.mode,
          children: $$typeof.children
        })),
          (renderLanes.ref = workInProgress.ref),
          (workInProgress.child = renderLanes),
          (renderLanes.return = workInProgress),
          (workInProgress = renderLanes);
      return workInProgress;
    case 22:
      return updateOffscreenComponent(
        current,
        workInProgress,
        renderLanes,
        workInProgress.pendingProps
      );
    case 24:
      return (
        prepareToReadContext(workInProgress),
        (elementType = readContext(CacheContext)),
        null === current
          ? (($$typeof = peekCacheFromPool()),
            null === $$typeof &&
              (($$typeof = workInProgressRoot),
              (nextProps = createCache()),
              ($$typeof.pooledCache = nextProps),
              nextProps.refCount++,
              null !== nextProps && ($$typeof.pooledCacheLanes |= renderLanes),
              ($$typeof = nextProps)),
            (workInProgress.memoizedState = {
              parent: elementType,
              cache: $$typeof
            }),
            initializeUpdateQueue(workInProgress),
            pushProvider(workInProgress, CacheContext, $$typeof))
          : (0 !== (current.lanes & renderLanes) &&
              (cloneUpdateQueue(current, workInProgress),
              processUpdateQueue(workInProgress, null, null, renderLanes),
              suspendIfUpdateReadFromEntangledAsyncAction()),
            ($$typeof = current.memoizedState),
            (nextProps = workInProgress.memoizedState),
            $$typeof.parent !== elementType
              ? (($$typeof = { parent: elementType, cache: elementType }),
                (workInProgress.memoizedState = $$typeof),
                0 === workInProgress.lanes &&
                  (workInProgress.memoizedState =
                    workInProgress.updateQueue.baseState =
                      $$typeof),
                pushProvider(workInProgress, CacheContext, elementType))
              : ((elementType = nextProps.cache),
                pushProvider(workInProgress, CacheContext, elementType),
                elementType !== $$typeof.cache &&
                  propagateContextChanges(
                    workInProgress,
                    [CacheContext],
                    renderLanes,
                    !0
                  ))),
        reconcileChildren(
          current,
          workInProgress,
          workInProgress.pendingProps.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 30:
      return (
        null === workInProgress.stateNode &&
          (workInProgress.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }),
        (elementType = workInProgress.pendingProps),
        null != elementType.name &&
          "auto" !== elementType.name &&
          (workInProgress.flags |= null === current ? 18882560 : 18874368),
        null !== current && current.memoizedProps.name !== elementType.name
          ? (workInProgress.flags |= 4194816)
          : markRef(current, workInProgress),
        reconcileChildren(
          current,
          workInProgress,
          elementType.children,
          renderLanes
        ),
        workInProgress.child
      );
    case 29:
      throw workInProgress.pendingProps;
  }
  throw Error(
    "Unknown unit of work tag (" +
      workInProgress.tag +
      "). This error is likely caused by a bug in React. Please file an issue."
  );
}
function doesRequireClone(current: RR.Fiber | null, completedWork: RR.Fiber): boolean {
  if (null !== current && current.child === completedWork.child) return !1;
  if (0 !== (completedWork.flags & 16)) return !0;
  for (current = completedWork.child; null !== current; ) {
    if (0 !== (current.flags & 8218) || 0 !== (current.subtreeFlags & 8218))
      return !0;
    current = current.sibling;
  }
  return !1;
}
function appendAllChildren(
  parent: RR.Instance,
  workInProgress: RR.Fiber,
  needsVisibilityToggle: boolean | RR.Fiber | null,
  isHidden: boolean
): void {
  for (var node = workInProgress.child; null !== node; ) {
    if (5 === node.tag) {
      var instance = node.stateNode;
      needsVisibilityToggle &&
        isHidden &&
        (instance = cloneHiddenInstance(instance));
      appendChildNode(parent.node, instance.node);
    } else if (6 === node.tag) {
      instance = node.stateNode;
      if (needsVisibilityToggle && isHidden)
        throw Error("Not yet implemented.");
      appendChildNode(parent.node, instance.node);
    } else if (4 !== node.tag)
      if (22 === node.tag && null !== node.memoizedState)
        (instance = node.child),
          null !== instance && (instance.return = node),
          appendAllChildren(parent, node, !0, !0);
      else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
    if (node === workInProgress) break;
    for (; null === node.sibling; ) {
      if (null === node.return || node.return === workInProgress) return;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
}
function appendAllChildrenToContainer(
  containerChildSet: RR.ChildSet,
  workInProgress: RR.Fiber,
  needsVisibilityToggle: boolean,
  isHidden: boolean
): boolean {
  for (
    var hasOffscreenComponentChild: boolean | RR.Fiber | null = !1, node = workInProgress.child;
    null !== node;

  ) {
    if (5 === node.tag) {
      var instance: RR.StateNode = node.stateNode;
      needsVisibilityToggle &&
        isHidden &&
        (instance = cloneHiddenInstance!(instance));
      appendChildNodeToSet(containerChildSet, instance.node);
    } else if (6 === node.tag) {
      instance = node.stateNode;
      if (needsVisibilityToggle && isHidden)
        throw Error("Not yet implemented.");
      appendChildNodeToSet(containerChildSet, instance.node);
    } else if (4 !== node.tag)
      if (22 === node.tag && null !== node.memoizedState)
        (hasOffscreenComponentChild = node.child),
          null !== hasOffscreenComponentChild &&
            (hasOffscreenComponentChild.return = node),
          appendAllChildrenToContainer(containerChildSet, node, !0, !0),
          (hasOffscreenComponentChild = !0);
      else if (null !== node.child) {
        node.child.return = node;
        node = node.child;
        continue;
      }
    if (node === workInProgress) break;
    for (; null === node.sibling; ) {
      if (null === node.return || node.return === workInProgress)
        return hasOffscreenComponentChild;
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  return hasOffscreenComponentChild;
}
function updateHostContainer(current: RR.Fiber | RR.FiberRoot | RR.PortalState | null, workInProgress: RR.Fiber): void {
  if (doesRequireClone((current as RR.Fiber | null), workInProgress)) {
    current = workInProgress.stateNode as RR.FiberRoot | RR.PortalState;
    var newChildSet = createChildNodeSet();
    appendAllChildrenToContainer(newChildSet, workInProgress, !1, !1);
    current.pendingChildren = newChildSet;
    workInProgress.flags |= 4;
  }
}
function scheduleRetryEffect(workInProgress: RR.Fiber, retryQueue: RR.FiberUpdateQueue | number): void {
  null !== (retryQueue as RR.FiberUpdateQueue) && (workInProgress.flags |= 4);
  workInProgress.flags & 16384 &&
    ((retryQueue =
      22 !== workInProgress.tag ? claimNextRetryLane() : 536870912),
    (workInProgress.lanes |= retryQueue),
    (workInProgressSuspendedRetryLanes |= retryQueue));
}
function cutOffTailIfNeeded(renderState: RR.SuspenseListRenderState, hasRenderedATailFallback: boolean | RR.Fiber | null): void {
  switch (renderState.tailMode) {
    case "visible":
      break;
    case "collapsed":
      for (
        var tailNode = renderState.tail, lastTailNode = null;
        null !== tailNode;

      )
        null !== tailNode.alternate && (lastTailNode = tailNode),
          (tailNode = tailNode.sibling);
      null === lastTailNode
        ? (hasRenderedATailFallback as boolean) || null === renderState.tail
          ? (renderState.tail = null)
          : (renderState.tail.sibling = null)
        : (lastTailNode.sibling = null);
      break;
    default:
      hasRenderedATailFallback = renderState.tail;
      for (tailNode = null; null !== hasRenderedATailFallback; )
        null !== hasRenderedATailFallback.alternate &&
          (tailNode = hasRenderedATailFallback),
          (hasRenderedATailFallback = hasRenderedATailFallback.sibling);
      null === tailNode ? (renderState.tail = null) : (tailNode.sibling = null);
  }
}
function bubbleProperties(completedWork: RR.Fiber): boolean {
  var didBailout =
      null !== completedWork.alternate &&
      completedWork.alternate.child === completedWork.child,
    newChildLanes: RR.Lanes = 0,
    subtreeFlags: RR.Flags = 0;
  if (didBailout)
    for (var child$89 = completedWork.child; null !== child$89; )
      (newChildLanes |= child$89.lanes | child$89.childLanes),
        (subtreeFlags |= child$89.subtreeFlags & 1206910976),
        (subtreeFlags |= child$89.flags & 1206910976),
        (child$89.return = completedWork),
        (child$89 = child$89.sibling);
  else
    for (child$89 = completedWork.child; null !== child$89; )
      (newChildLanes |= child$89.lanes | child$89.childLanes),
        (subtreeFlags |= child$89.subtreeFlags),
        (subtreeFlags |= child$89.flags),
        (child$89.return = completedWork),
        (child$89 = child$89.sibling);
  completedWork.subtreeFlags |= subtreeFlags;
  completedWork.childLanes = newChildLanes;
  return didBailout;
}
function completeWork(current: RR.Fiber | RR.HostContext | RR.HostObject | RR.SuspenseState | boolean | RR.FiberUpdateQueue | null, workInProgress: RR.Fiber, renderLanes: RR.Lanes | RR.FiberRoot | RR.HostObject | RR.HostContext | string | RR.MemoizedState | RR.CapturedValue[] | boolean | RR.Fiber | RR.OffscreenQueue | RR.Cache | null): RR.Fiber | null {
  var newProps = workInProgress.pendingProps;
  switch (workInProgress.tag) {
    case 28:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return bubbleProperties(workInProgress), null;
    case 1:
      return bubbleProperties(workInProgress), null;
    case 3:
      newProps = workInProgress.stateNode;
      var previousCache = null;
      null !== current && (previousCache = current.memoizedState.cache);
      workInProgress.memoizedState.cache !== previousCache &&
        (workInProgress.flags |= 2048);
      popProvider(CacheContext);
      popHostContainer();
      newProps.pendingContext &&
        ((newProps.context = newProps.pendingContext),
        (newProps.pendingContext = null));
      (null !== current && null !== current.child) ||
        null === current ||
        (current.memoizedState.isDehydrated &&
          0 === (workInProgress.flags & 256)) ||
        ((workInProgress.flags |= 1024), upgradeHydrationErrorsToRecoverable());
      updateHostContainer(current, workInProgress);
      bubbleProperties(workInProgress);
      return null;
    case 26:
    case 27:
    case 5:
      popHostContext(workInProgress);
      renderLanes = workInProgress.type;
      if (null !== current && null != workInProgress.stateNode)
        if (
          ((previousCache = current.stateNode),
          (renderLanes = current.memoizedProps),
          (current = doesRequireClone(current, workInProgress)) ||
            renderLanes !== newProps)
        ) {
          b: {
            renderLanes = reactPrivateInterface.diffAttributePayloads(
              renderLanes,
              newProps,
              previousCache.canonical.viewConfig.validAttributes
            );
            previousCache.canonical.currentProps = newProps;
            newProps = previousCache.node;
            if (current)
              newProps =
                null !== renderLanes
                  ? cloneNodeWithNewChildrenAndProps(newProps, renderLanes)
                  : cloneNodeWithNewChildren(newProps);
            else if (null !== renderLanes)
              newProps = cloneNodeWithNewProps(newProps, renderLanes);
            else {
              newProps = previousCache;
              break b;
            }
            newProps = { node: newProps, canonical: previousCache.canonical };
          }
          newProps === previousCache
            ? (workInProgress.stateNode = previousCache)
            : ((workInProgress.flags |= 8),
              (workInProgress.stateNode = newProps),
              current && appendAllChildren(newProps, workInProgress, !1, !1));
        } else workInProgress.stateNode = previousCache;
      else {
        if (!newProps) {
          if (null === workInProgress.stateNode)
            throw Error(
              "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue."
            );
          bubbleProperties(workInProgress);
          workInProgress.subtreeFlags &= -33554433;
          return null;
        }
        current = rootInstanceStackCursor.current;
        previousCache = allocateTag();
        renderLanes = getViewConfigForType(renderLanes);
        var updatePayload = reactPrivateInterface.createAttributePayload(
          newProps,
          renderLanes.validAttributes
        );
        current = {
          node: createNode(
            previousCache,
            renderLanes.uiViewClassName,
            current.containerTag,
            updatePayload,
            workInProgress
          ),
          canonical: {
            nativeTag: previousCache,
            viewConfig: renderLanes,
            currentProps: newProps,
            internalInstanceHandle: workInProgress,
            publicInstance: null,
            publicRootInstance: current.publicInstance
          }
        };
        workInProgress.flags |= 8;
        appendAllChildren(current, workInProgress, !1, !1);
        workInProgress.stateNode = current;
      }
      bubbleProperties(workInProgress);
      workInProgress.subtreeFlags &= -33554433;
      workInProgress.flags &= -16777217;
      return null;
    case 6:
      if (current && null != workInProgress.stateNode)
        current.memoizedProps !== newProps
          ? ((current = rootInstanceStackCursor.current),
            (previousCache = contextStackCursor.current),
            (workInProgress.flags |= 8),
            (workInProgress.stateNode = createTextInstance(
              newProps,
              current,
              previousCache,
              workInProgress
            )))
          : (workInProgress.stateNode = current.stateNode);
      else {
        if ("string" !== typeof newProps && null === workInProgress.stateNode)
          throw Error(
            "We must have new props for new mounts. This error is likely caused by a bug in React. Please file an issue."
          );
        current = rootInstanceStackCursor.current;
        previousCache = contextStackCursor.current;
        workInProgress.flags |= 8;
        workInProgress.stateNode = createTextInstance(
          newProps,
          current,
          previousCache,
          workInProgress
        );
      }
      bubbleProperties(workInProgress);
      return null;
    case 31:
      newProps = workInProgress.memoizedState;
      if (null === current || null !== current.memoizedState) {
        if (null !== newProps) {
          if (null === current) {
            throw Error(
              "A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React."
            );
            throw Error(
              "Expected prepareToHydrateHostActivityInstance() to never be called. This error is likely caused by a bug in React. Please file an issue."
            );
          }
          0 === (workInProgress.flags & 128) &&
            (workInProgress.memoizedState = null);
          workInProgress.flags |= 4;
          bubbleProperties(workInProgress);
          current = !1;
        } else
          (newProps = upgradeHydrationErrorsToRecoverable()),
            null !== current &&
              null !== current.memoizedState &&
              (current.memoizedState.hydrationErrors = newProps),
            (current = !0);
        if (!current) {
          if (workInProgress.flags & 256)
            return popSuspenseHandler(workInProgress), workInProgress;
          popSuspenseHandler(workInProgress);
          return null;
        }
        if (0 !== (workInProgress.flags & 128))
          throw Error(
            "Client rendering an Activity suspended it again. This is a bug in React."
          );
      }
      bubbleProperties(workInProgress);
      return null;
    case 13:
      newProps = workInProgress.memoizedState;
      if (
        null === current ||
        (null !== current.memoizedState &&
          null !== current.memoizedState.dehydrated)
      ) {
        if (null !== newProps && null !== newProps.dehydrated) {
          if (null === current) {
            throw Error(
              "A dehydrated suspense component was completed without a hydrated node. This is probably a bug in React."
            );
            throw Error(
              "Expected prepareToHydrateHostSuspenseInstance() to never be called. This error is likely caused by a bug in React. Please file an issue."
            );
          }
          0 === (workInProgress.flags & 128) &&
            (workInProgress.memoizedState = null);
          workInProgress.flags |= 4;
          bubbleProperties(workInProgress);
          previousCache = !1;
        } else
          (previousCache = upgradeHydrationErrorsToRecoverable()),
            null !== current &&
              null !== current.memoizedState &&
              (current.memoizedState.hydrationErrors = previousCache),
            (previousCache = !0);
        if (!previousCache) {
          if (workInProgress.flags & 256)
            return popSuspenseHandler(workInProgress), workInProgress;
          popSuspenseHandler(workInProgress);
          return null;
        }
      }
      popSuspenseHandler(workInProgress);
      if (0 !== (workInProgress.flags & 128))
        return (workInProgress.lanes = renderLanes), workInProgress;
      newProps = null !== newProps;
      current = null !== current && null !== current.memoizedState;
      newProps &&
        ((previousCache = workInProgress.child),
        (renderLanes = null),
        null !== previousCache.alternate &&
          null !== previousCache.alternate.memoizedState &&
          null !== previousCache.alternate.memoizedState.cachePool &&
          (renderLanes = previousCache.alternate.memoizedState.cachePool.pool),
        (updatePayload = null),
        null !== previousCache.memoizedState &&
          null !== previousCache.memoizedState.cachePool &&
          (updatePayload = previousCache.memoizedState.cachePool.pool),
        updatePayload !== renderLanes && (previousCache.flags |= 2048));
      newProps !== current && newProps && (workInProgress.child.flags |= 8192);
      scheduleRetryEffect(workInProgress, workInProgress.updateQueue);
      bubbleProperties(workInProgress);
      return null;
    case 4:
      return (
        popHostContainer(),
        updateHostContainer(current, workInProgress),
        (workInProgress.flags |= 67108864),
        bubbleProperties(workInProgress),
        null
      );
    case 10:
      return (
        popProvider(workInProgress.type), bubbleProperties(workInProgress), null
      );
    case 17:
      return bubbleProperties(workInProgress), null;
    case 19:
      popSuspenseListContext(workInProgress);
      newProps = workInProgress.memoizedState;
      if (null === newProps) return bubbleProperties(workInProgress), null;
      previousCache = 0 !== (workInProgress.flags & 128);
      updatePayload = newProps.rendering;
      if (null === updatePayload)
        if (previousCache) cutOffTailIfNeeded(newProps, !1);
        else {
          if (
            0 !== workInProgressRootExitStatus ||
            (null !== current && 0 !== (current.flags & 128))
          )
            for (current = workInProgress.child; null !== current; ) {
              updatePayload = findFirstSuspended(current);
              if (null !== updatePayload) {
                workInProgress.flags |= 128;
                cutOffTailIfNeeded(newProps, !1);
                current = updatePayload.updateQueue;
                workInProgress.updateQueue = current;
                scheduleRetryEffect(workInProgress, current);
                workInProgress.subtreeFlags = 0;
                current = renderLanes;
                for (newProps = workInProgress.child; null !== newProps; )
                  resetWorkInProgress(newProps, current),
                    (newProps = newProps.sibling);
                pushSuspenseListContext(
                  workInProgress,
                  (suspenseStackCursor.current & 1) | 2
                );
                return workInProgress.child;
              }
              current = current.sibling;
            }
          null !== newProps.tail &&
            now() > workInProgressRootRenderTargetTime &&
            ((workInProgress.flags |= 128),
            (previousCache = !0),
            cutOffTailIfNeeded(newProps, !1),
            (workInProgress.lanes = 4194304));
        }
      else {
        if (!previousCache)
          if (
            ((current = findFirstSuspended(updatePayload)), null !== current)
          ) {
            if (
              ((workInProgress.flags |= 128),
              (previousCache = !0),
              (current = current.updateQueue),
              (workInProgress.updateQueue = current),
              scheduleRetryEffect(workInProgress, current),
              cutOffTailIfNeeded(newProps, !0),
              null === newProps.tail &&
                "collapsed" !== newProps.tailMode &&
                "visible" !== newProps.tailMode &&
                !updatePayload.alternate)
            )
              return bubbleProperties(workInProgress), null;
          } else
            2 * now() - newProps.renderingStartTime >
              workInProgressRootRenderTargetTime &&
              536870912 !== renderLanes &&
              ((workInProgress.flags |= 128),
              (previousCache = !0),
              cutOffTailIfNeeded(newProps, !1),
              (workInProgress.lanes = 4194304));
        newProps.isBackwards
          ? ((updatePayload.sibling = workInProgress.child),
            (workInProgress.child = updatePayload))
          : ((current = newProps.last),
            null !== current
              ? (current.sibling = updatePayload)
              : (workInProgress.child = updatePayload),
            (newProps.last = updatePayload));
      }
      if (null !== newProps.tail) {
        current = newProps.tail;
        a: {
          for (renderLanes = current; null !== renderLanes; ) {
            if (null !== renderLanes.alternate) {
              renderLanes = !1;
              break a;
            }
            renderLanes = renderLanes.sibling;
          }
          renderLanes = !0;
        }
        newProps.rendering = current;
        newProps.tail = current.sibling;
        newProps.renderingStartTime = now();
        current.sibling = null;
        updatePayload = suspenseStackCursor.current;
        updatePayload = previousCache
          ? (updatePayload & 1) | 2
          : updatePayload & 1;
        "visible" !== newProps.tailMode &&
        "collapsed" !== newProps.tailMode &&
        renderLanes
          ? ((newProps = updatePayload),
            push(suspenseHandlerStackCursor, workInProgress),
            push(suspenseStackCursor, newProps),
            null === shellBoundary && (shellBoundary = workInProgress))
          : pushSuspenseListContext(workInProgress, updatePayload);
        return current;
      }
      bubbleProperties(workInProgress);
      return null;
    case 22:
    case 23:
      return (
        popSuspenseHandler(workInProgress),
        popHiddenContext(),
        (newProps = null !== workInProgress.memoizedState),
        null !== current
          ? (null !== current.memoizedState) !== newProps &&
            (workInProgress.flags |= 8192)
          : newProps && (workInProgress.flags |= 8192),
        newProps && 0 !== (workInProgress.mode & 1)
          ? 0 !== (renderLanes & 536870912) &&
            0 === (workInProgress.flags & 128) &&
            (bubbleProperties(workInProgress),
            workInProgress.subtreeFlags & 6 && (workInProgress.flags |= 8192))
          : bubbleProperties(workInProgress),
        (newProps = workInProgress.updateQueue),
        null !== newProps &&
          scheduleRetryEffect(workInProgress, newProps.retryQueue),
        (newProps = null),
        null !== current &&
          null !== current.memoizedState &&
          null !== current.memoizedState.cachePool &&
          (newProps = current.memoizedState.cachePool.pool),
        (previousCache = null),
        null !== workInProgress.memoizedState &&
          null !== workInProgress.memoizedState.cachePool &&
          (previousCache = workInProgress.memoizedState.cachePool.pool),
        previousCache !== newProps && (workInProgress.flags |= 2048),
        null !== current && pop(resumedCache),
        null
      );
    case 24:
      return (
        (newProps = null),
        null !== current && (newProps = current.memoizedState.cache),
        workInProgress.memoizedState.cache !== newProps &&
          (workInProgress.flags |= 2048),
        popProvider(CacheContext),
        bubbleProperties(workInProgress),
        null
      );
    case 25:
      return null;
    case 30:
      return (
        (workInProgress.flags |= 33554432),
        bubbleProperties(workInProgress),
        null
      );
    case 29:
      return null;
  }
  throw Error(
    "Unknown unit of work tag (" +
      workInProgress.tag +
      "). This error is likely caused by a bug in React. Please file an issue."
  );
}
function unwindWork(current: RR.Fiber | number | RR.SuspenseState | null, workInProgress: RR.Fiber): RR.Fiber | null {
  switch (workInProgress.tag) {
    case 1:
      return (
        (current = workInProgress.flags),
        current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null
      );
    case 3:
      return (
        popProvider(CacheContext),
        popHostContainer(),
        (current = workInProgress.flags),
        0 !== (current & 65536) && 0 === (current & 128)
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null
      );
    case 26:
    case 27:
    case 5:
      return popHostContext(workInProgress), null;
    case 31:
      if (
        null !== workInProgress.memoizedState &&
        (popSuspenseHandler(workInProgress), null === workInProgress.alternate)
      )
        throw Error(
          "Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue."
        );
      current = workInProgress.flags;
      return current & 65536
        ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
        : null;
    case 13:
      popSuspenseHandler(workInProgress);
      current = workInProgress.memoizedState as RR.SuspenseState | null;
      if (
        null !== current &&
        null !== current.dehydrated &&
        null === workInProgress.alternate
      )
        throw Error(
          "Threw in newly mounted dehydrated component. This is likely a bug in React. Please file an issue."
        );
      current = workInProgress.flags;
      return current & 65536
        ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
        : null;
    case 19:
      return (
        popSuspenseListContext(workInProgress),
        (current = workInProgress.flags),
        current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128),
            (current = workInProgress.memoizedState),
            null !== current &&
              ((current.rendering = null), (current.tail = null)),
            (workInProgress.flags |= 4),
            workInProgress)
          : null
      );
    case 4:
      return popHostContainer(), null;
    case 10:
      return popProvider(workInProgress.type as RR.ReactContext), null;
    case 22:
    case 23:
      return (
        popSuspenseHandler(workInProgress),
        popHiddenContext(),
        null !== (current as RR.Fiber | null) && pop(resumedCache),
        (current = workInProgress.flags),
        current & 65536
          ? ((workInProgress.flags = (current & -65537) | 128), workInProgress)
          : null
      );
    case 24:
      return popProvider(CacheContext), null;
    case 25:
      return null;
    default:
      return null;
  }
}
function unwindInterruptedWork(current: RR.Fiber | null, interruptedWork: RR.Fiber): void {
  switch (interruptedWork.tag) {
    case 3:
      popProvider(CacheContext);
      popHostContainer();
      break;
    case 26:
    case 27:
    case 5:
      popHostContext(interruptedWork);
      break;
    case 4:
      popHostContainer();
      break;
    case 31:
      null !== interruptedWork.memoizedState &&
        popSuspenseHandler(interruptedWork);
      break;
    case 13:
      popSuspenseHandler(interruptedWork);
      break;
    case 19:
      popSuspenseListContext(interruptedWork);
      break;
    case 10:
      popProvider(interruptedWork.type as RR.ReactContext);
      break;
    case 22:
    case 23:
      popSuspenseHandler(interruptedWork);
      popHiddenContext();
      null !== current && pop(resumedCache);
      break;
    case 24:
      popProvider(CacheContext);
  }
}
function commitHookEffectListMount(flags: RR.HookFlags, finishedWork: RR.Fiber): void {
  try {
    var updateQueue: RR.FunctionComponentUpdateQueue | RR.Effect | null = finishedWork.updateQueue as RR.FunctionComponentUpdateQueue | null,
      lastEffect: RR.Effect | RR.EffectDestroy | void | null = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== lastEffect) {
      var firstEffect = lastEffect.next;
      updateQueue = firstEffect;
      do {
        if ((updateQueue!.tag & flags) === flags) {
          lastEffect = void 0;
          var create = updateQueue!.create,
            inst = updateQueue!.inst;
          lastEffect = create();
          inst.destroy = lastEffect;
        }
        updateQueue = updateQueue!.next;
      } while (updateQueue !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitHookEffectListUnmount(
  flags: RR.HookFlags,
  finishedWork: RR.Fiber,
  nearestMountedAncestor$jscomp$0: RR.Fiber | null
): void {
  try {
    var updateQueue: RR.FunctionComponentUpdateQueue | RR.Effect | null = finishedWork.updateQueue as RR.FunctionComponentUpdateQueue | null,
      lastEffect: RR.Effect | RR.Fiber | null = null !== updateQueue ? updateQueue.lastEffect : null;
    if (null !== lastEffect) {
      var firstEffect = lastEffect.next;
      updateQueue = firstEffect;
      do {
        if ((updateQueue!.tag & flags) === flags) {
          var inst = updateQueue!.inst,
            destroy = inst.destroy;
          if (void 0 !== destroy) {
            inst.destroy = void 0;
            lastEffect = finishedWork;
            var nearestMountedAncestor = nearestMountedAncestor$jscomp$0,
              destroy_ = destroy as RR.EffectDestroy;
            try {
              destroy_();
            } catch (error) {
              captureCommitPhaseError(
                lastEffect,
                nearestMountedAncestor,
                error
              );
            }
          }
        }
        updateQueue = updateQueue!.next;
      } while (updateQueue !== firstEffect);
    }
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitClassCallbacks(finishedWork: RR.Fiber): void {
  var updateQueue: RR.UpdateQueue | null = finishedWork.updateQueue as RR.UpdateQueue | null;
  if (null !== updateQueue) {
    var instance = finishedWork.stateNode;
    try {
      commitCallbacks(updateQueue, instance);
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
  }
}
function safelyCallComponentWillUnmount(
  current: RR.Fiber,
  nearestMountedAncestor: RR.Fiber | null,
  instance: RR.ClassInstance
): void {
  instance.props = resolveClassComponentProps(
    current.type as RR.ClassComponent,
    current.memoizedProps
  );
  instance.state = current.memoizedState;
  try {
    instance.componentWillUnmount!();
  } catch (error) {
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}
function safelyAttachRef(current: RR.Fiber, nearestMountedAncestor: RR.Fiber | null): void {
  try {
    var ref = current.ref;
    if (null !== ref) {
      switch (current.tag) {
        case 26:
        case 27:
        case 5:
          var instanceToUse: RR.StateNode = getPublicInstance(current.stateNode);
          break;
        case 30:
          var instance = current.stateNode,
            name = getViewTransitionName(current.memoizedProps, instance);
          if (null === instance!.ref || instance!.ref.name !== name)
            instance!.ref = createViewTransitionInstance(name);
          instanceToUse = instance!.ref;
          break;
        case 7:
          if (null === current.stateNode) {
            var fragmentInstance = new FragmentInstance(current);
            traverseVisibleInstancesAndTextInstances(
              current.child,
              !1,
              addFragmentHandleToFiber,
              fragmentInstance,
              void 0,
              void 0
            );
            current.stateNode = fragmentInstance;
          }
          instanceToUse = current.stateNode;
          break;
        default:
          instanceToUse = current.stateNode;
      }
      "function" === typeof ref
        ? (current.refCleanup = ref(instanceToUse))
        : (ref.current = instanceToUse);
    }
  } catch (error) {
    captureCommitPhaseError(current, nearestMountedAncestor, error);
  }
}
function safelyDetachRef(current: RR.Fiber | null, nearestMountedAncestor: RR.Fiber | null): void {
  var ref = current!.ref,
    refCleanup = current!.refCleanup;
  if (null !== ref)
    if ("function" === typeof refCleanup)
      try {
        refCleanup();
      } catch (error) {
        captureCommitPhaseError((current as RR.Fiber), nearestMountedAncestor, error);
      } finally {
        (current!.refCleanup = null),
          (current = current!.alternate),
          null != current && (current.refCleanup = null);
      }
    else if ("function" === typeof ref)
      try {
        ref(null);
      } catch (error$117) {
        captureCommitPhaseError((current as RR.Fiber), nearestMountedAncestor, error$117);
      }
    else ref.current = null;
}
var viewTransitionMutationContext = !1;
function pushMutationContext() {
  var prev = viewTransitionMutationContext;
  viewTransitionMutationContext = !1;
  return prev;
}
function commitFragmentInstanceInsertionEffects(fiber: RR.Fiber): void {
  for (var parent: RR.Fiber | null = fiber.return; null !== parent; ) {
    isFragmentInstanceParent(parent) &&
      commitNewChildToFragmentInstance(fiber.stateNode, parent.stateNode);
    if (isFragmentInstanceHostBoundary(parent)) break;
    parent = parent.return;
  }
}
function commitFragmentInstanceDeletionEffects(fiber: RR.Fiber): void {
  for (var parent: RR.Fiber | null = fiber.return; null !== parent; ) {
    if (isFragmentInstanceParent(parent)) {
      var fragmentInstance = parent.stateNode;
      var childInstance = fiber.stateNode;
      null != childInstance.canonical &&
        ((childInstance = getPublicInstance(childInstance)),
        null != childInstance.reactFragments &&
          childInstance.reactFragments.delete(fragmentInstance));
    }
    if (isFragmentInstanceHostBoundary(parent)) break;
    parent = parent.return;
  }
}
function isFragmentInstanceHostBoundary(fiber: RR.Fiber): boolean {
  return 5 === fiber.tag || 3 === fiber.tag || !1;
}
function isFragmentInstanceParent(fiber: RR.Fiber | null): boolean | null {
  return fiber && 7 === fiber.tag && null !== fiber.stateNode;
}
function commitHostMount(finishedWork: RR.Fiber): void {
  try {
    throw Error(
      "The current renderer does not support mutation. This error is likely caused by a bug in React. Please file an issue."
    );
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
function commitImmutablePlacementNodeToFragmentInstances(
  finishedWork: RR.Fiber | null,
  parentFragmentInstances: RR.FragmentInstance[] | null
): void {
  if (5 === finishedWork.tag) {
    if (
      (5 === finishedWork!.tag ||
        27 === finishedWork!.tag ||
        6 === finishedWork.tag) &&
      null === finishedWork.alternate &&
      null !== parentFragmentInstances
    )
      for (var i = 0; i < parentFragmentInstances.length; i++)
        commitNewChildToFragmentInstance(
          finishedWork.stateNode,
          parentFragmentInstances[i]
        );
  } else if (
    4 !== finishedWork!.tag &&
    ((finishedWork = finishedWork!.child), null !== finishedWork)
  )
    for (
      commitImmutablePlacementNodeToFragmentInstances(
        finishedWork,
        parentFragmentInstances
      ),
        finishedWork = finishedWork.sibling;
      null !== finishedWork;

    )
      commitImmutablePlacementNodeToFragmentInstances(
        finishedWork,
        parentFragmentInstances
      ),
        (finishedWork = finishedWork.sibling);
}
function commitHostPortalContainerChildren(
  portal: RR.PortalState | RR.Container,
  finishedWork: RR.Fiber,
  pendingChildren: RR.ChildSet | null
): void {
  portal = (portal as RR.PortalState).containerInfo;
  try {
    completeRoot(portal.containerTag, pendingChildren);
  } catch (error) {
    captureCommitPhaseError(finishedWork, finishedWork.return, error);
  }
}
var shouldStartViewTransition = !1,
  appearingViewTransitions = null;
function trackEnterViewTransitions(placement: RR.Fiber): void {
  if (30 === placement.tag || 0 !== (placement.subtreeFlags & 33554432))
    shouldStartViewTransition = !0;
}
var viewTransitionCancelableChildren = null;
function pushViewTransitionCancelableScope() {
  var prevChildren = viewTransitionCancelableChildren;
  viewTransitionCancelableChildren = null;
  return prevChildren;
}
var viewTransitionHostInstanceIdx = 0;
function applyViewTransitionToHostInstances(): boolean {
  viewTransitionHostInstanceIdx = 0;
  return !1;
}
function commitAppearingPairViewTransitions(placement: any): void {
  if (0 !== (placement.subtreeFlags & 18874368))
    for (placement = placement.child; null !== placement; ) {
      if (22 !== placement.tag || null === placement.memoizedState)
        if (
          (commitAppearingPairViewTransitions(placement),
          30 === placement.tag &&
            0 !== (placement.flags & 18874368) &&
            placement.stateNode.paired)
        ) {
          var props = placement.memoizedProps;
          if (null == props.name || "auto" === props.name)
            throw Error(
              "Found a pair with an auto name. This is a bug in React."
            );
          "none" !== getViewTransitionClassName(props.default, props.share) &&
            applyViewTransitionToHostInstances();
        }
      placement = placement.sibling;
    }
}
function commitEnterViewTransitions(placement: any, gesture: boolean): void {
  if (30 === placement.tag) {
    var state = placement.stateNode,
      props = placement.memoizedProps;
    getViewTransitionName(props, state);
    "none" !==
    getViewTransitionClassName(
      props.default,
      state.paired ? props.share : props.enter
    )
      ? applyViewTransitionToHostInstances() &&
        (commitAppearingPairViewTransitions(placement),
        state.paired ||
          gesture ||
          scheduleViewTransitionEvent(placement, props.onEnter))
      : commitAppearingPairViewTransitions(placement);
  } else if (0 !== (placement.subtreeFlags & 33554432))
    for (placement = placement.child; null !== placement; )
      commitEnterViewTransitions(placement, gesture),
        (placement = placement.sibling);
  else commitAppearingPairViewTransitions(placement);
}
function commitDeletedPairViewTransitions(deletion: any): void {
  if (
    null !== appearingViewTransitions &&
    0 !== appearingViewTransitions.size
  ) {
    var pairs = appearingViewTransitions;
    if (0 !== (deletion.subtreeFlags & 18874368))
      for (deletion = deletion.child; null !== deletion; ) {
        if (22 !== deletion.tag || null === deletion.memoizedState) {
          if (30 === deletion.tag && 0 !== (deletion.flags & 18874368)) {
            var props = deletion.memoizedProps,
              name = props.name;
            if (null != name && "auto" !== name) {
              var pair = pairs.get(name);
              if (void 0 !== pair) {
                if (
                  "none" !==
                    getViewTransitionClassName(props.default, props.share) &&
                  applyViewTransitionToHostInstances()
                ) {
                  var oldInstance = deletion.stateNode;
                  pair.paired = oldInstance;
                  oldInstance.paired = pair;
                  scheduleViewTransitionEvent(deletion, props.onShare);
                }
                pairs.delete(name);
                if (0 === pairs.size) break;
              }
            }
          }
          commitDeletedPairViewTransitions(deletion);
        }
        deletion = deletion.sibling;
      }
  }
}
function commitExitViewTransitions(deletion: any): void {
  if (30 === deletion.tag) {
    var props = deletion.memoizedProps,
      name = getViewTransitionName(props, deletion.stateNode),
      pair =
        null !== appearingViewTransitions
          ? appearingViewTransitions.get(name)
          : void 0;
    if (
      "none" !==
        getViewTransitionClassName(
          props.default,
          void 0 !== pair ? props.share : props.exit
        ) &&
      applyViewTransitionToHostInstances()
    )
      if (void 0 !== pair) {
        var oldInstance = deletion.stateNode;
        pair.paired = oldInstance;
        oldInstance.paired = pair;
        appearingViewTransitions!.delete(name);
        scheduleViewTransitionEvent(deletion, props.onShare);
      } else scheduleViewTransitionEvent(deletion, props.onExit);
    null !== appearingViewTransitions &&
      commitDeletedPairViewTransitions(deletion);
  } else if (0 !== (deletion.subtreeFlags & 33554432))
    for (deletion = deletion.child; null !== deletion; )
      commitExitViewTransitions(deletion), (deletion = deletion.sibling);
  else
    null !== appearingViewTransitions &&
      commitDeletedPairViewTransitions(deletion);
}
function commitNestedViewTransitions(changedParent: any): void {
  for (changedParent = changedParent.child; null !== changedParent; ) {
    if (30 === changedParent.tag) {
      var props = changedParent.memoizedProps,
        name = getViewTransitionName(props, changedParent.stateNode);
      props = getViewTransitionClassName(props.default, props.update);
      changedParent.flags &= -5;
      "none" !== props &&
        applyViewTransitionToHostInstances(
          changedParent,
          name,
          props,
          (changedParent.memoizedState = [])
        );
    } else
      0 !== (changedParent.subtreeFlags & 33554432) &&
        commitNestedViewTransitions(changedParent);
    changedParent = changedParent.sibling;
  }
}
function restorePairedViewTransitions(parent: any): void {
  if (0 !== (parent.subtreeFlags & 18874368))
    for (parent = parent.child; null !== parent; ) {
      if (22 !== parent.tag || null === parent.memoizedState) {
        if (30 === parent.tag && 0 !== (parent.flags & 18874368)) {
          var instance = parent.stateNode;
          null !== instance.paired && (instance.paired = null);
        }
        restorePairedViewTransitions(parent);
      }
      parent = parent.sibling;
    }
}
function restoreEnterOrExitViewTransitions(fiber: any): void {
  if (30 === fiber.tag)
    (fiber.stateNode.paired = null), restorePairedViewTransitions(fiber);
  else if (0 !== (fiber.subtreeFlags & 33554432))
    for (fiber = fiber.child; null !== fiber; )
      restoreEnterOrExitViewTransitions(fiber), (fiber = fiber.sibling);
  else restorePairedViewTransitions(fiber);
}
function measureNestedViewTransitions(changedParent: any, gesture: boolean): void {
  for (changedParent = changedParent.child; null !== changedParent; ) {
    if (30 === changedParent.tag) {
      var props = changedParent.memoizedProps,
        state = changedParent.stateNode;
      getViewTransitionName(props, state);
      getViewTransitionClassName(props.default, props.update);
      gesture
        ? ((props = state.clones),
          null !== props && props.map(measureClonedInstance))
        : (changedParent.memoizedState = null);
      viewTransitionHostInstanceIdx = 0;
    } else
      0 !== (changedParent.subtreeFlags & 33554432) &&
        measureNestedViewTransitions(changedParent, gesture);
    changedParent = changedParent.sibling;
  }
}
var offscreenSubtreeIsHidden = !1,
  offscreenSubtreeWasHidden = !1,
  PossiblyWeakSet = "function" === typeof WeakSet ? WeakSet : Set,
  nextEffect = null,
  viewTransitionContextChanged = !1;
function commitBeforeMutationEffects(root: RR.FiberRoot | boolean, firstChild: RR.Fiber | RR.Flags, committedLanes: RR.Lanes | RR.Fiber): void {
  root = (committedLanes & 335544064) === committedLanes;
  nextEffect = firstChild;
  for (firstChild = root ? 9270 : 1024; null !== nextEffect; ) {
    committedLanes = nextEffect;
    if (root) {
      var deletions = committedLanes.deletions;
      if (null !== deletions)
        for (var i = 0; i < deletions.length; i++)
          root && commitExitViewTransitions(deletions[i]);
    }
    if (null === committedLanes.alternate && 0 !== (committedLanes.flags & 2))
      root && trackEnterViewTransitions(committedLanes),
        commitBeforeMutationEffects_complete(root);
    else {
      if (22 === committedLanes.tag && 0 !== (committedLanes.mode & 1))
        if (
          ((deletions = committedLanes.alternate),
          null !== committedLanes.memoizedState)
        ) {
          null !== deletions &&
            null === deletions.memoizedState &&
            root &&
            commitExitViewTransitions(deletions);
          commitBeforeMutationEffects_complete(root);
          continue;
        } else if (null !== deletions && null !== deletions.memoizedState) {
          root && trackEnterViewTransitions(committedLanes);
          commitBeforeMutationEffects_complete(root);
          continue;
        }
      deletions = committedLanes.child;
      0 !== (committedLanes.subtreeFlags & firstChild) && null !== deletions
        ? ((deletions.return = committedLanes), (nextEffect = deletions))
        : (root && commitNestedViewTransitions(committedLanes),
          commitBeforeMutationEffects_complete(root));
    }
  }
  appearingViewTransitions = null;
}
function commitBeforeMutationEffects_complete(
  isViewTransitionEligible$jscomp$0: boolean
): void {
  for (; null !== nextEffect; ) {
    var fiber: RR.Fiber = nextEffect,
      isViewTransitionEligible: any = isViewTransitionEligible$jscomp$0,
      current: any = fiber.alternate,
      flags: any = fiber.flags;
    switch (fiber.tag) {
      case 0:
      case 11:
      case 15:
        break;
      case 1:
        if (0 !== (flags & 1024) && null !== current) {
          isViewTransitionEligible = void 0;
          flags = current.memoizedProps;
          current = current.memoizedState;
          var instance: RR.ClassInstance = fiber.stateNode as RR.ClassInstance;
          try {
            var resolvedPrevProps = resolveClassComponentProps(
              (fiber.type as RR.ClassComponent),
              flags
            );
            isViewTransitionEligible = instance!.getSnapshotBeforeUpdate(
              resolvedPrevProps,
              current
            );
            instance!.__reactInternalSnapshotBeforeUpdate =
              isViewTransitionEligible;
          } catch (error) {
            captureCommitPhaseError(fiber, fiber.return, error);
          }
        }
        break;
      case 3:
        break;
      case 5:
      case 26:
      case 27:
      case 6:
      case 4:
      case 17:
        break;
      case 30:
        isViewTransitionEligible &&
          null !== current &&
          ((isViewTransitionEligible = getViewTransitionName(
            current.memoizedProps,
            current.stateNode
          )),
          (flags = fiber.memoizedProps),
          (flags = getViewTransitionClassName(flags.default, flags.update)),
          "none" !== flags &&
            applyViewTransitionToHostInstances(
              current,
              isViewTransitionEligible,
              flags,
              (current.memoizedState = [])
            ));
        break;
      default:
        if (0 !== (flags & 1024))
          throw Error(
            "This unit of work tag should not have side-effects. This error is likely caused by a bug in React. Please file an issue."
          );
    }
    current = fiber.sibling;
    if (null !== current) {
      current.return = fiber.return;
      nextEffect = current;
      break;
    }
    nextEffect = fiber.return;
  }
}
function commitLayoutEffectOnFiber(finishedRoot: RR.FiberRoot | RR.ClassInstance | RR.StateNode | RR.ElementType, current: RR.Fiber | RR.MemoizedState | RR.Props | boolean | null, finishedWork: RR.Fiber | (() => void)): void {
  var flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 4 && commitHookEffectListMount(5, finishedWork);
      break;
    case 1:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (flags & 4)
        if (((finishedRoot = finishedWork.stateNode), null === current))
          try {
            finishedRoot.componentDidMount();
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        else {
          var prevProps = resolveClassComponentProps(
            finishedWork.type,
            current.memoizedProps
          );
          current = current.memoizedState;
          try {
            finishedRoot.componentDidUpdate(
              prevProps,
              current,
              finishedRoot.__reactInternalSnapshotBeforeUpdate
            );
          } catch (error$115) {
            captureCommitPhaseError(
              finishedWork,
              finishedWork.return,
              error$115
            );
          }
        }
      flags & 64 && commitClassCallbacks(finishedWork);
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      break;
    case 3:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (flags & 64 && ((flags = finishedWork.updateQueue), null !== flags)) {
        finishedRoot = null;
        if (null !== finishedWork.child)
          switch (finishedWork.child.tag) {
            case 27:
            case 5:
              finishedRoot = getPublicInstance(finishedWork.child.stateNode);
              break;
            case 1:
              finishedRoot = finishedWork.child.stateNode;
          }
        try {
          commitCallbacks(flags, finishedRoot);
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      }
      break;
    case 27:
    case 26:
    case 5:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      if (null === current)
        if (flags & 4) commitHostMount(finishedWork);
        else if (flags & 64) {
          finishedRoot = finishedWork.type;
          current = finishedWork.memoizedProps;
          prevProps = finishedWork.stateNode;
          try {
            shim$1(prevProps, finishedRoot, current, finishedWork);
          } catch (error) {
            captureCommitPhaseError(finishedWork, finishedWork.return, error);
          }
        }
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      break;
    case 12:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    case 31:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    case 13:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 64 &&
        ((flags = finishedWork.memoizedState),
        null !== flags &&
          null !== flags.dehydrated &&
          (retryDehydratedSuspenseBoundary.bind(null, finishedWork), shim$1()));
      break;
    case 22:
      if (0 !== (finishedWork.mode & 1)) {
        if (
          ((flags =
            null !== finishedWork.memoizedState || offscreenSubtreeIsHidden),
          !flags)
        ) {
          var newOffscreenSubtreeWasHidden =
            (null !== current && null !== current.memoizedState) ||
            offscreenSubtreeWasHidden;
          current = offscreenSubtreeIsHidden;
          prevProps = offscreenSubtreeWasHidden;
          offscreenSubtreeIsHidden = flags;
          (offscreenSubtreeWasHidden = newOffscreenSubtreeWasHidden) &&
          !prevProps
            ? ((flags = 0),
              0 !== (finishedWork.subtreeFlags & 8772) && (flags |= 1),
              recursivelyTraverseReappearLayoutEffects(
                finishedRoot,
                finishedWork,
                flags
              ))
            : recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
          offscreenSubtreeIsHidden = current;
          offscreenSubtreeWasHidden = prevProps;
        }
      } else recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      break;
    case 30:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
      break;
    case 7:
      flags & 512 && safelyAttachRef(finishedWork, finishedWork.return);
    default:
      recursivelyTraverseLayoutEffects(finishedRoot, finishedWork);
  }
}
function detachFiberAfterEffects(fiber: RR.Fiber): void {
  var alternate: RR.Fiber | RR.StateNode | null = fiber.alternate;
  null !== alternate &&
    ((fiber.alternate = null), detachFiberAfterEffects(alternate));
  fiber.child = null;
  fiber.deletions = null;
  fiber.sibling = null;
  fiber.stateNode = null;
  fiber.return = null;
  fiber.dependencies = null;
  fiber.memoizedProps = null;
  fiber.memoizedState = null;
  fiber.pendingProps = null;
  fiber.stateNode = null;
  fiber.updateQueue = null;
}
function recursivelyTraverseDeletionEffects(
  finishedRoot: RR.FiberRoot,
  nearestMountedAncestor: RR.Fiber,
  parent: RR.Fiber | null
): void {
  for (parent = parent!.child; null !== parent; )
    commitDeletionEffectsOnFiber(
      finishedRoot,
      nearestMountedAncestor,
      parent
    ),
      (parent = parent.sibling);
}
function commitDeletionEffectsOnFiber(
  finishedRoot: RR.FiberRoot,
  nearestMountedAncestor: RR.Fiber,
  deletedFiber: RR.Fiber
): void {
  if (injectedHook && "function" === typeof injectedHook.onCommitFiberUnmount)
    try {
      injectedHook.onCommitFiberUnmount(rendererID, deletedFiber);
    } catch (err) {}
  switch (deletedFiber.tag) {
    case 26:
    case 27:
    case 5:
      offscreenSubtreeWasHidden ||
        safelyDetachRef(deletedFiber, nearestMountedAncestor),
        commitFragmentInstanceDeletionEffects(deletedFiber);
    case 6:
      6 === deletedFiber.tag &&
        commitFragmentInstanceDeletionEffects(deletedFiber);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 18:
      break;
    case 4:
      commitHostPortalContainerChildren(
        deletedFiber.stateNode as RR.PortalState,
        deletedFiber,
        createChildNodeSet()
      );
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor);
      offscreenSubtreeWasHidden ||
        commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 1:
      if (!offscreenSubtreeWasHidden) {
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
        var instance = deletedFiber.stateNode;
        "function" === typeof instance.componentWillUnmount &&
          safelyCallComponentWillUnmount(
            deletedFiber,
            nearestMountedAncestor,
            instance
          );
      }
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 21:
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 22:
      deletedFiber.mode & 1
        ? ((offscreenSubtreeWasHidden =
            (instance = offscreenSubtreeWasHidden) ||
            null !== deletedFiber.memoizedState),
          recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          ),
          (offscreenSubtreeWasHidden = instance))
        : recursivelyTraverseDeletionEffects(
            finishedRoot,
            nearestMountedAncestor,
            deletedFiber
          );
      break;
    case 30:
      safelyDetachRef(deletedFiber, nearestMountedAncestor);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    case 7:
      offscreenSubtreeWasHidden ||
        safelyDetachRef(deletedFiber, nearestMountedAncestor);
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
      break;
    default:
      recursivelyTraverseDeletionEffects(
        finishedRoot,
        nearestMountedAncestor,
        deletedFiber
      );
  }
}
function getRetryCache(finishedWork: RR.Fiber | RR.OffscreenInstance): RR.RetryCache {
  switch (finishedWork.tag) {
    case 31:
    case 13:
    case 19:
      var retryCache = finishedWork.stateNode;
      null === retryCache &&
        (retryCache = finishedWork.stateNode = new PossiblyWeakSet());
      return retryCache;
    case 22:
      return (
        (finishedWork = finishedWork.stateNode),
        (retryCache = finishedWork._retryCache),
        null === retryCache &&
          (retryCache = finishedWork._retryCache = new PossiblyWeakSet()),
        retryCache
      );
    default:
      throw Error(
        "Unexpected Suspense handler tag (" +
          finishedWork.tag +
          "). This is a bug in React."
      );
  }
}
function attachSuspenseRetryListeners(finishedWork: RR.Fiber, wakeables: RR.RetryQueue): void {
  var retryCache = getRetryCache(finishedWork);
  wakeables.forEach(function (wakeable) {
    if (!retryCache.has(wakeable)) {
      retryCache.add(wakeable);
      var retry: () => void = resolveRetryWakeable.bind(null, finishedWork, wakeable);
      wakeable.then(retry, retry);
    }
  });
}
function recursivelyTraverseMutationEffects(root, parentFiber, lanes) {
  var deletions = parentFiber.deletions;
  if (null !== deletions)
    for (var i = 0; i < deletions.length; i++) {
      var childToDelete = deletions[i];
      commitDeletionEffectsOnFiber(root, parentFiber, childToDelete);
      var alternate = childToDelete.alternate;
      null !== alternate && (alternate.return = null);
      childToDelete.return = null;
    }
  if (parentFiber.subtreeFlags & 13886)
    for (parentFiber = parentFiber.child; null !== parentFiber; )
      commitMutationEffectsOnFiber(parentFiber, root, lanes),
        (parentFiber = parentFiber.sibling);
}
function commitMutationEffectsOnFiber(finishedWork: RR.Fiber, root: any, lanes: any): void {
  var current: any = (finishedWork as RR.Fiber).alternate,
    flags: any = (finishedWork as RR.Fiber).flags;
  switch ((finishedWork as RR.Fiber).tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      if (
        flags & 4 &&
        ((current = finishedWork.updateQueue),
        (current = null !== current ? current.events : null),
        null !== current)
      )
        for (var ii: any = 0; ii < current.length; ii++) {
          var _eventPayloads$ii2: any = current[ii];
          _eventPayloads$ii2.ref.impl = _eventPayloads$ii2.nextImpl;
        }
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        (commitHookEffectListUnmount(3, finishedWork, finishedWork.return),
        commitHookEffectListMount(3, finishedWork),
        commitHookEffectListUnmount(5, finishedWork, finishedWork.return));
      break;
    case 1:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef((current as RR.Fiber | null), (current as RR.Fiber | null)!.return));
      (flags as RR.Flags) & 64 &&
        offscreenSubtreeIsHidden &&
        ((finishedWork = (finishedWork as RR.Fiber).updateQueue as any),
        null !== finishedWork &&
          ((flags = (finishedWork as any as RR.UpdateQueue).callbacks),
          null !== flags &&
            ((root = (finishedWork as any as RR.UpdateQueue).shared.hiddenCallbacks),
            ((finishedWork as any as RR.UpdateQueue).shared.hiddenCallbacks =
              null === root ? flags : root.concat(flags)))));
      break;
    case 26:
    case 27:
    case 5:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef((current as RR.Fiber | null), (current as RR.Fiber | null)!.return));
      null !== (finishedWork as RR.Fiber).alternate &&
        ((finishedWork as RR.Fiber).alternate!.stateNode = (finishedWork as RR.Fiber).stateNode);
      break;
    case 6:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      break;
    case 3:
      viewTransitionMutationContext = !1;
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      if (flags & 4) {
        flags = (root as RR.FiberRoot).containerInfo;
        root = (root as RR.FiberRoot).pendingChildren;
        try {
          completeRoot(flags.containerTag, root),
            (viewTransitionMutationContext = !0);
        } catch (error) {
          captureCommitPhaseError((finishedWork as RR.Fiber), (finishedWork as RR.Fiber).return, error);
        }
      }
      viewTransitionMutationContext = !1;
      break;
    case 4:
      current = pushMutationContext();
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      viewTransitionMutationContext = current;
      flags & 4 &&
        commitHostPortalContainerChildren(
          (finishedWork as RR.Fiber).stateNode as RR.PortalState,
          (finishedWork as RR.Fiber),
          ((finishedWork as RR.Fiber).stateNode as RR.PortalState).pendingChildren
        );
      break;
    case 12:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      break;
    case 31:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        ((flags = finishedWork.updateQueue),
        null !== flags &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, flags)));
      break;
    case 13:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      finishedWork.child!.flags & 8192 &&
        ((root = null !== current && null !== current.memoizedState),
        null === finishedWork.memoizedState ||
          root ||
          (globalMostRecentFallbackTime = now()));
      (flags as RR.Flags) & 4 &&
        ((flags = (finishedWork as RR.Fiber).updateQueue as RR.RetryQueue | null),
        null !== flags &&
          (((finishedWork as RR.Fiber).updateQueue = null),
          attachSuspenseRetryListeners((finishedWork as RR.Fiber), flags)));
      break;
    case 22:
      ii = null !== finishedWork.memoizedState;
      _eventPayloads$ii2 = null !== current && null !== current.memoizedState;
      if (finishedWork.mode & 1) {
        var prevOffscreenSubtreeIsHidden: any = offscreenSubtreeIsHidden,
          prevOffscreenSubtreeWasHidden = offscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden || ii;
        offscreenSubtreeWasHidden =
          prevOffscreenSubtreeWasHidden || _eventPayloads$ii2;
        recursivelyTraverseMutationEffects(root, finishedWork, lanes);
        offscreenSubtreeWasHidden = prevOffscreenSubtreeWasHidden;
        offscreenSubtreeIsHidden = prevOffscreenSubtreeIsHidden;
      } else recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 8192 &&
        ((root = finishedWork.stateNode),
        (root._visibility = ii ? root._visibility & -2 : root._visibility | 1),
        !ii ||
          null === current ||
          _eventPayloads$ii2 ||
          offscreenSubtreeIsHidden ||
          offscreenSubtreeWasHidden ||
          0 === (finishedWork.mode & 1) ||
          ((root = _eventPayloads$ii2 || offscreenSubtreeWasHidden),
          (lanes = offscreenSubtreeIsHidden),
          (current = offscreenSubtreeWasHidden),
          (offscreenSubtreeIsHidden = ii || offscreenSubtreeIsHidden),
          (offscreenSubtreeWasHidden = root),
          recursivelyTraverseDisappearLayoutEffects(finishedWork),
          (offscreenSubtreeIsHidden = lanes),
          (offscreenSubtreeWasHidden = current)));
      flags & 4 &&
        ((flags = finishedWork.updateQueue),
        null !== flags &&
          ((root = flags.retryQueue),
          null !== root &&
            ((flags.retryQueue = null),
            attachSuspenseRetryListeners(finishedWork, root))));
      break;
    case 19:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      flags & 4 &&
        ((flags = finishedWork.updateQueue),
        null !== flags &&
          ((finishedWork.updateQueue = null),
          attachSuspenseRetryListeners(finishedWork, flags)));
      break;
    case 30:
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return));
      flags = pushMutationContext();
      ii = (lanes & 335544064) === lanes;
      _eventPayloads$ii2 = finishedWork.memoizedProps;
      ii &&
        "none" !==
          getViewTransitionClassName(
            _eventPayloads$ii2.default,
            _eventPayloads$ii2.update
          );
      recursivelyTraverseMutationEffects(root, finishedWork, lanes);
      commitReconciliationEffects(finishedWork);
      ii &&
        null !== current &&
        viewTransitionMutationContext &&
        (finishedWork.flags |= 4);
      viewTransitionMutationContext = flags;
      break;
    case 21:
      break;
    case 7:
      flags & 512 &&
        (offscreenSubtreeWasHidden ||
          null === current ||
          safelyDetachRef(current, current.return)),
        current &&
          null !== current.stateNode &&
          (current.stateNode._fragmentFiber = finishedWork);
    default:
      recursivelyTraverseMutationEffects(root, finishedWork, lanes),
        commitReconciliationEffects(finishedWork);
  }
}
function commitReconciliationEffects(finishedWork: RR.Fiber): void {
  var flags = finishedWork.flags;
  if (flags & 2) {
    try {
      for (
        var parentFragmentInstances = null, parent = finishedWork.return;
        null !== parent;

      ) {
        if (isFragmentInstanceParent(parent)) {
          var fragmentInstance: RR.FragmentInstance = parent.stateNode as RR.FragmentInstance;
          null === parentFragmentInstances
            ? (parentFragmentInstances = [fragmentInstance])
            : parentFragmentInstances.push(fragmentInstance);
        }
        if (isFragmentInstanceHostBoundary(parent)) break;
        parent = parent.return;
      }
      commitImmutablePlacementNodeToFragmentInstances(
        finishedWork,
        parentFragmentInstances
      );
    } catch (error) {
      captureCommitPhaseError(finishedWork, finishedWork.return, error);
    }
    finishedWork.flags &= -3;
  }
  flags & 4096 && (finishedWork.flags &= -4097);
}
function recursivelyTraverseAfterMutationEffects(root: RR.FiberRoot, parentFiber: RR.Fiber | null): void {
  if (parentFiber!.subtreeFlags & 9270)
    for (parentFiber = parentFiber!.child; null !== parentFiber; )
      commitAfterMutationEffectsOnFiber(parentFiber, root),
        (parentFiber = parentFiber.sibling);
  else measureNestedViewTransitions(parentFiber, !1);
}
function commitAfterMutationEffectsOnFiber(finishedWork: any, root: RR.FiberRoot): void {
  var current = finishedWork.alternate;
  if (null === current) commitEnterViewTransitions(finishedWork, !1);
  else
    switch (finishedWork.tag) {
      case 3:
        viewTransitionContextChanged = !1;
        pushViewTransitionCancelableScope();
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
        viewTransitionCancelableChildren = null;
        break;
      case 5:
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
        break;
      case 4:
        current = viewTransitionContextChanged;
        viewTransitionContextChanged = !1;
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
        viewTransitionContextChanged = current;
        break;
      case 22:
        0 !== (finishedWork.mode & 1)
          ? null === finishedWork.memoizedState &&
            (null !== current.memoizedState
              ? commitEnterViewTransitions(finishedWork, !1)
              : recursivelyTraverseAfterMutationEffects(root, finishedWork))
          : recursivelyTraverseAfterMutationEffects(root, finishedWork);
        break;
      case 30:
        var prevContextChanged$126 = viewTransitionContextChanged,
          prevCancelableChildren = pushViewTransitionCancelableScope();
        viewTransitionContextChanged = !1;
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
        viewTransitionContextChanged && (finishedWork.flags |= 4);
        root = finishedWork.memoizedProps;
        var state = finishedWork.stateNode;
        getViewTransitionName(root, state);
        getViewTransitionName(current.memoizedProps, state);
        "none" !== getViewTransitionClassName(root.default, root.update) &&
          ((root = current.memoizedState),
          (current.memoizedState = null),
          (viewTransitionHostInstanceIdx = 0),
          viewTransitionHostInstanceIdx !== (null === root ? 0 : root.length) &&
            (finishedWork.flags |= 32));
        null !== prevCancelableChildren &&
          (prevCancelableChildren.push.apply(
            prevCancelableChildren,
            viewTransitionCancelableChildren
          ),
          (viewTransitionCancelableChildren = prevCancelableChildren));
        viewTransitionContextChanged =
          0 !== (finishedWork.flags & 32) ? !0 : prevContextChanged$126;
        break;
      default:
        recursivelyTraverseAfterMutationEffects(root, finishedWork);
    }
}
function recursivelyTraverseLayoutEffects(root: RR.FiberRoot, parentFiber: RR.Fiber | null): void {
  if (parentFiber!.subtreeFlags & 8772)
    for (parentFiber = parentFiber!.child; null !== parentFiber; )
      commitLayoutEffectOnFiber(root, parentFiber.alternate, parentFiber),
        (parentFiber = parentFiber.sibling);
}
function recursivelyTraverseDisappearLayoutEffects(parentFiber): void {
  for (parentFiber = parentFiber!.child; null !== parentFiber; ) {
    var finishedWork = parentFiber;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 14:
      case 15:
        commitHookEffectListUnmount(4, finishedWork, finishedWork.return);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 1:
        safelyDetachRef(finishedWork, finishedWork.return);
        var instance: RR.ClassInstance = finishedWork.stateNode as RR.ClassInstance;
        "function" === typeof instance.componentWillUnmount &&
          safelyCallComponentWillUnmount(
            finishedWork,
            finishedWork.return,
            instance
          );
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 27:
      case 5:
        safelyDetachRef(finishedWork, finishedWork.return);
        (5 !== finishedWork.tag && 27 !== finishedWork.tag) ||
          commitFragmentInstanceDeletionEffects(finishedWork);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 6:
        commitFragmentInstanceDeletionEffects(finishedWork);
        break;
      case 26:
        safelyDetachRef(finishedWork, finishedWork.return);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 22:
        null === finishedWork.memoizedState &&
          recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 30:
        safelyDetachRef(finishedWork, finishedWork.return);
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
        break;
      case 7:
        safelyDetachRef(finishedWork, finishedWork.return);
      default:
        recursivelyTraverseDisappearLayoutEffects(finishedWork);
    }
    parentFiber = parentFiber.sibling;
  }
}
function recursivelyTraverseReappearLayoutEffects(
  finishedRoot$jscomp$0: RR.FiberRoot,
  parentFiber: RR.Fiber | null,
  layoutEffectTraversalFlags: number
): void {
  layoutEffectTraversalFlags =
    0 !== (parentFiber!.subtreeFlags & 8772)
      ? layoutEffectTraversalFlags
      : layoutEffectTraversalFlags & -2;
  for (parentFiber = parentFiber!.child; null !== parentFiber; ) {
    var current: RR.Fiber | null = parentFiber.alternate,
      finishedRoot: RR.FiberRoot | RR.ClassInstance | RR.UpdateQueue | number | null = finishedRoot$jscomp$0,
      finishedWork = parentFiber,
      flags = finishedWork.flags,
      includeWorkInProgressEffects = 0 !== (layoutEffectTraversalFlags & 1);
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
        commitHookEffectListMount(4, finishedWork);
        break;
      case 1:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
        current = finishedWork;
        finishedRoot = current.stateNode as RR.ClassInstance;
        if ("function" === typeof finishedRoot.componentDidMount)
          try {
            (finishedRoot as RR.ClassInstance).componentDidMount!();
          } catch (error) {
            captureCommitPhaseError(current, current.return, error);
          }
        current = finishedWork;
        finishedRoot = current.updateQueue as RR.UpdateQueue | null;
        if (null !== finishedRoot) {
          var instance = current.stateNode;
          try {
            var hiddenCallbacks = finishedRoot.shared.hiddenCallbacks;
            if (null !== hiddenCallbacks)
              for (
                finishedRoot.shared.hiddenCallbacks = null, finishedRoot = 0;
                finishedRoot < hiddenCallbacks.length;
                finishedRoot++
              )
                callCallback(hiddenCallbacks[finishedRoot]!, instance);
          } catch (error) {
            captureCommitPhaseError(current, current.return, error);
          }
        }
        includeWorkInProgressEffects &&
          flags & 64 &&
          commitClassCallbacks(finishedWork);
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 27:
      case 5:
        (5 !== finishedWork.tag && 27 !== finishedWork.tag) ||
          commitFragmentInstanceInsertionEffects(finishedWork);
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
        includeWorkInProgressEffects &&
          null === current &&
          flags & 4 &&
          commitHostMount(finishedWork);
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 6:
        commitFragmentInstanceInsertionEffects(finishedWork);
        break;
      case 26:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
        includeWorkInProgressEffects &&
          null === current &&
          flags & 4 &&
          commitHostMount(finishedWork);
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 12:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
        break;
      case 31:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
        break;
      case 13:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
        break;
      case 22:
        null === finishedWork.memoizedState &&
          recursivelyTraverseReappearLayoutEffects(
            finishedRoot,
            finishedWork,
            layoutEffectTraversalFlags
          );
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 30:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
        safelyAttachRef(finishedWork, finishedWork.return);
        break;
      case 7:
        safelyAttachRef(finishedWork, finishedWork.return);
      default:
        recursivelyTraverseReappearLayoutEffects(
          finishedRoot,
          finishedWork,
          layoutEffectTraversalFlags
        );
    }
    parentFiber = parentFiber.sibling;
  }
}
function commitOffscreenPassiveMountEffects(current: RR.Fiber | RR.Cache | null, finishedWork: RR.Fiber): void {
  var previousCache: RR.Cache | null = null;
  null !== (current as RR.Fiber | null) &&
    null !== (current as RR.Fiber | null)!.memoizedState &&
    null !== ((current as RR.Fiber | null)!.memoizedState as RR.OffscreenState).cachePool &&
    (previousCache = ((current as RR.Fiber | null)!.memoizedState as RR.OffscreenState).cachePool!.pool);
  current = null;
  null !== finishedWork.memoizedState &&
    null !== (finishedWork.memoizedState as RR.OffscreenState).cachePool &&
    (current = (finishedWork.memoizedState as RR.OffscreenState).cachePool!.pool);
  current !== previousCache &&
    (null != current && current.refCount++,
    null != previousCache && releaseCache(previousCache));
}
function commitCachePassiveMountEffect(current: RR.Fiber | RR.Cache | null, finishedWork: RR.Fiber | RR.Cache | null): void {
  current = null;
  null !== (finishedWork as RR.Fiber).alternate &&
    (current = ((finishedWork as RR.Fiber).alternate!.memoizedState as RR.CacheComponentState).cache);
  finishedWork = ((finishedWork as RR.Fiber).memoizedState as RR.CacheComponentState).cache;
  finishedWork !== current &&
    (finishedWork!.refCount++, null != current && releaseCache(current));
}
function recursivelyTraversePassiveMountEffects(
  root: RR.FiberRoot,
  parentFiber: RR.Fiber | null,
  committedLanes: RR.Lanes,
  committedTransitions: RR.Transition[] | null
): void {
  if (
    parentFiber.subtreeFlags &
    ((committedLanes & 335544064) === committedLanes ? 10262 : 10256)
  )
    for (parentFiber = parentFiber!.child; null !== parentFiber; )
      commitPassiveMountOnFiber(
        root,
        parentFiber,
        committedLanes,
        committedTransitions
      ),
        (parentFiber = parentFiber.sibling);
}
function commitPassiveMountOnFiber(
  finishedRoot: RR.FiberRoot | RR.Cache | RR.ProfilerState | null,
  finishedWork: RR.Fiber | RR.Cache,
  committedLanes: RR.Lanes,
  committedTransitions: RR.Transition[] | null
): void {
  var isViewTransitionEligible =
    (committedLanes & 335544064) === committedLanes;
  isViewTransitionEligible &&
    null === finishedWork.alternate &&
    null !== finishedWork.return &&
    null !== finishedWork.return.alternate &&
    restoreEnterOrExitViewTransitions(finishedWork);
  var flags = finishedWork.flags;
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 && commitHookEffectListMount(9, finishedWork);
      break;
    case 1:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 3:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 &&
        ((finishedRoot = null),
        null !== finishedWork.alternate &&
          (finishedRoot = finishedWork.alternate.memoizedState.cache),
        (finishedWork = finishedWork.memoizedState.cache),
        finishedWork !== finishedRoot &&
          (finishedWork.refCount++,
          null != finishedRoot && releaseCache(finishedRoot)));
      break;
    case 12:
      if (flags & 2048) {
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
        finishedRoot = finishedWork.stateNode;
        try {
          var _finishedWork$memoize2 = finishedWork.memoizedProps,
            id = _finishedWork$memoize2.id,
            onPostCommit = _finishedWork$memoize2.onPostCommit;
          "function" === typeof onPostCommit &&
            onPostCommit(
              id,
              null === finishedWork.alternate ? "mount" : "update",
              finishedRoot.passiveEffectDuration,
              -0
            );
        } catch (error) {
          captureCommitPhaseError(finishedWork, finishedWork.return, error);
        }
      } else
        recursivelyTraversePassiveMountEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions
        );
      break;
    case 31:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 13:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    case 23:
      break;
    case 22:
      _finishedWork$memoize2 = finishedWork.stateNode;
      id = finishedWork.alternate;
      null !== finishedWork.memoizedState
        ? (isViewTransitionEligible &&
            null !== id &&
            null === id.memoizedState &&
            restoreEnterOrExitViewTransitions(id),
          _finishedWork$memoize2._visibility & 2
            ? recursivelyTraversePassiveMountEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions
              )
            : finishedWork.mode & 1
              ? recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  finishedWork
                )
              : ((_finishedWork$memoize2._visibility |= 2),
                recursivelyTraversePassiveMountEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions
                )))
        : (isViewTransitionEligible &&
            null !== id &&
            null !== id.memoizedState &&
            restoreEnterOrExitViewTransitions(finishedWork),
          _finishedWork$memoize2._visibility & 2
            ? recursivelyTraversePassiveMountEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions
              )
            : ((_finishedWork$memoize2._visibility |= 2),
              recursivelyTraverseReconnectPassiveEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                0 !== (finishedWork.subtreeFlags & 10256) || !1
              )));
      flags & 2048 && commitOffscreenPassiveMountEffects(id, finishedWork);
      break;
    case 24:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      flags & 2048 &&
        commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
      break;
    case 30:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
      break;
    default:
      recursivelyTraversePassiveMountEffects(
        finishedRoot,
        finishedWork,
        committedLanes,
        committedTransitions
      );
  }
}
function recursivelyTraverseReconnectPassiveEffects(
  finishedRoot$jscomp$0: RR.FiberRoot,
  parentFiber: RR.Fiber | null,
  committedLanes$jscomp$0: RR.Lanes,
  committedTransitions$jscomp$0: RR.Transition[] | null,
  includeWorkInProgressEffects: boolean
): void {
  includeWorkInProgressEffects =
    includeWorkInProgressEffects &&
    (0 !== (parentFiber!.subtreeFlags & 10256) || !1);
  for (parentFiber = parentFiber!.child; null !== parentFiber; ) {
    var finishedRoot = finishedRoot$jscomp$0,
      finishedWork = parentFiber,
      committedLanes = committedLanes$jscomp$0,
      committedTransitions = committedTransitions$jscomp$0,
      flags = finishedWork.flags;
    switch (finishedWork.tag) {
      case 0:
      case 11:
      case 15:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
        commitHookEffectListMount(8, finishedWork);
        break;
      case 23:
        break;
      case 22:
        var instance: RR.OffscreenInstance = finishedWork.stateNode as RR.OffscreenInstance;
        null !== finishedWork.memoizedState
          ? instance._visibility & 2
            ? recursivelyTraverseReconnectPassiveEffects(
                finishedRoot,
                finishedWork,
                committedLanes,
                committedTransitions,
                includeWorkInProgressEffects
              )
            : finishedWork.mode & 1
              ? recursivelyTraverseAtomicPassiveEffects(
                  finishedRoot,
                  finishedWork
                )
              : ((instance._visibility |= 2),
                recursivelyTraverseReconnectPassiveEffects(
                  finishedRoot,
                  finishedWork,
                  committedLanes,
                  committedTransitions,
                  includeWorkInProgressEffects
                ))
          : ((instance._visibility |= 2),
            recursivelyTraverseReconnectPassiveEffects(
              finishedRoot,
              finishedWork,
              committedLanes,
              committedTransitions,
              includeWorkInProgressEffects
            ));
        includeWorkInProgressEffects &&
          flags & 2048 &&
          commitOffscreenPassiveMountEffects(
            finishedWork.alternate,
            finishedWork
          );
        break;
      case 24:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
        includeWorkInProgressEffects &&
          flags & 2048 &&
          commitCachePassiveMountEffect(finishedWork.alternate, finishedWork);
        break;
      default:
        recursivelyTraverseReconnectPassiveEffects(
          finishedRoot,
          finishedWork,
          committedLanes,
          committedTransitions,
          includeWorkInProgressEffects
        );
    }
    parentFiber = parentFiber.sibling;
  }
}
function recursivelyTraverseAtomicPassiveEffects(
  finishedRoot$jscomp$0: RR.FiberRoot,
  parentFiber: RR.Fiber | null
): void {
  if (parentFiber!.subtreeFlags & 10256)
    for (parentFiber = parentFiber!.child; null !== parentFiber; ) {
      var finishedRoot: RR.FiberRoot = finishedRoot$jscomp$0,
        finishedWork: RR.Fiber = parentFiber,
        flags: RR.Flags = finishedWork.flags;
      switch (finishedWork.tag) {
        case 22:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
          flags & 2048 &&
            commitOffscreenPassiveMountEffects(
              finishedWork.alternate,
              finishedWork
            );
          break;
        case 24:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
          flags & 2048 &&
            commitCachePassiveMountEffect(
              finishedWork.alternate,
              finishedWork
            );
          break;
        default:
          recursivelyTraverseAtomicPassiveEffects(finishedRoot, finishedWork);
      }
      parentFiber = parentFiber.sibling;
    }
}
var suspenseyCommitFlag = 8192;
function recursivelyAccumulateSuspenseyCommit(parentFiber): void {
  if (parentFiber!.subtreeFlags & suspenseyCommitFlag)
    for (parentFiber = parentFiber!.child; null !== parentFiber; )
      accumulateSuspenseyCommitOnFiber(parentFiber),
        (parentFiber = parentFiber.sibling);
}
function accumulateSuspenseyCommitOnFiber(fiber) {
  switch (fiber.tag) {
    case 26:
      recursivelyAccumulateSuspenseyCommit(fiber);
      fiber.flags & suspenseyCommitFlag &&
        null !== fiber.memoizedState &&
        shim();
      break;
    case 5:
      recursivelyAccumulateSuspenseyCommit(fiber);
      break;
    case 3:
    case 4:
      recursivelyAccumulateSuspenseyCommit(fiber);
      break;
    case 22:
      if (null === fiber.memoizedState) {
        var current = fiber.alternate;
        null !== current && null !== current.memoizedState
          ? ((current = suspenseyCommitFlag),
            (suspenseyCommitFlag = 16777216),
            recursivelyAccumulateSuspenseyCommit(fiber),
            (suspenseyCommitFlag = current))
          : recursivelyAccumulateSuspenseyCommit(fiber);
      }
      break;
    case 30:
      if (
        0 !== (fiber.flags & suspenseyCommitFlag) &&
        ((current = fiber.memoizedProps.name),
        null != current && "auto" !== current)
      ) {
        var state = fiber.stateNode;
        state.paired = null;
        null === appearingViewTransitions &&
          (appearingViewTransitions = new Map());
        appearingViewTransitions.set(current, state);
      }
      recursivelyAccumulateSuspenseyCommit(fiber);
      break;
    default:
      recursivelyAccumulateSuspenseyCommit(fiber);
  }
}
function detachAlternateSiblings(parentFiber: RR.Fiber | null): void {
  var previousFiber: RR.Fiber | null = parentFiber!.alternate;
  if (
    null !== previousFiber &&
    ((parentFiber = previousFiber.child), null !== parentFiber)
  ) {
    previousFiber.child = null;
    do
      (previousFiber = parentFiber.sibling),
        (parentFiber.sibling = null),
        (parentFiber = previousFiber);
    while (null !== parentFiber);
  }
}
function recursivelyTraversePassiveUnmountEffects(parentFiber: RR.Fiber | null): void {
  var deletions: RR.Fiber[] | null = parentFiber!.deletions;
  if (0 !== (parentFiber!.flags & 16)) {
    if (null !== deletions)
      for (var i = 0; i < deletions.length; i++) {
        var childToDelete: RR.Fiber = deletions[i]!;
        nextEffect = childToDelete;
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          (parentFiber as RR.Fiber)
        );
      }
    detachAlternateSiblings(parentFiber!);
  }
  if (parentFiber!.subtreeFlags & 10256)
    for (parentFiber = parentFiber!.child; null !== parentFiber; )
      commitPassiveUnmountOnFiber(parentFiber),
        (parentFiber = parentFiber.sibling);
}
function commitPassiveUnmountOnFiber(finishedWork: RR.Fiber): void {
  switch (finishedWork.tag) {
    case 0:
    case 11:
    case 15:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      finishedWork.flags & 2048 &&
        commitHookEffectListUnmount(9, finishedWork, finishedWork.return);
      break;
    case 3:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    case 12:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    case 22:
      var instance: RR.OffscreenInstance = finishedWork.stateNode as RR.OffscreenInstance;
      null !== finishedWork.memoizedState &&
      instance._visibility & 2 &&
      (null === finishedWork.return || 13 !== finishedWork.return.tag)
        ? ((instance._visibility &= -3),
          recursivelyTraverseDisconnectPassiveEffects(finishedWork))
        : recursivelyTraversePassiveUnmountEffects(finishedWork);
      break;
    default:
      recursivelyTraversePassiveUnmountEffects(finishedWork);
  }
}
function recursivelyTraverseDisconnectPassiveEffects(parentFiber: RR.Fiber | null): void {
  var deletions: RR.Fiber[] | RR.Fiber | null = parentFiber!.deletions;
  if (0 !== (parentFiber!.flags & 16)) {
    if (null !== deletions)
      for (var i: number | RR.OffscreenInstance = 0; i < deletions.length; i++) {
        var childToDelete: RR.Fiber = deletions[i]!;
        nextEffect = childToDelete;
        commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
          childToDelete,
          (parentFiber as RR.Fiber)
        );
      }
    detachAlternateSiblings(parentFiber!);
  }
  for (parentFiber = parentFiber!.child; null !== parentFiber; ) {
    deletions = parentFiber;
    switch (deletions.tag) {
      case 0:
      case 11:
      case 15:
        commitHookEffectListUnmount(8, deletions, deletions.return);
        recursivelyTraverseDisconnectPassiveEffects(deletions);
        break;
      case 22:
        i = deletions.stateNode as RR.OffscreenInstance;
        i._visibility & 2 &&
          ((i._visibility &= -3),
          recursivelyTraverseDisconnectPassiveEffects(deletions));
        break;
      default:
        recursivelyTraverseDisconnectPassiveEffects(deletions);
    }
    parentFiber = parentFiber.sibling;
  }
}
function commitPassiveUnmountEffectsInsideOfDeletedTree_begin(
  deletedSubtreeRoot: RR.Fiber,
  nearestMountedAncestor: RR.Fiber
): void {
  for (; null !== nextEffect; ) {
    var fiber: RR.Fiber = nextEffect;
    switch (fiber.tag) {
      case 0:
      case 11:
      case 15:
        commitHookEffectListUnmount(8, fiber, nearestMountedAncestor);
        break;
      case 23:
      case 22:
        if (
          null !== fiber.memoizedState &&
          null !== (fiber.memoizedState as RR.OffscreenState).cachePool
        ) {
          var cache: RR.Cache | RR.Fiber | null = (fiber.memoizedState as RR.OffscreenState).cachePool!.pool;
          null != cache && cache.refCount++;
        }
        break;
      case 24:
        releaseCache((fiber.memoizedState as RR.CacheComponentState).cache!);
    }
    cache = fiber.child;
    if (null !== cache) (cache.return = fiber), (nextEffect = cache);
    else
      a: for (fiber = deletedSubtreeRoot; null !== nextEffect; ) {
        cache = nextEffect;
        var sibling: RR.Fiber | null = cache.sibling,
          returnFiber: RR.Fiber | null = cache.return;
        detachFiberAfterEffects(cache);
        if (cache === fiber) {
          nextEffect = null;
          break a;
        }
        if (null !== sibling) {
          sibling.return = returnFiber;
          nextEffect = sibling;
          break a;
        }
        nextEffect = returnFiber;
      }
  }
}
var DefaultAsyncDispatcher = {
    getCacheForType: function (resourceType) {
      var cache = readContext(CacheContext),
        cacheForType = cache.data.get(resourceType);
      void 0 === cacheForType &&
        ((cacheForType = resourceType()),
        cache.data.set(resourceType, cacheForType));
      return cacheForType;
    },
    cacheSignal: function () {
      return readContext(CacheContext).controller.signal;
    }
  },
  PossiblyWeakMap = "function" === typeof WeakMap ? WeakMap : Map,
  executionContext = 0,
  workInProgressRoot = null,
  workInProgress = null,
  workInProgressRootRenderLanes = 0,
  workInProgressSuspendedReason = 0,
  workInProgressThrownValue = null,
  workInProgressRootDidSkipSuspendedSiblings = !1,
  workInProgressRootIsPrerendering = !1,
  workInProgressRootDidAttachPingListener = !1,
  entangledRenderLanes = 0,
  workInProgressRootExitStatus = 0,
  workInProgressRootSkippedLanes = 0,
  workInProgressRootInterleavedUpdatedLanes = 0,
  workInProgressRootPingedLanes = 0,
  workInProgressDeferredLane = 0,
  workInProgressSuspendedRetryLanes = 0,
  workInProgressRootConcurrentErrors = null,
  workInProgressRootRecoverableErrors = null,
  workInProgressRootDidIncludeRecursiveRenderUpdate = !1,
  globalMostRecentFallbackTime = 0,
  globalMostRecentTransitionTime = 0,
  workInProgressRootRenderTargetTime = Infinity,
  workInProgressTransitions = null,
  legacyErrorBoundariesThatAlreadyFailed = null,
  pendingEffectsStatus = 0,
  pendingEffectsRoot = null,
  pendingFinishedWork = null,
  pendingEffectsLanes = 0,
  pendingEffectsRemainingLanes = 0,
  pendingPassiveTransitions = null,
  pendingRecoverableErrors = null,
  pendingViewTransition = null,
  pendingViewTransitionEvents = null,
  pendingTransitionTypes = null,
  nestedUpdateCount = 0,
  rootWithNestedUpdates = null;
function requestUpdateLane(fiber): RR.Lane {
  return 0 === (fiber.mode & 1)
    ? 2
    : 0 !== (executionContext & 2) && 0 !== workInProgressRootRenderLanes
      ? workInProgressRootRenderLanes & -workInProgressRootRenderLanes
      : null !== ReactSharedInternals.T
        ? requestTransitionLane()
        : resolveUpdatePriority() as RR.Lane;
}
function requestDeferredLane(): RR.Lane {
  if (0 === workInProgressDeferredLane)
    if (0 !== (workInProgressRootRenderLanes & 536870912))
      workInProgressDeferredLane = 536870912;
    else {
      var lane: RR.Lane | RR.Fiber | null = nextTransitionDeferredLane;
      nextTransitionDeferredLane <<= 1;
      0 === (nextTransitionDeferredLane & 3932160) &&
        (nextTransitionDeferredLane = 262144);
      workInProgressDeferredLane = lane;
    }
  lane = suspenseHandlerStackCursor.current;
  null !== lane && (lane.flags |= 32);
  return workInProgressDeferredLane;
}
function scheduleViewTransitionEvent(fiber: RR.Fiber, callback: any): void {
  if (null != callback) {
    var state = fiber.stateNode,
      instance = state!.ref;
    null === instance &&
      (instance = state!.ref =
        createViewTransitionInstance(
          getViewTransitionName(fiber.memoizedProps, state)
        ));
    null === pendingViewTransitionEvents &&
      (pendingViewTransitionEvents = []);
    pendingViewTransitionEvents.push(callback.bind(null, instance));
  }
}
function scheduleUpdateOnFiber(root: RR.FiberRoot, fiber: RR.Fiber, lane: RR.Lane): void {
  if (
    (root === workInProgressRoot &&
      (2 === workInProgressSuspendedReason ||
        9 === workInProgressSuspendedReason)) ||
    null !== root.cancelPendingCommit
  )
    prepareFreshStack(root, 0),
      markRootSuspended(
        root,
        workInProgressRootRenderLanes,
        workInProgressDeferredLane,
        !1
      );
  markRootUpdated$1(root, lane);
  if (0 === (executionContext & 2) || root !== workInProgressRoot)
    root === workInProgressRoot &&
      (0 === (executionContext & 2) &&
        (workInProgressRootInterleavedUpdatedLanes |= lane),
      4 === workInProgressRootExitStatus &&
        markRootSuspended(
          root,
          workInProgressRootRenderLanes,
          workInProgressDeferredLane,
          !1
        )),
      ensureRootIsScheduled(root),
      2 === lane &&
        0 === executionContext &&
        0 === (fiber.mode & 1) &&
        ((workInProgressRootRenderTargetTime = now() + 500),
        flushSyncWorkAcrossRoots_impl(0, !0));
}
function performWorkOnRoot(root$jscomp$0: RR.FiberRoot, lanes: RR.Lanes, forceSync: boolean | RR.Fiber): void {
  if (0 !== (executionContext & 6))
    throw Error("Should not already be working.");
  var shouldTimeSlice: boolean | RR.FiberRoot =
      (!(forceSync as boolean) &&
        0 === (lanes & 127) &&
        0 === (lanes & root$jscomp$0.expiredLanes)) ||
      checkIfRootIsPrerendering(root$jscomp$0, lanes),
    exitStatus: RR.RootExitStatus | RR.CapturedValue[] | RR.Milliseconds | null = shouldTimeSlice
      ? renderRootConcurrent(root$jscomp$0, lanes)
      : renderRootSync(root$jscomp$0, lanes, !0),
    renderWasConcurrent: boolean | RR.Lanes | RR.CapturedValue[] | RR.RootExitStatus | null = shouldTimeSlice;
  do {
    if (0 === exitStatus) {
      workInProgressRootIsPrerendering &&
        !shouldTimeSlice &&
        markRootSuspended(root$jscomp$0, lanes, 0, !1);
      break;
    } else {
      forceSync = root$jscomp$0.current!.alternate!;
      if (
        renderWasConcurrent &&
        !isRenderConsistentWithExternalStores(forceSync)
      ) {
        exitStatus = renderRootSync(root$jscomp$0, lanes, !1);
        renderWasConcurrent = !1;
        continue;
      }
      if (0 !== root$jscomp$0.tag && 2 === exitStatus) {
        renderWasConcurrent = lanes;
        if (root$jscomp$0.errorRecoveryDisabledLanes & renderWasConcurrent)
          var JSCompiler_inline_result: RR.Lanes | RR.RootExitStatus = 0;
        else
          (JSCompiler_inline_result = root$jscomp$0.pendingLanes & -536870913),
            (JSCompiler_inline_result =
              0 !== JSCompiler_inline_result
                ? JSCompiler_inline_result
                : JSCompiler_inline_result & 536870912
                  ? 536870912
                  : 0);
        if (0 !== JSCompiler_inline_result) {
          lanes = JSCompiler_inline_result;
          a: {
            var root: RR.FiberRoot = root$jscomp$0;
            exitStatus = workInProgressRootConcurrentErrors;
            JSCompiler_inline_result = renderRootSync(
              root,
              JSCompiler_inline_result,
              !1
            );
            if (
              2 !== JSCompiler_inline_result &&
              6 !== JSCompiler_inline_result
            ) {
              if (workInProgressRootDidAttachPingListener) {
                root.errorRecoveryDisabledLanes |= renderWasConcurrent;
                workInProgressRootInterleavedUpdatedLanes |=
                  renderWasConcurrent;
                exitStatus = 4;
                break a;
              }
              renderWasConcurrent = workInProgressRootRecoverableErrors;
              workInProgressRootRecoverableErrors = exitStatus;
              null !== renderWasConcurrent &&
                (null === workInProgressRootRecoverableErrors
                  ? (workInProgressRootRecoverableErrors = renderWasConcurrent)
                  : workInProgressRootRecoverableErrors.push.apply(
                      workInProgressRootRecoverableErrors,
                      renderWasConcurrent
                    ));
            }
            exitStatus = JSCompiler_inline_result;
          }
          renderWasConcurrent = !1;
          if (2 !== exitStatus) continue;
        }
      }
      if (1 === exitStatus) {
        prepareFreshStack(root$jscomp$0, 0);
        markRootSuspended(root$jscomp$0, lanes, 0, !0);
        break;
      }
      a: {
        shouldTimeSlice = root$jscomp$0;
        renderWasConcurrent = exitStatus;
        switch (renderWasConcurrent) {
          case 0:
          case 1:
            throw Error("Root did not complete. This is a bug in React.");
          case 4:
            if ((lanes & 4194048) !== lanes && (lanes & 62914560) !== lanes)
              break;
          case 6:
            markRootSuspended(
              shouldTimeSlice,
              lanes,
              workInProgressDeferredLane,
              !workInProgressRootDidSkipSuspendedSiblings
            );
            break a;
          case 2:
            workInProgressRootRecoverableErrors = null;
            break;
          case 3:
          case 5:
            break;
          default:
            throw Error("Unknown root exit status.");
        }
        if (
          (lanes & 62914560) === lanes &&
          3 === renderWasConcurrent &&
          ((exitStatus = globalMostRecentFallbackTime + 300 - now()),
          10 < exitStatus)
        ) {
          markRootSuspended(
            shouldTimeSlice,
            lanes,
            workInProgressDeferredLane,
            !workInProgressRootDidSkipSuspendedSiblings
          );
          if (0 !== getNextLanes(shouldTimeSlice, 0, !0)) break a;
          pendingEffectsLanes = lanes;
          shouldTimeSlice.timeoutHandle = scheduleTimeout(
            completeRootWhenReady.bind(
              null,
              shouldTimeSlice,
              forceSync,
              workInProgressRootRecoverableErrors,
              workInProgressTransitions,
              workInProgressRootDidIncludeRecursiveRenderUpdate,
              lanes,
              workInProgressDeferredLane,
              workInProgressRootInterleavedUpdatedLanes,
              workInProgressSuspendedRetryLanes,
              workInProgressRootDidSkipSuspendedSiblings,
              renderWasConcurrent,
              "Throttled",
              -0,
              0
            ),
            exitStatus
          );
          break a;
        }
        completeRootWhenReady(
          shouldTimeSlice,
          forceSync,
          workInProgressRootRecoverableErrors,
          workInProgressTransitions,
          workInProgressRootDidIncludeRecursiveRenderUpdate,
          lanes,
          workInProgressDeferredLane,
          workInProgressRootInterleavedUpdatedLanes,
          workInProgressSuspendedRetryLanes,
          workInProgressRootDidSkipSuspendedSiblings,
          renderWasConcurrent
        );
      }
    }
    break;
  } while (1);
  ensureRootIsScheduled(root$jscomp$0);
}
function completeRootWhenReady(
  root: RR.FiberRoot,
  finishedWork: RR.Fiber,
  recoverableErrors: RR.CapturedValue[] | null,
  transitions: RR.Transition[] | null,
  didIncludeRenderPhaseUpdate: boolean,
  lanes: RR.Lanes,
  spawnedLane: RR.Lane,
  updatedLanes: RR.Lanes,
  suspendedRetryLanes
): void {
  root.timeoutHandle = -1;
  didIncludeRenderPhaseUpdate = finishedWork.subtreeFlags;
  var isViewTransitionEligible = (lanes & 335544064) === lanes,
    suspendedState = null;
  if (
    isViewTransitionEligible ||
    didIncludeRenderPhaseUpdate & 8192 ||
    16785408 === (didIncludeRenderPhaseUpdate & 16785408)
  )
    (appearingViewTransitions = suspendedState = null),
      accumulateSuspenseyCommitOnFiber(finishedWork),
      isViewTransitionEligible &&
        null != fabricSuspendOnActiveViewTransition &&
        fabricSuspendOnActiveViewTransition(),
      (lanes & 62914560) === lanes
        ? globalMostRecentFallbackTime - now()
        : (lanes & 4194048) === lanes
          ? globalMostRecentTransitionTime - now()
          : 0;
  didIncludeRenderPhaseUpdate = suspendedState;
  root.cancelPendingCommit = null;
  do flushPendingEffects();
  while (0 !== pendingEffectsStatus);
  if (0 !== (executionContext & 6))
    throw Error("Should not already be working.");
  if (null !== finishedWork) {
    if (finishedWork === root.current)
      throw Error(
        "Cannot commit the same tree as before. This error is likely caused by a bug in React. Please file an issue."
      );
    root === workInProgressRoot &&
      ((workInProgress = workInProgressRoot = null),
      (workInProgressRootRenderLanes = 0));
    pendingFinishedWork = finishedWork;
    pendingEffectsRoot = root;
    pendingEffectsLanes = lanes;
    pendingPassiveTransitions = transitions;
    pendingRecoverableErrors = recoverableErrors;
    commitRoot(
      root,
      finishedWork,
      lanes,
      spawnedLane,
      updatedLanes,
      suspendedRetryLanes,
      didIncludeRenderPhaseUpdate
    );
  }
}
function isRenderConsistentWithExternalStores(finishedWork: RR.Fiber): boolean {
  for (var node: RR.Fiber = finishedWork; ; ) {
    var tag: number | RR.FunctionComponentUpdateQueue | RR.StoreConsistencyCheck[] | RR.Fiber | null = node.tag;
    if (
      (0 === tag || 11 === tag || 15 === tag) &&
      node.flags & 16384 &&
      ((tag = node.updateQueue as RR.FunctionComponentUpdateQueue | null),
      null !== tag && ((tag = tag.stores), null !== tag))
    )
      for (var i = 0; i < (tag as RR.StoreConsistencyCheck[]).length; i++) {
        var check: RR.StoreConsistencyCheck | RR.StoreConsistencyCheck["value"] = (tag as RR.StoreConsistencyCheck[])[i],
          getSnapshot: RR.GetSnapshot = check.getSnapshot;
        check = check.value;
        try {
          if (!objectIs(getSnapshot(), check)) return !1;
        } catch (error) {
          return !1;
        }
      }
    tag = node.child;
    if (node.subtreeFlags & 16384 && null !== tag)
      (tag.return = node), (node = tag);
    else {
      if (node === finishedWork) break;
      for (; null === node.sibling; ) {
        if (null === node.return || node.return === finishedWork) return !0;
        node = node.return;
      }
      node.sibling.return = node.return;
      node = node.sibling;
    }
  }
  return !0;
}
function markRootSuspended(
  root: RR.FiberRoot,
  suspendedLanes: RR.Lanes,
  spawnedLane: RR.Lane,
  didAttemptEntireTree: boolean | RR.FiberRoot["expirationTimes"]
): void {
  suspendedLanes = getEntangledLanes(root, suspendedLanes);
  suspendedLanes &= ~workInProgressRootPingedLanes;
  suspendedLanes &= ~workInProgressRootInterleavedUpdatedLanes;
  root.suspendedLanes |= suspendedLanes;
  root.pingedLanes &= ~suspendedLanes;
  (didAttemptEntireTree as boolean) && (root.warmLanes |= suspendedLanes);
  didAttemptEntireTree = root.expirationTimes;
  for (var lanes: RR.Lanes = suspendedLanes; 0 < lanes; ) {
    var index$8 = 31 - clz32(lanes),
      lane: RR.Lane = 1 << index$8;
    didAttemptEntireTree[index$8] = -1;
    lanes &= ~lane;
  }
  0 !== spawnedLane &&
    markSpawnedDeferredLane(root, spawnedLane, suspendedLanes);
}
function resetWorkInProgressStack(): void {
  if (null !== workInProgress) {
    if (0 === workInProgressSuspendedReason)
      var interruptedWork: RR.Fiber | null = workInProgress.return;
    else
      (interruptedWork = workInProgress),
        (lastContextDependency = currentlyRenderingFiber$1 = null),
        resetHooksOnUnwind(interruptedWork),
        (thenableState$1 = null),
        (thenableIndexCounter$1 = 0),
        (interruptedWork = workInProgress);
    for (; null !== interruptedWork; )
      unwindInterruptedWork(interruptedWork.alternate, interruptedWork),
        (interruptedWork = interruptedWork.return);
    workInProgress = null;
  }
}
function prepareFreshStack(root: RR.FiberRoot | RR.FiberRoot["entanglements"], lanes: RR.Lanes): RR.Fiber {
  var timeoutHandle: RR.TimeoutHandle | RR.NoTimeout | RR.FiberRoot["cancelPendingCommit"] | RR.Fiber = (root as RR.FiberRoot).timeoutHandle;
  -1 !== timeoutHandle &&
    (((root as RR.FiberRoot).timeoutHandle = -1), cancelTimeout((timeoutHandle as RR.TimeoutHandle | RR.NoTimeout)));
  timeoutHandle = (root as RR.FiberRoot).cancelPendingCommit;
  null !== timeoutHandle &&
    (((root as RR.FiberRoot).cancelPendingCommit = null), (timeoutHandle as RR.FiberRoot["cancelPendingCommit"])!());
  pendingEffectsLanes = 0;
  resetWorkInProgressStack();
  workInProgressRoot = (root as RR.FiberRoot);
  workInProgress = timeoutHandle = createWorkInProgress((root as RR.FiberRoot).current!, null);
  workInProgressRootRenderLanes = lanes;
  workInProgressSuspendedReason = 0;
  workInProgressThrownValue = null;
  workInProgressRootDidSkipSuspendedSiblings = !1;
  workInProgressRootIsPrerendering = checkIfRootIsPrerendering((root as RR.FiberRoot), lanes);
  workInProgressRootDidAttachPingListener = !1;
  workInProgressSuspendedRetryLanes =
    workInProgressDeferredLane =
    workInProgressRootPingedLanes =
    workInProgressRootInterleavedUpdatedLanes =
    workInProgressRootSkippedLanes =
    workInProgressRootExitStatus =
      0;
  workInProgressRootRecoverableErrors = workInProgressRootConcurrentErrors =
    null;
  workInProgressRootDidIncludeRecursiveRenderUpdate = !1;
  entangledRenderLanes = getEntangledLanes(root, lanes);
  finishQueueingConcurrentUpdates();
  return timeoutHandle;
}
function handleThrow(root: RR.FiberRoot, thrownValue: RR.Thrown): void {
  currentlyRenderingFiber = null;
  ReactSharedInternals.H = ContextOnlyDispatcher;
  thrownValue === SuspenseException || thrownValue === SuspenseActionException
    ? ((thrownValue = getSuspendedThenable()),
      (workInProgressSuspendedReason = 3))
    : thrownValue === SuspenseyCommitException
      ? ((thrownValue = getSuspendedThenable()),
        (workInProgressSuspendedReason = 4))
      : (workInProgressSuspendedReason =
          thrownValue === SelectiveHydrationException
            ? 8
            : null !== thrownValue &&
                "object" === typeof thrownValue &&
                "function" === typeof thrownValue.then
              ? 6
              : 1);
  workInProgressThrownValue = thrownValue;
  null === workInProgress &&
    ((workInProgressRootExitStatus = 1),
    logUncaughtError(
      root,
      createCapturedValueAtFiber(thrownValue, root.current!)
    ));
}
function pushDispatcher(): RR.Dispatcher {
  var prevDispatcher: RR.Dispatcher | null = ReactSharedInternals.H;
  ReactSharedInternals.H = ContextOnlyDispatcher;
  return null === prevDispatcher ? ContextOnlyDispatcher : prevDispatcher;
}
function pushAsyncDispatcher(): RR.AsyncDispatcher | null {
  var prevAsyncDispatcher: RR.AsyncDispatcher | null = ReactSharedInternals.A;
  ReactSharedInternals.A = DefaultAsyncDispatcher;
  return prevAsyncDispatcher;
}
function renderDidSuspendDelayIfPossible(): void {
  workInProgressRootExitStatus = 4;
  workInProgressRootDidSkipSuspendedSiblings ||
    ((workInProgressRootRenderLanes & 4194048) !==
      workInProgressRootRenderLanes &&
      null !== suspenseHandlerStackCursor.current) ||
    (workInProgressRootIsPrerendering = !0);
  (0 === (workInProgressRootSkippedLanes & 134217727) &&
    0 === (workInProgressRootInterleavedUpdatedLanes & 134217727)) ||
    null === workInProgressRoot ||
    markRootSuspended(
      workInProgressRoot,
      workInProgressRootRenderLanes,
      workInProgressDeferredLane,
      !1
    );
}
function renderRootSync(root: RR.FiberRoot, lanes: RR.Lanes | boolean, shouldYieldForPrerendering: boolean): RR.RootExitStatus {
  var prevExecutionContext: RR.ExecutionContext = executionContext;
  executionContext |= 2;
  var prevDispatcher: RR.Dispatcher = pushDispatcher(),
    prevAsyncDispatcher: RR.AsyncDispatcher | null = pushAsyncDispatcher();
  if (workInProgressRoot !== root || workInProgressRootRenderLanes !== (lanes as RR.Lanes))
    (workInProgressTransitions = null), prepareFreshStack(root, (lanes as RR.Lanes));
  lanes = !1;
  var exitStatus: RR.RootExitStatus = workInProgressRootExitStatus;
  a: do
    try {
      if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
        var unitOfWork: RR.Fiber = workInProgress,
          thrownValue: RR.Thrown = workInProgressThrownValue;
        switch (workInProgressSuspendedReason) {
          case 8:
            resetWorkInProgressStack();
            exitStatus = 6;
            break a;
          case 3:
          case 2:
          case 9:
          case 6:
            null === suspenseHandlerStackCursor.current && (lanes = !0);
            var reason: RR.SuspendedReason = workInProgressSuspendedReason;
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
            if (
              shouldYieldForPrerendering &&
              workInProgressRootIsPrerendering
            ) {
              exitStatus = 0;
              break a;
            }
            break;
          default:
            (reason = workInProgressSuspendedReason),
              (workInProgressSuspendedReason = 0),
              (workInProgressThrownValue = null),
              throwAndUnwindWorkLoop(root, unitOfWork, thrownValue, reason);
        }
      }
      workLoopSync();
      exitStatus = workInProgressRootExitStatus;
      break;
    } catch (thrownValue$135) {
      handleThrow(root, thrownValue$135);
    }
  while (1);
  lanes && root.shellSuspendCounter++;
  lastContextDependency = currentlyRenderingFiber$1 = null;
  executionContext = prevExecutionContext;
  ReactSharedInternals.H = prevDispatcher;
  ReactSharedInternals.A = prevAsyncDispatcher;
  null === workInProgress &&
    ((workInProgressRoot = null),
    (workInProgressRootRenderLanes = 0),
    finishQueueingConcurrentUpdates());
  return exitStatus;
}
function workLoopSync(): void {
  for (; null !== workInProgress; ) performUnitOfWork(workInProgress);
}
function renderRootConcurrent(root: RR.FiberRoot, lanes: RR.Lanes | RR.Fiber | (() => void)): RR.RootExitStatus {
  var prevExecutionContext: RR.ExecutionContext = executionContext;
  executionContext |= 2;
  var prevDispatcher: RR.Dispatcher = pushDispatcher(),
    prevAsyncDispatcher: RR.AsyncDispatcher | null = pushAsyncDispatcher();
  workInProgressRoot !== root || workInProgressRootRenderLanes !== (lanes as RR.Lanes)
    ? ((workInProgressTransitions = null),
      (workInProgressRootRenderTargetTime = now() + 500),
      prepareFreshStack(root, (lanes as RR.Lanes)))
    : (workInProgressRootIsPrerendering = checkIfRootIsPrerendering(
        root,
        (lanes as RR.Lanes)
      ));
  a: do
    try {
      if (0 !== workInProgressSuspendedReason && null !== workInProgress) {
        lanes = workInProgress;
        var thrownValue: RR.Thrown = workInProgressThrownValue;
        b: switch (workInProgressSuspendedReason) {
          case 1:
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 1);
            break;
          case 2:
          case 9:
            if (isThenableResolved(thrownValue)) {
              workInProgressSuspendedReason = 0;
              workInProgressThrownValue = null;
              replaySuspendedUnitOfWork(lanes);
              break;
            }
            lanes = function () {
              (2 !== workInProgressSuspendedReason &&
                9 !== workInProgressSuspendedReason) ||
                workInProgressRoot !== root ||
                (workInProgressSuspendedReason = 7);
              ensureRootIsScheduled(root);
            };
            thrownValue.then(lanes, lanes);
            break a;
          case 3:
            workInProgressSuspendedReason = 7;
            break a;
          case 4:
            workInProgressSuspendedReason = 5;
            break a;
          case 7:
            isThenableResolved(thrownValue)
              ? ((workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                replaySuspendedUnitOfWork(lanes))
              : ((workInProgressSuspendedReason = 0),
                (workInProgressThrownValue = null),
                throwAndUnwindWorkLoop(root, lanes, thrownValue, 7));
            break;
          case 5:
            var resource: RR.ResourceArg = null;
            switch (workInProgress.tag) {
              case 26:
                resource = workInProgress.memoizedState;
              case 5:
              case 27:
                var hostFiber: RR.Fiber = workInProgress;
                if (resource ? shim(resource) : 1) {
                  workInProgressSuspendedReason = 0;
                  workInProgressThrownValue = null;
                  var sibling: RR.Fiber | null = hostFiber.sibling;
                  if (null !== sibling) workInProgress = sibling;
                  else {
                    var returnFiber: RR.Fiber | null = hostFiber.return;
                    null !== returnFiber
                      ? ((workInProgress = returnFiber),
                        completeUnitOfWork(returnFiber))
                      : (workInProgress = null);
                  }
                  break b;
                }
            }
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 5);
            break;
          case 6:
            workInProgressSuspendedReason = 0;
            workInProgressThrownValue = null;
            throwAndUnwindWorkLoop(root, lanes, thrownValue, 6);
            break;
          case 8:
            resetWorkInProgressStack();
            workInProgressRootExitStatus = 6;
            break a;
          default:
            throw Error("Unexpected SuspendedReason. This is a bug in React.");
        }
      }
      workLoopConcurrentByScheduler();
      break;
    } catch (thrownValue$137) {
      handleThrow(root, thrownValue$137);
    }
  while (1);
  lastContextDependency = currentlyRenderingFiber$1 = null;
  ReactSharedInternals.H = prevDispatcher;
  ReactSharedInternals.A = prevAsyncDispatcher;
  executionContext = prevExecutionContext;
  if (null !== workInProgress) return 0;
  workInProgressRoot = null;
  workInProgressRootRenderLanes = 0;
  finishQueueingConcurrentUpdates();
  return workInProgressRootExitStatus;
}
function workLoopConcurrentByScheduler(): void {
  for (; null !== workInProgress && !shouldYield(); )
    performUnitOfWork(workInProgress);
}
function performUnitOfWork(unitOfWork: RR.Fiber): void {
  var next: RR.Fiber | null = beginWork(
    unitOfWork.alternate,
    unitOfWork,
    entangledRenderLanes
  );
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  null === next ? completeUnitOfWork(unitOfWork) : (workInProgress = next);
}
function replaySuspendedUnitOfWork(unitOfWork: RR.Fiber): void {
  var next: RR.Fiber | null = unitOfWork;
  var current: RR.Fiber | null = next.alternate;
  switch (next.tag) {
    case 15:
    case 0:
      next = replayFunctionComponent(
        current,
        next,
        next.pendingProps,
        next.type as RR.FunctionComponent,
        void 0,
        workInProgressRootRenderLanes
      );
      break;
    case 11:
      next = replayFunctionComponent(
        current,
        next,
        next.pendingProps,
        (next.type as RR.ForwardRefType).render,
        next.ref,
        workInProgressRootRenderLanes
      );
      break;
    case 5:
      resetHooksOnUnwind(next);
    default:
      unwindInterruptedWork(current, next),
        (next = workInProgress =
          resetWorkInProgress(next, entangledRenderLanes)),
        (next = beginWork(current, next, entangledRenderLanes));
  }
  unitOfWork.memoizedProps = unitOfWork.pendingProps;
  null === next ? completeUnitOfWork(unitOfWork) : (workInProgress = next);
}
function throwAndUnwindWorkLoop(
  root: RR.FiberRoot | boolean,
  unitOfWork: RR.Fiber,
  thrownValue: RR.Thrown,
  suspendedReason: RR.SuspendedReason | RR.Fiber | null
): void {
  lastContextDependency = currentlyRenderingFiber$1 = null;
  resetHooksOnUnwind(unitOfWork);
  thenableState$1 = null;
  thenableIndexCounter$1 = 0;
  var returnFiber: RR.Fiber | null = unitOfWork.return;
  try {
    if (
      throwException(
        (root as RR.FiberRoot),
        returnFiber,
        unitOfWork,
        thrownValue,
        workInProgressRootRenderLanes
      )
    ) {
      workInProgressRootExitStatus = 1;
      logUncaughtError(
        (root as RR.FiberRoot),
        createCapturedValueAtFiber(thrownValue, (root as RR.FiberRoot).current!)
      );
      workInProgress = null;
      return;
    }
  } catch (error) {
    if (null !== returnFiber) throw ((workInProgress = returnFiber), error);
    workInProgressRootExitStatus = 1;
    logUncaughtError(
      (root as RR.FiberRoot),
      createCapturedValueAtFiber(thrownValue, (root as RR.FiberRoot).current!)
    );
    workInProgress = null;
    return;
  }
  if (unitOfWork.flags & 32768) {
    if (1 === (suspendedReason as RR.SuspendedReason)) root = !0;
    else if (
      workInProgressRootIsPrerendering ||
      0 !== (workInProgressRootRenderLanes & 536870912)
    )
      root = !1;
    else if (
      ((workInProgressRootDidSkipSuspendedSiblings = root = !0),
      2 === (suspendedReason as RR.SuspendedReason) ||
        9 === (suspendedReason as RR.SuspendedReason) ||
        3 === (suspendedReason as RR.SuspendedReason) ||
        6 === (suspendedReason as RR.SuspendedReason))
    )
      (suspendedReason = suspenseHandlerStackCursor.current),
        null !== suspendedReason &&
          13 === suspendedReason.tag &&
          (suspendedReason.flags |= 16384);
    unwindUnitOfWork(unitOfWork, root);
  } else completeUnitOfWork(unitOfWork);
}
function completeUnitOfWork(unitOfWork: RR.Fiber | null): void {
  var completedWork: RR.Fiber | null = unitOfWork!;
  do {
    if (0 !== (completedWork.flags & 32768)) {
      unwindUnitOfWork(
        completedWork,
        workInProgressRootDidSkipSuspendedSiblings
      );
      return;
    }
    unitOfWork = completedWork.return;
    var next: RR.Fiber | null = completeWork(
      completedWork.alternate,
      completedWork,
      entangledRenderLanes
    );
    if (null !== next) {
      workInProgress = next;
      return;
    }
    completedWork = completedWork.sibling;
    if (null !== completedWork) {
      workInProgress = completedWork;
      return;
    }
    workInProgress = completedWork = unitOfWork;
  } while (null !== completedWork);
  0 === workInProgressRootExitStatus && (workInProgressRootExitStatus = 5);
}
function unwindUnitOfWork(unitOfWork: RR.Fiber | null, skipSiblings: boolean): void {
  do {
    var next: RR.Fiber | null = unwindWork(unitOfWork!.alternate, (unitOfWork as RR.Fiber));
    if (null !== next) {
      next.flags &= 32767;
      workInProgress = next;
      return;
    }
    next = unitOfWork!.return;
    null !== next &&
      ((next.flags |= 32768),
      (next.subtreeFlags = 0),
      (next.deletions = null));
    if (
      !skipSiblings &&
      ((unitOfWork = unitOfWork!.sibling), null !== unitOfWork)
    ) {
      workInProgress = unitOfWork;
      return;
    }
    workInProgress = unitOfWork = next;
  } while (null !== unitOfWork);
  workInProgressRootExitStatus = 6;
  workInProgress = null;
}
function commitRoot(
  root: RR.FiberRoot,
  finishedWork: RR.Fiber,
  lanes: RR.Lanes,
  spawnedLane: RR.Lane | boolean | RR.Transition | null,
  updatedLanes: RR.Lanes | RR.EventPriority,
  suspendedRetryLanes: RR.Lanes | RR.ExecutionContext,
  suspendedState: RR.SuspendedState | null | undefined
): void {
  var remainingLanes = finishedWork.lanes | finishedWork.childLanes;
  pendingEffectsRemainingLanes = remainingLanes;
  remainingLanes |= concurrentlyUpdatedLanes;
  markRootFinished(
    root,
    lanes,
    remainingLanes,
    spawnedLane,
    updatedLanes,
    suspendedRetryLanes
  );
  pendingViewTransitionEvents = null;
  (lanes & 335544064) === lanes
    ? ((pendingTransitionTypes = claimQueuedTransitionTypes(root)),
      (spawnedLane = 10262))
    : ((pendingTransitionTypes = null), (spawnedLane = 10256));
  0 !== (finishedWork.subtreeFlags & spawnedLane) ||
  0 !== (finishedWork.flags & spawnedLane)
    ? ((root.callbackNode = null),
      (root.callbackPriority = 0),
      scheduleCallback(NormalPriority$1, function () {
        flushPassiveEffects();
        return null;
      }))
    : ((root.callbackNode = null), (root.callbackPriority = 0));
  shouldStartViewTransition = !1;
  spawnedLane = 0 !== (finishedWork.flags & 13878);
  if (0 !== (finishedWork.subtreeFlags & 13878) || spawnedLane) {
    spawnedLane = ReactSharedInternals.T;
    ReactSharedInternals.T = null;
    updatedLanes = currentUpdatePriority;
    currentUpdatePriority = 2;
    suspendedRetryLanes = executionContext;
    executionContext |= 4;
    try {
      commitBeforeMutationEffects(root, finishedWork, lanes);
    } finally {
      (executionContext = suspendedRetryLanes),
        (currentUpdatePriority = updatedLanes),
        (ReactSharedInternals.T = spawnedLane);
    }
  }
  pendingEffectsStatus = 1;
  shouldStartViewTransition
    ? (pendingViewTransition = startViewTransition(
        suspendedState,
        root.containerInfo,
        pendingTransitionTypes,
        flushMutationEffects,
        flushLayoutEffects,
        flushAfterMutationEffects,
        flushSpawnedWork,
        flushPassiveEffects
      ))
    : (flushMutationEffects(), flushLayoutEffects(), flushSpawnedWork());
}
function flushAfterMutationEffects() {
  3 === pendingEffectsStatus &&
    ((pendingEffectsStatus = 0),
    commitAfterMutationEffectsOnFiber(
      pendingFinishedWork,
      pendingEffectsRoot
    ),
    (pendingEffectsStatus = 4));
}
function flushMutationEffects() {
  if (1 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    var root: RR.FiberRoot = pendingEffectsRoot!,
      finishedWork: RR.Fiber = pendingFinishedWork!,
      lanes = pendingEffectsLanes,
      rootMutationHasEffect: boolean | RR.Transition | null = 0 !== (finishedWork.flags & 13878);
    if (0 !== (finishedWork.subtreeFlags & 13878) || rootMutationHasEffect) {
      rootMutationHasEffect = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      var previousPriority: RR.EventPriority = currentUpdatePriority;
      currentUpdatePriority = 2;
      var prevExecutionContext: RR.ExecutionContext = executionContext;
      executionContext |= 4;
      try {
        commitMutationEffectsOnFiber(finishedWork, root, lanes);
      } finally {
        (executionContext = prevExecutionContext),
          (currentUpdatePriority = previousPriority),
          (ReactSharedInternals.T = rootMutationHasEffect);
      }
    }
    root.current = finishedWork;
    pendingEffectsStatus = 2;
  }
}
function flushLayoutEffects() {
  if (2 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    var root: RR.FiberRoot = pendingEffectsRoot!,
      finishedWork: RR.Fiber = pendingFinishedWork!,
      rootHasLayoutEffect: boolean | RR.Transition | null = 0 !== (finishedWork.flags & 8772);
    if (0 !== (finishedWork.subtreeFlags & 8772) || rootHasLayoutEffect) {
      rootHasLayoutEffect = ReactSharedInternals.T;
      ReactSharedInternals.T = null;
      var previousPriority: RR.EventPriority = currentUpdatePriority;
      currentUpdatePriority = 2;
      var prevExecutionContext: RR.ExecutionContext = executionContext;
      executionContext |= 4;
      try {
        commitLayoutEffectOnFiber(root, finishedWork.alternate, finishedWork);
      } finally {
        (executionContext = prevExecutionContext),
          (currentUpdatePriority = previousPriority),
          (ReactSharedInternals.T = rootHasLayoutEffect);
      }
    }
    pendingEffectsStatus = 3;
  }
}
function flushSpawnedWork() {
  if (4 === pendingEffectsStatus || 3 === pendingEffectsStatus) {
    pendingEffectsStatus = 0;
    var committedViewTransition = pendingViewTransition;
    pendingViewTransition = null;
    requestPaint();
    var root: RR.FiberRoot = pendingEffectsRoot!,
      finishedWork: RR.Fiber | RR.FiberRoot | RR.Transition | null = pendingFinishedWork!,
      lanes: RR.Lanes = pendingEffectsLanes,
      recoverableErrors: any = pendingRecoverableErrors,
      passiveSubtreeMask = (lanes & 335544064) === lanes ? 10262 : 10256;
    0 !== (finishedWork.subtreeFlags & passiveSubtreeMask) ||
    0 !== (finishedWork.flags & passiveSubtreeMask)
      ? (pendingEffectsStatus = 5)
      : ((pendingEffectsStatus = 0),
        (pendingFinishedWork = pendingEffectsRoot = null),
        releaseRootPooledCache(root, root.pendingLanes));
    passiveSubtreeMask = root.pendingLanes;
    0 === passiveSubtreeMask && (legacyErrorBoundariesThatAlreadyFailed = null);
    lanesToEventPriority(lanes);
    finishedWork = finishedWork.stateNode as RR.FiberRoot;
    if (injectedHook && "function" === typeof injectedHook.onCommitFiberRoot)
      try {
        injectedHook.onCommitFiberRoot(
          rendererID,
          finishedWork,
          void 0,
          128 === (finishedWork.current!.flags & 128)
        );
      } catch (err) {}
    if (null !== recoverableErrors) {
      finishedWork = ReactSharedInternals.T;
      passiveSubtreeMask = currentUpdatePriority;
      currentUpdatePriority = 2;
      ReactSharedInternals.T = null;
      try {
        for (
          var onRecoverableError: any = root.onRecoverableError, i = 0;
          i < recoverableErrors.length;
          i++
        ) {
          var recoverableError: RR.CapturedValue = recoverableErrors[i]!;
          onRecoverableError(recoverableError.value, {
            componentStack: recoverableError.stack
          });
        }
      } finally {
        (ReactSharedInternals.T = finishedWork),
          (currentUpdatePriority = passiveSubtreeMask);
      }
    }
    recoverableErrors = pendingViewTransitionEvents;
    onRecoverableError = pendingTransitionTypes;
    pendingTransitionTypes = null;
    if (
      null !== recoverableErrors &&
      ((pendingViewTransitionEvents = null),
      null === onRecoverableError && (onRecoverableError = []),
      null !== committedViewTransition)
    )
      for (
        recoverableError = 0;
        recoverableError < recoverableErrors.length;
        recoverableError++
      )
        (finishedWork = (0, recoverableErrors[recoverableError])(
          onRecoverableError
        )),
          void 0 !== finishedWork &&
            committedViewTransition.finished.finally(finishedWork);
    0 !== (pendingEffectsLanes & 3) && 0 !== root.tag && flushPendingEffects();
    ensureRootIsScheduled(root);
    passiveSubtreeMask = root.pendingLanes;
    0 !== (lanes & 261930) && 0 !== (passiveSubtreeMask & 42)
      ? root === rootWithNestedUpdates
        ? nestedUpdateCount++
        : ((nestedUpdateCount = 0), (rootWithNestedUpdates = root))
      : ((nestedUpdateCount = 0), (rootWithNestedUpdates = null));
    flushSyncWorkAcrossRoots_impl(0, !1);
  }
}
function releaseRootPooledCache(root: RR.FiberRoot, remainingLanes: number | RR.Cache | null): void {
  0 === (root.pooledCacheLanes &= (remainingLanes as RR.Lanes)) &&
    ((remainingLanes = root.pooledCache),
    null != remainingLanes &&
      ((root.pooledCache = null), releaseCache(remainingLanes)));
}
function flushPendingEffects(): boolean {
  null !== pendingViewTransition && (pendingViewTransition = null);
  flushMutationEffects();
  flushLayoutEffects();
  flushSpawnedWork();
  return flushPassiveEffects();
}
function flushPassiveEffects(): boolean {
  if (5 !== pendingEffectsStatus) return !1;
  var root: RR.FiberRoot = pendingEffectsRoot!,
    remainingLanes: RR.Lanes = pendingEffectsRemainingLanes;
  pendingEffectsRemainingLanes = 0;
  var renderPriority: RR.EventPriority | RR.Transition | null = lanesToEventPriority(pendingEffectsLanes),
    prevTransition = ReactSharedInternals.T,
    previousPriority = currentUpdatePriority;
  try {
    currentUpdatePriority = 32 > renderPriority ? 32 : renderPriority;
    ReactSharedInternals.T = null;
    renderPriority = pendingPassiveTransitions;
    pendingPassiveTransitions = null;
    var root$jscomp$0: RR.FiberRoot = pendingEffectsRoot!,
      lanes: RR.Lanes = pendingEffectsLanes;
    pendingEffectsStatus = 0;
    pendingFinishedWork = pendingEffectsRoot = null;
    pendingEffectsLanes = 0;
    if (0 !== (executionContext & 6))
      throw Error("Cannot flush passive effects while already rendering.");
    var prevExecutionContext: RR.ExecutionContext = executionContext;
    executionContext |= 4;
    commitPassiveUnmountOnFiber(root$jscomp$0.current!);
    commitPassiveMountOnFiber(
      root$jscomp$0,
      root$jscomp$0.current!,
      lanes,
      renderPriority
    );
    executionContext = prevExecutionContext;
    flushSyncWorkAcrossRoots_impl(0, !1);
    if (
      injectedHook &&
      "function" === typeof injectedHook.onPostCommitFiberRoot
    )
      try {
        injectedHook.onPostCommitFiberRoot(rendererID, root$jscomp$0);
      } catch (err) {}
    return !0;
  } finally {
    (currentUpdatePriority = previousPriority),
      (ReactSharedInternals.T = prevTransition),
      releaseRootPooledCache(root, remainingLanes);
  }
}
function captureCommitPhaseErrorOnRoot(rootFiber: RR.Fiber | RR.FiberRoot | null, sourceFiber: RR.Fiber | RR.CapturedValue | RR.Update, error: RR.Thrown): void {
  sourceFiber = createCapturedValueAtFiber(error, (sourceFiber as RR.Fiber));
  sourceFiber = createRootErrorUpdate((rootFiber as RR.Fiber).stateNode as RR.FiberRoot, sourceFiber, 2);
  rootFiber = enqueueUpdate((rootFiber as RR.Fiber), sourceFiber, 2);
  null !== rootFiber &&
    (markRootUpdated$1(rootFiber, 2), ensureRootIsScheduled(rootFiber));
}
function captureCommitPhaseError(sourceFiber: RR.Fiber | RR.CapturedValue, nearestMountedAncestor: RR.Fiber | null, error: RR.Thrown | RR.Update): void {
  if (3 === (sourceFiber as RR.Fiber).tag)
    captureCommitPhaseErrorOnRoot((sourceFiber as RR.Fiber), (sourceFiber as RR.Fiber), error);
  else
    for (; null !== nearestMountedAncestor; ) {
      if (3 === nearestMountedAncestor.tag) {
        captureCommitPhaseErrorOnRoot(
          nearestMountedAncestor,
          (sourceFiber as RR.Fiber),
          error
        );
        break;
      } else if (1 === nearestMountedAncestor.tag) {
        var instance: RR.ClassInstance | RR.FiberRoot | null = nearestMountedAncestor.stateNode as RR.ClassInstance;
        if (
          "function" ===
            typeof (nearestMountedAncestor.type as RR.ClassComponent).getDerivedStateFromError ||
          ("function" === typeof instance.componentDidCatch &&
            (null === legacyErrorBoundariesThatAlreadyFailed ||
              !legacyErrorBoundariesThatAlreadyFailed.has(instance)))
        ) {
          sourceFiber = createCapturedValueAtFiber(error, (sourceFiber as RR.Fiber));
          error = createClassErrorUpdate(2);
          instance = enqueueUpdate(nearestMountedAncestor, (error as RR.Update), 2);
          null !== instance &&
            (initializeClassErrorUpdate(
              (error as RR.Update),
              instance,
              nearestMountedAncestor,
              sourceFiber
            ),
            markRootUpdated$1(instance, 2),
            ensureRootIsScheduled(instance));
          break;
        }
      }
      nearestMountedAncestor = nearestMountedAncestor.return;
    }
}
function attachPingListener(root: RR.FiberRoot | (() => void), wakeable: RR.Wakeable, lanes: RR.Lanes): void {
  var pingCache: RR.PingCache | null = (root as RR.FiberRoot).pingCache;
  if (null === pingCache) {
    pingCache = (root as RR.FiberRoot).pingCache = new PossiblyWeakMap();
    var threadIDs: Set<RR.Lanes> | undefined = new Set();
    pingCache!.set(wakeable, threadIDs);
  } else
    (threadIDs = pingCache.get(wakeable)),
      void 0 === threadIDs &&
        ((threadIDs = new Set()), pingCache.set(wakeable, threadIDs));
  threadIDs.has(lanes) ||
    ((workInProgressRootDidAttachPingListener = !0),
    threadIDs.add(lanes),
    (root = pingSuspendedRoot.bind(null, (root as RR.FiberRoot), wakeable, lanes)),
    wakeable.then(root, root));
}
function pingSuspendedRoot(root: RR.FiberRoot, wakeable: RR.Wakeable, pingedLanes: RR.Lanes): void {
  var pingCache: RR.PingCache | null = root.pingCache;
  null !== pingCache && pingCache.delete(wakeable);
  root.pingedLanes |= root.suspendedLanes & pingedLanes;
  root.warmLanes &= ~pingedLanes;
  workInProgressRoot === root &&
    (workInProgressRootRenderLanes & pingedLanes) === pingedLanes &&
    (4 === workInProgressRootExitStatus ||
    (3 === workInProgressRootExitStatus &&
      (workInProgressRootRenderLanes & 62914560) ===
        workInProgressRootRenderLanes &&
      300 > now() - globalMostRecentFallbackTime)
      ? 0 === (executionContext & 2)
        ? prepareFreshStack(root, 0)
        : (workInProgressRootPingedLanes |= pingedLanes)
      : (workInProgressRootPingedLanes |= pingedLanes),
    workInProgressSuspendedRetryLanes === workInProgressRootRenderLanes &&
      (workInProgressSuspendedRetryLanes = 0));
  ensureRootIsScheduled(root);
}
function retryTimedOutBoundary(boundaryFiber: RR.Fiber | RR.FiberRoot | null, retryLane: RR.Lane): void {
  0 === retryLane &&
    (retryLane = 0 === (boundaryFiber.mode & 1) ? 2 : claimNextRetryLane());
  boundaryFiber = enqueueConcurrentRenderForLane((boundaryFiber as RR.Fiber), retryLane);
  null !== boundaryFiber &&
    (markRootUpdated$1(boundaryFiber, retryLane),
    ensureRootIsScheduled(boundaryFiber));
}
function retryDehydratedSuspenseBoundary(boundaryFiber: RR.Fiber): void {
  var suspenseState: RR.SuspenseState | null = boundaryFiber.memoizedState as RR.SuspenseState | null,
    retryLane: RR.Lane = 0;
  null !== suspenseState && (retryLane = suspenseState.retryLane);
  retryTimedOutBoundary(boundaryFiber, retryLane);
}
function resolveRetryWakeable(boundaryFiber: RR.Fiber, wakeable: RR.Wakeable): void {
  var retryLane: RR.Lane = 0;
  switch (boundaryFiber.tag) {
    case 31:
    case 13:
      var retryCache: RR.RetryCache | null = boundaryFiber.stateNode as RR.RetryCache | null;
      var suspenseState: RR.SuspenseState | null = boundaryFiber.memoizedState as RR.SuspenseState | null;
      null !== suspenseState && (retryLane = suspenseState.retryLane);
      break;
    case 19:
      retryCache = boundaryFiber.stateNode as RR.RetryCache | null;
      break;
    case 22:
      retryCache = (boundaryFiber.stateNode as RR.OffscreenInstance)._retryCache;
      break;
    default:
      throw Error(
        "Pinged unknown suspense boundary type. This is probably a bug in React."
      );
  }
  null !== retryCache && retryCache.delete(wakeable);
  retryTimedOutBoundary(boundaryFiber, retryLane);
}
function scheduleCallback(priorityLevel: RR.SchedulerPriority, callback: RR.SchedulerCallback): RR.SchedulerTask {
  return scheduleCallback$3(priorityLevel, callback);
}
function FiberNode(this: RR.Fiber, tag: RR.WorkTag, pendingProps: RR.Fiber["pendingProps"], key: string | null, mode: RR.TypeOfMode) {
  this.tag = tag;
  this.key = key;
  this.sibling =
    this.child =
    this.return =
    this.stateNode =
    this.type =
    this.elementType =
      null;
  this.index = 0;
  this.refCleanup = this.ref = null;
  this.pendingProps = pendingProps;
  this.dependencies =
    this.memoizedState =
    this.updateQueue =
    this.memoizedProps =
      null;
  this.mode = mode;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
}
function createFiberImplClass(tag, pendingProps, key, mode) {
  return new FiberNode(tag, pendingProps, key, mode);
}
function shouldConstruct(Component: RR.PrototypeHolder | RR.ClassPrototype | undefined): boolean {
  Component = (Component as RR.PrototypeHolder).prototype;
  return !(!Component || !(Component as RR.ClassPrototype | undefined)!.isReactComponent);
}
function createWorkInProgress(current: RR.Fiber, pendingProps: RR.Fiber["pendingProps"] | RR.Dependencies | null): RR.Fiber {
  var workInProgress: RR.Fiber | null = current.alternate;
  null === workInProgress
    ? ((workInProgress = createFiberImplClass(
        current.tag,
        pendingProps,
        current.key,
        current.mode
      )),
      (workInProgress.elementType = current.elementType),
      (workInProgress.type = current.type),
      (workInProgress.stateNode = current.stateNode),
      (workInProgress.alternate = current),
      (current.alternate = workInProgress))
    : ((workInProgress.pendingProps = pendingProps),
      (workInProgress.type = current.type),
      (workInProgress.flags = 0),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.deletions = null));
  workInProgress.flags = current.flags & 1206910976;
  workInProgress.childLanes = current.childLanes;
  workInProgress.lanes = current.lanes;
  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;
  pendingProps = current.dependencies;
  workInProgress.dependencies =
    null === pendingProps
      ? null
      : { lanes: pendingProps.lanes as RR.Lanes, firstContext: pendingProps.firstContext };
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;
  workInProgress.refCleanup = current.refCleanup;
  return workInProgress;
}
function resetWorkInProgress(workInProgress: RR.Fiber, renderLanes: RR.Lanes | RR.Dependencies | null): RR.Fiber {
  workInProgress.flags &= 1206910978;
  var current: RR.Fiber | null = workInProgress.alternate;
  null === current
    ? ((workInProgress.childLanes = 0),
      (workInProgress.lanes = (renderLanes as RR.Lanes)),
      (workInProgress.child = null),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.memoizedProps = null),
      (workInProgress.memoizedState = null),
      (workInProgress.updateQueue = null),
      (workInProgress.dependencies = null),
      (workInProgress.stateNode = null))
    : ((workInProgress.childLanes = current.childLanes),
      (workInProgress.lanes = current.lanes),
      (workInProgress.child = current.child),
      (workInProgress.subtreeFlags = 0),
      (workInProgress.deletions = null),
      (workInProgress.memoizedProps = current.memoizedProps),
      (workInProgress.memoizedState = current.memoizedState),
      (workInProgress.updateQueue = current.updateQueue),
      (workInProgress.type = current.type),
      (renderLanes = ((current.dependencies as RR.Dependencies | null | RR.Lanes) as RR.Dependencies | null)),
      (workInProgress.dependencies =
        null === renderLanes
          ? null
          : {
              lanes: renderLanes.lanes,
              firstContext: renderLanes.firstContext
            }));
  return workInProgress;
}
function createFiberFromTypeAndProps(
  type: RR.ElementTypeGiven | RR.Fiber,
  key: string | RR.Fiber | null,
  pendingProps: RR.Props | Error,
  owner: RR.Fiber | RR.ElementTypeGiven | null,
  mode: RR.TypeOfMode,
  lanes: RR.Lanes
): RR.Fiber {
  var fiberTag = 0;
  owner = type;
  if ("function" === typeof owner) shouldConstruct(owner) && (fiberTag = 1);
  else if ("string" === typeof owner) fiberTag = 5;
  else
    a: switch (owner) {
      case REACT_ACTIVITY_TYPE:
        return (
          (type = createFiberImplClass(31, pendingProps, key, mode)),
          (type.elementType = REACT_ACTIVITY_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(pendingProps.children, mode, lanes, key);
      case REACT_STRICT_MODE_TYPE:
        fiberTag = 8;
        mode |= 8;
        0 !== (mode & 1) && (mode |= 16);
        break;
      case REACT_PROFILER_TYPE:
        return (
          (type = createFiberImplClass(12, pendingProps, key, mode | 2)),
          (type.elementType = REACT_PROFILER_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_SUSPENSE_TYPE:
        return (
          (type = createFiberImplClass(13, pendingProps, key, mode)),
          (type.elementType = REACT_SUSPENSE_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_SUSPENSE_LIST_TYPE:
        return (
          (type = createFiberImplClass(19, pendingProps, key, mode)),
          (type.elementType = REACT_SUSPENSE_LIST_TYPE),
          (type.lanes = lanes),
          type
        );
      case REACT_LEGACY_HIDDEN_TYPE:
      case REACT_VIEW_TRANSITION_TYPE:
        return (
          (type = mode | 32),
          (type = createFiberImplClass(30, pendingProps, key, type)),
          (type.elementType = REACT_VIEW_TRANSITION_TYPE),
          (type.lanes = lanes),
          (type.stateNode = {
            autoName: null,
            paired: null,
            clones: null,
            ref: null
          }),
          type
        );
      default:
        if ("object" === typeof owner && null !== owner)
          switch (owner.$$typeof) {
            case REACT_CONTEXT_TYPE:
              fiberTag = 10;
              break a;
            case REACT_CONSUMER_TYPE:
              fiberTag = 9;
              break a;
            case REACT_FORWARD_REF_TYPE:
              fiberTag = 11;
              break a;
            case REACT_MEMO_TYPE:
              fiberTag = 14;
              break a;
            case REACT_LAZY_TYPE:
              fiberTag = 16;
              owner = null;
              break a;
          }
        fiberTag = 29;
        pendingProps = Error(
          "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " +
            ((null === type ? "null" : typeof type) + ".")
        );
        owner = null;
    }
  key = createFiberImplClass(fiberTag, pendingProps, key, mode);
  key.elementType = type;
  key.type = owner;
  key.lanes = lanes;
  return key;
}
function createFiberFromFragment(elements: RR.ReactNode | RR.Fiber, mode: RR.TypeOfMode, lanes: RR.Lanes, key: string | null): RR.Fiber {
  elements = createFiberImplClass(7, elements, key, mode);
  (elements as RR.Fiber).lanes = lanes;
  return (elements as RR.Fiber);
}
function createFiberFromText(content: string | RR.Fiber, mode: RR.TypeOfMode, lanes: RR.Lanes): RR.Fiber {
  content = createFiberImplClass(6, (content as string), null, mode);
  content.lanes = lanes;
  return content;
}
function createFiberFromPortal(portal: RR.ReactPortal, mode: RR.TypeOfMode | RR.Fiber, lanes: RR.Lanes): RR.Fiber {
  mode = createFiberImplClass(
    4,
    null !== portal.children ? portal.children : [],
    portal.key,
    (mode as RR.TypeOfMode)
  );
  mode.lanes = lanes;
  mode.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null,
    implementation: portal.implementation
  } as RR.PortalState;
  return mode;
}
function FiberRootNode(this: RR.FiberRoot,
  containerInfo: RR.Container,
  tag: RR.RootTag,
  hydrate: boolean,
  identifierPrefix: string,
  onUncaughtError: RR.OnUncaughtError,
  onCaughtError: RR.OnCaughtError,
  onRecoverableError: RR.OnRecoverableError,
  onDefaultTransitionIndicator: RR.OnDefaultTransitionIndicator,
  formState: RR.ReactFormState | null
): void {
  this.tag = tag;
  this.containerInfo = containerInfo;
  this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode =
    this.next =
    this.pendingContext =
    this.context =
    this.cancelPendingCommit =
      null;
  this.callbackPriority = 0;
  this.expirationTimes = createLaneMap<RR.Milliseconds>(-1);
  this.entangledLanes =
    this.shellSuspendCounter =
    this.errorRecoveryDisabledLanes =
    this.expiredLanes =
    this.warmLanes =
    this.pingedLanes =
    this.suspendedLanes =
    this.pendingLanes =
      0;
  this.entanglements = createLaneMap<RR.Lanes>(0);
  this.hiddenUpdates = createLaneMap<RR.ConcurrentUpdate[] | null>(null);
  this.identifierPrefix = identifierPrefix;
  this.onUncaughtError = onUncaughtError;
  this.onCaughtError = onCaughtError;
  this.onRecoverableError = onRecoverableError;
  this.pooledCache = null;
  this.pooledCacheLanes = 0;
  this.formState = formState;
  this.transitionTypes = null;
  this.incompleteTransitions = new Map<RR.Transition, unknown>();
}
function createPortal$1(children, containerInfo, implementation) {
  var key =
    3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return {
    $$typeof: REACT_PORTAL_TYPE,
    key:
      null == key
        ? null
        : key === REACT_OPTIMISTIC_KEY
          ? REACT_OPTIMISTIC_KEY
          : "" + key,
    children: children,
    containerInfo: containerInfo,
    implementation: implementation
  };
}
function findHostInstance(component: RR.ClassInstance | string | RR.Fiber | null): RR.PublicInstance | null {
  var fiber: RR.Fiber | undefined = (component as RR.ClassInstance)._reactInternals;
  if (void 0 === fiber) {
    if ("function" === typeof (component as RR.ClassInstance).render)
      throw Error("Unable to find node on an unmounted component.");
    component = Object.keys((component as RR.ClassInstance)).join(",");
    throw Error(
      "Argument appears to not be a ReactComponent. Keys: " + component
    );
  }
  component = findCurrentFiberUsingSlowPath(fiber);
  component = null !== component ? findCurrentHostFiberImpl(component) : null;
  return null === component ? null : getPublicInstance(component.stateNode);
}
function updateContainer(element, container, parentComponent, callback) {
  parentComponent = container.current;
  var lane = requestUpdateLane(parentComponent);
  null === container.context
    ? (container.context = emptyContextObject)
    : (container.pendingContext = emptyContextObject);
  container = createUpdate(lane);
  container.payload = { element: element };
  callback = void 0 === callback ? null : callback;
  null !== callback && (container.callback = callback);
  element = enqueueUpdate(parentComponent, container, lane);
  null !== element &&
    (scheduleUpdateOnFiber(element, parentComponent, lane),
    entangleTransitions(element, parentComponent, lane));
  return lane;
}
function shim$1() {
  throw Error(
    "The current renderer does not support hydration. This error is likely caused by a bug in React. Please file an issue."
  );
}
function shim() {
  throw Error(
    "The current renderer does not support Resources. This error is likely caused by a bug in React. Please file an issue."
  );
}
var fabricCreateViewTransitionInstance =
    reactPrivateInterface.fabricUIManager.createViewTransitionInstance,
  fabricStartViewTransition =
    reactPrivateInterface.fabricUIManager.startViewTransition,
  fabricStartViewTransitionReadyFinished =
    reactPrivateInterface.fabricUIManager.startViewTransitionReadyFinished;
function ViewTransitionPseudoElement(pseudo, name) {
  this._pseudo = pseudo;
  this._name = name;
}
function measureClonedInstance() {
  return {
    rect: { x: 0, y: 0, width: 0, height: 0 },
    abs: !1,
    clip: !1,
    view: !0
  };
}
function createViewTransitionInstance(name) {
  var tag = allocateTag();
  fabricCreateViewTransitionInstance(name, tag);
  return {
    name: name,
    old: new ViewTransitionPseudoElement("old", name),
    new: new ViewTransitionPseudoElement("new", name)
  };
}
function startViewTransition(
  suspendedState,
  rootContainer,
  transitionTypes,
  mutationCallback,
  layoutCallback,
  afterMutationCallback,
  spawnedWorkCallback,
  passiveCallback
) {
  suspendedState = fabricStartViewTransition(function () {
    mutationCallback();
    layoutCallback();
    afterMutationCallback();
  });
  if (null == suspendedState)
    return mutationCallback(), layoutCallback(), spawnedWorkCallback(), null;
  suspendedState.ready.then(function () {
    spawnedWorkCallback();
    fabricStartViewTransitionReadyFinished();
  });
  suspendedState.finished.finally(function () {
    passiveCallback();
  });
  return suspendedState;
}
var createNode = reactPrivateInterface.fabricUIManager.createNode,
  cloneNodeWithNewChildren =
    reactPrivateInterface.fabricUIManager.cloneNodeWithNewChildren,
  cloneNodeWithNewChildrenAndProps =
    reactPrivateInterface.fabricUIManager.cloneNodeWithNewChildrenAndProps,
  cloneNodeWithNewProps =
    reactPrivateInterface.fabricUIManager.cloneNodeWithNewProps,
  createChildNodeSet = reactPrivateInterface.fabricUIManager.createChildSet,
  appendChildNode = reactPrivateInterface.fabricUIManager.appendChild,
  appendChildNodeToSet = reactPrivateInterface.fabricUIManager.appendChildToSet,
  completeRoot = reactPrivateInterface.fabricUIManager.completeRoot,
  registerEventHandler =
    reactPrivateInterface.fabricUIManager.registerEventHandler,
  FabricDiscretePriority =
    reactPrivateInterface.fabricUIManager.unstable_DiscreteEventPriority,
  FabricContinuousPriority =
    reactPrivateInterface.fabricUIManager.unstable_ContinuousEventPriority,
  FabricIdlePriority =
    reactPrivateInterface.fabricUIManager.unstable_IdleEventPriority,
  fabricGetCurrentEventPriority =
    reactPrivateInterface.fabricUIManager.unstable_getCurrentEventPriority,
  fabricSuspendOnActiveViewTransition =
    reactPrivateInterface.fabricUIManager.suspendOnActiveViewTransition,
  extraDevToolsConfig = {
    getInspectorDataForInstance: void 0,
    getInspectorDataForViewAtPoint: function () {
      throw Error(
        "getInspectorDataForViewAtPoint() is not available in production."
      );
    }
  },
  getViewConfigForType =
    reactPrivateInterface.ReactNativeViewConfigRegistry.get,
  nextReactTag = 2;
function allocateTag() {
  var tag = nextReactTag;
  nextReactTag += 2;
  return tag;
}
registerEventHandler && registerEventHandler(dispatchEvent);
var PROD_HOST_CONTEXT = { isInAParentText: !0 };
function createTextInstance(
  text,
  rootContainerInstance,
  hostContext,
  internalInstanceHandle
) {
  hostContext = allocateTag();
  return {
    node: createNode(
      hostContext,
      "RCTRawText",
      rootContainerInstance.containerTag,
      { text: text },
      internalInstanceHandle
    )
  };
}
function getPublicInstance(instance) {
  if (null != instance.canonical) {
    if (null == instance.canonical.publicInstance) {
      var $jscomp$nullish$tmp0;
      instance.canonical.publicInstance =
        reactPrivateInterface.createPublicInstance(
          instance.canonical.nativeTag,
          instance.canonical.viewConfig,
          instance.canonical.internalInstanceHandle,
          null != ($jscomp$nullish$tmp0 = instance.canonical.publicRootInstance)
            ? $jscomp$nullish$tmp0
            : null
        );
      instance.canonical.publicRootInstance = null;
    }
    return instance.canonical.publicInstance;
  }
  return null != instance.containerInfo
    ? instance.containerInfo.publicInstance
    : null;
}
function getPublicInstanceFromHostFiber(fiber) {
  fiber = getPublicInstance(fiber.stateNode);
  if (null === fiber)
    throw Error("Expected to find a host node. This is a bug in React.");
  return fiber;
}
var currentUpdatePriority = 0;
function resolveUpdatePriority() {
  if (0 !== currentUpdatePriority) return currentUpdatePriority;
  var currentEventPriority = fabricGetCurrentEventPriority
    ? fabricGetCurrentEventPriority()
    : null;
  if (null != currentEventPriority)
    switch (currentEventPriority) {
      case FabricDiscretePriority:
        return 2;
      case FabricContinuousPriority:
        return 8;
      case FabricIdlePriority:
        return 268435456;
    }
  return 32;
}
var scheduleTimeout = setTimeout,
  cancelTimeout = clearTimeout;
function cloneHiddenInstance(instance) {
  var node = instance.node,
    updatePayload = reactPrivateInterface.createAttributePayload(
      { style: { display: "none" } },
      instance.canonical.viewConfig.validAttributes
    );
  return {
    node: cloneNodeWithNewProps(node, updatePayload),
    canonical: instance.canonical
  };
}
function FragmentInstance(fragmentFiber) {
  this._fragmentFiber = fragmentFiber;
  this._observers = null;
}
FragmentInstance.prototype.observeUsing = function (observer) {
  null === this._observers && (this._observers = new Set());
  this._observers.add(observer);
  traverseVisibleInstancesAndTextInstances(
    this._fragmentFiber.child,
    !1,
    observeChild,
    observer,
    void 0,
    void 0
  );
};
function observeChild(child, observer) {
  child = getPublicInstanceFromHostFiber(child);
  observer.observe(child);
  return !1;
}
FragmentInstance.prototype.unobserveUsing = function (observer) {
  var observers = this._observers;
  null !== observers &&
    observers.has(observer) &&
    (observers.delete(observer),
    traverseVisibleInstancesAndTextInstances(
      this._fragmentFiber.child,
      !1,
      unobserveChild,
      observer,
      void 0,
      void 0
    ));
};
function unobserveChild(child, observer) {
  child = getPublicInstanceFromHostFiber(child);
  observer.unobserve(child);
  return !1;
}
FragmentInstance.prototype.compareDocumentPosition = function (otherNode) {
  var parentHostFiber = getFragmentParentInstanceOrContainerFiber(
    this._fragmentFiber
  );
  if (null === parentHostFiber) return Node.DOCUMENT_POSITION_DISCONNECTED;
  var children = [];
  traverseVisibleInstancesAndTextInstances(
    this._fragmentFiber.child,
    !1,
    collectChildren,
    children,
    void 0,
    void 0
  );
  if (0 === children.length) {
    var parentHostInstance = getPublicInstanceFromHostFiber(parentHostFiber);
    children = this._fragmentFiber;
    parentHostFiber = getPublicInstanceFromHostFiber;
    var parentResult = parentHostInstance.compareDocumentPosition(otherNode);
    var result = parentResult;
    parentHostInstance === otherNode
      ? (result = Node.DOCUMENT_POSITION_CONTAINS)
      : parentResult & Node.DOCUMENT_POSITION_CONTAINED_BY &&
        ((parentHostInstance = [null, null]),
        (result = getFragmentParentInstanceOrContainerFiber(children)),
        null !== result &&
          findFragmentInstanceOrTextInstanceSiblings(
            parentHostInstance,
            children,
            result.child,
            { foundSelf: !1 }
          ),
        (children = parentHostInstance[1]),
        null === children
          ? (result = Node.DOCUMENT_POSITION_PRECEDING)
          : ((otherNode =
              parentHostFiber(children).compareDocumentPosition(otherNode)),
            (result =
              0 === otherNode || otherNode & Node.DOCUMENT_POSITION_FOLLOWING
                ? Node.DOCUMENT_POSITION_FOLLOWING
                : Node.DOCUMENT_POSITION_PRECEDING)));
    return (result |= Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC);
  }
  parentHostFiber = getPublicInstanceFromHostFiber(children[0]);
  children = getPublicInstanceFromHostFiber(children[children.length - 1]);
  parentHostInstance = parentHostFiber.compareDocumentPosition(otherNode);
  parentResult = children.compareDocumentPosition(otherNode);
  result =
    parentHostInstance & Node.DOCUMENT_POSITION_CONTAINED_BY ||
    parentResult & Node.DOCUMENT_POSITION_CONTAINED_BY;
  parentResult =
    parentHostInstance & Node.DOCUMENT_POSITION_FOLLOWING &&
    parentResult & Node.DOCUMENT_POSITION_PRECEDING;
  return parentHostFiber === otherNode ||
    children === otherNode ||
    result ||
    parentResult
    ? Node.DOCUMENT_POSITION_CONTAINED_BY
    : parentHostInstance;
};
function collectChildren(child, collection) {
  collection.push(child);
  return !1;
}
FragmentInstance.prototype.getRootNode = function (getRootNodeOptions) {
  var parentHostFiber = getFragmentParentInstanceOrContainerFiber(
    this._fragmentFiber
  );
  return null === parentHostFiber
    ? this
    : getPublicInstanceFromHostFiber(parentHostFiber).getRootNode(
        getRootNodeOptions
      );
};
FragmentInstance.prototype.getClientRects = function () {
  var rects = [];
  traverseVisibleInstancesAndTextInstances(
    this._fragmentFiber.child,
    !1,
    collectClientRects,
    rects,
    void 0,
    void 0
  );
  return rects;
};
function collectClientRects(child, rects) {
  child = getPublicInstanceFromHostFiber(child);
  rects.push(child.getBoundingClientRect());
  return !1;
}
function addFragmentHandleToFiber(child, fragmentInstance) {
  child = getPublicInstanceFromHostFiber(child);
  null != child && addFragmentHandleToInstance(child, fragmentInstance);
  return !1;
}
function addFragmentHandleToInstance(instance, fragmentInstance) {
  null == instance.reactFragments && (instance.reactFragments = new Set());
  instance.reactFragments.add(fragmentInstance);
}
function commitNewChildToFragmentInstance(childInstance, fragmentInstance) {
  if (null != childInstance.canonical) {
    var publicInstance = getPublicInstance(childInstance);
    if (null !== fragmentInstance._observers) {
      if (null == publicInstance)
        throw Error("Expected to find a host node. This is a bug in React.");
      fragmentInstance._observers.forEach(function (observer) {
        observer.observe(publicInstance);
      });
    }
    addFragmentHandleToInstance(publicInstance, fragmentInstance);
  }
}
var HostTransitionContext = {
    $$typeof: REACT_CONTEXT_TYPE,
    Provider: null,
    Consumer: null,
    _currentValue: null,
    _currentValue2: null,
    _threadCount: 0
  },
  scheduleMicrotask =
    "function" === typeof queueMicrotask ? queueMicrotask : scheduleTimeout;
getFiberCurrentPropsFromNode$1 = function (instance) {
  return instance.canonical.currentProps;
};
getInstanceFromNode$1 = function (node) {
  return null != node.canonical && null != node.canonical.internalInstanceHandle
    ? node.canonical.internalInstanceHandle
    : node;
};
getNodeFromInstance$1 = function (fiber) {
  fiber = getPublicInstance(fiber.stateNode);
  if (null == fiber) throw Error("Could not find host instance from fiber");
  return fiber;
};
ResponderEventPlugin.injection.injectGlobalResponderHandler({
  onChange: function (from, to, blockNativeResponder) {
    from &&
      from.stateNode &&
      reactPrivateInterface.fabricUIManager.setIsJSResponder(
        from.stateNode.node,
        !1,
        blockNativeResponder || !1
      );
    to &&
      to.stateNode &&
      reactPrivateInterface.fabricUIManager.setIsJSResponder(
        to.stateNode.node,
        !0,
        blockNativeResponder || !1
      );
  }
});
if (
  "function" !==
  typeof reactPrivateInterface.ReactFiberErrorDialog.showErrorDialog
)
  throw Error(
    "Expected ReactFiberErrorDialog.showErrorDialog to be a function."
  );
function nativeOnUncaughtError(error, errorInfo) {
  !1 !==
    reactPrivateInterface.ReactFiberErrorDialog.showErrorDialog({
      errorBoundary: null,
      error: error,
      componentStack:
        null != errorInfo.componentStack ? errorInfo.componentStack : ""
    }) && reportGlobalError(error);
}
function nativeOnCaughtError(error, errorInfo) {
  !1 !==
    reactPrivateInterface.ReactFiberErrorDialog.showErrorDialog({
      errorBoundary: errorInfo.errorBoundary,
      error: error,
      componentStack:
        null != errorInfo.componentStack ? errorInfo.componentStack : ""
    }) && console.error(error);
}
function nativeOnDefaultTransitionIndicator() {}
batchedUpdatesImpl = function (fn, a) {
  var prevExecutionContext = executionContext;
  executionContext |= 1;
  try {
    return fn(a);
  } finally {
    (executionContext = prevExecutionContext),
      0 === executionContext &&
        ((workInProgressRootRenderTargetTime = now() + 500),
        flushSyncWorkAcrossRoots_impl(0, !0));
  }
};
var roots = new Map(),
  internals$jscomp$inline_1347 = {
    bundleType: 0,
    version: "19.3.0",
    rendererPackageName: "react-native-renderer",
    currentDispatcherRef: ReactSharedInternals,
    reconcilerVersion: "19.3.0"
  };
null !== extraDevToolsConfig &&
  (internals$jscomp$inline_1347.rendererConfig = extraDevToolsConfig);
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var hook$jscomp$inline_1663 = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (
    !hook$jscomp$inline_1663.isDisabled &&
    hook$jscomp$inline_1663.supportsFiber
  )
    try {
      (rendererID = hook$jscomp$inline_1663.inject(
        internals$jscomp$inline_1347
      )),
        (injectedHook = hook$jscomp$inline_1663);
    } catch (err) {}
}
exports.createPortal = function (children, containerTag) {
  return createPortal$1(
    children,
    containerTag,
    null,
    2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null
  );
};
exports.dispatchCommand = function (handle, command, args) {
  handle = reactPrivateInterface.getNodeFromPublicInstance(handle);
  null != handle &&
    reactPrivateInterface.fabricUIManager.dispatchCommand(
      handle,
      command,
      args
    );
};
exports.findHostInstance_DEPRECATED = function (componentOrHandle) {
  return null == componentOrHandle
    ? null
    : componentOrHandle.canonical && componentOrHandle.canonical.publicInstance
      ? componentOrHandle.canonical.publicInstance
      : findHostInstance(componentOrHandle);
};
exports.findNodeHandle = function (componentOrHandle) {
  if (null == componentOrHandle) return null;
  if ("number" === typeof componentOrHandle) return componentOrHandle;
  if (
    null != componentOrHandle.canonical &&
    null != componentOrHandle.canonical.nativeTag
  )
    return componentOrHandle.canonical.nativeTag;
  var nativeTag =
    reactPrivateInterface.getNativeTagFromPublicInstance(componentOrHandle);
  if (nativeTag) return nativeTag;
  componentOrHandle = findHostInstance(componentOrHandle);
  return null == componentOrHandle
    ? componentOrHandle
    : reactPrivateInterface.getNativeTagFromPublicInstance(componentOrHandle);
};
exports.getNodeFromInternalInstanceHandle = function (internalInstanceHandle) {
  return (
    internalInstanceHandle &&
    internalInstanceHandle.stateNode &&
    internalInstanceHandle.stateNode.node
  );
};
exports.getPublicInstanceFromInternalInstanceHandle = function (
  internalInstanceHandle
) {
  var instance = internalInstanceHandle.stateNode;
  return null == instance
    ? null
    : 6 === internalInstanceHandle.tag
      ? (null == instance.publicInstance &&
          (instance.publicInstance =
            reactPrivateInterface.createPublicTextInstance(
              internalInstanceHandle
            )),
        instance.publicInstance)
      : getPublicInstance(internalInstanceHandle.stateNode);
};
exports.getPublicInstanceFromRootTag = function (rootTag) {
  return (rootTag = roots.get(rootTag))
    ? rootTag.containerInfo.publicInstance
    : null;
};
exports.isChildPublicInstance = function () {
  throw Error("isChildPublicInstance() is not available in production.");
};
exports.render = function (
  element,
  containerTag,
  callback,
  concurrentRoot,
  options
) {
  var root = roots.get(containerTag);
  if (!root) {
    root = nativeOnUncaughtError;
    var onCaughtError = nativeOnCaughtError,
      onRecoverableError = defaultOnRecoverableError;
    options &&
      void 0 !== options.onUncaughtError &&
      (root = options.onUncaughtError);
    options &&
      void 0 !== options.onCaughtError &&
      (onCaughtError = options.onCaughtError);
    options &&
      void 0 !== options.onRecoverableError &&
      (onRecoverableError = options.onRecoverableError);
    options = {
      publicInstance:
        reactPrivateInterface.createPublicRootInstance(containerTag),
      containerTag: containerTag
    };
    concurrentRoot = concurrentRoot ? 1 : 0;
    root = new FiberRootNode(
      options,
      concurrentRoot,
      !1,
      "",
      root,
      onCaughtError,
      onRecoverableError,
      nativeOnDefaultTransitionIndicator,
      null
    );
    concurrentRoot = createFiberImplClass(
      3,
      null,
      null,
      1 === concurrentRoot ? 1 : 0
    );
    root.current = concurrentRoot;
    concurrentRoot.stateNode = root;
    onCaughtError = createCache();
    onCaughtError.refCount++;
    root.pooledCache = onCaughtError;
    onCaughtError.refCount++;
    concurrentRoot.memoizedState = {
      element: null,
      isDehydrated: !1,
      cache: onCaughtError
    };
    initializeUpdateQueue(concurrentRoot);
    roots.set(containerTag, root);
  }
  updateContainer(element, root, null, callback);
  a: if (((element = root.current), element.child))
    switch (element.child.tag) {
      case 27:
      case 5:
        element = getPublicInstance(element.child.stateNode);
        break a;
      default:
        element = element.child.stateNode;
    }
  else element = null;
  return element;
};
exports.sendAccessibilityEvent = function (handle, eventType) {
  handle = reactPrivateInterface.getNodeFromPublicInstance(handle);
  null != handle &&
    reactPrivateInterface.fabricUIManager.sendAccessibilityEvent(
      handle,
      eventType
    );
};
exports.stopSurface = function (containerTag) {
  var root = roots.get(containerTag);
  root &&
    updateContainer(null, root, null, function () {
      root.containerInfo.publicInstance = null;
      roots.delete(containerTag);
    });
};
exports.unmountComponentAtNode = function (containerTag) {
  this.stopSurface(containerTag);
};

declare namespace RR {
type IteratorFn = (this: ReactNode) => Iterator<ReactNode>;
type AnyElementType = any;
}
declare namespace RR {
interface ComponentFunction extends Function { displayName?: string }
type FakeOrResult = any;
type PrepareStackTrace = (error: Error, structuredStackTrace: unknown[]) => unknown;
type ComponentFrameStacks = [sample: string | null, control: string | null | undefined];
interface RootFrameRunner { DetermineComponentFrameRoot: { (): ComponentFrameStacks; displayName?: string } }
}
declare namespace RR {
interface ThrownObject { readonly $$rrThrown?: never }
type ThrownInUnion = ThrownObject | string | number | boolean | bigint | symbol | null | undefined;
type Comparand = any;
type LazyResult = any;
}
declare namespace RR {
type ChildReconciler = (returnFiber: Fiber, currentFirstChild: Fiber | null, newChild: ReactNode, lanes: Lanes) => Fiber | null;
type ExistingChildren = Map<string | number, Fiber>;
interface ChildIteratorResult { value?: ReactNode; done?: boolean }
interface ChildIterator { next(): ChildIteratorResult }
}
declare namespace RR {
type StateUpdater = (this: any, prevState: any, nextProps: any) => any;
}
declare namespace RR {
interface HookStateObject { readonly $$rrHookState?: never }
type HookStateInUnion = HookStateObject | string | number | bigint | boolean | symbol | null | undefined;
interface StoreInstance { pending?: null }
interface UsableThenable extends Thenable<any> { $$typeof?: undefined }
interface UsableContext extends ReactContext<any> { then?: never }
type UsableGiven = UsableThenable | UsableContext;
type UsedValue = any;
type StoreSubscribe = (onStoreChange: () => void) => () => void;
type GetSnapshot = () => any;
type ActionPayload = any;
}
declare namespace RR {
type MemoizedPair<T = any> = [value: T, deps: HookDeps | null];
interface FormResetState {}
}
declare namespace RR {
type DeriveStateFromProps = (nextProps: any, prevState: any) => ClassState | null | undefined;
interface PropsWithRef extends Props { ref?: unknown }
type MemoCompare = (prevProps: any, nextProps: any) => boolean;
}
declare namespace RR {
interface CarriedObject { readonly $$rrCarried?: never }
type Carried = CarriedObject | string | number | bigint | boolean | symbol | null | undefined;
}
declare namespace RR {
interface GivenObject { readonly $$rrGiven?: never }
type Given = GivenObject | string | number | bigint | boolean | symbol | null | undefined;
}
declare namespace RR {
interface AnythingObject { readonly $$rrAnything?: never }
type Anything = AnythingObject | string | number | bigint | boolean | symbol | null | undefined;
type ResolvedLazy = Exclude<ElementType, string | symbol>;
type PropsOrChildren = any;
}
declare namespace RR {
type PropsInUnion = Props | string | number | bigint | boolean | symbol | null | undefined;
type PropsArg = unknown;
type CompleteWorkCurrent = Fiber | HostContext | Instance | SuspenseState | FiberUpdateQueue | Lanes | boolean | null;
type CompleteWorkRenderLanes = Lanes | FiberRoot | HostContext | MemoizedState | CapturedValue[] | Fiber | OffscreenQueue | Cache | boolean | null;
type CompleteWorkNewProps = PropsInUnion | Cache | SuspenseState | SuspenseListRenderState | Fiber;
type CompleteWorkType = ElementType | Fiber | SuspenseState | SuspenseInstance | CapturedValue[] | Cache | boolean | null;
type CompleteWorkNextResource = MemoizedState | Props | HostContext | Cache | Fiber | null;
}
declare namespace RR {
interface SnapshotObject { readonly $$rrSnapshot?: never }
type Snapshot = SnapshotObject | string | number | bigint | boolean | symbol | null | undefined;
}
declare namespace RR {
type SelectorStackEntry = Fiber | number;
}
declare namespace RR {
type ScheduleCommit = (initiateCommit: () => unknown) => () => void;
type SuspendedCommitReason = string | null;
}
declare namespace RR {
interface PrototypeHolder extends Function { prototype: ClassPrototype | undefined }
interface TypeObjectGiven { $$typeof?: unknown }
type ElementTypeGiven = ElementType | TypeObjectGiven | number | bigint | boolean | undefined;
}
declare namespace RR {
type TransitionResult = any;
type ReducerInUnion = (state: any, action: any) => HookStateInUnion;
}
declare namespace RR {
type CacheEntry = any;
type SelectorStackOrNames = Array<SelectorStackEntry | string>;
}
declare var module: { exports: any };
declare function require(name: string): any;
declare var console: { error(...data: any[]): void };
declare function setTimeout(handler: () => void, timeout?: number): RR.TimeoutHandle;
declare var reportError: (error: any) => void;
declare var window: RR.WindowLike;
declare var process: RR.ProcessLike;
declare var AbortController: RR.AbortControllerConstructor;
declare var __REACT_DEVTOOLS_GLOBAL_HOOK__: RR.DevToolsHook;
declare namespace RR {
type int32 = import("bun").int32;
type Lane = int32;
type Lanes = int32;
type LaneMap<T> = T[];
type Flags = int32;
type WorkTag = int32;
type TypeOfMode = number;
type HookFlags = int32;
type RootTag = number;
type UpdateTag = int32;
type EventPriority = number;
type SchedulerPriority = number;
type ExecutionContext = int32;
type RootExitStatus = int32;
type SuspendedReason = int32;
type PendingEffectsStatus = int32;
type SuspenseContext = int32;
type OffscreenVisibility = number;
type Milliseconds = number;
type ReactNode = any;
type ContextValue = any;
type HookState = any;
type Payload = any;
type Thrown = any;
interface HostObject { readonly $$rrHost?: never }
interface ClassState { readonly $$rrState?: never }
type Instance = HostObject;
type TextInstance = HostObject;
type SuspenseInstance = HostObject;
type ActivityInstance = HostObject;
type HydratableInstance = HostObject;
type FormInstance = HostObject;
type PublicInstance = HostObject;
type Container = HostObject;
type ChildSet = HostObject;
type HoistableRoot = HostObject;
type Resource = HostObject;
type SuspendedState = HostObject;
type UpdatePayload = HostObject;
type HostContext = HostObject | number | string | null;
type TransitionStatus = HostObject | null;
type TimeoutHandle = HostObject | number;
type NoTimeout = number;
interface LegacyContext { readonly $$rrContext?: never }
interface Props { [name: string]: unknown }
type State = MemoizedState;
type HostArg = StateNode;
type ResourceArg = MemoizedState;
type HostType = ElementType;
interface Fiber {
  tag: WorkTag;
  key: string | null;
  elementType: any;
  type: ElementType;
  stateNode: StateNode;
  return: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  index: number;
  ref: Ref;
  refCleanup: RefCleanup;
  pendingProps: any;
  memoizedProps: any;
  updateQueue: FiberUpdateQueue;
  memoizedState: MemoizedState;
  dependencies: Dependencies | null;
  mode: TypeOfMode;
  flags: Flags;
  subtreeFlags: Flags;
  deletions: Fiber[] | null;
  lanes: Lanes;
  childLanes: Lanes;
  alternate: Fiber | null;
}
type MemoizedState = Hook | RootState | SuspenseState | SuspenseListRenderState | OffscreenState | CacheComponentState | ClassState | Resource | null;
type FiberUpdateQueue = UpdateQueue | FunctionComponentUpdateQueue | OffscreenQueue | RetryQueue | null;
type StateNode = FiberRoot | ClassInstance | PortalState | OffscreenInstance | RetryCache | ProfilerState | ViewTransitionState | HostObject | null;
interface FiberRoot {
  tag: RootTag;
  containerInfo: Container;
  pendingChildren: ChildSet | null;
  current: Fiber | null;
  pingCache: PingCache | null;
  timeoutHandle: TimeoutHandle | NoTimeout;
  cancelPendingCommit: (() => void) | null;
  context: LegacyContext | null;
  pendingContext: LegacyContext | null;
  next: FiberRoot | null;
  callbackNode: SchedulerTask | null;
  callbackPriority: Lane;
  expirationTimes: LaneMap<Milliseconds>;
  pendingLanes: Lanes;
  suspendedLanes: Lanes;
  pingedLanes: Lanes;
  warmLanes: Lanes;
  expiredLanes: Lanes;
  errorRecoveryDisabledLanes: Lanes;
  shellSuspendCounter: number;
  entangledLanes: Lanes;
  entanglements: LaneMap<Lanes>;
  hiddenUpdates: LaneMap<ConcurrentUpdate[] | null>;
  identifierPrefix: string;
  onUncaughtError: OnUncaughtError;
  onCaughtError: OnCaughtError;
  onRecoverableError: OnRecoverableError;
  pooledCache: Cache | null;
  pooledCacheLanes: Lanes;
  formState: ReactFormState | null;
  incompleteTransitions: Map<Transition, unknown>;
  transitionTypes: string[] | null;
}
type ViewTransitionClass = null | undefined | string | { [type: string]: string | undefined; default?: string };
interface ViewTransitionProps {
  name?: string;
  default?: ViewTransitionClass;
  enter?: ViewTransitionClass;
  exit?: ViewTransitionClass;
  update?: ViewTransitionClass;
  share?: ViewTransitionClass;
  onEnter?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
  onExit?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
  onUpdate?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
  onShare?: (instance: ViewTransitionInstance, types: string[]) => void | (() => void);
  children?: ReactNode;
}
interface ViewTransitionState {
  autoName: string | null;
  paired: ViewTransitionState | null;
  clones: Instance[] | null;
  ref: ViewTransitionInstance | null;
}
type ViewTransitionInstance = HostObject;
type FragmentInstance = HostObject;
type RunningViewTransition = HostObject;
type OnUncaughtError = (error: Thrown, errorInfo: ErrorInfo) => void;
type OnCaughtError = (error: Thrown, errorInfo: CaughtErrorInfo) => void;
type OnRecoverableError = (error: Thrown, errorInfo: ErrorInfo) => void;
type OnDefaultTransitionIndicator = () => void | (() => void);
interface ErrorInfo { componentStack: string | null }
interface CaughtErrorInfo { componentStack: string | null; errorBoundary: StateNode }
type ReactFormState = [state: any, keyPath: string, referenceId: string | null, boundArgumentCount: number];
type PingCache = WeakMap<Wakeable, Set<Lanes>>;
interface PingCacheConstructor { new (): PingCache }
interface RootState { element: ReactNode; isDehydrated: boolean; cache: Cache }
interface RootUpdatePayload { element: ReactNode }
interface Update { lane: Lane; tag: UpdateTag; payload: Payload; callback: UpdateCallback | null; next: Update | null }
type UpdateCallback = (this: any) => unknown;
interface SharedQueue { pending: Update | null; lanes: Lanes; hiddenCallbacks: UpdateCallback[] | null }
interface UpdateQueue {
  baseState: MemoizedState;
  firstBaseUpdate: Update | null;
  lastBaseUpdate: Update | null;
  shared: SharedQueue;
  callbacks: UpdateCallback[] | null;
}
interface ConcurrentUpdate { lane: Lane; next: ConcurrentUpdate | null }
interface ConcurrentQueue { pending: ConcurrentUpdate | null }
type ConcurrentQueuesEntry = any;
interface Hook {
  memoizedState: HookState;
  baseState: HookState;
  baseQueue: HookUpdate | null;
  queue: any;
  next: Hook | null;
}
interface HookUpdate {
  lane: Lane;
  revertLane: Lane;
  gesture: null;
  action: HookState;
  hasEagerState: boolean;
  eagerState: HookState;
  next: HookUpdate | null;
}
interface HookQueue {
  pending: HookUpdate | null;
  lanes: Lanes;
  dispatch: Dispatch | null;
  lastRenderedReducer: Reducer | null;
  lastRenderedState: HookState;
}
type Dispatch = (action?: any) => void;
type Reducer = (state: any, action: any) => any;
type HookDeps = any[];
type EffectDestroy = () => void;
type EffectCreate = () => EffectDestroy | void;
interface Effect { tag: HookFlags; create: EffectCreate; deps: HookDeps | null; inst: EffectInstance; next: Effect | null }
interface EffectInstance { destroy: EffectDestroy | void }
interface FunctionComponentUpdateQueue {
  lastEffect: Effect | null;
  events: EventFunctionPayload[] | null;
  stores: StoreConsistencyCheck[] | null;
  memoCache: MemoCache | null;
}
interface MemoCache { data: any[][]; index: number }
interface EventFunctionRef { impl: (...args: any[]) => any }
interface EventFunctionPayload { ref: EventFunctionRef; nextImpl: (...args: any[]) => any }
interface StoreConsistencyCheck { getSnapshot: () => any; value: any }
interface StoreInstance { value: any; getSnapshot: () => any }
type ActionFn = (state: any, payload: any) => any;
interface ActionStateQueue { state: any; dispatch: Dispatch | null; action: ActionFn | null; pending: ActionStateQueueNode | null }
interface ActionStateQueueNode {
  payload: any;
  action: ActionFn;
  next: ActionStateQueueNode | null;
  isTransition: boolean;
  status: ThenableStatus;
  value: any;
  reason: Thrown;
  listeners: Array<(value?: any) => unknown>;
  then(listener: (value?: any) => unknown): void;
}
interface RefObject { current: any }
type RefCallback = (instance: any) => void | (() => void);
type Ref = RefCallback | RefObject | null;
type RefCleanup = (() => void) | void | null;
type DispatchTuple = [state: any, dispatch: Dispatch | null];
type StartTransition = (callback: () => unknown) => void;
type TransitionTuple = [isPending: boolean, start: StartTransition];
type ActionStateTuple = [state: any, dispatch: Dispatch | null, isPending: boolean];
type Usable = Thenable<any> | ReactContext<any>;
interface Dispatcher {
  readContext<T>(context: ReactContext<T>): T;
  use(usable: Usable): any;
  useCallback(callback: any, deps: HookDeps | null | undefined): any;
  useContext<T>(context: ReactContext<T>): T;
  useEffect(create: EffectCreate, deps: HookDeps | null | undefined): void;
  useImperativeHandle(ref: Ref | undefined, create: () => any, deps: HookDeps | null | undefined): void;
  useLayoutEffect(create: EffectCreate, deps: HookDeps | null | undefined): void;
  useInsertionEffect(create: EffectCreate, deps: HookDeps | null | undefined): void;
  useMemo(nextCreate: () => any, deps: HookDeps | null | undefined): any;
  useReducer(reducer: Reducer, initialArg: any, init?: (initialArg: any) => any): DispatchTuple;
  useRef(initialValue: any): RefObject;
  useState(initialState?: any): DispatchTuple;
  useDebugValue(value?: any, formatterFn?: (value: any) => any): void;
  useDeferredValue(value: any, initialValue?: any): any;
  useTransition(): TransitionTuple;
  useSyncExternalStore(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => any, getServerSnapshot?: () => any): any;
  useId(): string;
  useHostTransitionStatus(): TransitionStatus;
  useFormState(action: ActionFn, initialState: any, permalink?: string): ActionStateTuple;
  useActionState(action: ActionFn, initialState: any, permalink?: string): ActionStateTuple;
  useOptimistic(passthrough: any, reducer?: Reducer | null): DispatchTuple;
  useMemoCache(size: number): any[];
  useCacheRefresh(): () => void;
  useEffectEvent?(callback: (...args: any[]) => any): (...args: any[]) => any;
}
interface AsyncDispatcher { getCacheForType<T>(resourceType: () => T): T; cacheSignal(): AbortSignalLike }
interface ClassComponentUpdater {
  enqueueSetState(inst: ClassInstance, payload: Payload, callback?: UpdateCallback | null): void;
  enqueueReplaceState(inst: ClassInstance, payload: Payload, callback?: UpdateCallback | null): void;
  enqueueForceUpdate(inst: ClassInstance, callback?: UpdateCallback | null): void;
}
interface ContextDependency { context: ReactContext<any>; memoizedValue: ContextValue; next: ContextDependency | null }
interface Dependencies { lanes: Lanes; firstContext: ContextDependency | null }
interface ReactContext<T = any> {
  $$typeof: symbol;
  Consumer: ConsumerType | null;
  Provider: ReactContext<T> | null;
  _currentValue: T;
  _currentValue2: T;
  _threadCount: number;
  displayName?: string;
}
interface Cache { controller: AbortControllerLike; data: Map<() => unknown, unknown>; refCount: number }
interface CacheComponentState { parent: Cache | null; cache: Cache | null }
interface CacheUpdatePayload { cache: Cache }
interface SpawnedCachePool { parent: Cache | null; pool: Cache | null }
interface AbortSignalLike { aborted: boolean; addEventListener(type: string, listener: () => void): void }
interface AbortControllerLike { signal: AbortSignalLike; abort(): void }
interface AbortControllerConstructor { new (): AbortControllerLike }
interface Transition { types?: string[] | null | undefined }
interface TreeContext { id: number; overflow: string }
interface SuspenseState {
  dehydrated: SuspenseInstance | ActivityInstance | null;
  treeContext: TreeContext | null;
  retryLane: Lane;
  hydrationErrors: CapturedValue[] | null;
}
type ActivityState = SuspenseState;
interface OffscreenState { baseLanes: Lanes; cachePool: SpawnedCachePool | null }
type HiddenContext = OffscreenState;
interface OffscreenInstance {
  _visibility: OffscreenVisibility;
  _pendingMarkers: null;
  _retryCache: RetryCache | null;
  _transitions: null;
}
interface OffscreenQueue { transitions: null; markerInstances: null; retryQueue: RetryQueue | null }
type RetryQueue = Set<Wakeable>;
type RetryCache = WeakSet<Wakeable>;
interface RetryCacheConstructor { new (): RetryCache }
type SuspenseListTailMode = string | undefined;
interface SuspenseListRenderState {
  isBackwards: boolean;
  rendering: Fiber | null;
  renderingStartTime: Milliseconds;
  last: Fiber | null;
  tail: Fiber | null;
  tailMode: SuspenseListTailMode;
  treeForkCount: number;
  lastEffect?: null;
}
interface ProfilerState { effectDuration: number; passiveEffectDuration: number }
interface OffscreenProps { mode: unknown; children: ReactNode }
interface SuspenseProps { children?: ReactNode; fallback?: ReactNode }
interface ActivityProps { mode?: unknown; children?: ReactNode }
interface SuspenseListProps { revealOrder?: unknown; tail?: SuspenseListTailMode; children?: ReactNode }
interface ProviderProps { value?: ContextValue; children?: ReactNode }
interface ConsumerProps { children: (value: ContextValue) => ReactNode }
interface ProfilerProps { id?: string; onPostCommit?: unknown; children?: ReactNode }
type ThenableStatus = "pending" | "fulfilled" | "rejected";
interface Wakeable { then(onFulfill: () => unknown, onReject: () => unknown): unknown }
interface Thenable<T = any> {
  then(onFulfill: (value: T) => unknown, onReject: (error: Thrown) => unknown): unknown;
  status?: string;
  value?: T;
  reason?: Thrown;
}
type ThenableState = Thenable<any>[];
interface EntangledActionThenable { status: ThenableStatus; value: undefined; then(resolve: () => unknown): void }
interface ChainedThenable<T = any> { status: ThenableStatus; value: T | null; reason: Thrown; then(resolve: (value?: T) => unknown): void }
interface RejectedThenable { then(): void; status: "rejected"; reason: Thrown }
interface NoopThenable { then(): void }
interface StackCursor<T> { current: T }
interface CapturedValue { value: Thrown; source: Fiber | null; stack: string | null }
type ForkStackEntry = Fiber | number | null;
type IdStackEntry = Fiber | number | string | null;
interface PortalState { containerInfo: Container; pendingChildren: ChildSet | null; implementation: unknown }
type ComponentFrameSample = [sample: string | null, control: string | null];
interface RunInRootFrame { DetermineComponentFrameRoot: { (): ComponentFrameSample; displayName?: string } }
interface ReactElement { $$typeof: symbol; type: any; key: string | null; ref: any; props: any }
interface ReactPortal { $$typeof: symbol; key: string | null; children: ReactNode; containerInfo: Container; implementation: unknown }
interface LazyComponent { $$typeof: symbol; _payload: any; _init: (payload: any) => any }
interface ForwardRefType { $$typeof: symbol; render: FunctionComponent; displayName?: string }
interface MemoType { $$typeof: symbol; type: ElementType; compare: ((prevProps: any, nextProps: any) => boolean) | null; displayName?: string }
interface ConsumerType { $$typeof: symbol; _context: ReactContext<any> }
interface FunctionComponent { (props: any, secondArg?: any): ReactNode; defaultProps?: Props; displayName?: string }
interface ClassPrototype { isReactComponent?: unknown; isPureReactComponent?: boolean }
interface ClassComponent {
  new (props: any, context: any): ClassInstance;
  prototype: ClassPrototype;
  contextType?: ReactContext<any> | null;
  defaultProps?: Props;
  displayName?: string;
  getDerivedStateFromProps?: GetDerivedStateFromProps | null;
  getDerivedStateFromError?: ((error: Thrown) => any) | null;
}
type GetDerivedStateFromProps = (nextProps: any, prevState: any) => any;
type ElementType = string | symbol | FunctionComponent | ClassComponent | ReactContext<any> | ConsumerType | ForwardRefType | MemoType | LazyComponent | null;
interface ClassInstance {
  props: any;
  context: any;
  refs: any;
  updater: ClassComponentUpdater;
  state?: any;
  _reactInternals?: Fiber;
  __reactInternalSnapshotBeforeUpdate?: any;
  render(): ReactNode;
  componentDidMount?(): void;
  componentDidUpdate?(prevProps: any, prevState: any, snapshot: any): void;
  componentWillUnmount?(): void;
  componentDidCatch?(error: Thrown, errorInfo: ErrorInfo): void;
  shouldComponentUpdate?(nextProps: any, nextState: any, nextContext: any): boolean;
  getSnapshotBeforeUpdate?(prevProps: any, prevState: any): any;
  componentWillMount?(): void;
  UNSAFE_componentWillMount?(): void;
  componentWillReceiveProps?(nextProps: any, nextContext: any): void;
  UNSAFE_componentWillReceiveProps?(nextProps: any, nextContext: any): void;
  componentWillUpdate?(nextProps: any, nextState: any, nextContext: any): void;
  UNSAFE_componentWillUpdate?(nextProps: any, nextState: any, nextContext: any): void;
}
interface SharedInternals {
  H: Dispatcher | null;
  A: AsyncDispatcher | null;
  T: Transition | null;
  S: ((transition: Transition, returnValue: unknown) => void) | null;
}
interface ReactModule { __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: SharedInternals }
type SchedulerCallback = (didTimeout: boolean) => SchedulerCallback | null | undefined | void;
interface SchedulerTask {
  id: number;
  callback: SchedulerCallback | null;
  priorityLevel: SchedulerPriority;
  startTime: Milliseconds;
  expirationTime: Milliseconds;
  sortIndex: number;
}
interface SchedulerModule {
  unstable_scheduleCallback(priorityLevel: SchedulerPriority, callback: SchedulerCallback, options?: { delay: number }): SchedulerTask;
  unstable_cancelCallback(task: SchedulerTask): void;
  unstable_shouldYield(): boolean;
  unstable_requestPaint(): void;
  unstable_now(): Milliseconds;
  unstable_ImmediatePriority: SchedulerPriority;
  unstable_UserBlockingPriority: SchedulerPriority;
  unstable_NormalPriority: SchedulerPriority;
  unstable_IdlePriority: SchedulerPriority;
  log?: unknown;
  unstable_setDisableYieldValue?(newValue: boolean): void;
}
interface DevToolsHook {
  isDisabled?: boolean;
  supportsFiber?: boolean;
  checkDCE?: unknown;
  inject(internals: DevToolsInternals): number;
  onCommitFiberRoot?(rendererID: number | null, root: FiberRoot, schedulerPriority: undefined, didError: boolean): void;
  onPostCommitFiberRoot?(rendererID: number | null, root: FiberRoot): void;
  onCommitFiberUnmount?(rendererID: number | null, fiber: Fiber): void;
  setStrictMode?(rendererID: number | null, isStrict: boolean): void;
}
interface DevToolsInternals {
  bundleType: number;
  version: string | undefined;
  rendererPackageName: string | undefined;
  currentDispatcherRef: SharedInternals;
  reconcilerVersion: string;
  rendererConfig?: unknown;
}
type SelectorType = symbol | number;
interface Selector { $$typeof: SelectorType; value: any }
interface BoundingRect { x: number; y: number; width: number; height: number }
interface IntersectionObserverOptionsLike { root?: unknown; rootMargin?: string; threshold?: number | number[] }
type ObserveVisibleRectsCallback = (intersections: Array<{ ratio: number; rect: BoundingRect }>) => void;
interface Disconnectable { disconnect(): void }
interface ErrorEventInitLike { bubbles: boolean; cancelable: boolean; message: string; error: Thrown }
interface WindowLike { ErrorEvent: new (type: string, init: ErrorEventInitLike) => object; dispatchEvent(event: object): boolean }
interface ProcessLike { emit(name: string, error: Thrown): unknown }
interface HostConfig {
  rendererVersion?: string;
  rendererPackageName?: string;
  extraDevToolsConfig?: (...args: any[]) => any;
  getPublicInstance(instance: HostArg): PublicInstance;
  getRootHostContext(rootContainer: Container): HostContext;
  getChildHostContext(parentHostContext: HostContext, type: HostType): HostContext;
  prepareForCommit(containerInfo: Container): unknown;
  resetAfterCommit(containerInfo: Container): void;
  createInstance(type: HostType, props: any, rootContainer: Container | null, hostContext: HostContext, internalHandle: Fiber): Instance;
  cloneMutableInstance?: (...args: any[]) => any;
  appendInitialChild(parentInstance: HostArg, child: HostArg): void;
  finalizeInitialChildren(instance: HostArg, type: HostType, props: any, hostContext: HostContext): boolean;
  shouldSetTextContent(type: HostType, props: any): boolean;
  createTextInstance(text: string, rootContainer: Container | null, hostContext: HostContext, internalHandle: Fiber): TextInstance;
  cloneMutableTextInstance?: (...args: any[]) => any;
  scheduleTimeout(fn: (...args: any[]) => unknown, delay?: Milliseconds): TimeoutHandle;
  cancelTimeout(id: TimeoutHandle): void;
  noTimeout: NoTimeout;
  isPrimaryRenderer: boolean;
  warnsIfNotActing?: (...args: any[]) => any;
  supportsMutation: boolean;
  supportsPersistence: boolean;
  supportsHydration: boolean;
  getInstanceFromNode(node: HostArg): Fiber | null | undefined;
  beforeActiveInstanceBlur?: (...args: any[]) => any;
  preparePortalMount(containerInfo: Container): void;
  prepareScopeUpdate?: (...args: any[]) => any;
  getInstanceFromScope?: (...args: any[]) => any;
  setCurrentUpdatePriority(newPriority: EventPriority): void;
  getCurrentUpdatePriority(): EventPriority;
  resolveUpdatePriority(): EventPriority;
  trackSchedulerEvent?: (...args: any[]) => any;
  resolveEventType?: (...args: any[]) => any;
  resolveEventTimeStamp?: (...args: any[]) => any;
  shouldAttemptEagerTransition(): boolean;
  detachDeletedInstance(node: HostArg): void;
  requestPostPaintCallback?: (...args: any[]) => any;
  maySuspendCommit(type: HostType, props: any): boolean;
  maySuspendCommitOnUpdate?(type: HostType, oldProps: any, newProps: any): boolean;
  maySuspendCommitInSyncRender?(type: HostType, props: any): boolean;
  preloadInstance(instance: HostArg, type: HostType, props: any): boolean;
  startSuspendingCommit(): SuspendedState;
  suspendInstance(state: SuspendedState, instance: HostArg, type: HostType, props: any): void;
  suspendOnActiveViewTransition?: (...args: any[]) => any;
  waitForCommitToBeReady(state: SuspendedState, timeoutOffset: Milliseconds): ((initiateCommit: () => unknown) => () => void) | null;
  getSuspendedCommitReason?: (...args: any[]) => any;
  NotPendingTransition: TransitionStatus;
  HostTransitionContext: ReactContext<TransitionStatus>;
  resetFormInstance(form: HostArg): void;
  bindToConsole?: (...args: any[]) => any;
  supportsMicrotasks?: boolean;
  scheduleMicrotask?(fn: () => unknown): void;
  supportsTestSelectors?: boolean;
  findFiberRoot?(node: HostArg): Fiber | null;
  getBoundingRect?(node: HostArg): BoundingRect;
  getTextContent?(fiber: Fiber): string | null;
  isHiddenSubtree?(fiber: Fiber): boolean;
  matchAccessibilityRole?(node: HostArg, role: string): boolean;
  setFocusIfFocusable?(node: HostArg): boolean;
  setupIntersectionObserver?(targets: HostArg[], callback: ObserveVisibleRectsCallback, options?: IntersectionObserverOptionsLike): Disconnectable;
  appendChild?(parentInstance: HostArg, child: HostArg): void;
  appendChildToContainer?(container: HostArg, child: HostArg): void;
  commitTextUpdate?(textInstance: HostArg, oldText: string, newText: string): void;
  commitMount?(instance: HostArg, type: HostType, props: any, internalHandle: Fiber): void;
  commitUpdate?(instance: HostArg, type: HostType, prevProps: any, nextProps: any, internalHandle: Fiber): void;
  insertBefore?(parentInstance: HostArg, child: HostArg, beforeChild: HostArg): void;
  insertInContainerBefore?(container: HostArg, child: HostArg, beforeChild: HostArg): void;
  removeChild?(parentInstance: HostArg, child: HostArg): void;
  removeChildFromContainer?(container: HostArg, child: HostArg): void;
  resetTextContent?(instance: HostArg): void;
  hideInstance?(instance: HostArg): void;
  hideTextInstance?(textInstance: HostArg): void;
  unhideInstance?(instance: HostArg, props: any): void;
  unhideTextInstance?(textInstance: HostArg, text: string): void;
  cancelViewTransitionName?: (...args: any[]) => any;
  cancelRootViewTransitionName?: (...args: any[]) => any;
  restoreRootViewTransitionName?: (...args: any[]) => any;
  cloneRootViewTransitionContainer?: (...args: any[]) => any;
  removeRootViewTransitionClone?: (...args: any[]) => any;
  measureClonedInstance?: (...args: any[]) => any;
  hasInstanceChanged?: (...args: any[]) => any;
  hasInstanceAffectedParent?: (...args: any[]) => any;
  startViewTransition?: (...args: any[]) => any;
  startGestureTransition?: (...args: any[]) => any;
  stopViewTransition?: (...args: any[]) => any;
  getCurrentGestureOffset?: (...args: any[]) => any;
  createViewTransitionInstance?: (...args: any[]) => any;
  clearContainer?(container: HostArg): void;
  createFragmentInstance?: (...args: any[]) => any;
  updateFragmentInstanceFiber?: (...args: any[]) => any;
  commitNewChildToFragmentInstance?: (...args: any[]) => any;
  deleteChildFromFragmentInstance?: (...args: any[]) => any;
  cloneInstance?(instance: HostArg, type: HostType, oldProps: any, newProps: any, keepChildren: boolean, newChildSet: ChildSet | null): Instance;
  createContainerChildSet?(): ChildSet;
  appendChildToContainerChildSet?(childSet: ChildSet, child: HostArg): void;
  finalizeContainerChildren?(container: Container, newChildren: ChildSet): void;
  replaceContainerChildren?(container: Container, newChildren: ChildSet | null): void;
  cloneHiddenInstance?(instance: HostArg, type: HostType, props: any): Instance;
  cloneHiddenTextInstance?(instance: HostArg, text: string): TextInstance;
  isSuspenseInstancePending?(instance: SuspenseInstance): boolean;
  isSuspenseInstanceFallback?(instance: SuspenseInstance): boolean;
  getSuspenseInstanceFallbackErrorDetails?(instance: SuspenseInstance): { digest?: string | null };
  registerSuspenseInstanceRetry?(instance: SuspenseInstance, callback: () => void): void;
  canHydrateFormStateMarker?(instance: HydratableInstance, inRootOrSingleton: boolean): HydratableInstance | null;
  isFormStateMarkerMatching?(markerInstance: HydratableInstance): boolean;
  getNextHydratableSibling?(instance: HostArg): HydratableInstance | null;
  getNextHydratableSiblingAfterSingleton?(type: HostType, instance: HydratableInstance | null): HydratableInstance | null;
  getFirstHydratableChild?(parentInstance: Instance): HydratableInstance | null;
  getFirstHydratableChildWithinContainer?(parentContainer: Container): HydratableInstance | null;
  getFirstHydratableChildWithinActivityInstance?(parentInstance: ActivityInstance | null): HydratableInstance | null;
  getFirstHydratableChildWithinSuspenseInstance?(parentInstance: SuspenseInstance): HydratableInstance | null;
  getFirstHydratableChildWithinSingleton?(type: HostType, singleton: Instance, currentHydratableInstance: HydratableInstance | null): HydratableInstance | null;
  canHydrateInstance?(instance: HydratableInstance, type: HostType, props: any, inRootOrSingleton: boolean): Instance | null;
  canHydrateTextInstance?(instance: HydratableInstance, text: string, inRootOrSingleton: boolean): TextInstance | null;
  canHydrateActivityInstance?(instance: HydratableInstance, inRootOrSingleton: boolean): ActivityInstance | null;
  canHydrateSuspenseInstance?(instance: HydratableInstance, inRootOrSingleton: boolean): SuspenseInstance | null;
  hydrateInstance?(instance: HostArg, type: HostType, props: any, hostContext: HostContext, internalHandle: Fiber): boolean;
  hydrateTextInstance?(textInstance: HostArg, text: string, internalHandle: Fiber, parentInstanceProps: any): boolean;
  hydrateActivityInstance?(activityInstance: ActivityInstance, internalHandle: Fiber): void;
  hydrateSuspenseInstance?(suspenseInstance: SuspenseInstance, internalHandle: Fiber): void;
  getNextHydratableInstanceAfterActivityInstance?(activityInstance: ActivityInstance): HydratableInstance | null;
  getNextHydratableInstanceAfterSuspenseInstance?(suspenseInstance: SuspenseInstance): HydratableInstance | null;
  commitHydratedInstance?(instance: HostArg, type: HostType, props: any, internalHandle: Fiber): void;
  commitHydratedContainer?(container: Container): void;
  commitHydratedActivityInstance?(activityInstance: ActivityInstance | null): void;
  commitHydratedSuspenseInstance?(suspenseInstance: SuspenseInstance): void;
  finalizeHydratedChildren?(instance: HostArg, type: HostType, props: any, hostContext: HostContext): boolean;
  flushHydrationEvents?(): void;
  clearActivityBoundary?: (...args: any[]) => any;
  clearSuspenseBoundary?(parentInstance: HostArg, suspenseInstance: HostArg): void;
  clearActivityBoundaryFromContainer?: (...args: any[]) => any;
  clearSuspenseBoundaryFromContainer?(container: HostArg, suspenseInstance: HostArg): void;
  hideDehydratedBoundary?(suspenseInstance: HostArg): void;
  unhideDehydratedBoundary?(suspenseInstance: HostArg): void;
  shouldDeleteUnhydratedTailInstances?(parentType: HostType): boolean;
  diffHydratedPropsForDevWarnings?: (...args: any[]) => any;
  diffHydratedTextForDevWarnings?: (...args: any[]) => any;
  describeHydratableInstanceForDevWarnings?: (...args: any[]) => any;
  validateHydratableInstance?(type: HostType, props: any, hostContext: HostContext): boolean;
  validateHydratableTextInstance?(text: string, hostContext: HostContext): boolean;
  supportsResources?: boolean;
  isHostHoistableType?(type: string, props: any, hostContext: HostContext): boolean;
  getHoistableRoot?(container: Container): HoistableRoot;
  getResource?(type: HostType, currentProps: any, pendingProps: any, currentResource: ResourceArg): Resource | null;
  acquireResource?(hoistableRoot: HoistableRoot | null, resource: ResourceArg, props: any): Instance | null;
  releaseResource?(resource: ResourceArg): void;
  hydrateHoistable?(hoistableRoot: HoistableRoot | null, type: HostType, props: any, internalHandle: Fiber): Instance;
  mountHoistable?(hoistableRoot: HoistableRoot | null, type: HostType, instance: HostArg): void;
  unmountHoistable?(instance: HostArg): void;
  createHoistableInstance?(type: HostType, props: any, rootContainer: Container | null, internalHandle: Fiber): Instance;
  prepareToCommitHoistables?(): void;
  mayResourceSuspendCommit?(resource: ResourceArg): boolean;
  preloadResource?(resource: ResourceArg): boolean;
  suspendResource?(state: SuspendedState, hoistableRoot: HoistableRoot | null, resource: ResourceArg, props: any): void;
  supportsSingletons?: boolean;
  resolveSingletonInstance?(type: HostType, props: any, rootContainer: Container | null, hostContext: HostContext, validateDOMNestingDev: boolean): Instance;
  acquireSingletonInstance?(type: HostType, props: any, instance: HostArg, internalHandle: Fiber): void;
  releaseSingletonInstance?(instance: HostArg, type?: HostType, props?: Props): void;
  isHostSingletonType?(type: string): boolean;
  isSingletonScope?(type: HostType): boolean;
  addViewTransitionFinishedListener?: (...args: any[]) => any;
  applyViewTransitionName?: (...args: any[]) => any;
  measureInstance?: (...args: any[]) => any;
  restoreViewTransitionName?: (...args: any[]) => any;
  wasInstanceInViewport?: (...args: any[]) => any;
}
interface Reconciler {
  attemptContinuousHydration?(fiber: Fiber): void;
  attemptHydrationAtCurrentPriority?(fiber: Fiber): void;
  attemptSynchronousHydration?(fiber: Fiber): void;
  batchedUpdates?(fn: (a: any) => any, a: any): any;
  createComponentSelector?(component: ElementType): Selector;
  createContainer?(
    containerInfo: Container,
    tag: RootTag,
    hydrationCallbacks: unknown,
    isStrictMode: boolean,
    concurrentUpdatesByDefaultOverride: boolean | null,
    identifierPrefix: string,
    onUncaughtError: OnUncaughtError,
    onCaughtError: OnCaughtError,
    onRecoverableError: OnRecoverableError,
    onDefaultTransitionIndicator: OnDefaultTransitionIndicator
  ): FiberRoot;
  createHasPseudoClassSelector?(selectors: Selector[]): Selector;
  createHydrationContainer?(
    initialChildren: ReactNode,
    callback: UpdateCallback | null | undefined,
    containerInfo: Container,
    tag: RootTag,
    hydrationCallbacks: unknown,
    isStrictMode: boolean,
    concurrentUpdatesByDefaultOverride: boolean | null,
    identifierPrefix: string,
    onUncaughtError: OnUncaughtError,
    onCaughtError: OnCaughtError,
    onRecoverableError: OnRecoverableError,
    onDefaultTransitionIndicator: OnDefaultTransitionIndicator,
    transitionCallbacks: unknown,
    formState: ReactFormState | null
  ): FiberRoot;
  createPortal?(children: ReactNode, containerInfo: Container, implementation: unknown, key?: unknown): ReactPortal;
  createRoleSelector?(role: string): Selector;
  createTestNameSelector?(id: string): Selector;
  createTextSelector?(text: string): Selector;
  defaultOnCaughtError?(error: Thrown): void;
  defaultOnRecoverableError?(error: Thrown): void;
  defaultOnUncaughtError?(error: Thrown): void;
  deferredUpdates?(fn: () => any): any;
  discreteUpdates?(fn: (a: any, b: any, c: any, d: any) => any, a: any, b: any, c: any, d: any): any;
  findAllNodes?(hostRoot: Instance, selectors: Selector[]): StateNode[];
  findBoundingRects?(hostRoot: Instance, selectors: Selector[]): BoundingRect[];
  findHostInstance?(component: ClassInstance): PublicInstance | null;
  findHostInstanceWithNoPortals?(fiber: Fiber): PublicInstance | null;
  findHostInstanceWithWarning?(component: ClassInstance, methodName?: string): PublicInstance | null;
  flushPassiveEffects?(): boolean;
  flushSyncFromReconciler?(fn?: (() => any) | null): any;
  flushSyncWork?(): boolean;
  focusWithin?(hostRoot: Instance, selectors: Selector[]): boolean;
  getFindAllNodesFailureDescription?(hostRoot: Instance, selectors: Selector[]): string | null;
  getPublicRootInstance?(container: FiberRoot): StateNode;
  injectIntoDevTools?(): boolean;
  isAlreadyRendering?(): boolean;
  observeVisibleRects?(hostRoot: Instance, selectors: Selector[], callback: ObserveVisibleRectsCallback, options?: IntersectionObserverOptionsLike): Disconnectable;
  shouldError?(fiber?: Fiber): boolean | null;
  shouldSuspend?(fiber?: Fiber): boolean;
  startHostTransition?(formFiber: Fiber, pendingState: TransitionStatus, action: ((formData: any) => unknown) | null, formData: any): void;
  updateContainer?(element: ReactNode, container: FiberRoot, parentComponent?: ClassInstance | null, callback?: UpdateCallback | null): Lane;
  updateContainerSync?(element: ReactNode, container: FiberRoot, parentComponent?: ClassInstance | null, callback?: UpdateCallback | null): Lane;
}
}
