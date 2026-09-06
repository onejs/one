import type { WorkletCandidate } from './types';
export declare const AUTOWORKLET_FUNCTION_ARGS: Record<string, number[]>;
export declare const WORKLET_DIRECTIVES: string[];
export declare function hasDirective(fnNode: any, directive: string): boolean;
export declare function hasWorkletDirective(fnNode: any): boolean;
/**
 * Source offset just past every leading worklets directive in the body, so a
 * body slice drops all of them rather than only the first. Returns the offset
 * of the first real statement.
 */
export declare function bodyStartAfterDirectives(fnNode: any, code: string): number;
export declare function findWorkletCandidates(program: any): WorkletCandidate[];
//# sourceMappingURL=autoworklet.d.ts.map