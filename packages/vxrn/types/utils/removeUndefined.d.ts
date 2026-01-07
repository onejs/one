type RemoveUndefined<T> = {
  [K in keyof T]: T[K] extends undefined ? never : T[K]
}
export declare function removeUndefined<T extends object>(obj: T): RemoveUndefined<T>
export {}
//# sourceMappingURL=removeUndefined.d.ts.map
