import type { ReactNativeStackFrame } from './types/symbolicate';
export declare const inferPlatformFromStack: (stack: ReactNativeStackFrame[]) => string | undefined;
export declare const processStacks: (stack: ReactNativeStackFrame[]) => Promise<void>;
//# sourceMappingURL=symbolicate.d.ts.map