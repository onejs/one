import type { RenderAppProps } from './types'

type ClientLoaderResolver = (props: { loaderData: any; loaderServerData: any }) => any

let clientLoaderResolver: null | ClientLoaderResolver = null

export function onClientLoaderResolve(resolver: ClientLoaderResolver) {
  clientLoaderResolver = resolver
}

export async function resolveClientLoader(props: RenderAppProps) {
  if (!clientLoaderResolver) return
  if (!props.loaderServerData) return
  await clientLoaderResolver(props.loaderServerData)
}
