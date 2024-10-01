import type { RenderAppProps } from './types'

type LoaderResolverProps = Pick<RenderAppProps, 'loaderData' | 'loaderServerData' | 'loaderProps'>
type ClientLoaderResolver = (props: LoaderResolverProps) => any

let clientLoaderResolver: null | ClientLoaderResolver = null
let didRun = false

export function onClientLoaderResolve(resolver: ClientLoaderResolver) {
  if (didRun) {
    throw new Error(
      process.env.NODE_ENV === 'production'
        ? `Error 002`
        : `Error: You called onClientLoaderResolve after it was run, register it in your root _layout.tsx`
    )
  }
  clientLoaderResolver = resolver
}

export async function resolveClientLoader(props: LoaderResolverProps) {
  didRun = true
  if (!clientLoaderResolver) return
  await clientLoaderResolver(props)
}
