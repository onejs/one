/**
 * Lexical scope analysis and free variable capture for worklets.
 * Builds an authentic lexical scope tree to correctly handle variable shadowing,
 * block scoping (let/const), function hoisting, and catch parameters.
 */
export declare function getClosureVariables(fnNode: any, globals: Set<string>): string[];
//# sourceMappingURL=scope.d.ts.map