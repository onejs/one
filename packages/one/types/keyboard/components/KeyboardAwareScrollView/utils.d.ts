export declare const debounce: <F extends (...args: Parameters<F>) => ReturnType<F>>(worklet: F, wait?: number) => (...args: Parameters<F>) => ReturnType<F> | void;
export declare const scrollDistanceWithRespectToSnapPoints: (defaultScrollValue: number, snapPoints?: number[]) => number;
//# sourceMappingURL=utils.d.ts.map