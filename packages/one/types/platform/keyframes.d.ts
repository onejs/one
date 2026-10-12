import type { CubicKeyframe as CubicKeyframeValue, Keyframe, KeyframeTrack as KeyframeTrackValue, KeyframeValue, LinearKeyframe as LinearKeyframeValue, MoveKeyframe as MoveKeyframeValue, Spring, SpringKeyframe as SpringKeyframeValue, UnitCurve } from './animatorTypes';
export declare function LinearKeyframe<Value extends KeyframeValue>(to: Value, options: {
    duration: number;
    timingCurve?: UnitCurve;
}): LinearKeyframeValue<Value>;
export declare function SpringKeyframe<Value extends KeyframeValue>(to: Value, options?: {
    duration?: number;
    spring?: Spring;
    startVelocity?: Value;
}): SpringKeyframeValue<Value>;
export declare function CubicKeyframe<Value extends KeyframeValue>(to: Value, options: {
    duration: number;
    startVelocity?: Value;
    endVelocity?: Value;
}): CubicKeyframeValue<Value>;
export declare function MoveKeyframe<Value extends KeyframeValue>(to: Value): MoveKeyframeValue<Value>;
export declare function KeyframeTrack<Value extends KeyframeValue>(content: readonly Keyframe<KeyframeValue>[]): KeyframeTrackValue<Value>;
export declare function KeyframeTrack<Value extends KeyframeValue>(keyPath: string, content: readonly Keyframe<number>[]): KeyframeTrackValue<Value>;
//# sourceMappingURL=keyframes.d.ts.map