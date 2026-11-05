import type { WorkletClassCandidate } from './types';
export declare const WORKLET_CLASS_MARKER = "__workletClass";
export declare const WORKLET_CLASS_FACTORY_SUFFIX = "__classFactory";
export declare function findWorkletClasses(program: any): WorkletClassCandidate[];
export declare function classFactoryName(className: string): string;
export declare function buildClassFactoryDeclaration(candidate: WorkletClassCandidate, code: string): string;
/**
 * names constructed with `new Name()` anywhere under the worklet, in traversal
 * order. like upstream's plugin, callers rewrite one whose name is also a
 * captured variable to its class factory, without checking where the class
 * was defined, so imported worklet classes resolve through their own file.
 */
export declare function findConstructedNames(fnNode: any): string[];
//# sourceMappingURL=classes.d.ts.map