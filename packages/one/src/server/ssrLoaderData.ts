// shared weakmap for SSR loader data
// kept in a separate server-safe module to avoid pulling in client-side
// dependencies (like @react-navigation/native) into the serve runtime
export const ssrLoaderData = new WeakMap<Function, any>()

export function setSSRLoaderData(loaderFn: Function, data: any) {
  ssrLoaderData.set(loaderFn, data)
}
