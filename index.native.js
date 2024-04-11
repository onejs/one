function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
function _defineProperty(obj, key, value) { key = _toPropertyKey(key); if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
function _toPropertyKey(arg) { var key = _toPrimitive(arg, "string"); return typeof key === "symbol" ? key : String(key); }
function _toPrimitive(input, hint) { if (typeof input !== "object" || input === null) return input; var prim = input[Symbol.toPrimitive]; if (prim !== undefined) { var res = prim.call(input, hint || "default"); if (typeof res !== "object") return res; throw new TypeError("@@toPrimitive must return a primitive value."); } return (hint === "string" ? String : Number)(input); }
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { Animated, Image, Platform, requireNativeComponent, StyleSheet, UIManager, View } from 'react-native';
import { Freeze } from 'react-freeze';
import { version } from 'react-native/package.json';
import TransitionProgressContext from './TransitionProgressContext';
import useTransitionProgress from './useTransitionProgress';
import { isSearchBarAvailableForCurrentPlatform, isNewBackTitleImplementation, executeNativeBackPress } from './utils';

// web implementation is taken from `index.tsx`
const isPlatformSupported = Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'windows';
let ENABLE_SCREENS = isPlatformSupported;
function enableScreens() {
  let shouldEnableScreens = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
  ENABLE_SCREENS = isPlatformSupported && shouldEnableScreens;
  if (ENABLE_SCREENS && !UIManager.getViewManagerConfig('RNSScreen')) {
    console.error(`Screen native module hasn't been linked. Please check the react-native-screens README for more details`);
  }
}
let ENABLE_FREEZE = false;
function enableFreeze() {
  let shouldEnableReactFreeze = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
  const minor = parseInt(version.split('.')[1]); // eg. takes 66 from '0.66.0'

  // react-freeze requires react-native >=0.64, react-native from main is 0.0.0
  if (!(minor === 0 || minor >= 64) && shouldEnableReactFreeze) {
    console.warn('react-freeze library requires at least react-native 0.64. Please upgrade your react-native version in order to use this feature.');
  }
  ENABLE_FREEZE = shouldEnableReactFreeze;
}

// const that tells if the library should use new implementation, will be undefined for older versions
const shouldUseActivityState = true;
function screensEnabled() {
  return ENABLE_SCREENS;
}
// We initialize these lazily so that importing the module doesn't throw error when not linked
// This is necessary coz libraries such as React Navigation import the library where it may not be enabled
let NativeScreenValue;
let NativeScreenContainerValue;
let NativeScreenNavigationContainerValue;
let NativeScreenStack;
let NativeScreenStackHeaderConfig;
let NativeScreenStackHeaderSubview;
let AnimatedNativeScreen;
let NativeSearchBar;
let NativeSearchBarCommands;
let NativeFullWindowOverlay;
const ScreensNativeModules = {
  get NativeScreen() {
    NativeScreenValue = NativeScreenValue || require('./fabric/ScreenNativeComponent').default;
    return NativeScreenValue;
  },
  get NativeScreenContainer() {
    NativeScreenContainerValue = NativeScreenContainerValue || require('./fabric/ScreenContainerNativeComponent').default;
    return NativeScreenContainerValue;
  },
  get NativeScreenNavigationContainer() {
    NativeScreenNavigationContainerValue = NativeScreenNavigationContainerValue || (Platform.OS === 'ios' ? requireNativeComponent('RNSScreenNavigationContainer') : this.NativeScreenContainer);
    return NativeScreenNavigationContainerValue;
  },
  get NativeScreenStack() {
    NativeScreenStack = NativeScreenStack || requireNativeComponent('RNSScreenStack');
    return NativeScreenStack;
  },
  get NativeScreenStackHeaderConfig() {
    NativeScreenStackHeaderConfig = NativeScreenStackHeaderConfig || requireNativeComponent('RNSScreenStackHeaderConfig');
    return NativeScreenStackHeaderConfig;
  },
  get NativeScreenStackHeaderSubview() {
    NativeScreenStackHeaderSubview = NativeScreenStackHeaderSubview || requireNativeComponent('RNSScreenStackHeaderSubview');
    return NativeScreenStackHeaderSubview;
  },
  get NativeSearchBar() {
    NativeSearchBar = NativeSearchBar || require('./fabric/SearchBarNativeComponent').default;
    return NativeSearchBar;
  },
  get NativeSearchBarCommands() {
    NativeSearchBarCommands = NativeSearchBarCommands || require('./fabric/SearchBarNativeComponent').Commands;
    return NativeSearchBarCommands;
  },
  get NativeFullWindowOverlay() {
    NativeFullWindowOverlay = NativeFullWindowOverlay || requireNativeComponent('RNSFullWindowOverlay');
    return NativeFullWindowOverlay;
  }
};
// This component allows one more render before freezing the screen.
// Allows activityState to reach the native side and useIsFocused to work correctly.
function DelayedFreeze(_ref) {
  let {
    freeze,
    children
  } = _ref;
  // flag used for determining whether freeze should be enabled
  const [freezeState, setFreezeState] = React.useState(false);
  if (freeze !== freezeState) {
    // setImmediate is executed at the end of the JS execution block.
    // Used here for changing the state right after the render.
    setImmediate(() => {
      setFreezeState(freeze);
    });
  }
  return /*#__PURE__*/React.createElement(Freeze, {
    freeze: freeze ? freezeState : false
  }, children);
}
function ScreenStack(props) {
  const {
    children,
    ...rest
  } = props;
  const size = React.Children.count(children);
  // freezes all screens except the top one
  const childrenWithFreeze = React.Children.map(children, (child, index) => {
    var _props$descriptor, _props$descriptors, _descriptor$options$f, _descriptor$options;
    // @ts-expect-error it's either SceneView in v6 or RouteView in v5
    const {
      props,
      key
    } = child;
    const descriptor = (_props$descriptor = props === null || props === void 0 ? void 0 : props.descriptor) !== null && _props$descriptor !== void 0 ? _props$descriptor : props === null || props === void 0 ? void 0 : (_props$descriptors = props.descriptors) === null || _props$descriptors === void 0 ? void 0 : _props$descriptors[key];
    const freezeEnabled = (_descriptor$options$f = descriptor === null || descriptor === void 0 ? void 0 : (_descriptor$options = descriptor.options) === null || _descriptor$options === void 0 ? void 0 : _descriptor$options.freezeOnBlur) !== null && _descriptor$options$f !== void 0 ? _descriptor$options$f : ENABLE_FREEZE;
    return /*#__PURE__*/React.createElement(DelayedFreeze, {
      freeze: freezeEnabled && size - index > 1
    }, child);
  });
  return /*#__PURE__*/React.createElement(ScreensNativeModules.NativeScreenStack, rest, childrenWithFreeze);
}

// Incomplete type, all accessible properties available at:
// react-native/Libraries/Components/View/ReactNativeViewViewConfig.js
class InnerScreen extends React.Component {
  constructor() {
    super(...arguments);
    _defineProperty(this, "ref", null);
    _defineProperty(this, "closing", new Animated.Value(0));
    _defineProperty(this, "progress", new Animated.Value(0));
    _defineProperty(this, "goingForward", new Animated.Value(0));
    _defineProperty(this, "setRef", ref => {
      var _this$props$onCompone, _this$props;
      this.ref = ref;
      (_this$props$onCompone = (_this$props = this.props).onComponentRef) === null || _this$props$onCompone === void 0 ? void 0 : _this$props$onCompone.call(_this$props, ref);
    });
  }
  setNativeProps(props) {
    var _this$ref;
    (_this$ref = this.ref) === null || _this$ref === void 0 ? void 0 : _this$ref.setNativeProps(props);
  }
  render() {
    const {
      enabled = ENABLE_SCREENS,
      freezeOnBlur = ENABLE_FREEZE,
      ...rest
    } = this.props;

    // To maintain default behaviour of formSheet stack presentation style & and to have resonable
    // defaults for new medium-detent iOS API we need to set defaults here
    const {
      sheetAllowedDetents = 'large',
      sheetLargestUndimmedDetent = 'all',
      sheetGrabberVisible = false,
      sheetCornerRadius = -1.0,
      sheetExpandsWhenScrolledToEdge = true
    } = rest;
    if (enabled && isPlatformSupported) {
      var _gestureResponseDista, _gestureResponseDista2, _gestureResponseDista3, _gestureResponseDista4;
      AnimatedNativeScreen = AnimatedNativeScreen || Animated.createAnimatedComponent(ScreensNativeModules.NativeScreen);
      let {
        // Filter out active prop in this case because it is unused and
        // can cause problems depending on react-native version:
        // https://github.com/react-navigation/react-navigation/issues/4886
        active,
        activityState,
        children,
        isNativeStack,
        gestureResponseDistance,
        ...props
      } = rest;
      if (active !== undefined && activityState === undefined) {
        console.warn('It appears that you are using old version of react-navigation library. Please update @react-navigation/bottom-tabs, @react-navigation/stack and @react-navigation/drawer to version 5.10.0 or above to take full advantage of new functionality added to react-native-screens');
        activityState = active !== 0 ? 2 : 0; // in the new version, we need one of the screens to have value of 2 after the transition
      }

      const handleRef = ref => {
        var _ref$viewConfig, _ref$viewConfig$valid;
        if (ref !== null && ref !== void 0 && (_ref$viewConfig = ref.viewConfig) !== null && _ref$viewConfig !== void 0 && (_ref$viewConfig$valid = _ref$viewConfig.validAttributes) !== null && _ref$viewConfig$valid !== void 0 && _ref$viewConfig$valid.style) {
          ref.viewConfig.validAttributes.style = {
            ...ref.viewConfig.validAttributes.style,
            display: false
          };
          this.setRef(ref);
        }
      };
      return /*#__PURE__*/React.createElement(DelayedFreeze, {
        freeze: freezeOnBlur && activityState === 0
      }, /*#__PURE__*/React.createElement(AnimatedNativeScreen, _extends({}, props, {
        activityState: activityState,
        sheetAllowedDetents: sheetAllowedDetents,
        sheetLargestUndimmedDetent: sheetLargestUndimmedDetent,
        sheetGrabberVisible: sheetGrabberVisible,
        sheetCornerRadius: sheetCornerRadius,
        sheetExpandsWhenScrolledToEdge: sheetExpandsWhenScrolledToEdge,
        gestureResponseDistance: {
          start: (_gestureResponseDista = gestureResponseDistance === null || gestureResponseDistance === void 0 ? void 0 : gestureResponseDistance.start) !== null && _gestureResponseDista !== void 0 ? _gestureResponseDista : -1,
          end: (_gestureResponseDista2 = gestureResponseDistance === null || gestureResponseDistance === void 0 ? void 0 : gestureResponseDistance.end) !== null && _gestureResponseDista2 !== void 0 ? _gestureResponseDista2 : -1,
          top: (_gestureResponseDista3 = gestureResponseDistance === null || gestureResponseDistance === void 0 ? void 0 : gestureResponseDistance.top) !== null && _gestureResponseDista3 !== void 0 ? _gestureResponseDista3 : -1,
          bottom: (_gestureResponseDista4 = gestureResponseDistance === null || gestureResponseDistance === void 0 ? void 0 : gestureResponseDistance.bottom) !== null && _gestureResponseDista4 !== void 0 ? _gestureResponseDista4 : -1
        }
        // This prevents showing blank screen when navigating between multiple screens with freezing
        // https://github.com/software-mansion/react-native-screens/pull/1208
        ,
        ref: handleRef,
        onTransitionProgress: !isNativeStack ? undefined : Animated.event([{
          nativeEvent: {
            progress: this.progress,
            closing: this.closing,
            goingForward: this.goingForward
          }
        }], {
          useNativeDriver: true
        })
      }), !isNativeStack ?
      // see comment of this prop in types.tsx for information why it is needed
      children : /*#__PURE__*/React.createElement(TransitionProgressContext.Provider, {
        value: {
          progress: this.progress,
          closing: this.closing,
          goingForward: this.goingForward
        }
      }, children)));
    } else {
      // same reason as above
      let {
        active,
        activityState,
        style,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        onComponentRef,
        ...props
      } = rest;
      if (active !== undefined && activityState === undefined) {
        activityState = active !== 0 ? 2 : 0;
      }
      return /*#__PURE__*/React.createElement(Animated.View, _extends({
        style: [style, {
          display: activityState !== 0 ? 'flex' : 'none'
        }],
        ref: this.setRef
      }, props));
    }
  }
}
function ScreenContainer(props) {
  const {
    enabled = ENABLE_SCREENS,
    hasTwoStates,
    ...rest
  } = props;
  if (enabled && isPlatformSupported) {
    if (hasTwoStates) {
      return /*#__PURE__*/React.createElement(ScreensNativeModules.NativeScreenNavigationContainer, rest);
    }
    return /*#__PURE__*/React.createElement(ScreensNativeModules.NativeScreenContainer, rest);
  }
  return /*#__PURE__*/React.createElement(View, rest);
}
function FullWindowOverlay(props) {
  if (Platform.OS !== 'ios') {
    console.warn('Importing FullWindowOverlay is only valid on iOS devices.');
    return /*#__PURE__*/React.createElement(View, props);
  }
  return /*#__PURE__*/React.createElement(ScreensNativeModules.NativeFullWindowOverlay, {
    style: {
      position: 'absolute',
      width: '100%',
      height: '100%'
    }
  }, props.children);
}
const styles = StyleSheet.create({
  headerSubview: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  }
});
const ScreenStackHeaderBackButtonImage = props => /*#__PURE__*/React.createElement(ScreensNativeModules.NativeScreenStackHeaderSubview, {
  type: "back",
  style: styles.headerSubview
}, /*#__PURE__*/React.createElement(Image, _extends({
  resizeMode: "center",
  fadeDuration: 0
}, props)));
class SearchBar extends React.Component {
  constructor(props) {
    super(props);
    _defineProperty(this, "nativeSearchBarRef", void 0);
    this.nativeSearchBarRef = /*#__PURE__*/React.createRef();
  }
  _callMethodWithRef(method) {
    const ref = this.nativeSearchBarRef.current;
    if (ref) {
      method(ref);
    } else {
      console.warn('Reference to native search bar component has not been updated yet');
    }
  }
  blur() {
    this._callMethodWithRef(ref => ScreensNativeModules.NativeSearchBarCommands.blur(ref));
  }
  focus() {
    this._callMethodWithRef(ref => ScreensNativeModules.NativeSearchBarCommands.focus(ref));
  }
  toggleCancelButton(flag) {
    this._callMethodWithRef(ref => ScreensNativeModules.NativeSearchBarCommands.toggleCancelButton(ref, flag));
  }
  clearText() {
    this._callMethodWithRef(ref => ScreensNativeModules.NativeSearchBarCommands.clearText(ref));
  }
  setText(text) {
    this._callMethodWithRef(ref => ScreensNativeModules.NativeSearchBarCommands.setText(ref, text));
  }
  render() {
    if (!isSearchBarAvailableForCurrentPlatform) {
      console.warn('Importing SearchBar is only valid on iOS and Android devices.');
      return View;
    }
    return /*#__PURE__*/React.createElement(ScreensNativeModules.NativeSearchBar, _extends({}, this.props, {
      ref: this.nativeSearchBarRef
    }));
  }
}
const ScreenStackHeaderRightView = props => /*#__PURE__*/React.createElement(ScreensNativeModules.NativeScreenStackHeaderSubview, _extends({}, props, {
  type: "right",
  style: styles.headerSubview
}));
const ScreenStackHeaderLeftView = props => /*#__PURE__*/React.createElement(ScreensNativeModules.NativeScreenStackHeaderSubview, _extends({}, props, {
  type: "left",
  style: styles.headerSubview
}));
const ScreenStackHeaderCenterView = props => /*#__PURE__*/React.createElement(ScreensNativeModules.NativeScreenStackHeaderSubview, _extends({}, props, {
  type: "center",
  style: styles.headerSubview
}));
const ScreenStackHeaderSearchBarView = props => /*#__PURE__*/React.createElement(ScreensNativeModules.NativeScreenStackHeaderSubview, _extends({}, props, {
  type: "searchBar",
  style: styles.headerSubview
}));
// context to be used when the user wants to use enhanced implementation
// e.g. to use `useReanimatedTransitionProgress` (see `reanimated` folder in repo)
const ScreenContext = /*#__PURE__*/React.createContext(InnerScreen);
class Screen extends React.Component {
  render() {
    const ScreenWrapper = this.context || InnerScreen;
    return /*#__PURE__*/React.createElement(ScreenWrapper, this.props);
  }
}
_defineProperty(Screen, "contextType", ScreenContext);

const NativeScreen =  ScreensNativeModules.NativeScreen;
const NativeScreenContainer =  ScreensNativeModules.NativeScreenContainer;
const NativeScreenNavigationContainer =  ScreensNativeModules.NativeScreenNavigationContainer;
const ScreenStackHeaderConfig =  ScreensNativeModules.NativeScreenStackHeaderConfig;
const ScreenStackHeaderSubview =  ScreensNativeModules.NativeScreenStackHeaderSubview;
const SearchBarCommands =  ScreensNativeModules.NativeSearchBarCommands;

export {
  // these are classes so they are not evaluated until used
  // so no need to use getters for them
  Screen,
  ScreenContainer,
  ScreenContext,
  ScreenStack,
  InnerScreen,
  SearchBar,
  FullWindowOverlay,

  NativeScreen,
  NativeScreenContainer,
  NativeScreenNavigationContainer,
  ScreenStackHeaderConfig,
  ScreenStackHeaderSubview,
  SearchBarCommands,
  
  // these are functions and will not be evaluated until used
  // so no need to use getters for them
  ScreenStackHeaderBackButtonImage,
  ScreenStackHeaderRightView,
  ScreenStackHeaderLeftView,
  ScreenStackHeaderCenterView,
  ScreenStackHeaderSearchBarView,
  enableScreens,
  enableFreeze,
  screensEnabled,
  shouldUseActivityState,
  useTransitionProgress,
  isSearchBarAvailableForCurrentPlatform,
  isNewBackTitleImplementation,
  executeNativeBackPress
};
//# sourceMappingURL=index.native.js.map