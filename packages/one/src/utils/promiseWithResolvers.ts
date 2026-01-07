export function promiseWithResolvers<T>() {
  let a;
  let b;
  let c = new Promise<T>((resolve, reject) => {
    a = resolve;
    b = reject;
  });
  return { resolve: a, reject: b, promise: c };
}
