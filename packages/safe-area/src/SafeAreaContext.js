import { jsx as _jsx } from "react/jsx-runtime";
import * as React from 'react';
import { Dimensions } from 'react-native';
import { NativeSafeAreaProvider } from './NativeSafeAreaProvider';
const isDev = process.env.NODE_ENV !== 'production';
export const SafeAreaInsetsContext = React.createContext(null);
if (isDev) {
    SafeAreaInsetsContext.displayName = 'SafeAreaInsetsContext';
}
export const SafeAreaFrameContext = React.createContext(null);
if (isDev) {
    SafeAreaFrameContext.displayName = 'SafeAreaFrameContext';
}
export function SafeAreaProvider({ children, initialMetrics, initialSafeAreaInsets, ...others }) {
    const parentInsets = useParentSafeAreaInsets();
    const parentFrame = useParentSafeAreaFrame();
    const [insets, setInsets] = React.useState(initialMetrics?.insets ?? initialSafeAreaInsets ?? parentInsets ?? null);
    const [frame, setFrame] = React.useState(initialMetrics?.frame ??
        parentFrame ?? {
        // Backwards compat so we render anyway if we don't have frame.
        x: 0,
        y: 0,
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    });
    const onInsetsChange = React.useCallback((event) => {
        const { nativeEvent: { frame: nextFrame, insets: nextInsets }, } = event;
        React.startTransition(() => {
            setFrame((curFrame) => {
                if (
                // Backwards compat with old native code that won't send frame.
                nextFrame &&
                    (nextFrame.height !== curFrame.height ||
                        nextFrame.width !== curFrame.width ||
                        nextFrame.x !== curFrame.x ||
                        nextFrame.y !== curFrame.y)) {
                    return nextFrame;
                }
                return curFrame;
            });
            setInsets((curInsets) => {
                if (!curInsets ||
                    nextInsets.bottom !== curInsets.bottom ||
                    nextInsets.left !== curInsets.left ||
                    nextInsets.right !== curInsets.right ||
                    nextInsets.top !== curInsets.top) {
                    return nextInsets;
                }
                return curInsets;
            });
        });
    }, []);
    return (_jsx(NativeSafeAreaProvider, { onInsetsChange: onInsetsChange, ...others, children: _jsx(SafeAreaFrameContext.Provider, { value: frame, children: _jsx(SafeAreaInsetsContext.Provider, { value: insets, children: children }) }) }));
}
function useParentSafeAreaInsets() {
    return React.useContext(SafeAreaInsetsContext);
}
function useParentSafeAreaFrame() {
    return React.useContext(SafeAreaFrameContext);
}
const NO_INSETS_ERROR = 'No safe area value available. Make sure you are rendering `<SafeAreaProvider>` at the top of your app.';
export function useSafeAreaInsets() {
    const insets = React.useContext(SafeAreaInsetsContext);
    if (insets == null) {
        throw new Error(NO_INSETS_ERROR);
    }
    return insets;
}
export function useSafeAreaFrame() {
    const frame = React.useContext(SafeAreaFrameContext);
    if (frame == null) {
        throw new Error(NO_INSETS_ERROR);
    }
    return frame;
}
export function withSafeAreaInsets(WrappedComponent) {
    return React.forwardRef((props, ref) => {
        const insets = useSafeAreaInsets();
        // @ts-expect-error
        return _jsx(WrappedComponent, { ...props, insets: insets, ref: ref });
    });
}
/**
 * @deprecated
 */
export function useSafeArea() {
    return useSafeAreaInsets();
}
/**
 * @deprecated
 */
export const SafeAreaConsumer = SafeAreaInsetsContext.Consumer;
/**
 * @deprecated
 */
export const SafeAreaContext = SafeAreaInsetsContext;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2FmZUFyZWFDb250ZXh0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiU2FmZUFyZWFDb250ZXh0LnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUdqRSxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsS0FBSyxZQUFZLENBQUE7QUFFbkQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBb0IsSUFBSSxDQUFDLENBQUE7QUFDakYsSUFBSSxLQUFLLEVBQUUsQ0FBQztJQUNWLHFCQUFxQixDQUFDLFdBQVcsR0FBRyx1QkFBdUIsQ0FBQTtBQUM3RCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBYyxJQUFJLENBQUMsQ0FBQTtBQUMxRSxJQUFJLEtBQUssRUFBRSxDQUFDO0lBQ1Ysb0JBQW9CLENBQUMsV0FBVyxHQUFHLHNCQUFzQixDQUFBO0FBQzNELENBQUM7QUFXRCxNQUFNLFVBQVUsZ0JBQWdCLENBQUMsRUFDL0IsUUFBUSxFQUNSLGNBQWMsRUFDZCxxQkFBcUIsRUFDckIsR0FBRyxNQUFNLEVBQ2E7SUFDdEIsTUFBTSxZQUFZLEdBQUcsdUJBQXVCLEVBQUUsQ0FBQTtJQUM5QyxNQUFNLFdBQVcsR0FBRyxzQkFBc0IsRUFBRSxDQUFBO0lBQzVDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FDeEMsY0FBYyxFQUFFLE1BQU0sSUFBSSxxQkFBcUIsSUFBSSxZQUFZLElBQUksSUFBSSxDQUN4RSxDQUFBO0lBQ0QsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsR0FB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