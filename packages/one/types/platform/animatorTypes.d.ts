import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import type { SDKAnimationValue } from './generated/controlTypes';
export interface PhaseAnimatorProps<Phase> extends Omit<ViewProps, 'children'> {
    phases: Iterable<Phase>;
    trigger?: unknown;
    animation?: (phase: Phase) => SDKAnimationValue | null;
    children: (phase: Phase) => ReactNode;
}
export type KeyframeValue = number | Readonly<Record<string, number>>;
export declare const unitCurves: readonly ['linear', 'easeIn', 'easeOut', 'easeInOut', 'circularEaseIn', 'circularEaseOut', 'circularEaseInOut'];
export type UnitCurve = (typeof unitCurves)[number] | {
    startControlPoint: {
        x: number;
        y: number;
    };
    endControlPoint: {
        x: number;
        y: number;
    };
};
export declare const springPresets: readonly ['smooth', 'snappy', 'bouncy'];
export type Spring = (typeof springPresets)[number] | {
    duration?: number;
    bounce?: number;
} | {
    mass?: number;
    stiffness: number;
    damping: number;
    allowOverDamping?: boolean;
} | {
    response: number;
    dampingRatio: number;
} | {
    settlingDuration: number;
    dampingRatio: number;
    epsilon?: number;
};
export type LinearKeyframe<Value extends KeyframeValue> = Readonly<{
    kind: 'linear';
    to: Value;
    duration: number;
    timingCurve?: UnitCurve;
}>;
export type SpringKeyframe<Value extends KeyframeValue> = Readonly<{
    kind: 'spring';
    to: Value;
    duration?: number;
    spring?: Spring;
    startVelocity?: Value;
}>;
export type CubicKeyframe<Value extends KeyframeValue> = Readonly<{
    kind: 'cubic';
    to: Value;
    duration: number;
    startVelocity?: Value;
    endVelocity?: Value;
}>;
export type MoveKeyframe<Value extends KeyframeValue> = Readonly<{
    kind: 'move';
    to: Value;
}>;
export type Keyframe<Value extends KeyframeValue> = LinearKeyframe<Value> | SpringKeyframe<Value> | CubicKeyframe<Value> | MoveKeyframe<Value>;
export type KeyframeTrack<Value extends KeyframeValue> = Readonly<{
    kind: 'track';
    keyPath?: string;
    content: readonly Keyframe<KeyframeValue>[];
}>;
export interface KeyframeAnimatorProps<Value extends KeyframeValue> extends Omit<ViewProps, 'children'> {
    initialValue: Value;
    repeating?: boolean;
    trigger?: unknown;
    keyframes: (value: Value) => readonly KeyframeTrack<Value>[] | readonly Keyframe<Value>[];
    children: (value: Value) => ReactNode;
}
//# sourceMappingURL=animatorTypes.d.ts.map