// a module-level effect must stay absent until the explicit dynamic import.
const previous = Reflect.get(globalThis, '__oneDOMProofLazyEvaluations') ?? 0
Reflect.set(globalThis, '__oneDOMProofLazyEvaluations', previous + 1)

export const value = 'lazy module evaluated'
