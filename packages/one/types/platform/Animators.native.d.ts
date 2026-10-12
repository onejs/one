import { type KeyframeAnimatorProps, type KeyframeValue, type PhaseAnimatorProps } from './animatorTypes';
export declare function PhaseAnimator<Phase>({ phases, trigger, animation, children, style, ...props }: PhaseAnimatorProps<Phase>): import("react/jsx-runtime").JSX.Element;
export declare function KeyframeAnimator<Value extends KeyframeValue>({ initialValue, repeating, trigger, keyframes, children, style, ...props }: KeyframeAnimatorProps<Value>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Animators.native.d.ts.map