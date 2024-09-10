import { onClientLoaderResolve } from 'one'

onClientLoaderResolve(({ loaderData, loaderServerData }) => {
  // TODO
  console.info('got stuff', loaderData, loaderServerData)
})
