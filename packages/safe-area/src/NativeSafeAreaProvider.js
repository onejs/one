import { jsx as _jsx } from "react/jsx-runtime";
/* eslint-env browser */
import * as React from 'react';
import { View } from 'react-native';
/**
 * TODO:
 * Currently insets and frame are based on the window and are not
 * relative to the provider view. This is inconsistent with iOS and Android.
 * However in most cases if the provider view covers the screen this is not
 * an issue.
 */
const CSSTransitions = {
    WebkitTransition: 'webkitTransitionEnd',
    Transition: 'transitionEnd',
    MozTransition: 'transitionend',
    MSTransition: 'msTransitionEnd',
    OTransition: 'oTransitionEnd',
};
export function NativeSafeAreaProvider({ children, style, onInsetsChange, }) {
    React.useEffect(() => {
        // Skip for SSR.
        if (typeof document === 'undefined') {
            return;
        }
        const element = createContextElement();
        document.body.appendChild(element);
        const onEnd = () => {
            const { paddingTop, paddingBottom, paddingLeft, paddingRight } = window.getComputedStyle(element);
            const insets = {
                top: paddingTop ? Number.parseInt(paddingTop, 10) : 0,
                bottom: paddingBottom ? Number.parseInt(paddingBottom, 10) : 0,
                left: paddingLeft ? Number.parseInt(paddingLeft, 10) : 0,
                right: paddingRight ? Number.parseInt(paddingRight, 10) : 0,
            };
            const frame = {
                x: 0,
                y: 0,
                width: document.documentElement.offsetWidth,
                height: document.documentElement.offsetHeight,
            };
            // @ts-ignore: missing properties
            onInsetsChange({ nativeEvent: { insets, frame } });
        };
        element.addEventListener(getSupportedTransitionEvent(), onEnd);
        onEnd();
        return () => {
            document.body.removeChild(element);
            element.removeEventListener(getSupportedTransitionEvent(), onEnd);
        };
    }, [onInsetsChange]);
    const finalStyle = style || {
        flex: 1,
        width: '100%',
        height: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
    };
    return _jsx(View, { style: finalStyle, children: children });
}
let _supportedTransitionEvent = null;
function getSupportedTransitionEvent() {
    if (_supportedTransitionEvent != null) {
        return _supportedTransitionEvent;
    }
    const element = document.createElement('invalidtype');
    _supportedTransitionEvent = CSSTransitions.Transition;
    for (const key in CSSTransitions) {
        if (element.style[key] !== undefined) {
            _supportedTransitionEvent = CSSTransitions[key];
            break;
        }
    }
    return _supportedTransitionEvent;
}
let _supportedEnv = null;
function getSupportedEnv() {
    if (_supportedEnv !== null) {
        return _supportedEnv;
    }
    const { CSS } = window;
    if (CSS && CSS.supports && CSS.supports('top: constant(safe-area-inset-top)')) {
        _supportedEnv = 'constant';
    }
    else {
        _supportedEnv = 'env';
    }
    return _supportedEnv;
}
function getInset(side) {
    return `${getSupportedEnv()}(safe-area-inset-${side})`;
}
function createContextElement() {
    const element = document.createElement('div');
    const { style } = element;
    style.position = 'fixed';
    style.left = '0';
    style.top = '0';
    style.width = '0';
    style.height = '0';
    style.zIndex = '-1';
    style.overflow = 'hidden';
    style.visibility = 'hidden';
    // Bacon: Anything faster than this and the callback will be invoked too early with the wrong insets
    style.transitionDuration = '0.05s';
    style.transitionProperty = 'padding';
    style.transitionDelay = '0s';
    style.paddingTop = getInset('top');
    style.paddingBottom = getInset('bottom');
    style.paddingLeft = getInset('left');
    style.paddingRight = getInset('right');
    return element;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTmF0aXZlU2FmZUFyZWFQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk5hdGl2ZVNhZmVBcmVhUHJvdmlkZXIudHN4Il0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx3QkFBd0I7QUFFeEIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFFOUIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUVuQzs7Ozs7O0dBTUc7QUFFSCxNQUFNLGNBQWMsR0FBMkI7SUFDN0MsZ0JBQWdCLEVBQUUscUJBQXFCO0lBQ3ZDLFVBQVUsRUFBRSxlQUFlO0lBQzNCLGFBQWEsRUFBRSxlQUFlO0lBQzlCLFlBQVksRUFBRSxpQkFBaUI7SUFDL0IsV0FBVyxFQUFFLGdCQUFnQjtDQUM5QixDQUFBO0FBRUQsTUFBTSxVQUFVLHNCQUFzQixDQUFDLEVBQ3JDLFFBQVEsRUFDUixLQUFLLEVBQ0wsY0FBYyxHQUNjO0lBQzVCLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO1FBQ25CLGdCQUFnQjtRQUNoQixJQUFJLE9BQU8sUUFBUSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLE9BQU07UUFDUixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLEVBQUUsQ0FBQTtRQUN0QyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNsQyxNQUFNLEtBQUssR0FBRyxHQUFHLEVBQUU7WUFDakIsTUFBTSxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxHQUM1RCxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFFbEMsTUFBTSxNQUFNLEdBQUc7Z0JBQ2IsR0FBRyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JELE1BQU0s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