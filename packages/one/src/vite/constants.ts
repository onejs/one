export const EMPTY_LOADER_STRING = `export function loader() {return "__vxrn__loader__"};`

export function makeLoaderRouteIdStub(routeId: string): string {
  return `export function loader() {return ${JSON.stringify(routeId)}};`
}

export const LoaderDataCache = {}

export const SERVER_CONTEXT_POST_RENDER_STRING = `_one_post_render_data_`
