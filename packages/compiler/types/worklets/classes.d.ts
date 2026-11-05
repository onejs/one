import type { WorkletClassCandidate } from './types';
export declare const WORKLET_CLASS_MARKER = "__workletClass";
export declare const WORKLET_CLASS_FACTORY_SUFFIX = "__classFactory";
export declare function findWorkletClasses(program: any): WorkletClassCandidate[];
export declare function classFactoryName(className: string): string;
/**
 * marked class names that are the sole value binding of that name in the file.
 * every free reference to one necessarily resolves to the marked class, so a
 * worklet capturing it (a superclass, a static access, an instanceof) carries
 * the factory instead of the raw class. any other binding of the same name
 * keeps the previous capture, since the reference may resolve to that one.
 */
export declare function findUnambiguousClassNames(program: any, candidates: WorkletClassCandidate[]): Set<string>;
export declare function buildClassFactoryDeclaration(candidate: WorkletClassCandidate, code: string): string;
/**
 * names constructed with `new Name()` anywhere under the worklet, in traversal
 * order. like upstream's plugin, callers rewrite one whose name is also a
 * captured variable to its class factory, without checking where the class
 * was defined, so imported worklet classes resolve through their own file.
 */
export declare function findConstructedNames(fnNode: any): string[];
//# sourceMappingURL=classes.d.ts.map