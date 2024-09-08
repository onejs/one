import { onClientLoaderResolve } from 'vxs'

onClientLoaderResolve(({ loaderData, loaderServerData }) => {
  // TODO
  console.info('got stuff', loaderData, loaderServerData)
})
